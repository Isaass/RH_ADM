import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@pontuarh/shared';
import { prisma } from '../prisma/prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || 'pontuarh-jwt-super-secret-key-production-ready';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string | null;
  employeeId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Token de autenticação ausente ou inválido.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;

    // Verificação de suspensão em tempo real:
    // A suspensão de uma empresa tem efeito imediato sobre novas requisições, mesmo com JWT ativo
    if (decoded.role !== UserRole.SUPER_ADMIN && decoded.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: decoded.companyId },
        select: { active: true, status: true },
      });

      if (!company || !company.active || company.status === 'SUSPENSA') {
        return res.status(403).json({
          error: 'Empresa suspensa',
          message: 'O acesso desta empresa aos módulos operacionais foi suspenso pela administração da plataforma.',
          code: 'COMPANY_SUSPENDED',
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Sessão expirada ou inválida',
      message: 'Por favor, realize login novamente.',
    });
  }
}

export function rolesGuard(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado', message: 'Usuário não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não possui permissão para executar esta operação.',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}
