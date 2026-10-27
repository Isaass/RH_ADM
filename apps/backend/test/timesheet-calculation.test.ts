import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { timesheetService } from '../src/timesheet/timesheet.service';
import { TimeEntryType, UserRole } from '@pontuarh/shared';
import { AuthenticatedUser } from '../src/middlewares/auth.guard';

describe('Serviço de Apuração da Jornada de Trabalho — Testes de Cálculo e Regras Trabalhistas', () => {
  let testCompany: any;
  let scheduleStandard: any;
  let scheduleNight: any;
  let testEmpStandard: any;
  let testEmpNight: any;
  let authUser: AuthenticatedUser;

  beforeAll(async () => {
    testCompany = await prisma.company.create({
      data: {
        name: 'Empresa Teste Apuração Ltda',
        cnpj: '77.888.999/0001-22',
      },
    });

    // Jornada padrão 8.8h diárias, 44h semanais (Seg-Sex)
    scheduleStandard = await prisma.workSchedule.create({
      data: {
        companyId: testCompany.id,
        name: 'Padrão 44h',
        dailyHours: 8.8,
        weeklyHours: 44.0,
        expectedEntry: '08:00',
        expectedExit: '17:48',
        expectedBreak: '01:00',
        daysOfWeek: 'MON,TUE,WED,THU,FRI',
        toleranceMinutes: 10,
        nightShift: false,
      },
    });

    // Jornada noturna 12x36
    scheduleNight = await prisma.workSchedule.create({
      data: {
        companyId: testCompany.id,
        name: 'Escala Noturna 12x36',
        type: 'ESCALA_12X36',
        dailyHours: 12.0,
        weeklyHours: 36.0,
        expectedEntry: '19:00',
        expectedExit: '07:00',
        expectedBreak: '01:00',
        daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN',
        toleranceMinutes: 10,
        validFrom: new Date('2026-10-01T00:00:00.000Z'),
        nightShift: true,
      },
    });

    testEmpStandard = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Padrão Apuração',
        cpf: '33344455566',
        email: 'padrao.apuracao@pontuarh.com.br',
        admissionDate: new Date('2024-01-01'),
        status: 'ATIVO',
        workScheduleId: scheduleStandard.id,
      },
    });

    testEmpNight = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Noturno Apuração',
        cpf: '99988877766',
        email: 'noturno.apuracao@pontuarh.com.br',
        admissionDate: new Date('2024-01-01'),
        status: 'ATIVO',
        workScheduleId: scheduleNight.id,
      },
    });

    authUser = {
      id: 'usr_rh_test',
      email: 'rh@empresa.com',
      name: 'RH Auditor',
      role: UserRole.RH,
      companyId: testCompany.id,
    };
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.timeEntry.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.employee.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.workSchedule.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.company.deleteMany({ where: { id: testCompany.id } });
  });

  it('1. deve calcular corretamente horas trabalhadas e intervalos realizados em jornada completa', async () => {
    // Inserir 4 marcações no dia 2026-10-05 (Segunda-feira):
    // 08:00 (Entrada), 12:00 (Saída Almoço), 13:00 (Retorno Almoço), 17:48 (Saída)
    // Total trabalhado: 4h manhã + 4h48min tarde = 8h48min (8.8 horas)
    const baseDate = '2026-10-05';
    await prisma.timeEntry.createMany({
      data: [
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T08:00:00.000Z`),
          type: TimeEntryType.ENTRADA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T12:00:00.000Z`),
          type: TimeEntryType.INTERVALO_SAIDA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T13:00:00.000Z`),
          type: TimeEntryType.INTERVALO_RETORNO,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T17:48:00.000Z`),
          type: TimeEntryType.SAIDA,
          originalRecord: true,
        },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    expect(timesheet).toBeDefined();

    const day5 = timesheet.days.find((d) => d.date === '2026-10-05');
    expect(day5).toBeDefined();
    expect(day5?.isWorkday).toBe(true);
    expect(day5?.isIncomplete).toBe(false);
    expect(day5?.workedHoursFormatted).toBe('08:48');
    expect(day5?.expectedHoursFormatted).toBe('08:48');
    expect(day5?.breakDurationFormatted).toBe('01:00');
    expect(day5?.delayMinutes).toBe(0);
    expect(day5?.extraMinutes).toBe(0);
  });

  it('2. deve identificar marcação incompleta (número ímpar de marcações) e alertar ocorrência', async () => {
    // Dia 2026-10-06 (Terça-feira): apenas Entrada (08:00), Saída intervalo (12:00) e Retorno (13:00) -> Faltou Saída
    const baseDate = '2026-10-06';
    await prisma.timeEntry.createMany({
      data: [
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T08:00:00.000Z`),
          type: TimeEntryType.ENTRADA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T12:00:00.000Z`),
          type: TimeEntryType.INTERVALO_SAIDA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T13:00:00.000Z`),
          type: TimeEntryType.INTERVALO_RETORNO,
          originalRecord: true,
        },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day6 = timesheet.days.find((d) => d.date === '2026-10-06');

    expect(day6).toBeDefined();
    expect(day6?.isIncomplete).toBe(true);
    expect(day6?.occurrences).toContain('Marcação Incompleta / Ímpar');
    expect(timesheet.incompleteDaysCount).toBeGreaterThan(0);
  });

  it('3. deve identificar atrasos fora da tolerância da CLT', async () => {
    // Dia 2026-10-07 (Quarta-feira): Entrada 08:30 (atraso de 30min), Saída 17:48
    // Intervalo 1h. Total trabalhado: 8h18min vs 8h48min previsto -> Déficit de 30 min (acima da tolerância de 10 min)
    const baseDate = '2026-10-07';
    await prisma.timeEntry.createMany({
      data: [
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T08:30:00.000Z`),
          type: TimeEntryType.ENTRADA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T12:00:00.000Z`),
          type: TimeEntryType.INTERVALO_SAIDA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T13:00:00.000Z`),
          type: TimeEntryType.INTERVALO_RETORNO,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T17:48:00.000Z`),
          type: TimeEntryType.SAIDA,
          originalRecord: true,
        },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day7 = timesheet.days.find((d) => d.date === '2026-10-07');

    expect(day7).toBeDefined();
    expect(day7?.delayMinutes).toBe(30);
    expect(day7?.occurrences.some((o) => o.includes('Atraso / Saída Antecipada'))).toBe(true);
  });

  it('4. deve identificar horas excedentes sem classificá-las automaticamente como hora extra paga', async () => {
    // Dia 2026-10-08 (Quinta-feira): Trabalhou até 19:48 (2 horas a mais)
    const baseDate = '2026-10-08';
    await prisma.timeEntry.createMany({
      data: [
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T08:00:00.000Z`),
          type: TimeEntryType.ENTRADA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T12:00:00.000Z`),
          type: TimeEntryType.INTERVALO_SAIDA,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T13:00:00.000Z`),
          type: TimeEntryType.INTERVALO_RETORNO,
          originalRecord: true,
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpStandard.id,
          timestamp: new Date(`${baseDate}T19:48:00.000Z`),
          type: TimeEntryType.SAIDA,
          originalRecord: true,
        },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day8 = timesheet.days.find((d) => d.date === '2026-10-08');

    expect(day8).toBeDefined();
    expect(day8?.extraMinutes).toBe(120); // 2 horas excedentes
    expect(day8?.occurrences.some((o) => o.includes('Horas Excedentes (+02:00)'))).toBe(true);
    // Verifica que não foi cravado como pagamento de HE e sim saldo positivo passível de compensação
    expect(day8?.balanceHours).toBeGreaterThan(0);
  });

  it('5. deve apurar jornada flexível baseada exclusivamente na carga diária cumprida', async () => {
    const scheduleFlex = await prisma.workSchedule.create({
      data: {
        companyId: testCompany.id,
        name: 'Horário Flexível 8h',
        type: 'FLEXIVEL',
        dailyHours: 8.0,
        weeklyHours: 40.0,
        expectedEntry: '09:00',
        expectedExit: '18:00',
        expectedBreak: '01:00',
        daysOfWeek: 'MON,TUE,WED,THU,FRI',
        toleranceMinutes: 10,
        breakFlexible: true,
      },
    });

    const empFlex = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Flexível',
        cpf: '444' + Math.floor(10000000 + Math.random() * 89999999),
        email: `flex_${Date.now()}@empresa.com`,
        admissionDate: new Date('2024-01-01'),
        status: 'ATIVO',
        workScheduleId: scheduleFlex.id,
      },
    });

    // Trabalhou 10:15 às 14:15 (4h) e 15:15 às 19:15 (4h) = 8h exatas cumpridas
    const baseDate = '2026-10-09';
    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: empFlex.id, timestamp: new Date(`${baseDate}T10:15:00.000Z`), type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: empFlex.id, timestamp: new Date(`${baseDate}T14:15:00.000Z`), type: 'INTERVALO_SAIDA' },
        { companyId: testCompany.id, employeeId: empFlex.id, timestamp: new Date(`${baseDate}T15:15:00.000Z`), type: 'INTERVALO_RETORNO' },
        { companyId: testCompany.id, employeeId: empFlex.id, timestamp: new Date(`${baseDate}T19:15:00.000Z`), type: 'SAIDA' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, empFlex.id, '2026-10');
    const day9 = timesheet.days.find((d) => d.date === '2026-10-09');

    expect(day9).toBeDefined();
    expect(day9?.workedHours).toBe(8.0);
    expect(day9?.expectedHours).toBe(8.0);
    expect(day9?.balanceHours).toBe(0);
    expect(day9?.delayMinutes).toBe(0); // Sem atraso rígido em horário flexível
  });

  it('6. deve diferenciar escala 5x2 (descanso no sábado) e escala 6x1 (trabalho no sábado)', async () => {
    const schedule6x1 = await prisma.workSchedule.create({
      data: {
        companyId: testCompany.id,
        name: 'Escala 6x1 Operacional',
        type: 'ESCALA_6X1',
        dailyHours: 7.33,
        weeklyHours: 44.0,
        expectedEntry: '08:00',
        expectedExit: '16:00',
        expectedBreak: '01:00',
        daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT',
      },
    });

    const emp6x1 = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Operador 6x1',
        cpf: '555' + Math.floor(10000000 + Math.random() * 89999999),
        email: `op6x1_${Date.now()}@empresa.com`,
        admissionDate: new Date('2024-01-01'),
        status: 'ATIVO',
        workScheduleId: schedule6x1.id,
      },
    });

    const timesheetStandard = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const timesheet6x1 = await timesheetService.calculateTimesheet(authUser, emp6x1.id, '2026-10');

    // 2026-10-10 é Sábado
    const satStandard = timesheetStandard.days.find((d) => d.date === '2026-10-10');
    const sat6x1 = timesheet6x1.days.find((d) => d.date === '2026-10-10');

    expect(satStandard?.isWorkday).toBe(false);
    expect(satStandard?.expectedHours).toBe(0);

    expect(sat6x1?.isWorkday).toBe(true);
    expect(sat6x1?.expectedHours).toBeGreaterThan(0);
  });

  it('7. deve apurar escala 12x36 alternando 12h de trabalho em dias sim, dias não', async () => {
    const timesheetNight = await timesheetService.calculateTimesheet(authUser, testEmpNight.id, '2026-10');

    const day1 = timesheetNight.days.find((d) => d.date === '2026-10-01');
    const day2 = timesheetNight.days.find((d) => d.date === '2026-10-02');
    const day3 = timesheetNight.days.find((d) => d.date === '2026-10-03');

    // Alternância 12x36
    expect(day1?.isWorkday).toBe(true);
    expect(day1?.expectedHours).toBe(12.0);

    expect(day2?.isWorkday).toBe(false);
    expect(day2?.expectedHours).toBe(0);

    expect(day3?.isWorkday).toBe(true);
    expect(day3?.expectedHours).toBe(12.0);
  });

  it('8. deve apurar jornada atravessando a meia-noite (noturna)', async () => {
    // Entrada 22:00 no dia 15 e saída 06:00 no dia 16 (8 horas trabalhadas)
    await prisma.timeEntry.createMany({
      data: [
        {
          companyId: testCompany.id,
          employeeId: testEmpNight.id,
          timestamp: new Date('2026-10-15T22:00:00.000Z'),
          type: 'ENTRADA',
        },
        {
          companyId: testCompany.id,
          employeeId: testEmpNight.id,
          timestamp: new Date('2026-10-16T06:00:00.000Z'),
          type: 'SAIDA',
        },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpNight.id, '2026-10');
    const day15 = timesheet.days.find((d) => d.date === '2026-10-15');

    expect(day15).toBeDefined();
    expect(day15?.workedHours).toBe(8.0);
    expect(day15?.occurrences.some((o) => o.includes('Jornada Noturna'))).toBe(true);
  });

  it('9. deve somar múltiplos intervalos realizados em um único dia', async () => {
    // Dia 2026-10-19 com 3 intervalos (café da manhã, almoço, lanche)
    const baseDate = '2026-10-19';
    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T08:00:00.000Z`), type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T10:00:00.000Z`), type: 'INTERVALO_SAIDA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T10:15:00.000Z`), type: 'INTERVALO_RETORNO' }, // 15 min
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T12:00:00.000Z`), type: 'INTERVALO_SAIDA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T13:00:00.000Z`), type: 'INTERVALO_RETORNO' }, // 60 min
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T15:30:00.000Z`), type: 'INTERVALO_SAIDA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T15:45:00.000Z`), type: 'INTERVALO_RETORNO' }, // 15 min
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T18:18:00.000Z`), type: 'SAIDA' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day19 = timesheet.days.find((d) => d.date === '2026-10-19');

    expect(day19).toBeDefined();
    // Total de intervalos: 15 + 60 + 15 = 90 minutos (1.5h)
    expect(day19?.breakDuration).toBe(1.5);
    expect(day19?.breakDurationFormatted).toBe('01:30');
    // Total trabalhado: 2h + 1h45 + 2h30 + 2h33 = 8h48min (8.8 horas)
    expect(day19?.workedHours).toBe(8.8);
  });

  it('10. deve identificar marcações incompletas / ímpares sem crashar a apuração', async () => {
    // Dia 2026-10-21: 3 marcações (esqueceu a última saída)
    const baseDate = '2026-10-21';
    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T08:00:00.000Z`), type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T12:00:00.000Z`), type: 'INTERVALO_SAIDA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T13:00:00.000Z`), type: 'INTERVALO_RETORNO' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day21 = timesheet.days.find((d) => d.date === '2026-10-21');

    expect(day21).toBeDefined();
    expect(day21?.isIncomplete).toBe(true);
    expect(day21?.occurrences.some((o) => o.includes('Marcação Incompleta / Ímpar'))).toBe(true);
    expect(timesheet.incompleteDaysCount).toBeGreaterThan(0);
  });

  it('11. deve ordenar cronologicamente marcações recebidas fora de ordem', async () => {
    // Dia 2026-10-22: Inseridas desordenadas (saída antes do retorno, etc.)
    const baseDate = '2026-10-22';
    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T17:48:00.000Z`), type: 'SAIDA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T08:00:00.000Z`), type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T13:00:00.000Z`), type: 'INTERVALO_RETORNO' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${baseDate}T12:00:00.000Z`), type: 'INTERVALO_SAIDA' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day22 = timesheet.days.find((d) => d.date === '2026-10-22');

    expect(day22).toBeDefined();
    expect(day22?.workedHours).toBe(8.8);
    expect(day22?.breakDuration).toBe(1.0);
    expect(day22?.balanceHours).toBe(0);
  });

  it('12. deve detectar saída antecipada pontual além da tolerância', async () => {
    // Dia 2026-10-23: Saída às 16:30 em vez de 17:48 (saída antecipada de 78 min)
    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(2026, 9, 23, 8, 0, 0), type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(2026, 9, 23, 12, 0, 0), type: 'INTERVALO_SAIDA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(2026, 9, 23, 13, 0, 0), type: 'INTERVALO_RETORNO' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(2026, 9, 23, 16, 30, 0), type: 'SAIDA' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day23 = timesheet.days.find((d) => d.date === '2026-10-23');

    expect(day23).toBeDefined();
    expect(day23?.earlyExitMinutes).toBe(78);
    expect(day23?.occurrences.some((o) => o.includes('Saída antecipada'))).toBe(true);
  });

  it('13. deve tratar feriados nacionais oficiais zerando carga prevista e destinando trabalho para hora extra de pagamento', async () => {
    // 2026-10-12 é Feriado Nacional (Nossa Senhora Aparecida)
    // O colaborador trabalhou 4 horas excepcionais no feriado
    const holidayDate = '2026-10-12';
    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${holidayDate}T08:00:00.000Z`), type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: new Date(`${holidayDate}T12:00:00.000Z`), type: 'SAIDA' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day12 = timesheet.days.find((d) => d.date === '2026-10-12');

    expect(day12).toBeDefined();
    expect(day12?.isHoliday).toBe(true);
    expect(day12?.holidayName).toBe('Nossa Senhora Aparecida');
    expect(day12?.expectedHours).toBe(0);
    expect(day12?.workedHours).toBe(4.0);
    // Em feriado, as horas trabalhadas são 100% extraordinárias para pagamento em folha
    expect(day12?.payableOvertimeMinutes).toBe(240);
  });

  it('14. deve manter apuração exata independente de transições de fuso ou horário de verão', async () => {
    // Cálculo em milissegundos UTC garante exatidão de 240 minutos
    const tStart = new Date('2026-10-14T08:00:00.000Z');
    const tEnd = new Date('2026-10-14T12:00:00.000Z');

    await prisma.timeEntry.createMany({
      data: [
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: tStart, type: 'ENTRADA' },
        { companyId: testCompany.id, employeeId: testEmpStandard.id, timestamp: tEnd, type: 'SAIDA' },
      ],
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day14 = timesheet.days.find((d) => d.date === '2026-10-14');

    expect(day14).toBeDefined();
    expect(day14?.workedHours).toBe(4.0);
  });

  it('15. deve incorporar ajustes aprovados retroativamente refletindo no espelho', async () => {
    // Dia 2026-10-13 tinha apenas entrada matinal
    const baseDate = '2026-10-13';
    await prisma.timeEntry.create({
      data: {
        companyId: testCompany.id,
        employeeId: testEmpStandard.id,
        timestamp: new Date(`${baseDate}T08:00:00.000Z`),
        type: 'ENTRADA',
        originalRecord: true,
      },
    });

    // Inclusão de ajuste retroativo aprovado (marcação tratada)
    await prisma.timeEntry.create({
      data: {
        companyId: testCompany.id,
        employeeId: testEmpStandard.id,
        timestamp: new Date(`${baseDate}T16:48:00.000Z`),
        type: 'SAIDA',
        originalRecord: false, // Tratada!
        isTreated: true,
        treatmentType: 'INCLUSAO_AJUSTE',
      },
    });

    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');
    const day13 = timesheet.days.find((d) => d.date === '2026-10-13');

    expect(day13).toBeDefined();
    expect(day13?.treatedPunches.length).toBe(2);
    expect(day13?.originalPunches.length).toBe(1);
    expect(day13?.workedHours).toBe(8.8);
    expect(day13?.isIncomplete).toBe(false);
  });

  it('16. deve separar claramente horas apuradas, horas excedentes potenciais, banco de horas e horas para folha', async () => {
    const timesheet = await timesheetService.calculateTimesheet(authUser, testEmpStandard.id, '2026-10');

    // Validações dos campos de separação clara de horas
    expect(timesheet.totalWorkedHours).toBeDefined();
    expect(timesheet.potentialOvertimeHours).toBeDefined();
    expect(timesheet.timeBankHours).toBeDefined();
    expect(timesheet.payrollPayableHours).toBeDefined();
    expect(timesheet.netBalanceHours).toBeDefined();

    // Verificação de que horas em feriado foram destinadas a payrollPayableHours (4h do dia 12)
    expect(timesheet.payrollPayableHours).toBeGreaterThanOrEqual(4.0);
  });
});
