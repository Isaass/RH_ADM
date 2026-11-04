import { prisma } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import {
  UserRole,
  canManagePayroll,
  PayrollCompetenceStatus,
  PayrollItemType,
  PayrollItemCategory,
  CreatePayrollItemDTO,
} from '@pontuarh/shared';
import { timesheetService } from '../timesheet/timesheet.service';
import { vacationsCalculationService } from '../vacations/vacations-calculation.service';

export class PayrollService {
  /**
   * Valida permissão de acesso ao módulo financeiro (RBAC)
   */
  private checkPermission(user: AuthenticatedUser) {
    if (!user.companyId) {
      throw new Error('Usuário sem empresa vinculada.');
    }
    if (!canManagePayroll(user.role)) {
      throw new Error('Acesso negado: Você não possui autorização financeira para acessar a folha de pagamento.');
    }
  }

  /**
   * Arredonda valor para duas casas decimais evitando erros de ponto flutuante
   */
  private roundMoney(amount: number): number {
    return Math.round((Number(amount) || 0) * 100) / 100;
  }

  /**
   * Lista todas as competências cadastradas da empresa
   */
  async listCompetences(user: AuthenticatedUser) {
    this.checkPermission(user);

    const competences = await prisma.payrollCompetence.findMany({
      where: { companyId: user.companyId! },
      orderBy: { competence: 'desc' },
      include: {
        _count: {
          select: { summaries: true },
        },
      },
    });

    return competences;
  }

