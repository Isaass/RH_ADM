import { Router, Response } from 'express';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { schedulesService } from './schedules.service';
import { UserRole } from '@pontuarh/shared';

export const schedulesRouter = Router();
schedulesRouter.use(authGuard);

/**
 * Listar todas as jornadas da empresa
 */
schedulesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Usuário sem empresa vinculada.' });
    }
    const schedules = await schedulesService.listSchedules(companyId);
    return res.status(200).json(schedules);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Obter detalhes de uma jornada específica
 */
schedulesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Usuário sem empresa vinculada.' });
    }
    const schedule = await schedulesService.getScheduleById(companyId, req.params.id);
    return res.status(200).json(schedule);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
});

/**
 * Criar nova jornada de trabalho (RH e Admins)
 */
schedulesRouter.post(
  '/',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schedule = await schedulesService.createSchedule(req.user!, req.body);
      return res.status(201).json(schedule);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Editar jornada existente (RH e Admins)
 */
schedulesRouter.put(
  '/:id',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await schedulesService.updateSchedule(req.user!, req.params.id, req.body);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Alternar status da jornada (ativar/desativar)
 */
schedulesRouter.patch(
  '/:id/status',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await schedulesService.toggleStatus(req.user!, req.params.id);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Associar colaboradores à jornada
 */
schedulesRouter.post(
  '/:id/assign',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeIds } = req.body;
      if (!Array.isArray(employeeIds)) {
        return res.status(400).json({ error: 'employeeIds deve ser um array de IDs de colaboradores.' });
      }
      const result = await schedulesService.assignEmployees(req.user!, req.params.id, employeeIds);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);
