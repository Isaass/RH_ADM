import { describe, it, expect } from 'vitest';
import { canViewSalaries, UserRole, isValidCPF } from '@pontuarh/shared';

describe('Serviço de Colaboradores — Políticas de Segurança e Sigilo', () => {
  it('deve rejeitar cadastro com CPF inválido', () => {
    const invalidCPF = '12345678901';
    expect(isValidCPF(invalidCPF)).toBe(false);
  });

  it('deve aprovar cadastro com CPF matematicamente válido', () => {
    const validCPF = '52998224725';
    expect(isValidCPF(validCPF)).toBe(true);
  });

  it('deve ocultar salário para perfis não autorizados (COLABORADOR e GESTOR)', () => {
    const mockEmployee = {
      id: 'emp_1',
      fullName: 'Lucas Ferreira Lima',
      cpf: '52998224725',
      baseSalary: 9800.0,
    };

    // Função que replica a sanitização salarial do EmployeesService
    const sanitizeForRole = (role: UserRole, emp: typeof mockEmployee) => {
      const { baseSalary, ...rest } = emp;
      return {
        ...rest,
        baseSalary: canViewSalaries(role) ? baseSalary : null,
      };
    };

    const sanitizedForColab = sanitizeForRole(UserRole.COLABORADOR, mockEmployee);
    expect(sanitizedForColab.baseSalary).toBeNull();

    const sanitizedForGestor = sanitizeForRole(UserRole.GESTOR, mockEmployee);
    expect(sanitizedForGestor.baseSalary).toBeNull();

    const sanitizedForRH = sanitizeForRole(UserRole.RH, mockEmployee);
    expect(sanitizedForRH.baseSalary).toBe(9800.0);

    const sanitizedForAdmin = sanitizeForRole(UserRole.ADMIN_EMPRESA, mockEmployee);
    expect(sanitizedForAdmin.baseSalary).toBe(9800.0);

    const sanitizedForContador = sanitizeForRole(UserRole.CONTADOR, mockEmployee);
    expect(sanitizedForContador.baseSalary).toBe(9800.0);
  });
});
