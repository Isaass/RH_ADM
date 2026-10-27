import { describe, it, expect } from 'vitest';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserRole, canManageEmployees, canViewSalaries, canApproveAdjustments } from '@pontuarh/shared';

describe('Autenticação e RBAC (Role-Based Access Control)', () => {
  it('deve gerar e verificar hash de senha com bcryptjs', async () => {
    const password = 'MinhaSenhaSegura@2026';
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    const isValid = await bcrypt.compare(password, hash);
    const isInvalid = await bcrypt.compare('OutraSenha', hash);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('deve gerar e decodificar token JWT assinado', () => {
    const secret = 'test-secret-key';
    const payload = {
      id: 'usr_123',
      email: 'gestor@pontuarh.com.br',
      role: UserRole.GESTOR,
      companyId: 'comp_456',
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, secret) as typeof payload;
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(UserRole.GESTOR);
    expect(decoded.companyId).toBe(payload.companyId);
  });

  it('deve validar permissões de gestão de colaboradores por perfil', () => {
    expect(canManageEmployees(UserRole.ADMIN_EMPRESA)).toBe(true);
    expect(canManageEmployees(UserRole.RH)).toBe(true);
    expect(canManageEmployees(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canManageEmployees(UserRole.COLABORADOR)).toBe(false);
    expect(canManageEmployees(UserRole.GESTOR)).toBe(false);
  });

  it('deve validar proteção de sigilo salarial por perfil', () => {
    expect(canViewSalaries(UserRole.ADMIN_EMPRESA)).toBe(true);
    expect(canViewSalaries(UserRole.RH)).toBe(true);
    expect(canViewSalaries(UserRole.CONTADOR)).toBe(true);
    expect(canViewSalaries(UserRole.COLABORADOR)).toBe(false);
    expect(canViewSalaries(UserRole.GESTOR)).toBe(false);
  });

  it('deve validar permissões de aprovação de solicitações', () => {
    expect(canApproveAdjustments(UserRole.GESTOR)).toBe(true);
    expect(canApproveAdjustments(UserRole.RH)).toBe(true);
    expect(canApproveAdjustments(UserRole.ADMIN_EMPRESA)).toBe(true);
    expect(canApproveAdjustments(UserRole.COLABORADOR)).toBe(false);
  });
});
