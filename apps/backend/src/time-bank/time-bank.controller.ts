import { Router, Response } from 'express';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { timeBankService } from './time-bank.service';
import { UserRole, canManageTimeBank, canApproveCompensations } from '@pontuarh/shared';

export const timeBankRouter = Router();

// Todas as rotas de banco de horas exigem autenticação
timeBankRouter.use(authGuard);

// ----------------------------------------------------------------------------
// 1. POLÍTICAS DE BANCO DE HORAS
// ----------------------------------------------------------------------------

timeBankRouter.get('/policies', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const policies = await timeBankService.listPolicies(companyId);
    return res.status(200).json(policies);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

timeBankRouter.post('/policies', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const policy = await timeBankService.createPolicy(companyId, req.body, req.user!.id);
    return res.status(201).json(policy);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

timeBankRouter.put('/policies/:id', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const policy = await timeBankService.updatePolicy(companyId, req.params.id, req.body, req.user!.id);
    return res.status(200).json(policy);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 2. SALDOS
// ----------------------------------------------------------------------------

// Listagem de saldos de colaboradores da empresa (com restrição estrita de alçada para Gestores)
timeBankRouter.get('/balances', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const filters = {
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as 'POSITIVO' | 'NEGATIVO' | 'ZERADO' | 'EXPIRANDO' | 'VENCIDO' | undefined,
      search: req.query.search as string | undefined,
    };

    const summaries = await timeBankService.listCompanyBalances(companyId, filters, req.user);
    return res.status(200).json(summaries);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Saldo do próprio colaborador autenticado
timeBankRouter.get('/balances/my', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const employeeId = req.user!.employeeId;

    if (!employeeId) {
      return res.status(400).json({ error: 'Usuário não possui colaborador vinculado no sistema.' });
    }

    const summary = await timeBankService.calculateEmployeeBalance(companyId, employeeId);
    return res.status(200).json(summary);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Saldo de um colaborador específico por ID (com restrição estrita para Colaborador e Gestor)
timeBankRouter.get('/balances/:employeeId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const targetEmployeeId = req.params.employeeId;

    if (req.user!.role === UserRole.COLABORADOR && req.user!.employeeId !== targetEmployeeId) {
      return res.status(403).json({ error: 'Acesso negado: Você só pode consultar seu próprio saldo.' });
    }

    if (req.user!.role === UserRole.GESTOR) {
      const targetEmp = await timeBankService.calculateEmployeeBalance(companyId, targetEmployeeId);
      // Verifica se o colaborador pertence à sua equipe
      const empRecord = await (await import('../prisma/prisma.service')).prisma.employee.findUnique({
        where: { id: targetEmployeeId },
      });
      if (!empRecord || empRecord.companyId !== companyId || empRecord.managerId !== req.user!.employeeId) {
        return res.status(403).json({ error: 'Acesso negado: Este colaborador não é seu liderado direto.' });
      }
    }

    const summary = await timeBankService.calculateEmployeeBalance(companyId, targetEmployeeId);
    return res.status(200).json(summary);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 3. LIVRO DE MOVIMENTAÇÕES (LEDGER)
// ----------------------------------------------------------------------------

timeBankRouter.get('/transactions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const filters: any = {
      departmentId: req.query.departmentId as string | undefined,
      competence: req.query.competence as string | undefined,
      type: req.query.type as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      status: req.query.status as string | undefined,
    };

    if (req.user!.role === UserRole.COLABORADOR) {
      filters.employeeId = req.user!.employeeId || 'none';
    } else if (req.user!.role === UserRole.GESTOR) {
      if (req.query.employeeId) {
        const empRecord = await (await import('../prisma/prisma.service')).prisma.employee.findUnique({
          where: { id: req.query.employeeId as string },
        });
        if (!empRecord || empRecord.companyId !== companyId || empRecord.managerId !== req.user!.employeeId) {
          return res.status(403).json({ error: 'Acesso negado: Este colaborador não é seu liderado direto.' });
        }
        filters.employeeId = req.query.employeeId as string;
      } else {
        // Gestor sem especificar employeeId: filtra apenas liderados diretos
        const subordinates = await (await import('../prisma/prisma.service')).prisma.employee.findMany({
          where: { companyId, managerId: req.user!.employeeId },
          select: { id: true },
        });
        const subIds = subordinates.map((s) => s.id);
        const allTransactions = await timeBankService.listTransactions(companyId, filters);
        const filtered = allTransactions.filter((tx) => subIds.includes(tx.employeeId));
        return res.status(200).json(filtered);
      }
    } else if (req.query.employeeId) {
      filters.employeeId = req.query.employeeId as string;
    }

    const transactions = await timeBankService.listTransactions(companyId, filters);
    return res.status(200).json(transactions);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Lançamento manual no ledger (Ajuste por RH/Admin)
timeBankRouter.post('/transactions', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const tx = await timeBankService.createTransaction(companyId, req.body, req.user!.id);
    return res.status(201).json(tx);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Estorno de movimentação consolidada
timeBankRouter.post('/transactions/:id/reverse', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const result = await timeBankService.reverseTransaction(companyId, req.params.id, req.body.reason, req.user!.id);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 4. SOLICITAÇÕES DE COMPENSAÇÃO / FOLGAS
// ----------------------------------------------------------------------------

timeBankRouter.get('/compensations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const filters: any = {
      status: req.query.status as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    if (req.user!.role === UserRole.COLABORADOR) {
      filters.employeeId = req.user!.employeeId;
    } else if (req.query.employeeId) {
      filters.employeeId = req.query.employeeId as string;
    }

    const requests = await timeBankService.listCompensationRequests(companyId, filters, req.user);
    return res.status(200).json(requests);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

timeBankRouter.post('/compensations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    let targetEmployeeId = req.user!.employeeId;

    // Se for RH/Admin criando para outro colaborador
    if (req.body.employeeId && canManageTimeBank(req.user!.role)) {
      targetEmployeeId = req.body.employeeId;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'Colaborador não identificado para a solicitação.' });
    }

    const request = await timeBankService.createCompensationRequest(companyId, targetEmployeeId, req.body, req.user!.id);
    return res.status(201).json(request);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

timeBankRouter.post('/compensations/:id/decide', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const result = await timeBankService.decideCompensationRequest(companyId, req.params.id, req.body, req.user!);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Confirmação de realização da compensação (apenas solicitações APROVADAS podem transicionar para REALIZADA)
timeBankRouter.post('/compensations/:id/realize', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const result = await timeBankService.realizeCompensationRequest(companyId, req.params.id, req.user!, req.body?.notes);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

timeBankRouter.post('/compensations/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const result = await timeBankService.cancelCompensationRequest(companyId, req.params.id, req.user!, req.body?.reason);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 5. TRANSFERÊNCIA PARA PAGAMENTO EM FOLHA
// ----------------------------------------------------------------------------

timeBankRouter.post('/transfer-payroll', rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const result = await timeBankService.transferToPayroll(companyId, req.body, req.user!.id);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});
