import { Router, Response } from 'express';
import { prisma } from '../prisma/prisma.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { UserRole } from '@pontuarh/shared';

export const companiesRouter = Router();
companiesRouter.use(authGuard);

companiesRouter.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user!.companyId) {
      return res.status(404).json({ error: 'Nenhuma empresa associada a este usuário.' });
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: {
        _count: {
          select: {
            employees: true,
            departments: true,
            positions: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    return res.status(200).json(company);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

companiesRouter.put(
  '/current',
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, tradeName, email, phone } = req.body;
      const updated = await prisma.company.update({
        where: { id: req.user!.companyId! },
        data: {
          name: name ? name.trim() : undefined,
          tradeName: tradeName ? tradeName.trim() : undefined,
          email: email ? email.trim() : undefined,
          phone: phone ? phone.trim() : undefined,
        },
      });

      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);
