import { Router, Response } from 'express';
import { prisma } from '../prisma/prisma.service';
import { subscriptionsService } from '../platform/subscriptions.service';
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
      if (!req.user!.companyId) {
        return res.status(400).json({ error: 'Nenhuma empresa associada a este usuário.' });
      }

      const {
        name,
        tradeName,
        email,
        phone,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
      } = req.body;

      const updated = await prisma.company.update({
        where: { id: req.user!.companyId },
        data: {
          name: name ? name.trim() : undefined,
          tradeName: tradeName !== undefined ? (tradeName ? tradeName.trim() : null) : undefined,
          email: email !== undefined ? (email ? email.trim() : null) : undefined,
          phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
          street: street !== undefined ? (street ? street.trim() : null) : undefined,
          number: number !== undefined ? (number ? number.trim() : null) : undefined,
          complement: complement !== undefined ? (complement ? complement.trim() : null) : undefined,
          neighborhood: neighborhood !== undefined ? (neighborhood ? neighborhood.trim() : null) : undefined,
          city: city !== undefined ? (city ? city.trim() : null) : undefined,
          state: state !== undefined ? (state ? state.trim().toUpperCase() : null) : undefined,
          zipCode: zipCode !== undefined ? (zipCode ? zipCode.replace(/\D/g, '') : null) : undefined,
        },
      });

      // Auditoria
      await prisma.auditLog.create({
        data: {
          companyId: req.user!.companyId,
          userId: req.user!.id,
          action: 'UPDATE_COMPANY',
          entity: 'Company',
          entityId: req.user!.companyId,
          details: 'Atualização dos dados cadastrais e operacionais da empresa.',
        },
      });

      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Consulta a assinatura atual, limites e utilização da empresa logada (ADMIN_EMPRESA / RH)
 * GET /api/companies/current/subscription
 */
companiesRouter.get(
  '/current/subscription',
  rolesGuard([UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR, UserRole.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user!.companyId) {
        return res.status(400).json({ error: 'Nenhuma empresa associada a este usuário.' });
      }

      const usage = await subscriptionsService.getCompanyUsage(req.user!.companyId);
      return res.status(200).json(usage);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao consultar plano da empresa.' });
    }
  }
);

