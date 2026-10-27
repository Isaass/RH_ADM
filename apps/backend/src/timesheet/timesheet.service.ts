import { prisma } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import { UserRole, TimesheetDay, TimesheetMonthSummary } from '@pontuarh/shared';

export class TimesheetService {
  /**
   * Apuração completa de espelho de ponto mensal desacoplada de interface
   */
  async calculateTimesheet(
    user: AuthenticatedUser,
    employeeId: string,
    competence: string // Formato 'YYYY-MM'
  ): Promise<TimesheetMonthSummary> {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    // Validação de RBAC
    if (user.role === UserRole.COLABORADOR) {
      if (user.employeeId && user.employeeId !== employeeId) {
        throw new Error('Acesso negado: Você não possui autorização para consultar o espelho de outro colaborador.');
      }
    }

    if (user.role === UserRole.GESTOR) {
      const target = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!target || (target.managerId !== user.employeeId && target.id !== user.employeeId)) {
        throw new Error('Acesso negado: Este colaborador não pertence à sua equipe de gestão.');
      }
    }

    // Buscar dados cadastrais do colaborador e jornada
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        position: true,
        workSchedule: true,
        company: true,
      },
    });

    if (!employee || employee.companyId !== user.companyId) {
      throw new Error('Colaborador não encontrado nesta empresa.');
    }

    // Parse da competência
    const [yearStr, monthStr] = competence.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed no JS

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      throw new Error('Formato de competência inválido. Utilize o formato AAAA-MM (ex: 2026-10).');
    }

    // Início e fim do mês
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    // Buscar todas as marcações do colaborador no período (originais e tratadas)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        companyId: user.companyId,
        timestamp: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Buscar solicitações de ajuste pendentes para o resumo
    const pendingAdjustmentsCount = await prisma.timeAdjustmentRequest.count({
      where: {
        employeeId,
        companyId: user.companyId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: { in: ['PENDENTE', 'EM_ANALISE', 'AGUARDANDO_INFORMACOES'] },
      },
    });

    // Buscar férias programadas, em gozo ou concluídas no período (Fase 4)
    const monthVacations = await prisma.vacationRequest.findMany({
      where: {
        employeeId,
        companyId: user.companyId,
        status: { in: ['APROVADA', 'PROGRAMADA', 'EM_GOZO', 'CONCLUIDA'] },
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
    });

    // Buscar afastamentos e licenças ativas no período (Fase 4)
    const monthLeaves = await prisma.employeeLeave.findMany({
      where: {
        employeeId,
        companyId: user.companyId,
        status: { in: ['ATIVO', 'CONCLUIDO'] },
        startDate: { lte: endOfMonth },
        OR: [
          { endDate: null },
          { endDate: { gte: startOfMonth } },
        ],
      },
    });

    // Buscar atestados homologados no período (Fase 4)
    const monthCertificates = await prisma.medicalCertificate.findMany({
      where: {
        employeeId,
        companyId: user.companyId,
        status: 'APROVADO',
        startDate: { lte: endOfMonth },
      },
    });

    // Parametrização de Feriados Nacionais Oficiais
    const HOLIDAYS_MAP: Record<string, string> = {
      '01-01': 'Confraternização Universal',
      '04-21': 'Tiradentes',
      '05-01': 'Dia do Trabalho',
      '09-07': 'Independência do Brasil',
      '10-12': 'Nossa Senhora Aparecida',
      '11-02': 'Finados',
      '11-15': 'Proclamação da República',
      '11-20': 'Dia da Consciência Negra',
      '12-25': 'Natal',
    };

    // Jornada contratual parametrizada
    const schedule = employee.workSchedule;
    const scheduleType = schedule?.type || 'FIXA';
    const standardDailyHours = schedule?.dailyHours !== undefined ? schedule.dailyHours : 8.8;
    const toleranceMinutes = schedule?.toleranceMinutes !== undefined ? schedule.toleranceMinutes : 10;
    const isNightShift = Boolean(schedule?.nightShift);

    let workDaysArray: string[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    if (schedule?.daysOfWeek) {
      workDaysArray = schedule.daysOfWeek.split(',').map((d) => d.trim().toUpperCase());
    } else if (scheduleType === 'ESCALA_6X1') {
      workDaysArray = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    } else if (scheduleType === 'ESCALA_5X2') {
      workDaysArray = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    }

    const daysList: TimesheetDay[] = [];
    let totalExpectedHours = 0;
    let totalWorkedMinutes = 0;
    let totalDelayMinutes = 0;
    let totalEarlyExitMinutes = 0;
    let totalExtraMinutes = 0;
    let totalPotentialOvertimeMinutes = 0;
    let totalTimeBankMinutes = 0;
    let totalPayableOvertimeMinutes = 0;
    let incompleteDaysCount = 0;

    const dayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayNamesPt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Referência de alternância para escala 12x36
    const refDate = schedule?.validFrom ? new Date(schedule.validFrom) : new Date(employee.admissionDate);

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const currentDayDate = new Date(year, month, dayNum);
      const dayOfWeekIdx = currentDayDate.getDay();
      const dayCode = dayCodes[dayOfWeekIdx];
      const dayOfWeekName = dayNamesPt[dayOfWeekIdx];
      const monthDayKey = `${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dateStr = `${year}-${monthDayKey}`;

      // 1. Verificação de Feriado
      const isHoliday = Boolean(HOLIDAYS_MAP[monthDayKey]);
      const holidayName = HOLIDAYS_MAP[monthDayKey] || undefined;

      // 2. Determinação de dia útil segundo a escala
      let isWorkday = false;
      let expectedDailyHours = 0;

      if (scheduleType === 'ESCALA_12X36') {
        // Escala 12x36: trabalha 1 dia sim, 1 dia não a partir da data de referência
        const refYear = refDate.getUTCFullYear();
        const refMonth = refDate.getUTCMonth();
        const refDay = refDate.getUTCDate();
        const diffDays = Math.floor(
          (Date.UTC(year, month, dayNum) - Date.UTC(refYear, refMonth, refDay)) /
            (1000 * 60 * 60 * 24)
        );
        isWorkday = Math.abs(diffDays) % 2 === 0;
        expectedDailyHours = isWorkday ? 12.0 : 0;
      } else {
        // Escala normal, 5x2, 6x1 ou Flexível
        isWorkday = workDaysArray.includes(dayCode);
        if (isHoliday) {
          isWorkday = false; // Em feriados, jornada contratual é dispensada por padrão
        }
        expectedDailyHours = isWorkday ? standardDailyHours : 0;
      }

      totalExpectedHours += expectedDailyHours;

      // 3. Filtrar marcações pertencentes a este dia (originais e tratadas)
      const dayPunches = timeEntries.filter((entry) => {
        const eDate = new Date(entry.timestamp);
        return (
          eDate.getFullYear() === year &&
          eDate.getMonth() === month &&
          eDate.getDate() === dayNum
        );
      });

      // Separar em originais e tratadas
      const originalPunches = dayPunches
        .filter((p) => p.originalRecord)
        .map((p) => ({
          id: p.id,
          time: new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          type: p.type,
          timestamp: p.timestamp.toISOString(),
          originalRecord: true,
          isTreated: false,
        }));

      const treatedPunches = dayPunches.map((p) => ({
        id: p.id,
        time: new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        type: p.type,
        timestamp: p.timestamp.toISOString(),
        originalRecord: p.originalRecord,
        isTreated: p.isTreated,
      }));

      // 4. Ordenar marcações cronologicamente (garante consistência mesmo se enviadas fora de ordem)
      const sortedEntries = [...dayPunches].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let dayWorkedMinutes = 0;
      let breakDurationMinutes = 0;
      let dayDelayMinutes = 0;
      let dayEarlyExitMinutes = 0;
      let dayExtraMinutes = 0;
      let dayPotentialOvertimeMinutes = 0;
      let dayTimeBankMinutes = 0;
      let dayPayableOvertimeMinutes = 0;
      let dayBalanceMinutes = 0;
      const occurrences: string[] = [];

      // Checagem de Férias e Afastamentos Ativos no dia (Fase 4)
      const activeVacation = monthVacations.find((v) => {
        const vStartStr = new Date(v.startDate).toISOString().slice(0, 10);
        const vEndStr = new Date(v.endDate).toISOString().slice(0, 10);
        return dateStr >= vStartStr && dateStr <= vEndStr;
      });

      const activeLeave = monthLeaves.find((l) => {
        const lStartStr = new Date(l.startDate).toISOString().slice(0, 10);
        const lEndStr = l.endDate ? new Date(l.endDate).toISOString().slice(0, 10) : '9999-12-31';
        return dateStr >= lStartStr && dateStr <= lEndStr;
      });

      const activeCert = monthCertificates.find((c) => {
        const cStartStr = new Date(c.startDate).toISOString().slice(0, 10);
        const cEnd = new Date(c.startDate);
        cEnd.setUTCDate(cEnd.getUTCDate() + c.daysOff - 1);
        const cEndStr = cEnd.toISOString().slice(0, 10);
        return dateStr >= cStartStr && dateStr <= cEndStr;
      });

      const isAuthorizedAbsence = Boolean(activeVacation || activeLeave || activeCert);

      if (activeVacation) {
        occurrences.push('Férias Remuneradas (CLT)');
      } else if (activeLeave) {
        occurrences.push(`Afastamento: ${activeLeave.type.replace(/_/g, ' ')}`);
      } else if (activeCert) {
        occurrences.push('Atestado Médico Homologado');
      }

      if (isHoliday) {
        occurrences.push(`Feriado: ${holidayName}`);
      }

      const isIncomplete = sortedEntries.length % 2 !== 0;
      if (isIncomplete) {
        incompleteDaysCount++;
        occurrences.push('Marcação Incompleta / Ímpar');
      }

      // 5. Cálculo dos períodos trabalhados em pares (0-1, 2-3, 4-5...)
      for (let i = 0; i < sortedEntries.length - 1; i += 2) {
        const startMs = new Date(sortedEntries[i].timestamp).getTime();
        const endMs = new Date(sortedEntries[i + 1].timestamp).getTime();
        const diffMs = endMs - startMs;
        if (diffMs > 0) {
          dayWorkedMinutes += Math.floor(diffMs / (1000 * 60));
        }
      }

      // 6. Tratamento de jornada noturna atravessando a meia-noite
      // Se a jornada é noturna ou a última batida é de entrada após as 18:00 sem saída no mesmo dia
      if (isNightShift && sortedEntries.length % 2 === 1) {
        const lastPunch = sortedEntries[sortedEntries.length - 1];
        const lastPunchHour = new Date(lastPunch.timestamp).getHours();
        if (lastPunchHour >= 18) {
          // Procurar saída na manhã do dia seguinte (antes das 12:00)
          const nextDayPunches = timeEntries.filter((entry) => {
            const eDate = new Date(entry.timestamp);
            return (
              eDate.getFullYear() === year &&
              eDate.getMonth() === month &&
              eDate.getDate() === dayNum + 1 &&
              eDate.getHours() < 12
            );
          }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          if (nextDayPunches.length > 0) {
            const morningExit = nextDayPunches[0];
            const nightDiffMs = new Date(morningExit.timestamp).getTime() - new Date(lastPunch.timestamp).getTime();
            if (nightDiffMs > 0) {
              const nightMinutes = Math.floor(nightDiffMs / (1000 * 60));
              dayWorkedMinutes += nightMinutes;
              occurrences.push(`Jornada Noturna / Meia-noite (${this.formatMinutes(nightMinutes)})`);
            }
          }
        }
      }

      // 7. Cálculo de múltiplos intervalos realizados (entre saída[i] e entrada[i+1])
      if (sortedEntries.length >= 4) {
        for (let i = 1; i < sortedEntries.length - 1; i += 2) {
          const breakStart = new Date(sortedEntries[i].timestamp).getTime();
          const breakEnd = new Date(sortedEntries[i + 1].timestamp).getTime();
          const breakDiff = breakEnd - breakStart;
          if (breakDiff > 0) {
            breakDurationMinutes += Math.floor(breakDiff / (1000 * 60));
          }
        }
      }

      // Alerta de intervalo mínimo intrajornada (CLT Art. 71)
      if (isWorkday && expectedDailyHours > 6 && breakDurationMinutes > 0 && breakDurationMinutes < 60) {
        occurrences.push(`Intervalo inferior a 1h (${breakDurationMinutes} min)`);
      }

      // 8. Verificação de atrasos pontuais e saídas antecipadas em jornadas fixas
      if (isWorkday && scheduleType === 'FIXA' && schedule?.expectedEntry && sortedEntries.length >= 1) {
        const firstPunch = sortedEntries[0];
        const firstPunchTime = new Date(firstPunch.timestamp);
        const [expEntryH, expEntryM] = schedule.expectedEntry.split(':').map(Number);
        const expEntryMinutes = expEntryH * 60 + expEntryM;
        const punchMinutes = firstPunchTime.getHours() * 60 + firstPunchTime.getMinutes();

        const entryDelayMin = punchMinutes - expEntryMinutes;
        if (entryDelayMin > toleranceMinutes) {
          dayDelayMinutes = entryDelayMin;
          occurrences.push(`Atraso na entrada (+${this.formatMinutes(entryDelayMin)})`);
        }
      }

      if (isWorkday && scheduleType === 'FIXA' && schedule?.expectedExit && sortedEntries.length >= 2) {
        const lastPunch = sortedEntries[sortedEntries.length - 1];
        const lastPunchTime = new Date(lastPunch.timestamp);
        const [expExitH, expExitM] = schedule.expectedExit.split(':').map(Number);
        const expExitMinutes = expExitH * 60 + expExitM;
        const punchMinutes = lastPunchTime.getHours() * 60 + lastPunchTime.getMinutes();

        const exitEarlyMin = expExitMinutes - punchMinutes;
        if (exitEarlyMin > toleranceMinutes) {
          dayEarlyExitMinutes = exitEarlyMin;
          occurrences.push(`Saída antecipada (-${this.formatMinutes(exitEarlyMin)})`);
        }
      }

      // 9. Apuração de Saldos, Tolerâncias (Art. 58 § 1º CLT) e Separação de Horas
      const expectedMinutes = Math.round(expectedDailyHours * 60);
      const isPastOrToday = currentDayDate <= today;

      if (isPastOrToday) {
        if (sortedEntries.length === 0 && isWorkday) {
          if (isAuthorizedAbsence) {
            // Ausência justificada/planejada: não classifica como falta e não debita horas
            dayDelayMinutes = 0;
            dayBalanceMinutes = 0;
            dayTimeBankMinutes = 0;
          } else {
            occurrences.push('Falta Integral');
            dayDelayMinutes = expectedMinutes;
            dayBalanceMinutes = -expectedMinutes;
          }
        } else if (sortedEntries.length > 0) {
          if (isAuthorizedAbsence) {
            occurrences.push('Atenção: Marcação de ponto registrada durante período de férias/afastamento');
          }
          const diff = dayWorkedMinutes - expectedMinutes;

          // Aplicação estrita da tolerância CLT (Art. 58 § 1º: limite de até 10 minutos diários)
          if (Math.abs(diff) <= toleranceMinutes) {
            dayBalanceMinutes = 0; // Dentro da tolerância: dia cumprido integralmente
          } else if (diff < -toleranceMinutes) {
            dayBalanceMinutes = diff;
            dayDelayMinutes = Math.abs(diff);
            occurrences.push(`Atraso / Saída Antecipada (-${this.formatMinutes(Math.abs(diff))})`);
          } else if (diff > toleranceMinutes) {
            dayBalanceMinutes = diff;
            dayExtraMinutes = diff;
            dayPotentialOvertimeMinutes = diff;

            // Separação: trabalho em DSR ou feriado vai para pagamento direto em folha (100%)
            if (!isWorkday || isHoliday) {
              dayPayableOvertimeMinutes = diff;
              occurrences.push(`Horas Extras em Feriado/DSR (+${this.formatMinutes(diff)})`);
            } else {
              // Horas em dias normais destinadas ao Banco de Horas
              dayTimeBankMinutes = diff;
              occurrences.push(`Horas Excedentes (+${this.formatMinutes(diff)})`);
            }
          }
        }
      }

      totalWorkedMinutes += dayWorkedMinutes;
      totalDelayMinutes += dayDelayMinutes;
      totalEarlyExitMinutes += dayEarlyExitMinutes;
      totalExtraMinutes += dayExtraMinutes;
      totalPotentialOvertimeMinutes += dayPotentialOvertimeMinutes;
      totalTimeBankMinutes += dayTimeBankMinutes;
      totalPayableOvertimeMinutes += dayPayableOvertimeMinutes;

      daysList.push({
        date: dateStr,
        dayOfWeek: dayOfWeekName,
        isWorkday,
        isHoliday,
        holidayName,
        expectedSchedule: isWorkday && schedule
          ? {
              entry: schedule.expectedEntry,
              exit: schedule.expectedExit,
              breakTime: schedule.expectedBreak,
              dailyHours: expectedDailyHours,
            }
          : null,
        originalPunches,
        treatedPunches,
        workedHours: Math.round((dayWorkedMinutes / 60) * 100) / 100,
        workedHoursFormatted: this.formatMinutes(dayWorkedMinutes),
        expectedHours: expectedDailyHours,
        expectedHoursFormatted: this.formatMinutes(expectedMinutes),
        breakDuration: Math.round((breakDurationMinutes / 60) * 100) / 100,
        breakDurationFormatted: this.formatMinutes(breakDurationMinutes),
        balanceHours: Math.round((dayBalanceMinutes / 60) * 100) / 100,
        balanceHoursFormatted:
          dayBalanceMinutes >= 0
            ? `+${this.formatMinutes(dayBalanceMinutes)}`
            : `-${this.formatMinutes(Math.abs(dayBalanceMinutes))}`,
        delayMinutes: dayDelayMinutes,
        earlyExitMinutes: dayEarlyExitMinutes,
        extraMinutes: dayExtraMinutes,
        potentialOvertimeMinutes: dayPotentialOvertimeMinutes,
        timeBankMinutes: dayTimeBankMinutes,
        payableOvertimeMinutes: dayPayableOvertimeMinutes,
        isIncomplete,
        occurrences,
      });
    }

    const netBalanceHours = Math.round(((totalWorkedMinutes - totalExpectedHours * 60) / 60) * 100) / 100;
    const potentialOvertimeHours = Math.round((totalPotentialOvertimeMinutes / 60) * 100) / 100;
    const timeBankHours = Math.round((totalTimeBankMinutes / 60) * 100) / 100;
    const payrollPayableHours = Math.round((totalPayableOvertimeMinutes / 60) * 100) / 100;

    return {
      competence,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        cpf: employee.cpf,
        registrationNumber: employee.registrationNumber,
        admissionDate: employee.admissionDate.toISOString().split('T')[0],
        department: employee.department ? { id: employee.department.id, name: employee.department.name, companyId: employee.companyId, createdAt: '' } : null,
        position: employee.position ? { id: employee.position.id, title: employee.position.title, companyId: employee.companyId, createdAt: '' } : null,
        workSchedule: employee.workSchedule ? {
          id: employee.workSchedule.id,
          name: employee.workSchedule.name,
          type: employee.workSchedule.type,
          weeklyHours: employee.workSchedule.weeklyHours,
          dailyHours: employee.workSchedule.dailyHours,
          expectedEntry: employee.workSchedule.expectedEntry,
          expectedExit: employee.workSchedule.expectedExit,
          expectedBreak: employee.workSchedule.expectedBreak,
          daysOfWeek: employee.workSchedule.daysOfWeek,
          toleranceMinutes: employee.workSchedule.toleranceMinutes,
          nightShift: employee.workSchedule.nightShift,
          breakFlexible: employee.workSchedule.breakFlexible,
          active: employee.workSchedule.active,
          companyId: employee.companyId,
          createdAt: '',
        } : null,
      },
      totalExpectedHours: Math.round(totalExpectedHours * 100) / 100,
      totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
      totalDelayMinutes,
      totalEarlyExitMinutes,
      totalExtraMinutes,
      potentialOvertimeHours,
      timeBankHours,
      payrollPayableHours,
      netBalanceHours,
      days: daysList,
      incompleteDaysCount,
      pendingAdjustmentsCount,
    };
  }

  /**
   * Converte minutos em formato legível HH:MM
   */
  private formatMinutes(totalMinutes: number): string {
    const absMinutes = Math.abs(Math.round(totalMinutes));
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}

export const timesheetService = new TimesheetService();
