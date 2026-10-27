import { Router, Response } from 'express';
import { employeesService } from './employees.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { UserRole } from '@pontuarh/shared';

export const employeesRouter = Router();

// Aplica autenticação obrigatória para todas as rotas de colaboradores
employeesRouter.use(authGuard);

/**
 * Listagem de colaboradores (filtrada por perfil e empresa)
 */
employeesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, departmentId, status } = req.query;
    const list = await employeesService.listEmployees(req.user!, {
      search: search as string,
      departmentId: departmentId as string,
      status: status as string,
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(400).json({
      error: 'Erro ao listar colaboradores',
      message: error.message,
    });
  }
});

/**
 * Consulta de detalhes de um colaborador
 */
employeesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employee = await employeesService.getEmployeeById(req.user!, req.params.id);
    return res.status(200).json(employee);
  } catch (error: any) {
    return res.status(404).json({
      error: 'Colaborador não encontrado',
      message: error.message,
    });
  }
});

/**
 * Cadastro de colaborador (Apenas ADMIN_EMPRESA e RH)
 */
employeesRouter.post(
  '/',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await employeesService.createEmployee(req.user!, req.body);
      return res.status(201).json(created);
    } catch (error: any) {
      return res.status(400).json({
        error: 'Erro ao cadastrar colaborador',
        message: error.message,
      });
    }
  }
);

/**
 * Atualização cadastral de colaborador
 */
employeesRouter.put(
  '/:id',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await employeesService.updateEmployee(req.user!, req.params.id, req.body);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({
        error: 'Erro ao atualizar colaborador',
        message: error.message,
      });
    }
  }
);

/**
 * Ativar ou desativar colaborador
 */
employeesRouter.patch(
  '/:id/toggle-status',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const toggled = await employeesService.toggleStatus(req.user!, req.params.id);
      return res.status(200).json(toggled);
    } catch (error: any) {
      return res.status(400).json({
        error: 'Erro ao alterar status do colaborador',
        message: error.message,
      });
    }
  }
);
