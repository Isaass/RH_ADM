import { Router, Response } from 'express';
import { platformService } from './platform.service';
import { plansService } from './plans.service';
import { subscriptionsService } from './subscriptions.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { UserRole } from '@pontuarh/shared';

export const platformRouter = Router();

// Todas as rotas administrativas da plataforma são restritas exclusivamente ao perfil SUPER_ADMIN
platformRouter.use(authGuard, rolesGuard([UserRole.SUPER_ADMIN]));

/**
 * Métricas gerais da plataforma SaaS
 * GET /api/platform/metrics
 */
platformRouter.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await platformService.getMetrics(req.user!);
    return res.status(200).json(metrics);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao carregar métricas da plataforma.' });
  }
});

/**
 * Listagem paginada de empresas com busca e filtros
 * GET /api/platform/companies
 */
platformRouter.get('/companies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await platformService.listCompanies(req.user!, req.query);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao listar empresas.' });
  }
});

/**
 * Cadastro de nova empresa e primeiro administrador
 * POST /api/platform/companies
 */
platformRouter.post('/companies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const company = await platformService.createCompany(req.user!, req.body);
    return res.status(201).json(company);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao cadastrar empresa.' });
  }
});

/**
 * Detalhes de uma empresa específica
 * GET /api/platform/companies/:id
 */
platformRouter.get('/companies/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const details = await platformService.getCompanyDetails(req.user!, req.params.id);
    return res.status(200).json(details);
  } catch (err: any) {
    const status = err.message === 'Empresa não encontrada.' ? 404 : 400;
    return res.status(status).json({ error: err.message || 'Erro ao consultar empresa.' });
  }
});

/**
 * Atualização dos dados cadastrais de uma empresa
 * PUT /api/platform/companies/:id
 */
platformRouter.put('/companies/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await platformService.updateCompany(req.user!, req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao atualizar empresa.' });
  }
});

/**
 * Ativação ou Suspensão de empresa
 * PATCH /api/platform/companies/:id/status
 */
platformRouter.patch('/companies/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { active, reason, status } = req.body;
    let result;

    if (active === false || status === 'SUSPENSA') {
      result = await platformService.suspendCompany(req.user!, req.params.id, reason);
    } else {
      result = await platformService.reactivateCompany(req.user!, req.params.id);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao alterar status da empresa.' });
  }
});

/**
 * Listar administradores vinculados à empresa
 * GET /api/platform/companies/:id/administrators
 */
platformRouter.get('/companies/:id/administrators', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admins = await platformService.listCompanyAdministrators(req.user!, req.params.id);
    return res.status(200).json(admins);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao listar administradores da empresa.' });
  }
});

/**
 * Criar administrador vinculado à empresa
 * POST /api/platform/companies/:id/administrators
 */
platformRouter.post('/companies/:id/administrators', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = await platformService.createCompanyAdministrator(req.user!, req.params.id, req.body);
    return res.status(201).json(admin);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao criar administrador.' });
  }
});

/**
 * Ativar ou desativar conta de administrador
 * PATCH /api/platform/companies/:id/administrators/:adminId/status
 */
platformRouter.patch(
  '/companies/:id/administrators/:adminId/status',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { active } = req.body;
      const updated = await platformService.toggleAdministratorStatus(
        req.user!,
        req.params.id,
        req.params.adminId,
        Boolean(active)
      );
      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao alterar status do administrador.' });
    }
  }
);

/**
 * Redefinição de senha de administrador
 * POST /api/platform/companies/:id/administrators/:adminId/reset-password
 */
platformRouter.post(
  '/companies/:id/administrators/:adminId/reset-password',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { newPassword } = req.body;
      const result = await platformService.resetAdministratorPassword(
        req.user!,
        req.params.id,
        req.params.adminId,
        newPassword
      );
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao redefinir senha do administrador.' });
    }
  }
);

// ==========================================
// ROTAS DE GESTÃO DE PLANOS SAAS (Fase 6.2)
// ==========================================

/**
 * Listagem de planos
 * GET /api/platform/plans
 */
