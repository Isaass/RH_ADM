import * as crypto from 'crypto';
import { prisma } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import { UserRole, RequestStatus, canApproveAdjustments } from '@pontuarh/shared';
import { timesheetService } from '../timesheet/timesheet.service';
import { timeBankService } from '../time-bank/time-bank.service';

export interface CreateAdjustmentDTO {
  date: string;
  type: string;
  entryType?: string;
  proposedTime?: string;
  justification: string;
  attachmentUrl?: string;
  idempotencyKey?: string;
}

export function validateAttachment(attachmentUrl?: string | null) {
  if (!attachmentUrl) return;
  const sanitized = attachmentUrl.trim().toLowerCase();
  if (sanitized.startsWith('javascript:') || sanitized.startsWith('data:text/html') || sanitized.startsWith('data:application/x-')) {
    throw new Error('Tipo de anexo inválido ou potencialmente inseguro.');
  }
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  const hasValidExt = allowedExtensions.some((ext) => sanitized.split('?')[0].endsWith(ext));
  if (!hasValidExt) {
    throw new Error('Extensão de anexo não permitida. Formatos aceitos: PDF, PNG, JPG, JPEG, WEBP.');
  }
}

export interface DecisionDTO {
  status: RequestStatus | string;
  decisionNotes?: string;
}

