import { Router, Response } from 'express';
import { prisma } from '../prisma/prisma.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { UserRole } from '@pontuarh/shared';

export const departmentsRouter = Router();
departmentsRouter.use(authGuard);

departmentsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { companyId: req.user!.companyId! },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(departments);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

departmentsRouter.post(
  '/',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, code } = req.body;
      if (!name) return res.status(400).json({ error: 'Nome do departamento é obrigatório.' });

      const created = await prisma.department.create({
        data: {
          companyId: req.user!.companyId!,
          name: name.trim(),
          code: code ? code.trim() : null,
        },
      });
      return res.status(201).json(created);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);
