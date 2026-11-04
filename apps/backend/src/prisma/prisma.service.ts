import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  private static instance: PrismaService;

  private constructor() {
    const isTestEnv =
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      !!process.env.PW_TEST_WORKER_INDEX;
    const dbUrl = process.env.DATABASE_URL || '';

    if (isTestEnv) {
      const isAllowedTestDb = dbUrl.includes('test_db') || dbUrl.includes('_test');
      if (!isAllowedTestDb) {
        throw new Error(
          '[SEGURANÇA BLOQUEADA] Execução de testes abortada: O banco configurado não é uma base de testes autorizada.'
        );
      }
    }

    super();
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }
}

export const prisma = PrismaService.getInstance();
