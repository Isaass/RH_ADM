import { prisma } from '../prisma/prisma.service';
import { canManageEmployees } from '@pontuarh/shared';
import { AuthenticatedUser } from '../middlewares/auth.guard';

export interface CreateScheduleDTO {
  name: string;
  type?: string;
  dailyHours?: number;
  weeklyHours?: number;
  expectedEntry: string;
  expectedExit: string;
  expectedBreak: string;
  daysOfWeek?: string;
  toleranceMinutes?: number;
  validFrom?: string;
  validUntil?: string;
  nightShift?: boolean;
  breakFlexible?: boolean;
  description?: string;
}

export interface UpdateScheduleDTO extends Partial<CreateScheduleDTO> {
  active?: boolean;
}

export class SchedulesService {
  /**
   * Listar todas as jornadas da empresa com contagem de colaboradores associados
   */
  async listSchedules(companyId: string) {
    const schedules = await prisma.workSchedule.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return schedules.map((s) => ({
      ...s,
      employeesCount: s._count.employees,
    }));
  }

  /**
   * Buscar detalhes de uma jornada por ID
   */
  async getScheduleById(companyId: string, id: string) {
    const schedule = await prisma.workSchedule.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            registrationNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!schedule || schedule.companyId !== companyId) {
      throw new Error('Jornada de trabalho não encontrada nesta empresa.');
    }

    return {
      ...schedule,
      employeesCount: schedule._count.employees,
    };
  }

  /**
   * Criar uma nova jornada de trabalho com auditoria
   */
  async createSchedule(user: AuthenticatedUser, data: CreateScheduleDTO) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    if (!canManageEmployees(user.role)) {
      throw new Error('Acesso negado: Perfil sem permissão para cadastrar jornadas.');
    }

    if (!data.name || !data.expectedEntry || !data.expectedExit || !data.expectedBreak) {
      throw new Error('Preencha os campos obrigatórios: Nome, Entrada Prevista, Saída Prevista e Intervalo.');
    }

    const dailyHours = data.dailyHours !== undefined ? Number(data.dailyHours) : 8.0;
    const weeklyHours = data.weeklyHours !== undefined ? Number(data.weeklyHours) : 44.0;
    const toleranceMinutes = data.toleranceMinutes !== undefined ? Number(data.toleranceMinutes) : 10;

    const schedule = await prisma.workSchedule.create({
      data: {
        companyId: user.companyId,
        name: data.name.trim(),
        type: data.type || 'FIXA',
        dailyHours,
        weeklyHours,
        expectedEntry: data.expectedEntry,
        expectedExit: data.expectedExit,
        expectedBreak: data.expectedBreak,
        daysOfWeek: data.daysOfWeek || 'MON,TUE,WED,THU,FRI',
        toleranceMinutes,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        nightShift: Boolean(data.nightShift),
        breakFlexible: Boolean(data.breakFlexible),
        description: data.description || null,
        active: true,
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
        action: 'CREATE_WORK_SCHEDULE',
        entity: 'WorkSchedule',
        entityId: schedule.id,
        details: `Criação da jornada "${schedule.name}" (${schedule.type}, ${schedule.weeklyHours}h/sem).`,
      },
    });

    return schedule;
  }

  /**
   * Atualizar uma jornada de trabalho existente
   */
  async updateSchedule(user: AuthenticatedUser, id: string, data: UpdateScheduleDTO) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    if (!canManageEmployees(user.role)) {
      throw new Error('Acesso negado: Perfil sem permissão para atualizar jornadas.');
    }

    const existing = await prisma.workSchedule.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== user.companyId) {
      throw new Error('Jornada de trabalho não encontrada.');
    }

    const updated = await prisma.workSchedule.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : existing.name,
        type: data.type !== undefined ? data.type : existing.type,
        dailyHours: data.dailyHours !== undefined ? Number(data.dailyHours) : existing.dailyHours,
        weeklyHours: data.weeklyHours !== undefined ? Number(data.weeklyHours) : existing.weeklyHours,
        expectedEntry: data.expectedEntry !== undefined ? data.expectedEntry : existing.expectedEntry,
        expectedExit: data.expectedExit !== undefined ? data.expectedExit : existing.expectedExit,
        expectedBreak: data.expectedBreak !== undefined ? data.expectedBreak : existing.expectedBreak,
        daysOfWeek: data.daysOfWeek !== undefined ? data.daysOfWeek : existing.daysOfWeek,
        toleranceMinutes: data.toleranceMinutes !== undefined ? Number(data.toleranceMinutes) : existing.toleranceMinutes,
        validFrom: data.validFrom !== undefined ? (data.validFrom ? new Date(data.validFrom) : null) : existing.validFrom,
        validUntil: data.validUntil !== undefined ? (data.validUntil ? new Date(data.validUntil) : null) : existing.validUntil,
        nightShift: data.nightShift !== undefined ? Boolean(data.nightShift) : existing.nightShift,
        breakFlexible: data.breakFlexible !== undefined ? Boolean(data.breakFlexible) : existing.breakFlexible,
        description: data.description !== undefined ? data.description : existing.description,
        active: data.active !== undefined ? Boolean(data.active) : existing.active,
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
        action: 'UPDATE_WORK_SCHEDULE',
        entity: 'WorkSchedule',
        entityId: updated.id,
        details: `Atualização dos parâmetros da jornada "${updated.name}".`,
      },
    });

    return updated;
  }

  /**
   * Alternar status de ativação da jornada
   */
  async toggleStatus(user: AuthenticatedUser, id: string) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    const schedule = await prisma.workSchedule.findUnique({
      where: { id },
    });

    if (!schedule || schedule.companyId !== user.companyId) {
      throw new Error('Jornada não encontrada.');
    }

    const nextStatus = !schedule.active;

    const updated = await prisma.workSchedule.update({
      where: { id },
      data: { active: nextStatus },
    });

    let auditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) auditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: auditUserId,
        action: nextStatus ? 'ACTIVATE_WORK_SCHEDULE' : 'DEACTIVATE_WORK_SCHEDULE',
        entity: 'WorkSchedule',
        entityId: schedule.id,
        details: `Alteração do status da jornada "${schedule.name}" para ${nextStatus ? 'Ativa' : 'Inativa'}.`,
      },
    });

    return updated;
  }

  /**
   * Associar colaboradores a uma jornada de trabalho
   */
  async assignEmployees(user: AuthenticatedUser, scheduleId: string, employeeIds: string[]) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    const schedule = await prisma.workSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.companyId !== user.companyId) {
      throw new Error('Jornada não encontrada.');
    }

    // Atualiza todos os colaboradores pertencentes à empresa
    const updateResult = await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
        companyId: user.companyId,
      },
      data: {
        workScheduleId: scheduleId,
      },
    });

    let auditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) auditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: auditUserId,
        action: 'ASSIGN_WORK_SCHEDULE',
        entity: 'WorkSchedule',
        entityId: scheduleId,
        details: `Associação de ${updateResult.count} colaboradores à jornada "${schedule.name}".`,
      },
    });

    return {
      message: `${updateResult.count} colaboradores associados com sucesso à jornada "${schedule.name}".`,
      count: updateResult.count,
    };
  }
}

export const schedulesService = new SchedulesService();