platformRouter.get('/plans', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;
    const search = req.query.search as string;
    const plans = await plansService.listPlans({ search, active });
    return res.status(200).json(plans);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao listar planos.' });
  }
});

/**
 * Detalhes de um plano
 * GET /api/platform/plans/:id
 */
platformRouter.get('/plans/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await plansService.getPlanById(req.params.id);
    return res.status(200).json(plan);
  } catch (err: any) {
    const status = err.message === 'Plano não encontrado.' ? 404 : 400;
    return res.status(status).json({ error: err.message || 'Erro ao buscar plano.' });
  }
});

/**
 * Criação de plano
 * POST /api/platform/plans
 */
platformRouter.post('/plans', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await plansService.createPlan(req.user!, req.body);
    return res.status(201).json(plan);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao criar plano.' });
  }
});

/**
 * Edição de plano
 * PUT /api/platform/plans/:id
 */
platformRouter.put('/plans/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await plansService.updatePlan(req.user!, req.params.id, req.body);
    return res.status(200).json(plan);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao atualizar plano.' });
  }
});

/**
 * Ativar / Desativar plano
 * PATCH /api/platform/plans/:id/status
 */
platformRouter.patch('/plans/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { active } = req.body;
    const plan = await plansService.togglePlanStatus(req.user!, req.params.id, Boolean(active));
    return res.status(200).json(plan);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao alterar status do plano.' });
  }
});

/**
 * Exclusão de plano
 * DELETE /api/platform/plans/:id
 */
platformRouter.delete('/plans/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await plansService.deletePlan(req.user!, req.params.id);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao excluir plano.' });
  }
});

// ==========================================
// ROTAS DE ASSINATURAS SAAS (Fase 6.2)
// ==========================================

/**
 * Métricas comerciais e MRR
 * GET /api/platform/subscriptions/metrics
 */
platformRouter.get('/subscriptions/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await subscriptionsService.getCommercialMetrics();
    return res.status(200).json(metrics);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao calcular métricas comerciais.' });
  }
});

/**
 * Listagem paginada de assinaturas
 * GET /api/platform/subscriptions
 */
platformRouter.get('/subscriptions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await subscriptionsService.listSubscriptions(req.query as any);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao listar assinaturas.' });
  }
});

/**
 * Detalhes da assinatura e histórico de uma empresa
 * GET /api/platform/companies/:id/subscription
 */
platformRouter.get('/companies/:id/subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await subscriptionsService.getCompanySubscription(req.params.id);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao consultar assinatura da empresa.' });
  }
});

/**
 * Atribui ou cria assinatura inicial para uma empresa
 * POST /api/platform/companies/:id/subscription
 */
platformRouter.post('/companies/:id/subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await subscriptionsService.assignSubscription(req.user!, req.params.id, req.body);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao atribuir plano.' });
  }
});

/**
 * Altera plano da empresa (Upgrade / Downgrade)
 * PUT /api/platform/companies/:id/subscription
 */
platformRouter.put('/companies/:id/subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await subscriptionsService.changePlan(req.user!, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao alterar plano.' });
  }
});

/**
 * Renova assinatura da empresa
 * POST /api/platform/companies/:id/subscription/renew
 */
platformRouter.post('/companies/:id/subscription/renew', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await subscriptionsService.renewSubscription(req.user!, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao renovar assinatura.' });
  }
});

/**
 * Cancela assinatura da empresa
 * POST /api/platform/companies/:id/subscription/cancel
 */
platformRouter.post('/companies/:id/subscription/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await subscriptionsService.cancelSubscription(req.user!, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao cancelar assinatura.' });
  }
});

/**
 * Define período de teste (Trial) para a empresa
 * POST /api/platform/companies/:id/subscription/trial
 */
platformRouter.post('/companies/:id/subscription/trial', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days, notes } = req.body;
    const result = await subscriptionsService.setTrialPeriod(req.user!, req.params.id, Number(days), notes);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao configurar período de teste.' });
  }
});

