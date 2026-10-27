import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../prisma/prisma.service';
import { UserRole } from '@pontuarh/shared';
import { AuthenticatedUser } from '../middlewares/auth.guard';

const JWT_SECRET = process.env.JWT_SECRET || 'pontuarh-jwt-super-secret-key-production-ready';
const JWT_EXPIRES_IN = '8h';

const DEMO_EMAILS = [
  'admin@pontuarh.com.br',
  'rh@pontuarh.com.br',
  'gestor@pontuarh.com.br',
  'colaborador@pontuarh.com.br',
  'contador@pontuarh.com.br',
];

export class AuthService {
  async login(email: string, passwordPlain: string, ipAddress?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Proteção em produção: Contas demonstrativas não podem ser utilizadas
    if (process.env.NODE_ENV === 'production' && DEMO_EMAILS.includes(normalizedEmail)) {
      throw new Error('Acesso negado: Contas demonstrativas de teste não são permitidas em ambiente de produção.');
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        company: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            registrationNumber: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    if (!user.active) {
      throw new Error('Esta conta de usuário foi desativada pelo administrador.');
    }

    const isPasswordValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      companyId: user.companyId,
      employeeId: user.employee?.id || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Registro de Auditoria
    if (user.companyId) {
      await prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          details: `Login efetuado com sucesso pelo perfil ${user.role}.`,
          ipAddress: ipAddress || null,
        },
      });
    }

    return {
      token,
      user: {
        ...payload,
        companyName: user.company?.tradeName || user.company?.name || null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        employee: {
          include: {
            department: true,
            position: true,
            workSchedule: true,
            manager: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      throw new Error('Usuário não encontrado ou inativo.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      companyId: user.companyId,
      company: user.company,
      employeeId: user.employee?.id || null,
      employee: user.employee,
    };
  }
}

export const authService = new AuthService();
