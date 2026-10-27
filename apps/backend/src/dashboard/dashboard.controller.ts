import { Router, Response } from 'express';
import { prisma } from '../prisma/prisma.service';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { canViewSalaries } from '@pontuarh/shared';

export const dashboardRouter = Router();
dashboardRouter.use(authGuard);

dashboardRouter.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Usuário sem empresa vinculada.' });
    }

    // 1. Contagens reais
    const [totalEmployees, activeEmployees, inactiveEmployees] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, status: 'ATIVO' } }),
      prisma.employee.count({ where: { companyId, status: { not: 'ATIVO' } } }),
    ]);

    // 2. Departamentos com contagem de colaboradores
    const departments = await prisma.department.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    // 3. Auditoria recente
    const recentAudits = await prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { name: true, role: true },
        },
      },
    });

    // 4. Folha estimada (apenas se tiver permissão financeira)
    let estimatedPayroll: number | null = null;
    if (canViewSalaries(req.user!.role)) {
      const activeEmps = await prisma.employee.findMany({
        where: { companyId, status: 'ATIVO' },
        select: { baseSalary: true },
      });
      estimatedPayroll = activeEmps.reduce((acc, curr) => acc + (curr.baseSalary || 0), 0);
    }

    return res.status(200).json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departmentsCount: departments.length,
      departmentsBreakdown: departments.map((d) => ({
        id: d.id,
        name: d.name,
        count: d._count.employees,
      })),
      estimatedPayroll,
      recentAudits,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});
