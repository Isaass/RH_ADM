import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { vacationsService } from './vacations.service';
import { vacationsCalculationService } from './vacations-calculation.service';
import { canViewSalaries, UserRole } from '@pontuarh/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const vacationsRouter = Router();

// Aplica autenticação obrigatória em todas as rotas
vacationsRouter.use(authGuard);

/**
 * GET /api/vacations/overview
 * Visão consolidada para RH / Gestores
 */
vacationsRouter.get('/overview', async (req: AuthenticatedRequest, res) => {
  try {
    const { departmentId, search, status } = req.query;
    const overview = await vacationsService.listCompanyVacationOverview(
      req.user!.companyId,
      req.user!,
      {
        departmentId: departmentId ? String(departmentId) : undefined,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
      }
    );
    res.status(200).json(overview);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao carregar visão geral de férias.' });
  }
});

/**
 * POST /api/vacations/periods/sync
 * Sincroniza períodos aquisitivos de um colaborador ou de toda a empresa
 */
vacationsRouter.post('/periods/sync', async (req: AuthenticatedRequest, res) => {
  try {
    if (req.body.employeeId) {
      const periods = await vacationsService.ensureEmployeePeriods(req.body.employeeId, req.user!.companyId);
      return res.status(200).json({ message: 'Períodos sincronizados com sucesso!', periods });
    }
    const employees = await prisma.employee.findMany({
      where: { companyId: req.user!.companyId, status: 'ATIVO' },
      select: { id: true },
    });
    for (const emp of employees) {
      await vacationsService.ensureEmployeePeriods(emp.id, req.user!.companyId);
    }
    res.status(200).json({ message: `${employees.length} colaboradores tiveram seus períodos sincronizados com sucesso!` });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao sincronizar períodos de férias.' });
  }
});

/**
 * GET /api/vacations/periods
 * Consulta períodos: para o colaborador logado ou para employeeId informado (se autorizado)
 */
vacationsRouter.get('/periods', async (req: AuthenticatedRequest, res) => {
  try {
    const targetEmployeeId = (req.query.employeeId as string) || req.user!.employeeId;
    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'Colaborador não identificado.' });
    }
    const periods = await vacationsService.listEmployeePeriods(targetEmployeeId, req.user!);
    res.status(200).json(periods);
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao consultar períodos de férias.' });
  }
});

/**
 * GET /api/vacations/my-periods
 * Colaborador consulta seus próprios períodos aquisitivos e concessivos
 */
vacationsRouter.get('/my-periods', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.employeeId) {
      return res.status(400).json({ error: 'Usuário não possui vínculo funcional de colaborador.' });
    }
    const periods = await vacationsService.listEmployeePeriods(req.user!.employeeId, req.user!);
    res.status(200).json(periods);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao consultar períodos de férias.' });
  }
});

/**
 * GET /api/vacations/employee/:employeeId
 * Gestor ou RH consulta períodos de um colaborador específico
 */
vacationsRouter.get('/employee/:employeeId', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeId } = req.params;
    const periods = await vacationsService.listEmployeePeriods(employeeId, req.user!);
    res.status(200).json(periods);
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao consultar períodos do colaborador.' });
  }
});

/**
 * GET /api/vacations/requests
 * Lista solicitações de férias para a empresa/gestor/colaborador
 */
