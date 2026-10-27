import { PrismaClient } from '@prisma/client';
import {
  AuthenticatedUser,
  canManageLeaves,
  canViewSensitiveMedicalData,
  LeaveStatus,
  LeaveType,
  UserRole,
} from '@pontuarh/shared';

const prisma = new PrismaClient();

export interface CreateLeaveDTO {
  employeeId?: string;
  type: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  expectedReturnDate?: string | null;
  reason: string;
  cidCode?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
}

export interface UpdateLeaveDTO {
  endDate?: string | null;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  notes?: string | null;
  status?: string;
}

export class LeavesService {
  /**
   * Listagem de afastamentos com filtros e proteção de dados médicos sensíveis (LGPD)
   */
  async listLeaves(
    companyId: string,
    user: AuthenticatedUser,
    filters?: { employeeId?: string; status?: string; type?: string }
  ) {
    const where: any = { companyId };

    if (user.role === UserRole.COLABORADOR) {
      where.employeeId = user.employeeId;
    } else if (user.role === UserRole.GESTOR) {
      where.employee = { managerId: user.employeeId };
    }

    if (filters?.employeeId) {
      // Se for gestor, garante que o employeeId é subordinado
      if (user.role === UserRole.GESTOR) {
        const emp = await prisma.employee.findFirst({
          where: { id: filters.employeeId, companyId, managerId: user.employeeId },
        });
        if (!emp) {
          throw new Error('Acesso negado: colaborador não pertence à sua equipe.');
        }
      }
      where.employeeId = filters.employeeId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    const leaves = await prisma.employeeLeave.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            email: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const canViewCid = canViewSensitiveMedicalData(user.role);

    return leaves.map((l) => ({
      ...l,
      // Oculta CID médico se o usuário não tiver privilégio de sigilo de saúde
      cidCode: canViewCid || l.employeeId === user.employeeId ? l.cidCode : undefined,
    }));
  }

  /**
   * Registro de afastamento ou licença
   */
  async createLeave(user: AuthenticatedUser, dto: CreateLeaveDTO) {
    const targetEmployeeId = dto.employeeId || user.employeeId;
    if (!targetEmployeeId) {
      throw new Error('Colaborador não identificado.');
    }

    // Apenas RH ou Admin podem registrar afastamentos diretamente; Gestor apenas se for de sua equipe
    if (user.role === UserRole.COLABORADOR) {
      throw new Error('Afastamentos formais e licenças devem ser homologados pelo RH.');
    }

    if (user.role === UserRole.GESTOR) {
      const emp = await prisma.employee.findFirst({
        where: { id: targetEmployeeId, companyId: user.companyId, managerId: user.employeeId },
      });
      if (!emp) {
        throw new Error('Acesso negado: colaborador não pertence à sua equipe.');
      }
    }

    const startDate = new Date(dto.startDate);
    let endDate: Date | null = null;
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
      if (endDate < startDate) {
        throw new Error('A data de término não pode ser anterior à data de início.');
      }
    }

    // Checagem de sobreposição de afastamentos
    const overlapping = await prisma.employeeLeave.findFirst({
      where: {
        employeeId: targetEmployeeId,
        companyId: user.companyId,
        status: { in: ['PENDENTE', 'ATIVO'] },
        startDate: { lte: endDate || new Date('2099-12-31') },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
    });

    if (overlapping) {
      throw new Error(`Conflito de agenda: o colaborador já possui um afastamento ativo (${overlapping.type}) para este período.`);
    }

    const leave = await prisma.employeeLeave.create({
      data: {
        companyId: user.companyId,
        employeeId: targetEmployeeId,
        type: dto.type,
        startDate,
        endDate,
        expectedReturnDate: dto.expectedReturnDate ? new Date(dto.expectedReturnDate) : null,
        reason: dto.reason.trim(),
        cidCode: dto.cidCode?.trim() || null,
        documentUrl: dto.documentUrl || null,
        notes: dto.notes?.trim() || null,
        status: LeaveStatus.ATIVO,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    return leave;
  }

  /**
   * Conclui o afastamento e registra a data real de retorno ao trabalho
   */
  async endLeave(user: AuthenticatedUser, leaveId: string, actualReturnDate: Date = new Date()) {
    if (!canManageLeaves(user.role)) {
      throw new Error('Apenas o RH ou Administrador podem finalizar afastamentos.');
    }

    const leave = await prisma.employeeLeave.findFirst({
      where: { id: leaveId, companyId: user.companyId },
    });

    if (!leave) {
      throw new Error('Afastamento não encontrado.');
    }

    const returnDate = new Date(actualReturnDate);

    const updated = await prisma.employeeLeave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.CONCLUIDO,
        actualReturnDate: returnDate,
        endDate: leave.endDate || returnDate,
      },
    });

    return updated;
  }

  /**
   * Cancelamento de afastamento
   */
  async cancelLeave(user: AuthenticatedUser, leaveId: string, reason?: string) {
    if (!canManageLeaves(user.role)) {
      throw new Error('Apenas o RH ou Administrador podem cancelar afastamentos.');
    }

    const leave = await prisma.employeeLeave.findFirst({
      where: { id: leaveId, companyId: user.companyId },
    });

    if (!leave) {
      throw new Error('Afastamento não encontrado.');
    }

    const updated = await prisma.employeeLeave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.CANCELADO,
        notes: reason ? `Cancelado: ${reason}` : leave.notes,
      },
    });

    return updated;
  }
}

export const leavesService = new LeavesService();
