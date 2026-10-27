import { Router, Response } from 'express';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { timeTrackingService } from './time-tracking.service';

export const timeTrackingRouter = Router();
timeTrackingRouter.use(authGuard);

/**
 * Registro de Ponto Eletrônico (REP-P)
 * Endpoint acessível por qualquer colaborador ativo
 */
timeTrackingRouter.post('/punch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const idempotencyKey = 
      (req.headers['x-idempotency-key'] as string) || 
      (req.headers['idempotency-key'] as string) || 
      req.body.idempotencyKey;

    const result = await timeTrackingService.registerPunch(req.user!, {
      ...req.body,
      idempotencyKey,
      ipAddress,
    });
    return res.status(result.isIdempotent ? 200 : 201).json(result);
  } catch (error: any) {
    return res.status(400).json({
      error: 'Falha no registro de ponto',
      message: error.message,
    });
  }
});

/**
 * Consulta das marcações realizadas no dia de hoje
 */
timeTrackingRouter.get('/today', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await timeTrackingService.getTodayEntries(req.user!);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Consulta de histórico de marcações de um colaborador
 */
timeTrackingRouter.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user!.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Identificador do colaborador não fornecido.' });
    }

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const entries = await timeTrackingService.getEmployeeEntries(req.user!, employeeId, startDate, endDate);
    return res.status(200).json(entries);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});