vacationsRouter.get('/requests', async (req: AuthenticatedRequest, res) => {
  try {
    const where: any = { companyId: req.user!.companyId };
    if (req.user!.role === UserRole.COLABORADOR) {
      where.employeeId = req.user!.employeeId;
    } else if (req.user!.role === UserRole.GESTOR) {
      where.employee = { managerId: req.user!.employeeId };
    }
    if (req.query.employeeId) {
      where.employeeId = String(req.query.employeeId);
    }
    if (req.query.status && req.query.status !== 'TODOS') {
      where.status = String(req.query.status);
    }
    const list = await prisma.vacationRequest.findMany({
      where,
      include: { employee: true, vacationPeriod: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(list);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao listar solicitações de férias.' });
  }
});

/**
 * GET /api/vacations/remuneration-preview
 * Prévia estimativa de remuneração de férias (GET com query params)
 */
vacationsRouter.get('/remuneration-preview', async (req: AuthenticatedRequest, res) => {
  try {
    const targetEmployeeId = (req.query.employeeId as string) || req.user!.employeeId;
    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'Colaborador não informado.' });
    }
    const employee = await prisma.employee.findFirst({
      where: { id: targetEmployeeId, companyId: req.user!.companyId },
    });
    if (!employee) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }
    const vacationDays = Number(req.query.daysCount || req.query.vacationDays || 15);
    const sellDays = Number(req.query.sellDays || 0);

    const baseSalary = employee.baseSalary || 3000;
    const preview = vacationsCalculationService.calculateRemunerationPreview(
      baseSalary,
      vacationDays,
      sellDays
    );
    res.status(200).json(preview);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao calcular prévia de remuneração de férias.' });
  }
});

/**
 * POST /api/vacations/preview
 * Prévia estimativa de remuneração de férias (POST com body)
 */
vacationsRouter.post('/preview', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeId, vacationDays, sellDays } = req.body;
    const targetEmployeeId = employeeId || req.user!.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'Colaborador não informado.' });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: targetEmployeeId, companyId: req.user!.companyId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    if (req.user!.role === UserRole.GESTOR && targetEmployeeId !== req.user!.employeeId && !canViewSalaries(req.user!.role)) {
      return res.status(403).json({ error: 'Acesso negado: visualização de remuneração restrita ao RH ou próprio colaborador.' });
    }

    const baseSalary = employee.baseSalary || 3000;
    const preview = vacationsCalculationService.calculateRemunerationPreview(
      baseSalary,
      Number(vacationDays) || 30,
      Number(sellDays) || 0
    );

    res.status(200).json(preview);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao calcular prévia de remuneração de férias.' });
  }
});

/**
 * POST /api/vacations/requests & POST /api/vacations/request
 * Solicitação de férias pelo colaborador ou agendamento pelo RH
 */
const handleCreateRequest = async (req: AuthenticatedRequest, res: any) => {
  try {
    const request = await vacationsService.createVacationRequest(req.user!, req.body);
    res.status(201).json({
      message: 'Solicitação de férias submetida com sucesso!',
      request,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao submeter solicitação de férias.' });
  }
};

vacationsRouter.post('/requests', handleCreateRequest);
vacationsRouter.post('/request', handleCreateRequest);

/**
 * POST /api/vacations/requests/:id/decide
 * Aprovação ou recusa pelo Gestor / RH
 */
vacationsRouter.post('/requests/:id/decide', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const decided = await vacationsService.decideVacationRequest(req.user!, id, req.body);
    res.status(200).json({
      message: `Solicitação de férias ${decided.status === 'APROVADA' ? 'aprovada' : 'recusada'} com sucesso!`,
      request: decided,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') || error.message?.includes('Operação negada') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao deliberar sobre solicitação de férias.' });
  }
});

/**
 * POST /api/vacations/requests/:id/cancel
 * Cancelamento de férias solicitadas ou aprovadas
 */
vacationsRouter.post('/requests/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const canceled = await vacationsService.cancelVacationRequest(req.user!, id, reason);
    res.status(200).json({
      message: 'Solicitação de férias cancelada com sucesso! Dias estornados ao período aquisitivo.',
      request: canceled,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao cancelar solicitação de férias.' });
  }
});

/**
 * POST /api/vacations/requests/:id/confirm-take
 * Confirmação de fruição efetiva de férias pelo RH
 */
vacationsRouter.post('/requests/:id/confirm-take', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const confirmed = await vacationsService.confirmVacationTake(req.user!, id);
    res.status(200).json({
      message: 'Férias confirmadas e registradas como efetivamente usufruídas.',
      request: confirmed,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao confirmar fruição de férias.' });
  }
});
