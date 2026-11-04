import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/prisma.service';
import { UserRole, PlanFeature } from '@pontuarh/shared';

/**
 * Middleware centralizado de controle comercial de funcionalidades (Feature Flags por Plano)
 * Valida se a empresa do usuário autenticado possui assinatura ativa e se o plano contratado
 * inclui a funcionalidade requisitada.
 *
 * Super Admin tem bypass global garantido.
 */
export function featureGuard(feature: PlanFeature | string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      // Super Admin possui acesso irrestrito global à plataforma
      if (user.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      const companyId = user.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Empresa do usuário não identificada.' });
      }

      // Buscar assinatura vigente e plano da empresa
      const subscription = await prisma.subscription.findUnique({
        where: { companyId },
        include: { plan: true },
      });

      if (!subscription || !subscription.plan) {
        return res.status(403).json({
          error: 'A empresa não possui uma assinatura de plano SaaS ativa. Entre em contato com a administração da plataforma.',
          code: 'NO_SUBSCRIPTION',
        });
      }

      // 1. Checagem de cancelamento
      if (subscription.status === 'CANCELADA') {
        return res.status(403).json({
          error: 'A assinatura do plano contratado pela empresa foi cancelada.',
          code: 'SUBSCRIPTION_CANCELLED',
        });
      }

      // 2. Checagem de expiração temporal
      const now = new Date();
      const isPastEndDate = subscription.endDate ? now > subscription.endDate : false;
      if (subscription.status === 'EXPIRADA' || isPastEndDate) {
        return res.status(403).json({
          error: 'A assinatura do plano contratado está expirada. Regularize ou renove sua assinatura para utilizar este módulo.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }

      // 3. Checagem de feature flag no plano
      const planFeatures = subscription.plan.features || [];
      if (!planFeatures.includes(feature as string)) {
        return res.status(403).json({
          error: `O módulo "${feature}" não está incluso no plano contratado (${subscription.plan.name}). Solicite um upgrade de plano ao administrador.`,
          code: 'FEATURE_NOT_IN_PLAN',
          feature,
          planName: subscription.plan.name,
        });
      }

      // Empresa ativa, assinatura regular e funcionalidade permitida
      return next();
    } catch (error: any) {
      console.error('[FeatureGuard] Erro ao validar permissões comerciais:', error);
      return res.status(500).json({ error: 'Erro interno ao validar permissões do plano da empresa.' });
    }
  };
}
