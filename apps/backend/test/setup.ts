// Verificação estrita de segurança do banco de dados antes da execução de qualquer teste no Vitest
const dbUrl = process.env.DATABASE_URL || '';
const isAllowedTestDb = dbUrl.includes('test_db') || dbUrl.includes('_test');

if (!isAllowedTestDb) {
  throw new Error(
    '[SEGURANÇA BLOQUEADA] Execução do Vitest interrompida: a URL do banco não aponta para um ambiente de teste isolado autorizado!'
  );
}

