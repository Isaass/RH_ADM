import { describe, it, expect } from 'vitest';
import { isValidCPF, formatCPF, isValidCNPJ, formatCNPJ, formatCurrencyBRL } from '@pontuarh/shared';

describe('Validações Brasileiras (CLT / Receita Federal)', () => {
  it('deve validar CPFs válidos conhecidos', () => {
    // CPFs válidos matematicamente segundo a fórmula oficial
    expect(isValidCPF('52998224725')).toBe(true);
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('11144477735')).toBe(true);
  });

  it('deve rejeitar CPFs inválidos ou com sequências repetidas', () => {
    expect(isValidCPF('11111111111')).toBe(false);
    expect(isValidCPF('00000000000')).toBe(false);
    expect(isValidCPF('12345678900')).toBe(false);
    expect(isValidCPF('')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
  });

  it('deve formatar CPF corretamente', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });

  it('deve validar CNPJ de teste', () => {
    expect(isValidCNPJ('00000000000191')).toBe(true); // Banco do Brasil
    expect(isValidCNPJ('12345678000195')).toBe(true); // Válido
    expect(isValidCNPJ('12345678000199')).toBe(false); // Dígito inválido
  });

  it('deve formatar valores em Real Brasileiro (BRL)', () => {
    const formatted = formatCurrencyBRL(5432.1);
    expect(formatted).toContain('5.432,10');
  });
});