export class AdjustmentsService {
  /**
   * Colaborador cria solicitação de ajuste ou justificativa
   */
  async createRequest(user: AuthenticatedUser, data: CreateAdjustmentDTO) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    let targetEmployeeId = user.employeeId;
    if (!targetEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: user.id, companyId: user.companyId },
      });
      targetEmployeeId = emp?.id || null;
    }

    if (!targetEmployeeId) {
      throw new Error('Usuário não possui vínculo de colaborador ativo para solicitar ajustes.');
    }

    if (!data.date || !data.type || !data.justification) {
      throw new Error('Campos obrigatórios: Data, Tipo da Ocorrência e Justificativa.');
    }

    // Validação estrita de segurança para arquivos anexados
    if (data.attachmentUrl) {
      validateAttachment(data.attachmentUrl);
    }

    // Idempotência de solicitações de ajuste
    if (data.idempotencyKey) {
      const existing = await prisma.timeAdjustmentRequest.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              registrationNumber: true,
            },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    let requestDate: Date;
    if (typeof data.date === 'string' && data.date.includes('-')) {
      const [y, m, d] = data.date.split('T')[0].split('-').map(Number);
      requestDate = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      requestDate = new Date(data.date);
    }

    if (isNaN(requestDate.getTime())) {
      throw new Error('Data informada é inválida.');
    }

    const request = await prisma.timeAdjustmentRequest.create({
      data: {
        companyId: user.companyId,
        employeeId: targetEmployeeId,
        date: requestDate,
        type: data.type,
        entryType: data.entryType || null,
        proposedTime: data.proposedTime || null,
        justification: data.justification.trim(),
        attachmentUrl: data.attachmentUrl || null,
        idempotencyKey: data.idempotencyKey || null,
        status: RequestStatus.PENDENTE,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            registrationNumber: true,
          },
        },
      },
    });

    // Auditoria
    let auditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) auditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: auditUserId,
        action: 'CREATE_ADJUSTMENT_REQUEST',
        entity: 'TimeAdjustmentRequest',
        entityId: request.id,
        details: `Solicitação de ajuste de ponto criada (${data.type}) para a data ${data.date}.`,
      },
    });

    return request;
  }

  /**
   * Listar solicitações do próprio colaborador logado
   */
  async listMyRequests(user: AuthenticatedUser) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada.');
    }

    let targetEmployeeId = user.employeeId;
    if (!targetEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: user.id, companyId: user.companyId },
      });
      targetEmployeeId = emp?.id || null;
    }

    if (!targetEmployeeId) {
      return [];
    }

    return prisma.timeAdjustmentRequest.findMany({
      where: {
        employeeId: targetEmployeeId,
        companyId: user.companyId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
          },
        },
      },
    });
  }

  /**
   * Cancelar uma solicitação própria (se ainda PENDENTE)
   */
  async cancelRequest(user: AuthenticatedUser, requestId: string) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada.');
    }

    const request = await prisma.timeAdjustmentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.companyId !== user.companyId) {
      throw new Error('Solicitação não encontrada.');
    }

    if (request.employeeId !== user.employeeId) {
      throw new Error('Você só pode cancelar suas próprias solicitações.');
    }

    if (request.status !== RequestStatus.PENDENTE) {
      throw new Error(`Não é possível cancelar uma solicitação com status ${request.status}.`);
    }

    const updated = await prisma.timeAdjustmentRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.CANCELADA },
    });

    let cancelAuditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) cancelAuditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: cancelAuditUserId,
        action: 'CANCEL_ADJUSTMENT_REQUEST',
        entity: 'TimeAdjustmentRequest',
        entityId: request.id,
        details: 'Cancelamento de solicitação de ajuste pelo colaborador.',
      },
    });

    return updated;
  }

  /**
   * Listar solicitações para a Central Administrativa (RH, Gestores e Admins)
   * Com filtro de gestor restrito apenas aos seus liderados diretos
   */
  async listRequestsForReview(
    user: AuthenticatedUser,
    filters: {
      status?: string;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
    }
  ) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada.');
    }

    if (!canApproveAdjustments(user.role)) {
      throw new Error('Acesso negado: Perfil não possui permissão para analisar solicitações de ponto.');
    }

    const whereClause: any = {
      companyId: user.companyId,
    };

    if (filters.status && filters.status !== 'TODOS') {
      whereClause.status = filters.status;
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    if (filters.employeeId) {
      whereClause.employeeId = filters.employeeId;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    // Regra estrita de Gestor: visualizar SOMENTE liderados sob sua responsabilidade
    if (user.role === UserRole.GESTOR) {
      if (!user.employeeId) {
        return [];
      }
      whereClause.employee = {
        managerId: user.employeeId,
      };
    }

    return prisma.timeAdjustmentRequest.findMany({
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

  /**
   * Consultar detalhes de uma solicitação com marcações originais do dia para comparação
   */
  async getRequestDetails(user: AuthenticatedUser, requestId: string) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada.');
    }

    const request = await prisma.timeAdjustmentRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
            workSchedule: true,
          },
        },
      },
    });

    if (!request || request.companyId !== user.companyId) {
      throw new Error('Solicitação não encontrada nesta empresa.');
    }

    // Validação de acesso do Gestor
    if (user.role === UserRole.GESTOR && request.employee.managerId !== user.employeeId) {
      throw new Error('Acesso negado: Este colaborador não é seu liderado direto.');
    }

    // Buscar marcações brutas daquele dia para comparação visual
    const requestDate = new Date(request.date);
    const startOfDay = new Date(requestDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(requestDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dayEntries = await prisma.timeEntry.findMany({
      where: {
        companyId: user.companyId,
        employeeId: request.employeeId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return {
      request,
      originalDayEntries: dayEntries,
    };
  }

  /**
   * Decisão do Gestor ou RH: Aprovar, Recusar, Solicitar Informações ou Em Análise
   * Princípio fundamental: AO APROVAR, APLICA O TRATAMENTO SEM ALTERAR A MARCAÇÃO ORIGINAL!
   */
  async decideRequest(user: AuthenticatedUser, requestId: string, decision: DecisionDTO) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada.');
    }

    if (!canApproveAdjustments(user.role)) {
      throw new Error('Acesso negado: Perfil não possui permissão para aprovar ou recusar solicitações.');
    }

    const request = await prisma.timeAdjustmentRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!request || request.companyId !== user.companyId) {
      throw new Error('Solicitação não encontrada.');
    }

    // Impossibilidade de aprovar solicitações próprias (segregação de funções e prevenção de conflito de interesses)
    if (request.employeeId === user.employeeId || (request.employee.userId && request.employee.userId === user.id)) {
      throw new Error('Acesso negado: Não é permitido aprovar ou reprovar a sua própria solicitação de ajuste.');
    }

    // Validação de Gestor
    if (user.role === UserRole.GESTOR && request.employee.managerId !== user.employeeId) {
      throw new Error('Acesso negado: Este colaborador não é seu liderado direto.');
    }

    const nextStatus = decision.status;
    const validStatuses = [
      RequestStatus.APROVADA,
      RequestStatus.RECUSADA,
      RequestStatus.EM_ANALISE,
      RequestStatus.AGUARDANDO_INFORMACOES,
    ];

    if (!validStatuses.includes(nextStatus as RequestStatus)) {
      throw new Error(`Status de decisão inválido: ${nextStatus}.`);
    }

    if (nextStatus === RequestStatus.RECUSADA && (!decision.decisionNotes || !decision.decisionNotes.trim())) {
      throw new Error('É obrigatório justificar o motivo da recusa da solicitação.');
    }

    let reviewerUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) reviewerUserId = u.id;
    }

    // Atualizar a solicitação
    const updatedRequest = await prisma.timeAdjustmentRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        reviewerId: reviewerUserId,
        decisionNotes: decision.decisionNotes || null,
        decidedAt: new Date(),
      },
      include: { employee: true },
    });

    // SE APROVADA: Aplica o tratamento correspondente SEM TOCAR NO REGISTRO ORIGINAL!
    if (nextStatus === RequestStatus.APROVADA) {
      const base = new Date(request.date);
      const punchDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0);
      if (request.proposedTime && request.proposedTime.includes(':')) {
        const [hours, minutes] = request.proposedTime.split(':').map((v) => parseInt(v, 10));
        if (!isNaN(hours) && !isNaN(minutes)) {
          punchDate.setHours(hours, minutes, 0, 0);
        }
      }

      const treatmentId = 'trt_' + crypto.randomUUID().replace(/-/g, '').substring(0, 20);
      const hashIntegrity = crypto
        .createHash('sha256')
        .update(`${treatmentId}|${user.companyId}|${request.employeeId}|${punchDate.toISOString()}|TRATADO|${request.id}`)
        .digest('hex');

      // Cria a marcação tratada preservando estritamente originalRecord: false
      await prisma.timeEntry.create({
        data: {
          id: treatmentId,
          companyId: user.companyId,
          employeeId: request.employeeId,
          timestamp: punchDate,
          timezone: 'America/Sao_Paulo',
          type: request.entryType || 'ENTRADA',
          origin: 'WEB_AJUSTE_APROVADO',
          location: `Ajuste aprovado por ${user.name} (${user.role})`,
          originalRecord: false, // MARCAÇÃO TRATADA!
          isTreated: true,
          treatmentType: request.type,
          adjustmentRequestId: request.id,
          hashIntegrity,
        },
      });

      // Sincronização com o Banco de Horas (Fase 3):
      // Recalcula o espelho para a competência afetada e gera ajuste no ledger caso haja alteração de saldo
      try {
        const competenceStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
        const dayStr = `${competenceStr}-${String(base.getDate()).padStart(2, '0')}`;
        const timesheet = await timesheetService.calculateTimesheet(user, request.employeeId, competenceStr);
        const dayReport = timesheet.days.find((d) => d.date === dayStr);
        if (dayReport && dayReport.timeBankMinutes !== undefined) {
          await timeBankService.syncDayAdjustment(
            user.companyId,
            request.employeeId,
            dayStr,
            dayReport.timeBankMinutes,
            reviewerUserId || undefined
          );
        }
      } catch (syncErr: any) {
        console.warn('Alerta na sincronização automática de ponto com banco de horas:', syncErr.message);
      }
    }

    // Trilha de auditoria
    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: reviewerUserId,
        action: nextStatus === RequestStatus.APROVADA ? 'APPROVE_ADJUSTMENT' : 'REJECT_ADJUSTMENT',
        entity: 'TimeAdjustmentRequest',
        entityId: request.id,
        details: `Decisão de ${nextStatus} na solicitação do colaborador ${request.employee.fullName}. Notas: ${decision.decisionNotes || 'Sem observações adicionais.'}`,
      },
    });

    return updatedRequest;
  }
}

export const adjustmentsService = new AdjustmentsService();
