import { Router, Response } from 'express';
import { prisma } from '../prisma/prisma.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { UserRole } from '@pontuarh/shared';

export const positionsRouter = Router();
positionsRouter.use(authGuard);

positionsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const positions = await prisma.position.findMany({
      where: { companyId: req.user!.companyId! },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { title: 'asc' },
    });
    return res.status(200).json(positions);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

positionsRouter.post(
  '/',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, cboCode, description } = req.body;
      if (!title) return res.status(400).json({ error: 'Título do cargo é obrigatório.' });

      const created = await prisma.position.create({
        data: {
          companyId: req.user!.companyId!,
          title: title.trim(),
          cboCode: cboCode ? cboCode.trim() : null,
          description: description || null,
        },
      });
      return res.status(201).json(created);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);
