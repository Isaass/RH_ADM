import { Router, Response } from 'express';
import { onboardingService } from './onboarding.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { UserRole } from '@pontuarh/shared';

export const onboardingRouter = Router();

onboardingRouter.use(authGuard);

/**
 * Consulta o status e progresso do onboarding da empresa atual
 * GET /api/onboarding/status
 */
onboardingRouter.get(
  '/status',
  rolesGuard([UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Nenhuma organização vinculada ao usuário.' });
      }

      const status = await onboardingService.getStatus(companyId);
      return res.status(200).json(status);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao consultar status de onboarding.' });
    }
  }
);

/**
 * Atualiza o passo atual do onboarding (progresso e continuidade)
 * PUT /api/onboarding/step
 */
onboardingRouter.put(
  '/step',
  rolesGuard([UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Nenhuma organização vinculada ao usuário.' });
      }

      const step = Number(req.body.step);
      if (!step || isNaN(step)) {
        return res.status(400).json({ error: 'O parâmetro step deve ser um número válido.' });
      }

      const result = await onboardingService.updateStep(companyId, step);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao atualizar etapa de onboarding.' });
    }
  }
);

/**
 * Finaliza o onboarding da empresa
 * POST /api/onboarding/complete
 */
onboardingRouter.post(
  '/complete',
  rolesGuard([UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Nenhuma organização vinculada ao usuário.' });
      }

      const result = await onboardingService.completeOnboarding(companyId, req.user!.id);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao concluir configuração inicial.' });
    }
  }
);