  /**
   * Obtém detalhes de uma competência com seus demonstrativos consolidados
   */
  async getCompetenceDetails(user: AuthenticatedUser, competence: string) {
    this.checkPermission(user);

    const period = await prisma.payrollCompetence.findUnique({
      where: {
        companyId_competence: {
          companyId: user.companyId!,
          competence,
        },
      },
      include: {
        summaries: {
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                cpf: true,
                registrationNumber: true,
                department: { select: { id: true, name: true } },
                position: { select: { id: true, title: true } },
              },
            },
            items: {
              orderBy: [{ type: 'asc' }, { code: 'asc' }],
            },
          },
          orderBy: {
            employee: { fullName: 'asc' },
          },
        },
      },
    });

    return period;
  }

  /**
   * Gera ou recalcula a prévia da folha de pagamento para uma competência aberta
   * Integra com Salário Base, Apuração de Horas Extras, Banco de Horas e Férias
   */
  async calculateOrRecalculateCompetence(user: AuthenticatedUser, competence: string) {
    this.checkPermission(user);

    // Validação de formato AAAA-MM
    if (!/^\d{4}-\d{2}$/.test(competence)) {
      throw new Error('Formato de competência inválido. Utilize o formato AAAA-MM (ex: 2026-10).');
    }

    const [yearStr, monthStr] = competence.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) {
      throw new Error('Mês inválido na competência. Deve estar entre 01 e 12.');
    }

    // Verificar se já existe a competência e se está fechada
    let compRecord = await prisma.payrollCompetence.findUnique({
      where: {
        companyId_competence: {
          companyId: user.companyId!,
          competence,
        },
      },
      include: {
        summaries: {
          include: { items: true },
        },
      },
    });

    if (compRecord && compRecord.status === PayrollCompetenceStatus.FECHADA) {
      throw new Error(`A competência ${competence} está FECHADA e não pode ser recalculada. Reabra a competência para alterações.`);
    }

    // Se não existir, cria a competência aberta
    if (!compRecord) {
      compRecord = await prisma.payrollCompetence.create({
        data: {
          companyId: user.companyId!,
          competence,
          status: PayrollCompetenceStatus.ABERTA,
        },
        include: {
          summaries: {
            include: { items: true },
          },
        },
      });
    }

    // Buscar todos os colaboradores da empresa (ativos ou admitidos até a competência)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const employees = await prisma.employee.findMany({
      where: {
        companyId: user.companyId!,
        admissionDate: { lte: endOfMonth },
        status: { in: ['ATIVO', 'FERIAS', 'AFASTADO'] },
      },
      include: {
        workSchedule: true,
        department: true,
        position: true,
      },
      orderBy: { fullName: 'asc' },
    });

    // Mapa de itens manuais existentes para preservar durante recálculo
    const existingManualItemsByEmployee = new Map<string, Array<{
      type: string;
      category: string;
      code: string;
      name: string;
      reference?: string | null;
      amount: number;
    }>>();

    if (compRecord.summaries) {
      for (const summary of compRecord.summaries) {
        const manuals = summary.items.filter((it) => it.isManual).map((it) => ({
          type: it.type,
          category: it.category,
          code: it.code,
          name: it.name,
          reference: it.reference,
          amount: it.amount,
        }));
        if (manuals.length > 0) {
          existingManualItemsByEmployee.set(summary.employeeId, manuals);
        }
      }
    }

    // Processamento de cada colaborador dentro de transação atômica
    await prisma.$transaction(async (tx) => {
      for (const emp of employees) {
        const baseSalary = this.roundMoney(emp.baseSalary || 0);

        // Divisor mensal padrão CLT com base nas horas semanais
        const weeklyHours = emp.workSchedule?.weeklyHours || 44.0;
        const monthlyDivisor = Math.round((weeklyHours / 6) * 30); // 44h -> 220, 40h -> 200, 36h -> 180
        const valorHora = monthlyDivisor > 0 ? this.roundMoney(baseSalary / monthlyDivisor) : 0;

        const itemsToCreate: Array<{
          type: string;
          category: string;
          code: string;
          name: string;
          reference?: string | null;
          amount: number;
          isManual: boolean;
        }> = [];

        // 1. Rubrica Base: Salário Contratual
        itemsToCreate.push({
          type: PayrollItemType.PROVENTO,
          category: PayrollItemCategory.SALARIO_BASE,
          code: '001',
          name: 'Salário Base Contratual',
          reference: '30 dias',
          amount: baseSalary,
          isManual: false,
        });

        // 2. Integração com Apuração de Ponto (Horas Extras 50%)
        let overtimeHours = 0;
        let overtimeAmount = 0;
        try {
          const timesheet = await timesheetService.calculateTimesheet(user, emp.id, competence);
          if (timesheet && timesheet.totalExtraMinutes > 0) {
            overtimeHours = this.roundMoney(timesheet.totalExtraMinutes / 60);
            const overtimeHourlyRate = this.roundMoney(valorHora * 1.5);
            overtimeAmount = this.roundMoney(overtimeHours * overtimeHourlyRate);

            if (overtimeAmount > 0) {
              itemsToCreate.push({
                type: PayrollItemType.PROVENTO,
                category: PayrollItemCategory.HORAS_EXTRAS,
                code: '101',
                name: 'Horas Extras 50% (Apuração Ponto)',
                reference: `${overtimeHours.toFixed(2)}h`,
                amount: overtimeAmount,
                isManual: false,
              });
            }
          }
        } catch (tsErr) {
          // Se não houver jornada cadastrada ou erro não crítico na apuração, prossegue com salário base
        }

        // 3. Integração com Banco de Horas (Liquidações / Transferências para Folha)
        let timeBankAmount = 0;
        const timeBankTxs = await tx.timeBankTransaction.findMany({
          where: {
            companyId: user.companyId!,
            employeeId: emp.id,
            competence,
            type: { in: ['TRANSFERENCIA_PAGAMENTO', 'LIQUIDACAO_FOLHA'] },
            status: 'CONSOLIDADO',
          },
        });

        if (timeBankTxs.length > 0) {
          const totalPaidMinutes = timeBankTxs.reduce((sum, t) => sum + t.minutes, 0);
          if (totalPaidMinutes > 0) {
            const paidHours = this.roundMoney(totalPaidMinutes / 60);
            const timeBankHourlyRate = this.roundMoney(valorHora * 1.5);
            timeBankAmount = this.roundMoney(paidHours * timeBankHourlyRate);

            itemsToCreate.push({
              type: PayrollItemType.PROVENTO,
              category: PayrollItemCategory.BANCO_HORAS_PAGO,
              code: '105',
              name: 'Banco de Horas Quitado em Folha',
              reference: `${paidHours.toFixed(2)}h`,
              amount: timeBankAmount,
              isManual: false,
            });
          }
        }

        // 4. Integração com Férias (Solicitações Aprovadas com início na competência)
        let vacationAmount = 0;
        const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const vacationRequests = await tx.vacationRequest.findMany({
          where: {
            companyId: user.companyId!,
            employeeId: emp.id,
            status: { in: ['APROVADA', 'PROGRAMADA', 'EM_GOZO', 'CONCLUIDA'] },
            startDate: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        for (const vacReq of vacationRequests) {
          const preview = vacationsCalculationService.calculateRemunerationPreview(
            baseSalary,
            vacReq.daysCount,
            vacReq.sellDays
          );

          if (preview.totalGrossPreview > 0) {
            vacationAmount = this.roundMoney(vacationAmount + preview.totalGrossPreview);

            itemsToCreate.push({
              type: PayrollItemType.PROVENTO,
              category: PayrollItemCategory.FERIAS,
              code: '201',
              name: `Férias Remuneradas (${vacReq.daysCount}d) + 1/3 Constitucional`,
              reference: `${vacReq.daysCount} dias`,
              amount: this.roundMoney(preview.vacationPay + preview.constitutionalThird),
              isManual: false,
            });

            if (vacReq.sellDays > 0) {
              itemsToCreate.push({
                type: PayrollItemType.PROVENTO,
                category: PayrollItemCategory.FERIAS,
                code: '202',
                name: `Abono Pecuniário (${vacReq.sellDays}d) + 1/3`,
                reference: `${vacReq.sellDays} dias`,
                amount: this.roundMoney(preview.abonoPay + preview.abonoThird),
                isManual: false,
              });
            }
          }
        }

        // 5. Restaurar lançamentos manuais preservados
        const preservedManuals = existingManualItemsByEmployee.get(emp.id) || [];
        for (const man of preservedManuals) {
          itemsToCreate.push({
            type: man.type,
            category: man.category,
            code: man.code,
            name: man.name,
            reference: man.reference,
            amount: this.roundMoney(man.amount),
            isManual: true,
          });
        }

        // Calcular totais do colaborador
        const totalEarnings = this.roundMoney(
          itemsToCreate
            .filter((it) => it.type === PayrollItemType.PROVENTO)
            .reduce((sum, it) => sum + it.amount, 0)
        );

        const totalDeductions = this.roundMoney(
          itemsToCreate
            .filter((it) => it.type === PayrollItemType.DESCONTO)
            .reduce((sum, it) => sum + it.amount, 0)
        );

        const netSalary = this.roundMoney(totalEarnings - totalDeductions);

        const otherEarnings = this.roundMoney(
          itemsToCreate
            .filter((it) => it.type === PayrollItemType.PROVENTO && it.isManual)
            .reduce((sum, it) => sum + it.amount, 0)
        );

        const otherDeductions = this.roundMoney(
          itemsToCreate
            .filter((it) => it.type === PayrollItemType.DESCONTO && it.isManual)
            .reduce((sum, it) => sum + it.amount, 0)
        );

        // Upsert do resumo do colaborador na competência
        const summary = await tx.payrollEmployeeSummary.upsert({
          where: {
            payrollCompetenceId_employeeId: {
              payrollCompetenceId: compRecord.id,
              employeeId: emp.id,
            },
          },
          create: {
            payrollCompetenceId: compRecord.id,
            companyId: user.companyId!,
            employeeId: emp.id,
            baseSalary,
            totalEarnings,
            totalDeductions,
            netSalary,
            overtimeHours,
            overtimeAmount,
            timeBankAmount,
            vacationAmount,
            otherEarnings,
            otherDeductions,
          },
          update: {
            baseSalary,
            totalEarnings,
            totalDeductions,
            netSalary,
            overtimeHours,
            overtimeAmount,
            timeBankAmount,
            vacationAmount,
            otherEarnings,
            otherDeductions,
          },
        });

        // Limpar itens anteriores do resumo e recriar
        await tx.payrollItem.deleteMany({
          where: { summaryId: summary.id },
        });

        await tx.payrollItem.createMany({
          data: itemsToCreate.map((it) => ({
            summaryId: summary.id,
            companyId: user.companyId!,
            employeeId: emp.id,
            type: it.type,
            category: it.category,
            code: it.code,
            name: it.name,
            reference: it.reference || null,
            amount: it.amount,
            isManual: it.isManual,
          })),
        });
      }

      // Recalcular totais consolidados da competência
      const allSummaries = await tx.payrollEmployeeSummary.findMany({
        where: { payrollCompetenceId: compRecord.id },
      });

      const totalGross = this.roundMoney(allSummaries.reduce((sum, s) => sum + s.totalEarnings, 0));
      const totalDeds = this.roundMoney(allSummaries.reduce((sum, s) => sum + s.totalDeductions, 0));
      const totalNet = this.roundMoney(totalGross - totalDeds);

      await tx.payrollCompetence.update({
        where: { id: compRecord.id },
        data: {
          totalEmployees: allSummaries.length,
          totalGross,
          totalDeductions: totalDeds,
          totalNet,
        },
      });

      // Registro de auditoria
      await tx.auditLog.create({
        data: {
          companyId: user.companyId!,
          userId: user.id,
          action: 'CALCULATE_PAYROLL',
          entity: 'PayrollCompetence',
          entityId: compRecord.id,
          details: `Cálculo da prévia da folha para a competência ${competence}: ${allSummaries.length} colaboradores, Proventos R$ ${totalGross.toFixed(2)}, Líquido R$ ${totalNet.toFixed(2)}.`,
        },
      });
    });

    return this.getCompetenceDetails(user, competence);
  }

  /**
   * Adiciona um lançamento manual (provento ou desconto) para um colaborador em competência aberta
   */
  async addManualItem(
    user: AuthenticatedUser,
    competence: string,
    data: CreatePayrollItemDTO
  ) {
    this.checkPermission(user);

    if (!data.name || !data.amount || data.amount <= 0) {
      throw new Error('Nome e valor positivo são obrigatórios para lançamentos manuais.');
    }

    const period = await prisma.payrollCompetence.findUnique({
      where: {
        companyId_competence: {
          companyId: user.companyId!,
          competence,
        },
      },
    });

    if (!period) {
      throw new Error('Competência não encontrada. Calcule a prévia antes de adicionar lançamentos.');
    }

    if (period.status === PayrollCompetenceStatus.FECHADA) {
      throw new Error('Não é possível adicionar lançamentos a uma competência fechada.');
    }

    const summary = await prisma.payrollEmployeeSummary.findUnique({
      where: {
        payrollCompetenceId_employeeId: {
          payrollCompetenceId: period.id,
          employeeId: data.employeeId,
        },
      },
    });

    if (!summary) {
      throw new Error('Demonstrativo do colaborador não encontrado nesta competência.');
    }

    const amount = this.roundMoney(data.amount);
    const itemType = data.type === PayrollItemType.DESCONTO ? PayrollItemType.DESCONTO : PayrollItemType.PROVENTO;
    const category = data.category || (itemType === PayrollItemType.PROVENTO ? PayrollItemCategory.ADICIONAL_MANUAL : PayrollItemCategory.DESCONTO_MANUAL);
    const code = data.code || (itemType === PayrollItemType.PROVENTO ? '301' : '401');

    return prisma.$transaction(async (tx) => {
      const createdItem = await tx.payrollItem.create({
        data: {
          summaryId: summary.id,
          companyId: user.companyId!,
          employeeId: data.employeeId,
          type: itemType,
          category,
          code,
          name: data.name.trim(),
          reference: data.reference || null,
          amount,
          isManual: true,
        },
      });

      // Recalcular totais do colaborador
      const allItems = await tx.payrollItem.findMany({
        where: { summaryId: summary.id },
      });

      const totalEarnings = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.PROVENTO).reduce((sum, it) => sum + it.amount, 0)
      );
      const totalDeductions = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.DESCONTO).reduce((sum, it) => sum + it.amount, 0)
      );
      const netSalary = this.roundMoney(totalEarnings - totalDeductions);
      const otherEarnings = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.PROVENTO && it.isManual).reduce((sum, it) => sum + it.amount, 0)
      );
      const otherDeductions = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.DESCONTO && it.isManual).reduce((sum, it) => sum + it.amount, 0)
      );

      await tx.payrollEmployeeSummary.update({
        where: { id: summary.id },
        data: {
          totalEarnings,
          totalDeductions,
          netSalary,
          otherEarnings,
          otherDeductions,
        },
      });

      // Recalcular totais da competência
      const allSummaries = await tx.payrollEmployeeSummary.findMany({
        where: { payrollCompetenceId: period.id },
      });
      const totalGross = this.roundMoney(allSummaries.reduce((sum, s) => sum + s.totalEarnings, 0));
      const totalDeds = this.roundMoney(allSummaries.reduce((sum, s) => sum + s.totalDeductions, 0));
      const totalNet = this.roundMoney(totalGross - totalDeds);

      await tx.payrollCompetence.update({
        where: { id: period.id },
        data: { totalGross, totalDeductions: totalDeds, totalNet },
      });

      return createdItem;
    });
  }

  /**
   * Remove um lançamento manual de uma competência aberta
   */
  async deleteManualItem(user: AuthenticatedUser, competence: string, itemId: string) {
    this.checkPermission(user);

    const period = await prisma.payrollCompetence.findUnique({
      where: {
        companyId_competence: {
          companyId: user.companyId!,
          competence,
        },
      },
    });

    if (!period) {
      throw new Error('Competência não encontrada.');
    }

    if (period.status === PayrollCompetenceStatus.FECHADA) {
      throw new Error('Não é possível remover lançamentos de uma competência fechada.');
    }

    const item = await prisma.payrollItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.companyId !== user.companyId) {
      throw new Error('Lançamento não encontrado nesta empresa.');
    }

    if (!item.isManual) {
      throw new Error('Itens automáticos do sistema não podem ser removidos individualmente. Recalcule a competência se necessário.');
    }

    return prisma.$transaction(async (tx) => {
      await tx.payrollItem.delete({
        where: { id: itemId },
      });

      // Recalcular totais do colaborador
      const allItems = await tx.payrollItem.findMany({
        where: { summaryId: item.summaryId },
      });

      const totalEarnings = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.PROVENTO).reduce((sum, it) => sum + it.amount, 0)
      );
      const totalDeductions = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.DESCONTO).reduce((sum, it) => sum + it.amount, 0)
      );
      const netSalary = this.roundMoney(totalEarnings - totalDeductions);
      const otherEarnings = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.PROVENTO && it.isManual).reduce((sum, it) => sum + it.amount, 0)
      );
      const otherDeductions = this.roundMoney(
        allItems.filter((it) => it.type === PayrollItemType.DESCONTO && it.isManual).reduce((sum, it) => sum + it.amount, 0)
      );

      await tx.payrollEmployeeSummary.update({
        where: { id: item.summaryId },
        data: {
          totalEarnings,
          totalDeductions,
          netSalary,
          otherEarnings,
          otherDeductions,
        },
      });

      // Recalcular totais da competência
      const allSummaries = await tx.payrollEmployeeSummary.findMany({
        where: { payrollCompetenceId: period.id },
      });
      const totalGross = this.roundMoney(allSummaries.reduce((sum, s) => sum + s.totalEarnings, 0));
      const totalDeds = this.roundMoney(allSummaries.reduce((sum, s) => sum + s.totalDeductions, 0));
      const totalNet = this.roundMoney(totalGross - totalDeds);

      await tx.payrollCompetence.update({
        where: { id: period.id },
        data: { totalGross, totalDeductions: totalDeds, totalNet },
      });

      return { success: true };
    });
  }

  /**
   * Fecha uma competência aberta, tornando todos os seus demonstrativos e itens imutáveis
   */
  async closeCompetence(user: AuthenticatedUser, competence: string, notes?: string) {
    this.checkPermission(user);

    // Fechamento permitido para ADMIN_EMPRESA e RH
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN_EMPRESA && user.role !== UserRole.RH) {
      throw new Error('Apenas Administradores ou RH têm alçada para homologar o fechamento de competência da folha.');
    }

    const period = await prisma.payrollCompetence.findUnique({
      where: {
        companyId_competence: {
          companyId: user.companyId!,
          competence,
        },
      },
    });

    if (!period) {
      throw new Error('Competência não encontrada.');
    }

    if (period.status === PayrollCompetenceStatus.FECHADA) {
      throw new Error(`A competência ${competence} já se encontra fechada.`);
    }

    const updated = await prisma.payrollCompetence.update({
      where: { id: period.id },
      data: {
        status: PayrollCompetenceStatus.FECHADA,
        closedAt: new Date(),
        closedById: user.id,
        notes: notes ? notes.trim() : period.notes,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        companyId: user.companyId!,
        userId: user.id,
        action: 'CLOSE_PAYROLL',
        entity: 'PayrollCompetence',
        entityId: period.id,
        details: `Fechamento definitivo da folha para a competência ${competence} homologado pelo usuário ${user.name}.`,
      },
    });

    return updated;
  }

  /**
   * Exporta resumo da folha de pagamento em formato CSV padronizado (compatível com Excel / UTF-8 BOM)
   */
  async exportCompetenceCSV(user: AuthenticatedUser, competence: string): Promise<string> {
    const details = await this.getCompetenceDetails(user, competence);
    if (!details) {
      throw new Error('Competência não encontrada para exportação.');
    }

    const rows: string[] = [];

    // Header UTF-8 com BOM para suporte perfeito a caracteres no Excel
    rows.push('Matrícula;Colaborador;CPF;Departamento;Cargo;Salário Base (R$);Horas Extras (R$);Banco de Horas (R$);Férias (R$);Outros Proventos (R$);Total Proventos (R$);Descontos (R$);Salário Líquido (R$)');

    for (const summary of details.summaries) {
      const emp = summary.employee;
      const row = [
        emp?.registrationNumber || 'N/A',
        `"${(emp?.fullName || '').replace(/"/g, '""')}"`,
        emp?.cpf || '',
        `"${(emp?.department?.name || '').replace(/"/g, '""')}"`,
        `"${(emp?.position?.title || '').replace(/"/g, '""')}"`,
        summary.baseSalary.toFixed(2).replace('.', ','),
        summary.overtimeAmount.toFixed(2).replace('.', ','),
        summary.timeBankAmount.toFixed(2).replace('.', ','),
        summary.vacationAmount.toFixed(2).replace('.', ','),
        summary.otherEarnings.toFixed(2).replace('.', ','),
        summary.totalEarnings.toFixed(2).replace('.', ','),
        summary.totalDeductions.toFixed(2).replace('.', ','),
        summary.netSalary.toFixed(2).replace('.', ','),
      ];
      rows.push(row.join(';'));
    }

    // Linha de totalizadores
    rows.push(`"TOTAL GERAL";"${details.totalEmployees} colaboradores";"";"";"";"";"";"";"";"";${details.totalGross.toFixed(2).replace('.', ',')};${details.totalDeductions.toFixed(2).replace('.', ',')};${details.totalNet.toFixed(2).replace('.', ',')}`);

    return '\uFEFF' + rows.join('\r\n');
  }
}

export const payrollService = new PayrollService();
