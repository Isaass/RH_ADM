import { prisma } from '../prisma/prisma.service';
import {
  UserRole,
  SubscriptionStatus,
  SubscriptionPeriodicity,
  SubscriptionAction,
  AssignSubscriptionDTO,
  ChangeSubscriptionPlanDTO,
  RenewSubscriptionDTO,
  CancelSubscriptionDTO,
  CommercialMetrics,
  CompanyUsage,
  PlanFeature,
} from '@pontuarh/shared';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import { Decimal } from '@prisma/client/runtime/library';

export class SubscriptionsService {
  private checkSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Acesso negado: Somente Super Administradores podem executar esta operação.');
    }
  }

  /**
   * Métricas Comerciais e Financeiras da Plataforma
   */
  async getCommercialMetrics(): Promise<CommercialMetrics> {
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      activeSubsWithPrices,
      plansWithCounts,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ATIVA' } }),
      prisma.subscription.count({ where: { status: 'EM_TESTE' } }),
      prisma.subscription.count({ where: { status: 'EXPIRADA' } }),
      prisma.subscription.count({ where: { status: 'CANCELADA' } }),
      prisma.subscription.findMany({
        where: { status: { in: ['ATIVA', 'EM_TESTE'] } },
        select: { price: true, periodicity: true },
      }),
      prisma.plan.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { subscriptions: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Cálculo do MRR estimado (Receita Mensal Recorrente)
    let estimatedMRR = 0;
    for (const sub of activeSubsWithPrices) {
      const p = Number(sub.price) || 0;
      if (sub.periodicity === 'ANUAL') {
        estimatedMRR += p / 12;
      } else {
        estimatedMRR += p;
      }
    }

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      estimatedMRR: Math.round(estimatedMRR * 100) / 100,
      companiesPerPlan: plansWithCounts.map((p) => ({
        planId: p.id,
        planName: p.name,
        planCode: p.code,
        count: p._count.subscriptions,
      })),
    };
  }

  /**
   * Listagem paginada de assinaturas com filtros
   */
  async listSubscriptions(query?: {
    search?: string;
    planId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query?.planId) {
      where.planId = query.planId;
    }

    if (query?.status && query.status !== 'TODOS') {
      where.status = query.status;
    }

    if (query?.search) {
      const term = query.search.trim();
      where.company = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { tradeName: { contains: term, mode: 'insensitive' } },
          { cnpj: { contains: term } },
        ],
      };
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              tradeName: true,
              cnpj: true,
              email: true,
              active: true,
              status: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              monthlyPrice: true,
              annualPrice: true,
              maxEmployees: true,
              maxUsers: true,
              maxAdmins: true,
              features: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const formatted = subscriptions.map((s) => ({
      ...s,
      price: Number(s.price),
      plan: s.plan
        ? {
            ...s.plan,
            monthlyPrice: Number(s.plan.monthlyPrice),
            annualPrice: s.plan.annualPrice ? Number(s.plan.annualPrice) : null,
          }
        : null,
    }));

    return {
      data: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Retorna a assinatura vigente e histórico completo de uma empresa
   */
  async getCompanySubscription(companyId: string) {
    const [subscription, history, company] = await Promise.all([
      prisma.subscription.findUnique({
        where: { companyId },
        include: {
          plan: true,
        },
      }),
      prisma.subscriptionHistory.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, tradeName: true, cnpj: true, status: true },
      }),
    ]);

    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    return {
      company,
      subscription: subscription
        ? {
            ...subscription,
            price: Number(subscription.price),
            plan: subscription.plan
              ? {
                  ...subscription.plan,
                  monthlyPrice: Number(subscription.plan.monthlyPrice),
                  annualPrice: subscription.plan.annualPrice ? Number(subscription.plan.annualPrice) : null,
                }
              : null,
          }
        : null,
      history: history.map((h) => ({
        ...h,
        price: Number(h.price),
      })),
    };
  }

  /**
   * Atribui ou cria a primeira assinatura para uma empresa
   */
  async assignSubscription(
    user: AuthenticatedUser,
    companyId: string,
    data: AssignSubscriptionDTO
  ) {
    this.checkSuperAdmin(user);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error('Empresa não encontrada.');

    const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new Error('Plano não encontrado.');
    if (!plan.active) throw new Error('O plano selecionado está desativado para novas adesões.');

    const periodicity = data.periodicity === 'ANUAL' ? 'ANUAL' : 'MENSAL';
    const status = data.status || (data.trialDays ? 'EM_TESTE' : 'ATIVA');
    const price = data.price !== undefined ? new Decimal(data.price) : periodicity === 'ANUAL' && plan.annualPrice ? plan.annualPrice : plan.monthlyPrice;

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    let endDate: Date;
    if (data.endDate) {
      endDate = new Date(data.endDate);
    } else if (data.trialDays && data.trialDays > 0) {
      endDate = new Date(startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000);
    } else if (periodicity === 'ANUAL') {
      endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Upsert para garantir unicidade estrita por empresa
      const sub = await tx.subscription.upsert({
        where: { companyId },
        create: {
          companyId,
          planId: plan.id,
          periodicity,
          startDate,
          endDate,
          status,
          price,
          notes: data.notes || null,
        },
        update: {
          planId: plan.id,
          periodicity,
          startDate,
          endDate,
          status,
          price,
          notes: data.notes || null,
        },
      });

      // Gravação no histórico auditado
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: sub.id,
          companyId,
          planId: plan.id,
          planName: plan.name,
          planCode: plan.code,
          action: 'CRIACAO',
          newStatus: status,
          price,
          periodicity,
          startDate,
          endDate,
          performedById: user.id,
          performedByName: user.email,
          reason: data.notes || (data.trialDays ? `Período de teste inicial (${data.trialDays} dias)` : 'Atribuição inicial de plano'),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: user.id,
          action: 'ASSIGN_SUBSCRIPTION',
          entity: 'Subscription',
          entityId: sub.id,
          details: `Plano "${plan.name}" atribuído à empresa "${company.name}". Status: ${status}, Preço: R$ ${price}.`,
        },
      });

      return sub;
    });

    return {
      ...result,
      price: Number(result.price),
    };
  }

  /**
   * Altera o plano contratado (Upgrade / Downgrade)
   */
  async changePlan(
    user: AuthenticatedUser,
    companyId: string,
    data: ChangeSubscriptionPlanDTO
  ) {
    this.checkSuperAdmin(user);

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new Error('A empresa não possui assinatura ativa para alteração. Use a atribuição de plano.');
    }

    const newPlan = await prisma.plan.findUnique({ where: { id: data.newPlanId } });
    if (!newPlan) throw new Error('Novo plano não encontrado.');
    if (!newPlan.active) throw new Error('O novo plano selecionado está inativo.');

    const periodicity = data.periodicity || subscription.periodicity;
    const price = data.price !== undefined ? new Decimal(data.price) : periodicity === 'ANUAL' && newPlan.annualPrice ? newPlan.annualPrice : newPlan.monthlyPrice;

    // Recalcular vencimento proporcional ou reiniciar ciclo
    const now = new Date();
    const endDate = periodicity === 'ANUAL'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: newPlan.id,
          periodicity,
          price,
          startDate: now,
          endDate,
          status: 'ATIVA',
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          companyId,
          planId: newPlan.id,
          planName: newPlan.name,
          planCode: newPlan.code,
          action: 'TROCA_PLANO',
          previousStatus: subscription.status,
          newStatus: 'ATIVA',
          price,
          periodicity,
          startDate: now,
          endDate,
          performedById: user.id,
          performedByName: user.email,
          reason: data.reason || `Alteração de plano de ${subscription.plan.name} para ${newPlan.name}`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: user.id,
          action: 'CHANGE_SUBSCRIPTION_PLAN',
          entity: 'Subscription',
          entityId: subscription.id,
          details: `Plano alterado para "${newPlan.name}". Anterior: "${subscription.plan.name}".`,
        },
      });

      return updated;
    });

    return {
      ...result,
      price: Number(result.price),
    };
  }

  /**
   * Renova uma assinatura existente estendendo a data de expiração
   */
  async renewSubscription(
    user: AuthenticatedUser,
    companyId: string,
    data?: RenewSubscriptionDTO
  ) {
    this.checkSuperAdmin(user);

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!subscription) throw new Error('Assinatura não encontrada para renovação.');

    const monthsToAdd = data?.monthsToAdd || (subscription.periodicity === 'ANUAL' ? 12 : 1);
    const now = new Date();
    // Se a data de término for no passado, inicia a contagem a partir de agora
    const baseDate = subscription.endDate && subscription.endDate > now ? subscription.endDate : now;
    const newEndDate = new Date(baseDate.getTime() + monthsToAdd * 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const renewed = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ATIVA',
          endDate: newEndDate,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          companyId,
          planId: subscription.planId,
          planName: subscription.plan.name,
          planCode: subscription.plan.code,
          action: 'RENOVACAO',
          previousStatus: subscription.status,
          newStatus: 'ATIVA',
          price: subscription.price,
          periodicity: subscription.periodicity,
          startDate: subscription.startDate,
          endDate: newEndDate,
          performedById: user.id,
          performedByName: user.email,
          reason: data?.notes || `Renovação por mais ${monthsToAdd} mês(es).`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: user.id,
          action: 'RENEW_SUBSCRIPTION',
          entity: 'Subscription',
          entityId: subscription.id,
          details: `Assinatura renovada até ${newEndDate.toLocaleDateString('pt-BR')}.`,
        },
      });

      return renewed;
    });

    return {
      ...result,
      price: Number(result.price),
    };
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(
    user: AuthenticatedUser,
    companyId: string,
    data: CancelSubscriptionDTO
  ) {
    this.checkSuperAdmin(user);

    if (!data.reason || !data.reason.trim()) {
      throw new Error('A justificativa do cancelamento é obrigatória.');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!subscription) throw new Error('Assinatura não encontrada.');

    const result = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELADA',
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          companyId,
          planId: subscription.planId,
          planName: subscription.plan.name,
          planCode: subscription.plan.code,
          action: 'CANCELAMENTO',
          previousStatus: subscription.status,
          newStatus: 'CANCELADA',
          price: subscription.price,
          periodicity: subscription.periodicity,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          performedById: user.id,
          performedByName: user.email,
          reason: data.reason.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: user.id,
          action: 'CANCEL_SUBSCRIPTION',
          entity: 'Subscription',
          entityId: subscription.id,
          details: `Assinatura cancelada pelo Super Admin. Motivo: ${data.reason.trim()}`,
        },
      });

      return cancelled;
    });

    return {
      ...result,
      price: Number(result.price),
    };
  }

  /**
   * Define período de teste (Trial)
   */
  async setTrialPeriod(
    user: AuthenticatedUser,
    companyId: string,
    days: number,
    notes?: string
  ) {
    this.checkSuperAdmin(user);

    if (days <= 0) throw new Error('A quantidade de dias de teste deve ser maior que zero.');

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!subscription) throw new Error('Assinatura não encontrada.');

    const now = new Date();
    const newEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'EM_TESTE',
          endDate: newEndDate,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          companyId,
          planId: subscription.planId,
          planName: subscription.plan.name,
          planCode: subscription.plan.code,
          action: 'ALTERACAO_STATUS',
          previousStatus: subscription.status,
          newStatus: 'EM_TESTE',
          price: subscription.price,
          periodicity: subscription.periodicity,
          startDate: now,
          endDate: newEndDate,
          performedById: user.id,
          performedByName: user.email,
          reason: notes || `Período de teste configurado para ${days} dias.`,
        },
      });

      return updated;
    });

    return {
      ...result,
      price: Number(result.price),
    };
  }

  /**
   * Consulta a utilização atual da empresa em relação aos limites do plano contratado
   */
  async getCompanyUsage(companyId: string): Promise<CompanyUsage> {
    const [subscription, activeEmployeesCount, usersCount, adminsCount] = await Promise.all([
      prisma.subscription.findUnique({
        where: { companyId },
        include: { plan: true },
      }),
      prisma.employee.count({
        where: { companyId, status: { not: 'INATIVO' } },
      }),
      prisma.user.count({
        where: { companyId },
      }),
      prisma.user.count({
        where: { companyId, role: UserRole.ADMIN_EMPRESA },
      }),
    ]);

    if (!subscription || !subscription.plan) {
      throw new Error('A empresa não possui um plano contratado.');
    }

    const plan = subscription.plan;
    const now = new Date();

    const isExpired = subscription.status === 'EXPIRADA' || Boolean(subscription.endDate && now > subscription.endDate);
    const isTrial = subscription.status === 'EM_TESTE';

    let daysRemaining: number | null = null;
    if (subscription.endDate) {
      const diffMs = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Mapeamento de todas as features possíveis
    const allFeatures: PlanFeature[] = [
      PlanFeature.DASHBOARD,
      PlanFeature.COLABORADORES,
      PlanFeature.PONTO_ELETRONICO,
      PlanFeature.ESPELHO_PONTO,
      PlanFeature.AJUSTES,
      PlanFeature.BANCO_HORAS,
      PlanFeature.FERIAS,
      PlanFeature.DOCUMENTOS,
      PlanFeature.FOLHA_PAGAMENTO,
      PlanFeature.RELATORIOS,
    ];

    const featuresMap: Record<string, boolean> = {};
    for (const f of allFeatures) {
      featuresMap[f] = plan.features.includes(f);
    }

    const formattedPlan = {
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: plan.annualPrice ? Number(plan.annualPrice) : null,
    };

    return {
      plan: formattedPlan,
      subscription: {
        ...subscription,
        price: Number(subscription.price),
        plan: formattedPlan,
      },
      currentUsage: {
        employees: activeEmployeesCount,
        maxEmployees: plan.maxEmployees,
        employeesPercentage: Math.min(100, Math.round((activeEmployeesCount / plan.maxEmployees) * 100)),
        users: usersCount,
        maxUsers: plan.maxUsers,
        usersPercentage: Math.min(100, Math.round((usersCount / plan.maxUsers) * 100)),
        admins: adminsCount,
        maxAdmins: plan.maxAdmins,
        adminsPercentage: Math.min(100, Math.round((adminsCount / plan.maxAdmins) * 100)),
      },
      features: featuresMap,
      isExpired,
      isTrial,
      daysRemaining,
    };
  }
}

export const subscriptionsService = new SubscriptionsService();
