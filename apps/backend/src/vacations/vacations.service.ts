import { PrismaClient } from '@prisma/client';
import {
  AuthenticatedUser,
  canApproveVacations,
  canManageVacations,
  UserRole,
  VacationPeriodStatus,
  VacationRequestStatus,
} from '@pontuarh/shared';
import { vacationsCalculationService } from './vacations-calculation.service';

const prisma = new PrismaClient();

export interface CreateVacationRequestDTO {
  employeeId?: string;
  vacationPeriodId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  sellDays?: number; // Abono pecuniário (0 a 10 dias)
  advance13th?: boolean;
  employeeNotes?: string;
}

export interface DecideVacationRequestDTO {
  status: 'APROVADA' | 'PROGRAMADA' | 'RECUSADA';
  decisionNotes?: string;
}

export class VacationsService {
  /**
   * Garante que os períodos aquisitivos de um colaborador estão gerados no banco de dados
   */
  async ensureEmployeePeriods(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado.');
    }

    const calculatedPeriods = vacationsCalculationService.generatePeriodsFromAdmission(
      employee.admissionDate,
      new Date()
    );

    for (const cp of calculatedPeriods) {
      const existing = await prisma.vacationPeriod.findFirst({
        where: {
          employeeId,
          companyId,
          startDate: cp.startDate,
          endDate: cp.endDate,
        },
      });

      if (!existing) {
        await prisma.vacationPeriod.create({
          data: {
            companyId,
            employeeId,
            startDate: cp.startDate,
            endDate: cp.endDate,
            concessiveStartDate: cp.concessiveStartDate,
            concessiveEndDate: cp.concessiveEndDate,
            daysAcquired: cp.daysAcquired,
            daysRemaining: cp.daysRemaining,
            status: cp.status,
          },
        });
      } else {
        // Atualiza status caso tenha vencido ou expirado
        if (existing.status === 'ADQUIRIDO' && cp.isExpired && existing.daysRemaining > 0) {
          await prisma.vacationPeriod.update({
            where: { id: existing.id },
            data: { status: 'VENCIDO' },
          });
        }
      }
    }
  }

  /**
   * Lista períodos aquisitivos e concessivos de um colaborador
   */
  async listEmployeePeriods(employeeId: string, user: AuthenticatedUser) {
    // Validação de alçada de acesso
    if (user.role === UserRole.COLABORADOR && user.employeeId !== employeeId) {
      throw new Error('Você não tem permissão para visualizar períodos de outro colaborador.');
    }

    if (user.role === UserRole.GESTOR) {
      const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId: user.companyId } });
      if (!emp || emp.managerId !== user.employeeId) {
        throw new Error('Acesso negado: o colaborador não pertence à sua equipe subordinada.');
      }
    }

    await this.ensureEmployeePeriods(employeeId, user.companyId);

    const periods = await prisma.vacationPeriod.findMany({
      where: { employeeId, companyId: user.companyId },
      include: {
        vacationRequests: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const now = new Date();
    return periods.map((p) => {
      const diffMs = new Date(p.concessiveEndDate).getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = daysUntilExpiry < 0;
      const isExpiringSoon = !isExpired && daysUntilExpiry <= 60;

      return {
        ...p,
        isExpired,
        isExpiringSoon,
        daysUntilExpiry,
      };
    });
  }

  /**
   * Visão geral consolidada de férias para a empresa (com suporte a filtros por gestor, departamento e status)
   */
  async listCompanyVacationOverview(
    companyId: string,
    user: AuthenticatedUser,
    filters?: { departmentId?: string; status?: string; search?: string }
  ) {
    const whereEmployee: any = { companyId, status: 'ATIVO' };

    // Gestor vê somente seus subordinados diretos
    if (user.role === UserRole.GESTOR) {
      whereEmployee.managerId = user.employeeId;
    }

    if (filters?.departmentId) {
      whereEmployee.departmentId = filters.departmentId;
    }

    if (filters?.search) {
      whereEmployee.fullName = { contains: filters.search, mode: 'insensitive' };
    }

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      include: {
        department: true,
        vacationPeriods: {
          include: {
            vacationRequests: true,
          },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Garante que períodos existam para cada um dos funcionários retornados
    for (const emp of employees) {
      if (emp.vacationPeriods.length === 0) {
        await this.ensureEmployeePeriods(emp.id, companyId);
      }
    }

    // Recarrega os períodos atualizados
    const refreshedEmployees = await prisma.employee.findMany({
      where: whereEmployee,
      include: {
        department: true,
        vacationPeriods: {
          include: {
            vacationRequests: true,
          },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const now = new Date();
    let employeesOnVacationCount = 0;
    let scheduledVacationsCount = 0;
    let expiringVacationsCount = 0;
    let pendingRequestsCount = 0;

    const list = refreshedEmployees.map((emp) => {
      let currentPeriod: any = null;
      let hasExpiringSoon = false;
      let hasExpired = false;

      for (const p of emp.vacationPeriods) {
        const diffMs = new Date(p.concessiveEndDate).getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (p.daysRemaining > 0) {
          if (daysUntilExpiry < 0) {
            hasExpired = true;
            expiringVacationsCount++;
          } else if (daysUntilExpiry <= 60) {
            hasExpiringSoon = true;
            expiringVacationsCount++;
          }
        }

        // Checa solicitações ativas
        for (const req of p.vacationRequests) {
          if (req.status === 'PENDENTE' || req.status === 'EM_ANALISE') {
            pendingRequestsCount++;
          } else if (req.status === 'APROVADA' || req.status === 'PROGRAMADA') {
            scheduledVacationsCount++;
          } else if (req.status === 'EM_GOZO') {
            employeesOnVacationCount++;
          }
        }

        // Prioriza período com saldo aberto/adquirido
        if (!currentPeriod && p.daysRemaining > 0) {
          currentPeriod = p;
        }
      }

      if (!currentPeriod && emp.vacationPeriods.length > 0) {
        currentPeriod = emp.vacationPeriods[emp.vacationPeriods.length - 1];
      }

      return {
        employee: {
          id: emp.id,
          fullName: emp.fullName,
          cpf: emp.cpf,
          email: emp.email,
          admissionDate: emp.admissionDate,
          department: emp.department?.name,
          baseSalary: canManageVacations(user.role) ? emp.baseSalary : null,
        },
        activePeriod: currentPeriod,
        totalPeriodsCount: emp.vacationPeriods.length,
        hasExpiringSoon,
        hasExpired,
      };
    });

    // Contadores adicionais de afastamentos e atestados
    const activeLeavesCount = await prisma.employeeLeave.count({
      where: {
        companyId,
        status: 'ATIVO',
        ...(user.role === UserRole.GESTOR ? { employee: { managerId: user.employeeId } } : {}),
      },
    });

    const pendingCertificatesCount = await prisma.medicalCertificate.count({
      where: {
        companyId,
        status: 'PENDENTE',
        ...(user.role === UserRole.GESTOR ? { employee: { managerId: user.employeeId } } : {}),
      },
    });

    return {
      metrics: {
        employeesOnVacationCount,
        scheduledVacationsCount,
        expiringVacationsCount,
        pendingRequestsCount,
        activeLeavesCount,
        pendingCertificatesCount,
      },
      employees: list,
    };
  }

  /**
   * Checagem de conflitos de agenda (outras férias, afastamentos, atestados ou compensações de banco)
   */
  async checkConflicts(employeeId: string, companyId: string, startDate: Date, endDate: Date, excludeRequestId?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Conflito com outras férias do mesmo colaborador
    const conflictingVacation = await prisma.vacationRequest.findFirst({
      where: {
        employeeId,
        companyId,
        id: excludeRequestId ? { not: excludeRequestId } : undefined,
        status: { in: ['PENDENTE', 'EM_ANALISE', 'APROVADA', 'PROGRAMADA', 'EM_GOZO'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (conflictingVacation) {
      return {
        hasConflict: true,
        type: 'VACATION',
        reason: `Conflito de período com outra solicitação de férias já existente (${new Date(conflictingVacation.startDate).toLocaleDateString('pt-BR')} a ${new Date(conflictingVacation.endDate).toLocaleDateString('pt-BR')}, status: ${conflictingVacation.status}).`,
      };
    }

    // 2. Conflito com afastamentos ou licenças ativas
    const conflictingLeave = await prisma.employeeLeave.findFirst({
      where: {
        employeeId,
        companyId,
        status: { in: ['PENDENTE', 'ATIVO'] },
        startDate: { lte: end },
        OR: [
          { endDate: null },
          { endDate: { gte: start } },
        ],
      },
    });

    if (conflictingLeave) {
      return {
        hasConflict: true,
        type: 'LEAVE',
        reason: `Conflito de agenda: o colaborador possui afastamento/licença ativo (${conflictingLeave.type}) no período solicitado.`,
      };
    }

    // 3. Conflito com folga compensatória de banco de horas (TimeBankCompensationRequest)
    const conflictingCompensation = await prisma.timeBankCompensationRequest.findFirst({
      where: {
        employeeId,
        companyId,
        status: { in: ['RESERVADA', 'APROVADA'] },
        date: { gte: start, lte: end },
      },
    });

    if (conflictingCompensation) {
      return {
        hasConflict: true,
        type: 'TIME_BANK_COMPENSATION',
        reason: `Conflito de agenda: o colaborador possui compensação de banco de horas agendada em ${new Date(conflictingCompensation.date).toLocaleDateString('pt-BR')} dentro do período de férias.`,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Colaborador ou RH solicita período de férias
   */
  async createVacationRequest(user: AuthenticatedUser, dto: CreateVacationRequestDTO) {
    const targetEmployeeId = dto.employeeId || user.employeeId;
    if (!targetEmployeeId) {
      throw new Error('Colaborador não identificado.');
    }

    // Validação de alçada
    if (user.role === UserRole.COLABORADOR && user.employeeId !== targetEmployeeId) {
      throw new Error('Você só pode solicitar férias para si próprio.');
    }

    if (user.role === UserRole.GESTOR) {
      const emp = await prisma.employee.findFirst({ where: { id: targetEmployeeId, companyId: user.companyId } });
      if (!emp || emp.managerId !== user.employeeId) {
        throw new Error('Você só pode solicitar férias para colaboradores de sua equipe.');
      }
    }

    const employee = await prisma.employee.findFirst({
      where: { id: targetEmployeeId, companyId: user.companyId },
      include: { workSchedule: true },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado.');
    }

    const period = await prisma.vacationPeriod.findFirst({
      where: { id: dto.vacationPeriodId, employeeId: targetEmployeeId, companyId: user.companyId },
      include: {
        vacationRequests: {
          where: { status: { in: ['PENDENTE', 'EM_ANALISE', 'APROVADA', 'PROGRAMADA', 'EM_GOZO', 'CONCLUIDA'] } },
        },
      },
    });

    if (!period) {
      throw new Error('Período aquisitivo não encontrado.');
    }

    let startDate: Date;
    let endDate: Date;
    if (typeof dto.startDate === 'string' && dto.startDate.includes('-')) {
      const [sY, sM, sD] = dto.startDate.split('T')[0].split('-').map(Number);
      startDate = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
    } else {
      startDate = new Date(dto.startDate);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    if (typeof dto.endDate === 'string' && dto.endDate.includes('-')) {
      const [eY, eM, eD] = dto.endDate.split('T')[0].split('-').map(Number);
      endDate = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));
    } else {
      endDate = new Date(dto.endDate);
      endDate.setUTCHours(23, 59, 59, 999);
    }

    if (startDate >= endDate) {
      throw new Error('A data inicial deve ser anterior à data final.');
    }

    // Calcula duração real em dias corridos
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== dto.daysCount) {
      throw new Error(`Inconsistência no número de dias: o intervalo de datas resulta em ${diffDays} dias, mas foram informados ${dto.daysCount} dias.`);
    }

    // Validação de fracionamento (CLT Art. 134 § 1º)
    const existingRequests = period.vacationRequests.map((r) => ({ daysCount: r.daysCount }));
    const fractionVal = vacationsCalculationService.validateFractioning(
      dto.daysCount,
      dto.sellDays || 0,
      existingRequests,
      period.daysAcquired
    );

    if (!fractionVal.valid) {
      throw new Error(fractionVal.reason || 'Regra de fracionamento de férias inválida.');
    }

    // Validação de início 2 dias antes de DSR (CLT Art. 134 § 3º)
    const workDays = employee.workSchedule?.daysOfWeek ? employee.workSchedule.daysOfWeek.split(',') : ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const startVal = vacationsCalculationService.validateStartDate(startDate, workDays);
    if (!startVal.valid) {
      throw new Error(startVal.reason || 'Data de início inválida perante a CLT.');
    }

    // Checagem de conflitos
    const conflict = await this.checkConflicts(targetEmployeeId, user.companyId, startDate, endDate);
    if (conflict.hasConflict) {
      throw new Error(conflict.reason);
    }

    const fractionNumber = existingRequests.length + 1;

    // Persistência com status PENDENTE
    const vacationRequest = await prisma.vacationRequest.create({
      data: {
        companyId: user.companyId,
        employeeId: targetEmployeeId,
        vacationPeriodId: period.id,
        startDate,
        endDate,
        daysCount: dto.daysCount,
        sellDays: dto.sellDays || 0,
        fractionNumber,
        status: VacationRequestStatus.PENDENTE,
        employeeNotes: dto.employeeNotes?.trim() || null,
        advance13th: Boolean(dto.advance13th),
      },
    });

    return vacationRequest;
  }

  /**
   * Gestor ou RH delibera sobre a solicitação de férias
   */
  async decideVacationRequest(user: AuthenticatedUser, requestId: string, dto: DecideVacationRequestDTO) {
    if (!canApproveVacations(user.role)) {
      throw new Error('Acesso negado: seu perfil não possui permissão para aprovar ou recusar férias.');
    }

    const request = await prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId: user.companyId },
      include: {
        employee: true,
        vacationPeriod: true,
      },
    });

    if (!request) {
      throw new Error('Solicitação de férias não encontrada.');
    }

    // Bloqueio de autoaprovação
    if (request.employeeId === user.employeeId) {
      throw new Error('Operação negada: não é permitido aprovar ou recusar a própria solicitação de férias.');
    }

    // Gestor restrito aos seus subordinados
    if (user.role === UserRole.GESTOR && request.employee.managerId !== user.employeeId) {
      throw new Error('Acesso negado: o colaborador não é seu subordinado direto.');
    }

    // Apenas PENDENTE ou EM_ANALISE podem ser deliberadas
    if (!['PENDENTE', 'EM_ANALISE'].includes(request.status)) {
      throw new Error(`Transição inválida: solicitação já se encontra no status ${request.status}.`);
    }

    if (dto.status === 'RECUSADA' && (!dto.decisionNotes || !dto.decisionNotes.trim())) {
      throw new Error('É obrigatório informar a justificativa em caso de recusa da solicitação.');
    }

    const targetStatus = dto.status === 'APROVADA' ? 'APROVADA' : 'RECUSADA';

    // Transação ACID
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.vacationRequest.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          decisionNotes: dto.decisionNotes?.trim() || null,
          reviewedById: user.id,
          decidedAt: new Date(),
        },
      });

      // Se aprovada, deduz dias restantes e marca período como PROGRAMADO
      if (targetStatus === 'APROVADA') {
        const totalUsed = request.daysCount + request.sellDays;
        const newRemaining = Math.max(0, request.vacationPeriod.daysRemaining - totalUsed);
        const newUsed = request.vacationPeriod.daysUsed + request.daysCount;
        const newSold = request.vacationPeriod.daysSold + request.sellDays;

        await tx.vacationPeriod.update({
          where: { id: request.vacationPeriodId },
          data: {
            daysUsed: newUsed,
            daysSold: newSold,
            daysRemaining: newRemaining,
            status: newRemaining === 0 ? 'PROGRAMADO' : 'PARCIALMENTE_USUFRUIDO',
          },
        });
      }

      return updated;
    });
  }

  /**
   * Cancelamento de solicitação de férias (pelo colaborador ou RH)
   */
  async cancelVacationRequest(user: AuthenticatedUser, requestId: string, reason?: string) {
    const request = await prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId: user.companyId },
      include: { employee: true, vacationPeriod: true },
    });

    if (!request) {
      throw new Error('Solicitação de férias não encontrada.');
    }

    // Permissão: Colaborador titular, RH ou Admin
    if (user.role === UserRole.COLABORADOR && request.employeeId !== user.employeeId) {
      throw new Error('Você só pode cancelar suas próprias solicitações de férias.');
    }

    if (user.role === UserRole.GESTOR && request.employee.managerId !== user.employeeId) {
      throw new Error('Você só pode cancelar solicitações de colaboradores de sua equipe.');
    }

    // Férias já em gozo ou concluídas não podem ser simplesmente canceladas
    if (['EM_GOZO', 'CONCLUIDA'].includes(request.status)) {
      throw new Error('Não é possível cancelar férias que já foram usufruídas ou estão em gozo.');
    }

    if (request.status === 'CANCELADA') {
      throw new Error('Esta solicitação de férias já foi cancelada.');
    }

    const wasApproved = ['APROVADA', 'PROGRAMADA'].includes(request.status);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.vacationRequest.update({
        where: { id: requestId },
        data: {
          status: VacationRequestStatus.CANCELADA,
          decisionNotes: reason ? `Cancelado: ${reason}` : request.decisionNotes,
        },
      });

      // Se havia sido aprovada, devolve os dias ao período aquisitivo
      if (wasApproved) {
        const totalToRestore = request.daysCount + request.sellDays;
        const restoredRemaining = request.vacationPeriod.daysRemaining + totalToRestore;
        const restoredUsed = Math.max(0, request.vacationPeriod.daysUsed - request.daysCount);
        const restoredSold = Math.max(0, request.vacationPeriod.daysSold - request.sellDays);

        await tx.vacationPeriod.update({
          where: { id: request.vacationPeriodId },
          data: {
            daysRemaining: restoredRemaining,
            daysUsed: restoredUsed,
            daysSold: restoredSold,
            status: restoredUsed === 0 ? 'ADQUIRIDO' : 'PARCIALMENTE_USUFRUIDO',
          },
        });
      }

      return updated;
    });
  }

  /**
   * Confirmação de início ou conclusão de gozo de férias (realização efetiva)
   */
  async confirmVacationTake(user: AuthenticatedUser, requestId: string) {
    if (!canManageVacations(user.role)) {
      throw new Error('Acesso negado: apenas o RH pode registrar a fruição efetiva de férias.');
    }

    const request = await prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId: user.companyId },
    });

    if (!request) {
      throw new Error('Solicitação de férias não encontrada.');
    }

    if (!['APROVADA', 'PROGRAMADA'].includes(request.status)) {
      throw new Error(`Apenas férias aprovadas ou programadas podem ser confirmadas como em gozo/concluídas (status atual: ${request.status}).`);
    }

    const updated = await prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: VacationRequestStatus.CONCLUIDA,
      },
    });

    return updated;
  }
}

export const vacationsService = new VacationsService();
