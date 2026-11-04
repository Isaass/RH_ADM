import { describe, it, expect } from 'vitest';

describe('Segurança do Banco de Dados em Ambiente de Teste', () => {
  it('deve validar que a URL do banco contém identificador explícito de teste', () => {
    const currentUrl = process.env.DATABASE_URL || '';
    const isTestDb = currentUrl.includes('test_db') || currentUrl.includes('_test');
    expect(isTestDb).toBe(true);
  });

  it('deve simular bloqueio caso uma URL não autorizada de produção seja injetada', () => {
    const fakeProdUrl = 'postgresql://pontuarh:secret@127.0.0.1:5432/pontuarh_db?schema=public';
    const isAllowed = fakeProdUrl.includes('test_db') || fakeProdUrl.includes('_test');
    expect(isAllowed).toBe(false);

    // Valida que a regra de segurança dispara erro se executada com banco não autorizado
    const assertDbAllowed = (url: string) => {
      if (!url.includes('test_db') && !url.includes('_test')) {
        throw new Error('[SEGURANÇA BLOQUEADA] Execução em banco operacional é proibida em testes.');
      }
    };

    expect(() => assertDbAllowed(fakeProdUrl)).toThrowError(/SEGURANÇA BLOQUEADA/);
  });
});

