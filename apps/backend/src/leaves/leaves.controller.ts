import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { leavesService } from './leaves.service';

export const leavesRouter = Router();
leavesRouter.use(authGuard);

/**
 * GET /api/leaves
 * Listagem geral para RH / Gestor
 */
leavesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeId, status, type } = req.query;
    const leaves = await leavesService.listLeaves(req.user!.companyId, req.user!, {
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? String(status) : undefined,
      type: type ? String(type) : undefined,
    });
    res.status(200).json(leaves);
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao consultar afastamentos.' });
  }
});

/**
 * GET /api/leaves/my-leaves
 * Colaborador consulta seus próprios afastamentos
 */
leavesRouter.get('/my-leaves', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.employeeId) {
      return res.status(400).json({ error: 'Usuário não possui vínculo funcional de colaborador.' });
    }
    const leaves = await leavesService.listLeaves(req.user!.companyId, req.user!, {
      employeeId: req.user!.employeeId,
    });
    res.status(200).json(leaves);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao consultar afastamentos do colaborador.' });
  }
});

/**
 * POST /api/leaves
 * Registro de novo afastamento pelo RH / Gestor
 */
leavesRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const leave = await leavesService.createLeave(req.user!, req.body);
    res.status(201).json({
      message: 'Afastamento registrado com sucesso!',
      leave,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao registrar afastamento.' });
  }
});

/**
 * POST /api/leaves/:id/end
 * Registro do retorno e encerramento do afastamento
 */
leavesRouter.post('/:id/end', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { actualReturnDate } = req.body;
    const ended = await leavesService.endLeave(req.user!, id, actualReturnDate ? new Date(actualReturnDate) : undefined);
    res.status(200).json({
      message: 'Retorno registrado e afastamento concluído com sucesso!',
      leave: ended,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Apenas o RH') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao finalizar afastamento.' });
  }
});

/**
 * POST /api/leaves/:id/cancel
 * Cancelamento do afastamento
 */
leavesRouter.post('/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const canceled = await leavesService.cancelLeave(req.user!, id, reason);
    res.status(200).json({
      message: 'Afastamento cancelado com sucesso!',
      leave: canceled,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Apenas o RH') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao cancelar afastamento.' });
  }
});
