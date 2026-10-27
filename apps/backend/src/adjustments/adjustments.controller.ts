import { Router, Response } from 'express';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { adjustmentsService } from './adjustments.service';
import { UserRole } from '@pontuarh/shared';

export const adjustmentsRouter = Router();
adjustmentsRouter.use(authGuard);

/**
 * Colaborador: Criar solicitação de ajuste ou justificativa
 */
adjustmentsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) ||
      (req.headers['idempotency-key'] as string) ||
      req.body.idempotencyKey;

    const request = await adjustmentsService.createRequest(req.user!, {
      ...req.body,
      idempotencyKey,
    });
    return res.status(201).json(request);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Colaborador: Consultar histórico de solicitações próprias
 */
adjustmentsRouter.get('/my-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requests = await adjustmentsService.listMyRequests(req.user!);
    return res.status(200).json(requests);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Colaborador: Cancelar solicitação própria pendente
 */
adjustmentsRouter.patch('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cancelled = await adjustmentsService.cancelRequest(req.user!, req.params.id);
    return res.status(200).json(cancelled);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Central Administrativa: Listar solicitações para análise (RH, Gestor, Admins)
 */
adjustmentsRouter.get(
  '/',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters = {
        status: req.query.status as string,
        employeeId: req.query.employeeId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        type: req.query.type as string,
      };
      const requests = await adjustmentsService.listRequestsForReview(req.user!, filters);
      return res.status(200).json(requests);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Central Administrativa: Detalhes da solicitação com marcações originais para comparação
 */
adjustmentsRouter.get(
  '/:id',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const details = await adjustmentsService.getRequestDetails(req.user!, req.params.id);
      return res.status(200).json(details);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }
);

/**
 * Central Administrativa: Decisão (Aprovar, Recusar, Solicitar Informações, Em Análise)
 */
adjustmentsRouter.patch(
  '/:id/decision',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await adjustmentsService.decideRequest(req.user!, req.params.id, req.body);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);
