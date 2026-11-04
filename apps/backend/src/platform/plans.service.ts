import { prisma } from '../prisma/prisma.service';
import { UserRole, CreatePlanDTO, UpdatePlanDTO, PlanFeature } from '@pontuarh/shared';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import { Decimal } from '@prisma/client/runtime/library';

export class PlansService {
  private checkSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Acesso negado: Somente Super Administradores podem gerenciar planos.');
    }
  }

  /**
   * Lista todos os planos cadastrados na plataforma
   */
  async listPlans(query?: { search?: string; active?: boolean }) {
    const where: any = {};

    if (query?.active !== undefined) {
      where.active = query.active;
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const plans = await prisma.plan.findMany({
      where,
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { monthlyPrice: 'asc' },
    });

    return plans.map((p) => ({
      ...p,
      monthlyPrice: Number(p.monthlyPrice),
      annualPrice: p.annualPrice ? Number(p.annualPrice) : null,
    }));
  }

  /**
   * Busca detalhes de um plano pelo ID ou Código
   */
  async getPlanById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
        subscriptions: {
          include: {
            company: {
              select: { id: true, name: true, cnpj: true, status: true },
            },
          },
          take: 10,
        },
      },
    });

    if (!plan) {
      throw new Error('Plano não encontrado.');
    }

    return {
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: plan.annualPrice ? Number(plan.annualPrice) : null,
    };
  }

  /**
   * Cria um novo plano SaaS
   */
  async createPlan(user: AuthenticatedUser, data: CreatePlanDTO) {
    this.checkSuperAdmin(user);

    if (!data.name || !data.name.trim()) {
      throw new Error('O nome do plano é obrigatório.');
    }

    const cleanCode = (data.code || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('O código único do plano é obrigatório.');
    }

    // Unicidade de código
    const existing = await prisma.plan.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new Error(`Já existe um plano cadastrado com o código "${cleanCode}".`);
    }

    if (data.monthlyPrice === undefined || data.monthlyPrice < 0) {
      throw new Error('O valor mensal deve ser maior ou igual a zero.');
    }

    if (data.maxEmployees <= 0) {
      throw new Error('A quantidade máxima de colaboradores deve ser de no mínimo 1.');
    }

    if (data.maxUsers <= 0) {
      throw new Error('A quantidade máxima de usuários deve ser de no mínimo 1.');
    }

    if (data.maxAdmins <= 0) {
      throw new Error('A quantidade máxima de administradores deve ser de no mínimo 1.');
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name.trim(),
        code: cleanCode,
        description: data.description ? data.description.trim() : null,
        monthlyPrice: new Decimal(data.monthlyPrice),
        annualPrice: data.annualPrice !== undefined && data.annualPrice !== null ? new Decimal(data.annualPrice) : null,
        maxEmployees: Number(data.maxEmployees),
        maxUsers: Number(data.maxUsers),
        maxAdmins: Number(data.maxAdmins),
        features: Array.isArray(data.features) ? data.features : [],
        active: data.active !== undefined ? Boolean(data.active) : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_PLAN',
        entity: 'Plan',
        entityId: plan.id,
        details: `Plano "${plan.name}" (${plan.code}) criado pelo Super Admin. Valor: R$ ${plan.monthlyPrice}/mês.`,
      },
    });

    return {
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: plan.annualPrice ? Number(plan.annualPrice) : null,
    };
  }

  /**
   * Atualiza informações e limites de um plano existente
   */
  async updatePlan(user: AuthenticatedUser, id: string, data: UpdatePlanDTO) {
    this.checkSuperAdmin(user);

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Plano não encontrado.');
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('O nome do plano não pode ser vazio.');
      updateData.name = data.name.trim();
    }

    if (data.code !== undefined) {
      const cleanCode = data.code.trim().toUpperCase();
      if (!cleanCode) throw new Error('O código do plano não pode ser vazio.');
      if (cleanCode !== existing.code) {
        const codeTaken = await prisma.plan.findUnique({ where: { code: cleanCode } });
        if (codeTaken) throw new Error(`O código "${cleanCode}" já está em uso por outro plano.`);
        updateData.code = cleanCode;
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.monthlyPrice !== undefined) {
      if (data.monthlyPrice < 0) throw new Error('O valor mensal deve ser maior ou igual a zero.');
      updateData.monthlyPrice = new Decimal(data.monthlyPrice);
    }

    if (data.annualPrice !== undefined) {
      updateData.annualPrice = data.annualPrice !== null ? new Decimal(data.annualPrice) : null;
    }

    if (data.maxEmployees !== undefined) {
      if (data.maxEmployees <= 0) throw new Error('A quantidade máxima de colaboradores deve ser maior que zero.');
      updateData.maxEmployees = Number(data.maxEmployees);
    }

    if (data.maxUsers !== undefined) {
      if (data.maxUsers <= 0) throw new Error('A quantidade máxima de usuários deve ser maior que zero.');
      updateData.maxUsers = Number(data.maxUsers);
    }

    if (data.maxAdmins !== undefined) {
      if (data.maxAdmins <= 0) throw new Error('A quantidade máxima de administradores deve ser maior que zero.');
      updateData.maxAdmins = Number(data.maxAdmins);
    }

    if (data.features !== undefined) {
      updateData.features = Array.isArray(data.features) ? data.features : [];
    }

    if (data.active !== undefined) {
      updateData.active = Boolean(data.active);
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_PLAN',
        entity: 'Plan',
        entityId: updated.id,
        details: `Plano "${updated.name}" atualizado pelo Super Admin.`,
      },
    });

    return {
      ...updated,
      monthlyPrice: Number(updated.monthlyPrice),
      annualPrice: updated.annualPrice ? Number(updated.annualPrice) : null,
    };
  }

  /**
   * Ativa ou desativa um plano
   */
  async togglePlanStatus(user: AuthenticatedUser, id: string, active: boolean) {
    this.checkSuperAdmin(user);

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new Error('Plano não encontrado.');

    const updated = await prisma.plan.update({
      where: { id },
      data: { active },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: active ? 'ACTIVATE_PLAN' : 'DEACTIVATE_PLAN',
        entity: 'Plan',
        entityId: plan.id,
        details: `Plano "${plan.name}" foi ${active ? 'ativado' : 'desativado'} pelo Super Admin.`,
      },
    });

    return {
      ...updated,
      monthlyPrice: Number(updated.monthlyPrice),
      annualPrice: updated.annualPrice ? Number(updated.annualPrice) : null,
    };
  }

  /**
   * Exclusão segura: impede exclusão física se houver assinaturas vinculadas
   */
  async deletePlan(user: AuthenticatedUser, id: string) {
    this.checkSuperAdmin(user);

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true, subscriptionHistories: true } },
      },
    });

    if (!plan) {
      throw new Error('Plano não encontrado.');
    }

    if (plan._count.subscriptions > 0 || plan._count.subscriptionHistories > 0) {
      throw new Error(
        `Não é permitido excluir o plano "${plan.name}" pois existem empresas ou histórico de assinaturas vinculados. Desative o plano para impedir novas contratações.`
      );
    }

    await prisma.plan.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_PLAN',
        entity: 'Plan',
        entityId: id,
        details: `Plano "${plan.name}" (${plan.code}) excluído pelo Super Admin.`,
      },
    });

    return { success: true, message: `Plano "${plan.name}" excluído com sucesso.` };
  }
}

export const plansService = new PlansService();
