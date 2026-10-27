import { prisma } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import {
  UserRole,
  TimeBankOperation,
  TimeBankCompensationType,
  TimeBankCompensationStatus,
  TimeBankOrigin,
  TimeBankExpiryAction,
  TimeBankPolicy,
  TimeBankTransaction,
  TimeBankCompensationRequest,
  EmployeeTimeBankSummary,
  canManageTimeBank,
  canApproveCompensations,
} from '@pontuarh/shared';

export interface CreatePolicyDTO {
  name: string;
  compensationType?: string;
  periodMonths?: number;
  validFrom?: string;
  validUntil?: string | null;
  maxDailyCreditMinutes?: number;
  maxNegativeBalanceMinutes?: number;
  allowNegativeBalance?: boolean;
  creditRate?: number;
  requireManagerApproval?: boolean;
  expiryAction?: string;
  active?: boolean;
  isDefault?: boolean;
}

export interface CreateTransactionDTO {
  employeeId: string;
  type: string;
  minutes: number;
  competence: string;
  origin?: string;
  referenceId?: string | null;
  description?: string | null;
  idempotencyKey?: string | null;
}

export interface CreateCompensationDTO {
  type: string;
  date: string;
  durationMinutes: number;
  justification: string;
  idempotencyKey?: string | null;
}

export class TimeBankService {
  /**
   * Converte minutos em formato legível HH:MM
   */
  formatMinutes(totalMinutes: number): string {
    const isNegative = totalMinutes < 0;
    const absMinutes = Math.abs(Math.round(totalMinutes));
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : `+${formatted}`;
  }

  // --------------------------------------------------------------------------
  // POLÍTICAS DE BANCO DE HORAS
  // --------------------------------------------------------------------------

  async listPolicies(companyId: string) {
    const policies = await prisma.timeBankPolicy.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return policies.map((p) => ({
      ...p,
      employeesCount: p._count.employees,
    }));
  }

