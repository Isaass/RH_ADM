import { Router, Response } from 'express';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { timesheetService } from './timesheet.service';

export const timesheetRouter = Router();
timesheetRouter.use(authGuard);

/**
 * Consulta do espelho de ponto do próprio colaborador autenticado
 */
timesheetRouter.get('/my-summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Usuário sem vínculo de colaborador ativo.' });
    }

    const now = new Date();
    const currentCompetence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const competence = (req.query.competence as string) || currentCompetence;

    const result = await timesheetService.calculateTimesheet(req.user!, employeeId, competence);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Consulta de espelho de ponto por colaborador (RH, Gestores e Admins)
 */
timesheetRouter.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.query.employeeId as string;
    if (!employeeId) {
      return res.status(400).json({ error: 'Parâmetro employeeId é obrigatório.' });
    }

    const now = new Date();
    const currentCompetence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const competence = (req.query.competence as string) || currentCompetence;

    const result = await timesheetService.calculateTimesheet(req.user!, employeeId, competence);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});