  async getPolicy(companyId: string, policyId: string) {
    const policy = await prisma.timeBankPolicy.findUnique({
      where: { id: policyId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!policy || policy.companyId !== companyId) {
      throw new Error('Política de banco de horas não encontrada.');
    }

    return {
      ...policy,
      employeesCount: policy._count.employees,
    };
  }

  async createPolicy(companyId: string, data: CreatePolicyDTO, userId?: string) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome da política é obrigatório.');
    }

    return prisma.$transaction(async (tx) => {
      // Se marcada como padrão, desmarcar a anterior
      if (data.isDefault) {
        await tx.timeBankPolicy.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const policy = await tx.timeBankPolicy.create({
        data: {
          companyId,
          name: data.name.trim(),
          compensationType: data.compensationType || 'BANCO_HORAS_PADRAO',
          periodMonths: data.periodMonths !== undefined ? data.periodMonths : 6,
          validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          maxDailyCreditMinutes: data.maxDailyCreditMinutes !== undefined ? data.maxDailyCreditMinutes : 120,
          maxNegativeBalanceMinutes: data.maxNegativeBalanceMinutes !== undefined ? data.maxNegativeBalanceMinutes : 2400,
          allowNegativeBalance: data.allowNegativeBalance !== undefined ? data.allowNegativeBalance : true,
          creditRate: data.creditRate !== undefined ? data.creditRate : 1.0,
          requireManagerApproval: data.requireManagerApproval !== undefined ? data.requireManagerApproval : true,
          expiryAction: data.expiryAction || 'PAGAR_FOLHA',
          active: data.active !== undefined ? data.active : true,
          isDefault: Boolean(data.isDefault),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: userId || null,
          action: 'CREATE_TIME_BANK_POLICY',
          entity: 'TimeBankPolicy',
          entityId: policy.id,
          details: `Política de Banco de Horas criada: "${policy.name}" (${policy.periodMonths} meses).`,
        },
      });

      return policy;
    });
  }

  async updatePolicy(companyId: string, policyId: string, data: Partial<CreatePolicyDTO>, userId?: string) {
    const existing = await prisma.timeBankPolicy.findUnique({
      where: { id: policyId },
    });

    if (!existing || existing.companyId !== companyId) {
      throw new Error('Política não encontrada nesta empresa.');
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.timeBankPolicy.updateMany({
          where: { companyId, isDefault: true, id: { not: policyId } },
          data: { isDefault: false },
        });
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.compensationType !== undefined) updateData.compensationType = data.compensationType;
      if (data.periodMonths !== undefined) updateData.periodMonths = data.periodMonths;
      if (data.validFrom !== undefined) updateData.validFrom = new Date(data.validFrom);
      if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
      if (data.maxDailyCreditMinutes !== undefined) updateData.maxDailyCreditMinutes = data.maxDailyCreditMinutes;
      if (data.maxNegativeBalanceMinutes !== undefined) updateData.maxNegativeBalanceMinutes = data.maxNegativeBalanceMinutes;
      if (data.allowNegativeBalance !== undefined) updateData.allowNegativeBalance = data.allowNegativeBalance;
      if (data.creditRate !== undefined) updateData.creditRate = data.creditRate;
      if (data.requireManagerApproval !== undefined) updateData.requireManagerApproval = data.requireManagerApproval;
      if (data.expiryAction !== undefined) updateData.expiryAction = data.expiryAction;
      if (data.active !== undefined) updateData.active = data.active;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      const updated = await tx.timeBankPolicy.update({
        where: { id: policyId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: userId || null,
          action: 'UPDATE_TIME_BANK_POLICY',
          entity: 'TimeBankPolicy',
          entityId: policyId,
          details: `Política de Banco de Horas atualizada: "${updated.name}".`,
        },
      });

      return updated;
    });
  }

  async getEmployeeEffectivePolicy(companyId: string, employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { timeBankPolicy: true },
    });

    if (!employee || employee.companyId !== companyId) {
      throw new Error('Colaborador não encontrado.');
    }

    if (employee.timeBankPolicy && employee.timeBankPolicy.active) {
      return employee.timeBankPolicy;
    }

    // Busca política padrão ativa da empresa
    const defaultPolicy = await prisma.timeBankPolicy.findFirst({
      where: { companyId, isDefault: true, active: true },
    });

    if (defaultPolicy) {
      return defaultPolicy;
    }

    // Fallback: qualquer política ativa
    return prisma.timeBankPolicy.findFirst({
      where: { companyId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // --------------------------------------------------------------------------
  // CÁLCULO E CONSULTA DE SALDOS (LEDGER BASE)
  // --------------------------------------------------------------------------

  async calculateEmployeeBalance(
    companyId: string,
    employeeId: string,
    prismaClient: any = prisma
  ): Promise<EmployeeTimeBankSummary> {
    const employee = await prismaClient.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        timeBankPolicy: true,
      },
    });

    if (!employee || employee.companyId !== companyId) {
      throw new Error('Colaborador não encontrado.');
    }

    let policy = employee.timeBankPolicy;
    if (!policy || !policy.active) {
      policy = await prismaClient.timeBankPolicy.findFirst({
        where: { companyId, isDefault: true, active: true },
      });
    }

    // Busca todas as transações consolidadas do ledger
    const transactions = await prismaClient.timeBankTransaction.findMany({
      where: {
        companyId,
        employeeId,
        status: 'CONSOLIDADO',
      },
      orderBy: { createdAt: 'asc' },
    });

    let currentBalanceMinutes = 0;
    let accumulatedCreditMinutes = 0;
    let accumulatedDebitMinutes = 0;
    let compensatedMinutes = 0;
    let paidMinutes = 0;

    for (const tx of transactions) {
      const mins = Math.abs(tx.minutes);
      switch (tx.type) {
        case 'CREDITO':
        case 'AJUSTE_CREDITO':
          currentBalanceMinutes += mins;
          accumulatedCreditMinutes += mins;
          break;
        case 'DEBITO':
        case 'AJUSTE_DEBITO':
          currentBalanceMinutes -= mins;
          accumulatedDebitMinutes += mins;
          break;
        case 'COMPENSACAO':
          currentBalanceMinutes -= mins;
          compensatedMinutes += mins;
          break;
        case 'TRANSFERENCIA_PAGAMENTO':
        case 'PAGAMENTO':
          currentBalanceMinutes -= mins;
          paidMinutes += mins;
          break;
        case 'ESTORNO':
          // Transações estornadas são excluídas pela cláusula status: CONSOLIDADO
          break;
      }
    }

    // Minutos comprometidos em solicitações de compensação pendentes (RESERVADA) ou aprovadas aguardando fruição (APROVADA)
    const reservedRequests = await prismaClient.timeBankCompensationRequest.findMany({
      where: {
        companyId,
        employeeId,
        status: {
          in: [TimeBankCompensationStatus.RESERVADA, TimeBankCompensationStatus.APROVADA],
        },
      },
    });

    const reservedMinutes = reservedRequests.reduce(
      (acc: number, req: any) => acc + Math.abs(req.durationMinutes),
      0
    );

    const availableBalanceMinutes = currentBalanceMinutes - reservedMinutes;

    // Cálculo de vencimento e alertas (CLT Art. 59 § 5º / CCT)
    let validUntil: string | null = null;
    let isExpiringSoon = false;
    let isExpired = false;
    let daysUntilExpiry: number | null = null;
    let expiryNotice: string | null = null;

    if (policy) {
      let expDate: Date | null = null;
      if (policy.validUntil) {
        expDate = new Date(policy.validUntil);
      } else if (policy.periodMonths) {
        const startDate = policy.validFrom ? new Date(policy.validFrom) : new Date(employee.admissionDate);
        expDate = new Date(startDate);
        expDate.setMonth(expDate.getMonth() + policy.periodMonths);
      }

      if (expDate) {
        validUntil = expDate.toISOString();
        const diffMs = expDate.getTime() - Date.now();
        daysUntilExpiry = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0 && currentBalanceMinutes > 0) {
          isExpired = true;
          expiryNotice = `Saldo positivo de ${this.formatMinutes(
            currentBalanceMinutes
          )} atingiu o término da vigência da política em ${expDate.toLocaleDateString(
            'pt-BR'
          )}. Requer análise e deliberação administrativa pelo RH (sem baixa automática).`;
        } else if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && currentBalanceMinutes > 0) {
          isExpiringSoon = true;
          expiryNotice = `Saldo positivo de ${this.formatMinutes(
            currentBalanceMinutes
          )} expira em ${daysUntilExpiry} dia(s) (${expDate.toLocaleDateString(
            'pt-BR'
          )}). Planeje o agendamento de compensações ou programação para folha.`;
        }
      }
    }

    return {
      employeeId: employee.id,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        cpf: employee.cpf,
        registrationNumber: employee.registrationNumber,
        department: employee.department,
        position: employee.position,
        admissionDate: employee.admissionDate.toISOString().split('T')[0],
      },
      policy: policy ? {
        id: policy.id,
        name: policy.name,
        periodMonths: policy.periodMonths,
        maxDailyCreditMinutes: policy.maxDailyCreditMinutes,
        maxNegativeBalanceMinutes: policy.maxNegativeBalanceMinutes,
        allowNegativeBalance: policy.allowNegativeBalance,
        creditRate: policy.creditRate,
        expiryAction: policy.expiryAction,
      } : null,
      currentBalanceMinutes,
      currentBalanceFormatted: this.formatMinutes(currentBalanceMinutes),
      reservedMinutes,
      reservedFormatted: this.formatMinutes(reservedMinutes),
      availableBalanceMinutes,
      availableBalanceFormatted: this.formatMinutes(availableBalanceMinutes),
      accumulatedCreditMinutes,
      accumulatedDebitMinutes,
      compensatedMinutes,
      paidMinutes,
      validUntil,
      isExpiringSoon,
      isExpired,
      daysUntilExpiry,
      expiryNotice,
    };
  }

  async listCompanyBalances(
    companyId: string,
    filters: {
      departmentId?: string;
      status?: 'POSITIVO' | 'NEGATIVO' | 'ZERADO' | 'EXPIRANDO' | 'VENCIDO';
      search?: string;
    } = {},
    user?: AuthenticatedUser
  ) {
    const whereEmployee: any = {
      companyId,
      status: 'ATIVO',
    };

    // Restrição estrita de alçada para Gestor: vê exclusivamente seus liderados diretos
    if (user && user.role === UserRole.GESTOR) {
      if (!user.employeeId) {
        return [];
      }
      whereEmployee.managerId = user.employeeId;
    }

    if (filters.departmentId) {
      whereEmployee.departmentId = filters.departmentId;
    }

    if (filters.search) {
      whereEmployee.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { cpf: { contains: filters.search } },
        { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      select: { id: true },
      orderBy: { fullName: 'asc' },
    });

    const summaries: EmployeeTimeBankSummary[] = [];
    for (const emp of employees) {
      const summary = await this.calculateEmployeeBalance(companyId, emp.id);

      if (filters.status) {
        if (filters.status === 'POSITIVO' && summary.currentBalanceMinutes <= 0) continue;
        if (filters.status === 'NEGATIVO' && summary.currentBalanceMinutes >= 0) continue;
        if (filters.status === 'ZERADO' && summary.currentBalanceMinutes !== 0) continue;
        if (filters.status === 'EXPIRANDO' && !summary.isExpiringSoon) continue;
        if (filters.status === 'VENCIDO' && !summary.isExpired) continue;
      }

      summaries.push(summary);
    }

    return summaries;
  }

  // --------------------------------------------------------------------------
  // LIVRO DE MOVIMENTAÇÕES (TRANSACTIONS LEDGER)
  // --------------------------------------------------------------------------

  async listTransactions(
    companyId: string,
    filters: {
      employeeId?: string;
      departmentId?: string;
      competence?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    } = {}
  ) {
    const whereClause: any = { companyId };

    if (filters.employeeId) {
      whereClause.employeeId = filters.employeeId;
    }

    if (filters.departmentId) {
      whereClause.employee = { departmentId: filters.departmentId };
    }

    if (filters.competence) {
      whereClause.competence = filters.competence;
    }

    if (filters.type && filters.type !== 'TODOS') {
      whereClause.type = filters.type;
    }

    if (filters.status && filters.status !== 'TODOS') {
      whereClause.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return prisma.timeBankTransaction.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            registrationNumber: true,
            department: { select: { name: true } },
          },
        },
        policy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTransaction(
    companyId: string,
    data: CreateTransactionDTO,
    performedByUserId?: string
  ) {
    if (!data.employeeId) throw new Error('Colaborador é obrigatório.');
    if (!data.type) throw new Error('Tipo de movimentação é obrigatório.');
    if (data.minutes === undefined || data.minutes === null) throw new Error('Quantidade em minutos é obrigatória.');
    if (!data.competence) throw new Error('Competência (AAAA-MM) é obrigatória.');

    const absMinutes = Math.abs(Math.round(data.minutes));
    if (absMinutes === 0) {
      throw new Error('A quantidade de minutos deve ser maior que zero.');
    }

    return prisma.$transaction(async (tx) => {
      // Prevenção de duplicidade por Idempotência com validação estrita de payload
      if (data.idempotencyKey) {
        const existing = await tx.timeBankTransaction.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) {
          if (
            existing.employeeId !== data.employeeId ||
            existing.minutes !== absMinutes ||
            existing.type !== data.type
          ) {
            throw new Error('Conflito de idempotência: a chave informada já foi utilizada com parâmetros diferentes.');
          }
          return existing;
        }
      }

      // Bloqueio atômico de concorrência no nível de linha (PostgreSQL SELECT FOR UPDATE)
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${data.employeeId} FOR UPDATE`;

      // Validação do colaborador e lock de concorrência
      const employee = await tx.employee.findUnique({
        where: { id: data.employeeId },
        include: { timeBankPolicy: true },
      });

      if (!employee || employee.companyId !== companyId) {
        throw new Error('Colaborador não encontrado nesta empresa.');
      }

      const policy = employee.timeBankPolicy || (await tx.timeBankPolicy.findFirst({
        where: { companyId, isDefault: true, active: true },
      }));

      // Apuração do saldo atual antes da nova transação
      const currentSummary = await this.calculateEmployeeBalance(companyId, data.employeeId, tx);

      // Verificação de regras de débito e limites negativos
      const isDebit = [
        'DEBITO',
        'AJUSTE_DEBITO',
        'COMPENSACAO',
        'TRANSFERENCIA_PAGAMENTO',
        'PAGAMENTO',
      ].includes(data.type);

      const delta = isDebit ? -absMinutes : absMinutes;
      const expectedBalanceAfter = currentSummary.currentBalanceMinutes + delta;

      if (policy && isDebit && expectedBalanceAfter < 0) {
        if (!policy.allowNegativeBalance) {
          throw new Error('Saldo negativo bloqueado pelas regras da política de banco de horas da empresa.');
        }

        if (policy.maxNegativeBalanceMinutes !== undefined && Math.abs(expectedBalanceAfter) > policy.maxNegativeBalanceMinutes) {
          throw new Error(
            `Operação excede o limite máximo de saldo negativo permitido (${this.formatMinutes(
              policy.maxNegativeBalanceMinutes
            )}). Saldo resultante seria: ${this.formatMinutes(expectedBalanceAfter)}.`
          );
        }
      }

      const transaction = await tx.timeBankTransaction.create({
        data: {
          companyId,
          employeeId: data.employeeId,
          policyId: policy?.id || null,
          type: data.type,
          minutes: absMinutes,
          balanceAfter: expectedBalanceAfter,
          competence: data.competence,
          origin: data.origin || TimeBankOrigin.AJUSTE_GESTOR,
          referenceId: data.referenceId || null,
          createdById: performedByUserId || null,
          status: 'CONSOLIDADO',
          idempotencyKey: data.idempotencyKey || null,
          description: data.description || null,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: performedByUserId || null,
          action: 'CREATE_TIME_BANK_TRANSACTION',
          entity: 'TimeBankTransaction',
          entityId: transaction.id,
          details: `Lançamento ${transaction.type}: ${this.formatMinutes(delta)} para colaborador ${employee.fullName} (Competência: ${transaction.competence}).`,
        },
      });

      return transaction;
    });
  }

  async reverseTransaction(
    companyId: string,
    transactionId: string,
    reason: string,
    performedByUserId: string
  ) {
    if (!reason || !reason.trim()) {
      throw new Error('É obrigatório informar a justificativa do estorno.');
    }

    return prisma.$transaction(async (tx) => {
      // Bloqueio atômico de linha para impedir estorno concorrente duplo
      await tx.$executeRaw`SELECT id FROM "TimeBankTransaction" WHERE id = ${transactionId} FOR UPDATE`;

      const originalTx = await tx.timeBankTransaction.findUnique({
        where: { id: transactionId },
        include: { employee: true },
      });

      if (!originalTx || originalTx.companyId !== companyId) {
        throw new Error('Movimentação não encontrada.');
      }

      if (originalTx.status === 'ESTORNADO') {
        throw new Error('Esta movimentação já foi estornada anteriormente.');
      }

      // Marca original como ESTORNADO
      await tx.timeBankTransaction.update({
        where: { id: transactionId },
        data: { status: 'ESTORNADO' },
      });

      // Cria lançamento compensatório de estorno no ledger preservando integridade histórica
      const reversalRecord = await tx.timeBankTransaction.create({
        data: {
          companyId,
          employeeId: originalTx.employeeId,
          policyId: originalTx.policyId,
          type: 'ESTORNO',
          minutes: originalTx.minutes,
          competence: originalTx.competence,
          origin: originalTx.origin,
          referenceId: originalTx.id,
          createdById: performedByUserId,
          status: 'ESTORNADO',
          description: `Estorno de movimentação #${originalTx.id} (${originalTx.type} de ${this.formatMinutes(
            originalTx.minutes
          )}): ${reason.trim()}`,
          idempotencyKey: `estorno-${originalTx.id}-${Date.now()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: performedByUserId,
          action: 'REVERSE_TIME_BANK_TRANSACTION',
          entity: 'TimeBankTransaction',
          entityId: originalTx.id,
          details: `Movimentação estornada com sucesso para ${originalTx.employee.fullName}. Motivo: ${reason}`,
        },
      });

      return {
        message: 'Movimentação estornada com sucesso.',
        reversedTransactionId: originalTx.id,
        reversalRecordId: reversalRecord.id,
      };
    });
  }

  // --------------------------------------------------------------------------
  // SOLICITAÇÃO E GESTÃO DE COMPENSAÇÕES / FOLGAS
  // --------------------------------------------------------------------------

  async listCompensationRequests(
    companyId: string,
    filters: {
      employeeId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {},
    user?: AuthenticatedUser
  ) {
    const whereClause: any = { companyId };

    if (filters.employeeId) {
      whereClause.employeeId = filters.employeeId;
    }

    if (filters.status && filters.status !== 'TODOS') {
      whereClause.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    // Regras de RBAC
    if (user && user.role === UserRole.COLABORADOR) {
      whereClause.employeeId = user.employeeId || 'none';
    } else if (user && user.role === UserRole.GESTOR) {
      whereClause.employee = {
        managerId: user.employeeId,
      };
    }

    return prisma.timeBankCompensationRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            registrationNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCompensationRequest(
    companyId: string,
    employeeId: string,
    data: CreateCompensationDTO,
    requestedByUserId?: string
  ) {
    if (!data.type) throw new Error('Tipo de compensação é obrigatório.');
    if (!data.date) throw new Error('Data pretendida é obrigatória.');
    if (!data.durationMinutes || data.durationMinutes <= 0) {
      throw new Error('A quantidade de horas a compensar deve ser maior que zero.');
    }
    if (!data.justification || !data.justification.trim()) {
      throw new Error('Justificativa é obrigatória.');
    }

    const durationMinutes = Math.abs(Math.round(data.durationMinutes));

    return prisma.$transaction(async (tx) => {
      // Prevenção de duplicidade por Idempotência com validação de payload
      if (data.idempotencyKey) {
        const existing = await tx.timeBankCompensationRequest.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) {
          if (
            existing.employeeId !== employeeId ||
            existing.durationMinutes !== durationMinutes ||
            existing.type !== data.type
          ) {
            throw new Error('Conflito de idempotência: a chave informada já foi utilizada com parâmetros diferentes.');
          }
          return existing;
        }
      }

      // Bloqueio atômico de concorrência no nível de linha (PostgreSQL SELECT FOR UPDATE)
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${employeeId} FOR UPDATE`;

      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee || employee.companyId !== companyId) {
        throw new Error('Colaborador não encontrado.');
      }

      // Verificação do saldo disponível (saldo atual - reservas pendentes e aprovadas)
      const balance = await this.calculateEmployeeBalance(companyId, employeeId, tx);

      if (balance.availableBalanceMinutes < durationMinutes) {
        throw new Error(
          `Saldo disponível insuficiente para compensação. Saldo atual: ${balance.currentBalanceFormatted}, Reservado em outras solicitações: ${balance.reservedFormatted}, Disponível líquido: ${balance.availableBalanceFormatted}. Solicitado: ${this.formatMinutes(
            durationMinutes
          )}.`
        );
      }

      // Checagem de conflito com Férias ou Afastamentos ativos (Fase 4)
      let startOfDay: Date;
      let endOfDay: Date;
      if (typeof data.date === 'string' && data.date.includes('-')) {
        const [dY, dM, dD] = data.date.split('T')[0].split('-').map(Number);
        startOfDay = new Date(Date.UTC(dY, dM - 1, dD, 0, 0, 0, 0));
        endOfDay = new Date(Date.UTC(dY, dM - 1, dD, 23, 59, 59, 999));
      } else {
        startOfDay = new Date(data.date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        endOfDay = new Date(data.date);
        endOfDay.setUTCHours(23, 59, 59, 999);
      }

      const conflictingVacation = await tx.vacationRequest.findFirst({
        where: {
          employeeId,
          companyId,
          status: { in: ['APROVADA', 'PROGRAMADA', 'EM_GOZO'] },
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
      });

      if (conflictingVacation) {
        throw new Error(
          `Conflito de agenda: o colaborador possui férias programadas na data pretendida (${new Date(data.date).toLocaleDateString('pt-BR')}).`
        );
      }

      const conflictingLeave = await tx.employeeLeave.findFirst({
        where: {
          employeeId,
          companyId,
          status: { in: ['PENDENTE', 'ATIVO'] },
          startDate: { lte: endOfDay },
          OR: [{ endDate: null }, { endDate: { gte: startOfDay } }],
        },
      });

      if (conflictingLeave) {
        throw new Error(
          `Conflito de agenda: o colaborador possui afastamento/licença ativo (${conflictingLeave.type}) na data pretendida.`
        );
      }

      const request = await tx.timeBankCompensationRequest.create({
        data: {
          companyId,
          employeeId,
          type: data.type,
          date: new Date(data.date),
          durationMinutes,
          justification: data.justification.trim(),
          status: TimeBankCompensationStatus.RESERVADA,
          idempotencyKey: data.idempotencyKey || null,
        },
        include: {
          employee: {
            select: { id: true, fullName: true },
          },
        },
      });

      let auditUserId: string | null = null;
      if (requestedByUserId) {
        const userExists = await tx.user.findUnique({ where: { id: requestedByUserId }, select: { id: true } });
        if (userExists) auditUserId = userExists.id;
      }

      await tx.auditLog.create({
        data: {
          companyId,
          userId: auditUserId,
          action: 'CREATE_COMPENSATION_REQUEST',
          entity: 'TimeBankCompensationRequest',
          entityId: request.id,
          details: `Solicitação de compensação (${request.type}) criada para ${request.employee.fullName}: ${this.formatMinutes(
            request.durationMinutes
          )} em ${data.date}. Minutos alocados no saldo reservado.`,
        },
      });

      return request;
    });
  }

  async decideCompensationRequest(
    companyId: string,
    requestId: string,
    decision: {
      status: 'APROVADA' | 'RECUSADA';
      decisionNotes?: string;
    },
    reviewerUser: AuthenticatedUser
  ) {
    if (!canApproveCompensations(reviewerUser.role)) {
      throw new Error('Acesso negado: Perfil não possui permissão para aprovar ou recusar solicitações de compensação.');
    }

    if (!['APROVADA', 'RECUSADA'].includes(decision.status)) {
      throw new Error(`Status de decisão inválido: "${decision.status}". Utilize APROVADA ou RECUSADA.`);
    }

    return prisma.$transaction(async (tx) => {
      const request = await tx.timeBankCompensationRequest.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });

      if (!request || request.companyId !== companyId) {
        throw new Error('Solicitação de compensação não encontrada.');
      }

      // Validação de transição de estado da máquina de estados
      if (request.status !== TimeBankCompensationStatus.RESERVADA) {
        if (request.status === TimeBankCompensationStatus.APROVADA) {
          throw new Error('Esta solicitação já foi aprovada. Para cancelar uma folga aprovada, utilize a rotina de cancelamento.');
        }
        if (request.status === TimeBankCompensationStatus.REALIZADA) {
          throw new Error('Transição inválida: Não é possível alterar uma compensação que já foi efetivamente realizada.');
        }
        throw new Error(`Transição inválida: Não é permitido deliberar sobre uma solicitação com status "${request.status}".`);
      }

      // Impossibilidade de auto-aprovação
      if (request.employeeId === reviewerUser.employeeId || request.employee.userId === reviewerUser.id) {
        throw new Error('Acesso negado: Segregação de funções. Não é permitido aprovar sua própria solicitação.');
      }

      // Validação de liderança do Gestor
      if (reviewerUser.role === UserRole.GESTOR && request.employee.managerId !== reviewerUser.employeeId) {
        throw new Error('Acesso negado: Este colaborador não é seu liderado direto.');
      }

      if (decision.status === 'RECUSADA' && (!decision.decisionNotes || !decision.decisionNotes.trim())) {
        throw new Error('É obrigatório justificar o motivo da recusa da compensação.');
      }

      // Lock de concorrência no empregado
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${request.employeeId} FOR UPDATE`;

      if (decision.status === 'APROVADA') {
        // Validação de concorrência: verifica se o saldo cobre o débito
        const balance = await this.calculateEmployeeBalance(companyId, request.employeeId, tx);

        // O saldo disponível atual já inclui a reserva desta própria requisição
        const availableWithThis = balance.availableBalanceMinutes + request.durationMinutes;
        if (availableWithThis < request.durationMinutes) {
          throw new Error('Saldo insuficiente para aprovação da compensação.');
        }

        // FASE 3.1: Aprovação autoriza a fruição mas NÃO debita imediatamente no ledger.
        // As horas PERMANECEM RESERVADAS até a efetiva confirmação da realização da folha/saída!
        const updated = await tx.timeBankCompensationRequest.update({
          where: { id: requestId },
          data: {
            status: TimeBankCompensationStatus.APROVADA,
            reviewedById: reviewerUser.id,
            decisionNotes: decision.decisionNotes || null,
            decidedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: reviewerUser.id,
            action: 'APPROVE_COMPENSATION_REQUEST',
            entity: 'TimeBankCompensationRequest',
            entityId: request.id,
            details: `Compensação aprovada para ${request.employee.fullName}: ${this.formatMinutes(
              request.durationMinutes
            )}. Horas continuam reservadas até a confirmação de realização.`,
          },
        });

        return updated;
      } else {
        // RECUSADA: libera automaticamente os minutos reservados
        const updated = await tx.timeBankCompensationRequest.update({
          where: { id: requestId },
          data: {
            status: TimeBankCompensationStatus.RECUSADA,
            reviewedById: reviewerUser.id,
            decisionNotes: decision.decisionNotes || null,
            decidedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: reviewerUser.id,
            action: 'REJECT_COMPENSATION_REQUEST',
            entity: 'TimeBankCompensationRequest',
            entityId: request.id,
            details: `Solicitação de compensação recusada para ${request.employee.fullName}. Reserva de saldo liberada. Motivo: ${decision.decisionNotes}`,
          },
        });

        return updated;
      }
    });
  }

  async realizeCompensationRequest(
    companyId: string,
    requestId: string,
    performedByUser: AuthenticatedUser,
    notes?: string
  ) {
    if (!canApproveCompensations(performedByUser.role)) {
      throw new Error('Acesso negado: Perfil não possui permissão para confirmar realização de compensações.');
    }

    return prisma.$transaction(async (tx) => {
      const request = await tx.timeBankCompensationRequest.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });

      if (!request || request.companyId !== companyId) {
        throw new Error('Solicitação de compensação não encontrada.');
      }

      if (performedByUser.role === UserRole.GESTOR && request.employee.managerId !== performedByUser.employeeId) {
        throw new Error('Acesso negado: Este colaborador não é seu liderado direto.');
      }

      // Validação estrita da máquina de estados: Apenas APROVADA pode transicionar para REALIZADA
      if (request.status !== TimeBankCompensationStatus.APROVADA) {
        if (request.status === TimeBankCompensationStatus.REALIZADA) {
          throw new Error('Esta compensação já foi realizada anteriormente.');
        }
        if (request.status === TimeBankCompensationStatus.RESERVADA) {
          throw new Error('Transição de estado inválida: Não é possível realizar uma compensação que ainda não foi aprovada pelo gestor.');
        }
        throw new Error(`Transição de estado inválida: Não é possível realizar uma compensação com status "${request.status}".`);
      }

      // Lock de concorrência no empregado
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${request.employeeId} FOR UPDATE`;

      const dateObj = new Date(request.date);
      const competence = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

      // FASE 3.1: A realização consolida o débito no ledger transacional de banco de horas
      const ledgerTx = await tx.timeBankTransaction.create({
        data: {
          companyId,
          employeeId: request.employeeId,
          type: TimeBankOperation.COMPENSACAO,
          minutes: request.durationMinutes,
          competence,
          origin: TimeBankOrigin.SOLICITACAO_COMPENSACAO,
          referenceId: request.id,
          createdById: performedByUser.id,
          status: 'CONSOLIDADO',
          description: `Compensação de jornada (${request.type}) realizada em ${request.date.toISOString().split('T')[0]}: ${request.justification}${notes ? ` [Obs: ${notes}]` : ''}`,
          idempotencyKey: `comp-realize-${request.id}`,
        },
      });

      const updated = await tx.timeBankCompensationRequest.update({
        where: { id: requestId },
        data: {
          status: TimeBankCompensationStatus.REALIZADA,
          ledgerTransactionId: ledgerTx.id,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: performedByUser.id,
          action: 'REALIZE_COMPENSATION_REQUEST',
          entity: 'TimeBankCompensationRequest',
          entityId: request.id,
          details: `Compensação usufruída e realizada para ${request.employee.fullName}: ${this.formatMinutes(
            request.durationMinutes
          )}. Débito de compensação consolidado no ledger (${ledgerTx.id}).`,
        },
      });

      return updated;
    });
  }

  async cancelCompensationRequest(
    companyId: string,
    requestId: string,
    user: AuthenticatedUser,
    reason?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.timeBankCompensationRequest.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });

      if (!request || request.companyId !== companyId) {
        throw new Error('Solicitação de compensação não encontrada.');
      }

      if (user.role === UserRole.COLABORADOR && request.employeeId !== user.employeeId) {
        throw new Error('Acesso negado: Você só pode cancelar suas próprias solicitações.');
      }

      if (user.role === UserRole.GESTOR && request.employee.managerId !== user.employeeId) {
        throw new Error('Acesso negado: Este colaborador não é seu liderado direto.');
      }

      // Validação da máquina de estados: Apenas RESERVADA ou APROVADA podem ser canceladas
      if (
        request.status !== TimeBankCompensationStatus.RESERVADA &&
        request.status !== TimeBankCompensationStatus.APROVADA
      ) {
        if (request.status === TimeBankCompensationStatus.REALIZADA) {
          throw new Error('Transição de estado inválida: Não é possível cancelar uma compensação que já foi efetivamente realizada e debitada no ledger. Utilize a rotina de estorno.');
        }
        throw new Error(`Transição de estado inválida: Não é possível cancelar uma solicitação com status "${request.status}".`);
      }

      // Lock de concorrência no colaborador
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${request.employeeId} FOR UPDATE`;

      const cancelReason =
        reason?.trim() ||
        (user.role === UserRole.COLABORADOR
          ? 'Cancelada pelo próprio colaborador solicitante.'
          : 'Cancelada pela gestão/RH.');

      const previousStatus = request.status;

      const updated = await tx.timeBankCompensationRequest.update({
        where: { id: requestId },
        data: {
          status: TimeBankCompensationStatus.CANCELADA,
          decisionNotes: request.decisionNotes
            ? `${request.decisionNotes} | Motivo do cancelamento: ${cancelReason}`
            : `Motivo do cancelamento: ${cancelReason}`,
          decidedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: user.id,
          action: 'CANCEL_COMPENSATION_REQUEST',
          entity: 'TimeBankCompensationRequest',
          entityId: request.id,
          details: `Compensação cancelada (${previousStatus} -> CANCELADA) para ${request.employee.fullName}. Reserva de ${this.formatMinutes(
            request.durationMinutes
          )} liberada. Motivo: ${cancelReason}`,
        },
      });

      return updated;
    });
  }

  // Retrocompatibilidade
  async cancelOwnCompensationRequest(
    companyId: string,
    requestId: string,
    user: AuthenticatedUser
  ) {
    return this.cancelCompensationRequest(companyId, requestId, user);
  }

  // --------------------------------------------------------------------------
  // HORAS DESTINADAS AO PAGAMENTO EM FOLHA
  // --------------------------------------------------------------------------

  async transferToPayroll(
    companyId: string,
    data: {
      employeeId: string;
      minutes: number;
      competence: string; // YYYY-MM
      description?: string;
      idempotencyKey?: string | null;
    },
    performedByUserId: string
  ) {
    if (!data.employeeId) throw new Error('Colaborador é obrigatório.');
    if (!data.minutes || data.minutes <= 0) throw new Error('Quantidade de minutos para pagamento deve ser maior que zero.');
    if (!data.competence) throw new Error('Competência de destino da folha é obrigatória (ex: 2026-10).');

    const minutesToPay = Math.abs(Math.round(data.minutes));

    return prisma.$transaction(async (tx) => {
      // Validação de idempotência
      if (data.idempotencyKey) {
        const existing = await tx.timeBankTransaction.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) {
          if (
            existing.employeeId !== data.employeeId ||
            existing.minutes !== minutesToPay ||
            existing.competence !== data.competence
          ) {
            throw new Error('Conflito de idempotência: a chave informada já foi utilizada com parâmetros diferentes.');
          }
          return existing;
        }
      }

      // Bloqueio atômico de linha para impedir transferência concorrente indevida
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${data.employeeId} FOR UPDATE`;

      const employee = await tx.employee.findUnique({
        where: { id: data.employeeId },
      });

      if (!employee || employee.companyId !== companyId) {
        throw new Error('Colaborador não encontrado.');
      }

      // Checa saldo disponível no banco de horas (deduzindo RESERVADA e APROVADA)
      const balance = await this.calculateEmployeeBalance(companyId, data.employeeId, tx);

      if (balance.availableBalanceMinutes < minutesToPay) {
        throw new Error(
          `Saldo positivo insuficiente para transferência. Saldo atual: ${balance.currentBalanceFormatted}, Reservado: ${balance.reservedFormatted}, Disponível: ${balance.availableBalanceFormatted}. Solicitado para pagamento: ${this.formatMinutes(
            minutesToPay
          )}.`
        );
      }

      const idempotencyKey =
        data.idempotencyKey || `payroll-transfer-${data.employeeId}-${data.competence}-${Date.now()}`;

      const ledgerTx = await tx.timeBankTransaction.create({
        data: {
          companyId,
          employeeId: data.employeeId,
          type: TimeBankOperation.TRANSFERENCIA_PAGAMENTO,
          minutes: minutesToPay,
          competence: data.competence,
          origin: TimeBankOrigin.LIQUIDACAO_FOLHA,
          createdById: performedByUserId,
          status: 'CONSOLIDADO',
          idempotencyKey,
          description:
            data.description ||
            `Liquidação de saldo de banco de horas encaminhado para pagamento na folha de competência ${data.competence}`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: performedByUserId,
          action: 'TRANSFER_TIME_BANK_TO_PAYROLL',
          entity: 'TimeBankTransaction',
          entityId: ledgerTx.id,
          details: `Transferência de ${this.formatMinutes(minutesToPay)} para folha de pagamento de ${employee.fullName} (Competência: ${data.competence}).`,
        },
      });

      return ledgerTx;
    });
  }

  // --------------------------------------------------------------------------
  // INTEGRAÇÃO COM APURAÇÃO DE PONTO E AJUSTES APROVADOS
  // --------------------------------------------------------------------------

  async syncDayAdjustment(
    companyId: string,
    employeeId: string,
    dateStr: string, // YYYY-MM-DD
    eligibleMinutes: number, // Net extra/deficit minutes for that day
    performedByUserId?: string
  ) {
    const [year, month] = dateStr.split('-');
    const competence = `${year}-${month}`;
    const absMinutes = Math.abs(Math.round(eligibleMinutes));
    const isCredit = eligibleMinutes > 0;
    const type = isCredit ? 'AJUSTE_CREDITO' : 'AJUSTE_DEBITO';

    return prisma.$transaction(async (tx) => {
      // Bloqueio atômico de linha para serializar ajustes do colaborador
      await tx.$executeRaw`SELECT id FROM "Employee" WHERE id = ${employeeId} FOR UPDATE`;

      // Verifica se já existe lançamento de ajuste de ponto consolidado para esta data
      const existing = await tx.timeBankTransaction.findFirst({
        where: {
          companyId,
          employeeId,
          origin: TimeBankOrigin.APURACAO_PONTO,
          referenceId: dateStr,
          status: 'CONSOLIDADO',
        },
      });

      // Cenário: O recálculo resultou em 0 minutos elegíveis
      if (eligibleMinutes === 0) {
        if (existing) {
          // Estorna o lançamento anterior pois não há mais minutos excedentes/devidos
          await tx.timeBankTransaction.update({
            where: { id: existing.id },
            data: { status: 'ESTORNADO' },
          });
        }
        return null;
      }

      // Cenário: Reprocessamento idêntico da mesma apuração (idempotência segura)
      if (existing && existing.minutes === absMinutes && existing.type === type) {
        return existing;
      }

      if (existing) {
        // Se já existia um registro do mesmo dia com minutos diferentes, estorna o anterior
        await tx.timeBankTransaction.update({
          where: { id: existing.id },
          data: { status: 'ESTORNADO' },
        });
      }

      const transaction = await tx.timeBankTransaction.create({
        data: {
          companyId,
          employeeId,
          type,
          minutes: absMinutes,
          competence,
          origin: TimeBankOrigin.APURACAO_PONTO,
          referenceId: dateStr,
          createdById: performedByUserId || null,
          status: 'CONSOLIDADO',
          description: `Ajuste decorrente de apuração/retificação de ponto do dia ${dateStr} (${this.formatMinutes(
            eligibleMinutes
          )})`,
          idempotencyKey: `sync-point-${employeeId}-${dateStr}-${Date.now()}`,
        },
      });

      return transaction;
    });
  }
}

export const timeBankService = new TimeBankService();
