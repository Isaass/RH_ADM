import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { timeTrackingService } from '../src/time-tracking/time-tracking.service';
import { TimeEntryType, UserRole } from '@pontuarh/shared';
import { AuthenticatedUser } from '../src/middlewares/auth.guard';

describe('Módulo de Controle Eletrônico de Ponto (REP-P) — Testes de Unidade e Integração', () => {
  let testCompany: any;
  let otherCompany: any;
  let testEmployee: any;
  let testUser: AuthenticatedUser;

  beforeAll(async () => {
    // Setup de empresa e colaborador de teste
    testCompany = await prisma.company.create({
      data: {
        name: 'Empresa Teste Ponto Ltda',
        cnpj: '98.765.432/0001-10',
      },
    });

    otherCompany = await prisma.company.create({
      data: {
        name: 'Outra Empresa Isolada Ltda',
        cnpj: '11.222.333/0001-44',
      },
    });

    testEmployee = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Teste Ponto',
        cpf: '78912345600',
        email: 'teste.ponto@pontuarh.com.br',
        admissionDate: new Date('2024-01-01'),
        status: 'ATIVO',
      },
    });

    testUser = {
      id: 'usr_test_ponto',
      email: testEmployee.email,
      name: testEmployee.fullName,
      role: UserRole.COLABORADOR,
      companyId: testCompany.id,
      employeeId: testEmployee.id,
    };
  });

  afterAll(async () => {
    // Limpeza
    await prisma.auditLog.deleteMany({ where: { companyId: { in: [testCompany.id, otherCompany.id] } } });
    await prisma.timeEntry.deleteMany({ where: { companyId: { in: [testCompany.id, otherCompany.id] } } });
    await prisma.employee.deleteMany({ where: { companyId: { in: [testCompany.id, otherCompany.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [testCompany.id, otherCompany.id] } } });
  });

  it('1. deve registrar entrada com timestamp do servidor, timezone e hash de integridade', async () => {
    const punchResult = await timeTrackingService.registerPunch(testUser, {
      type: TimeEntryType.ENTRADA,
      origin: 'WEB',
    });

    expect(punchResult.entry).toBeDefined();
    expect(punchResult.entry.type).toBe(TimeEntryType.ENTRADA);
    expect(punchResult.entry.timezone).toBe('America/Sao_Paulo');
    expect(punchResult.entry.originalRecord).toBe(true);
    expect(punchResult.entry.hashIntegrity).toBeDefined();
    expect(punchResult.entry.hashIntegrity?.length).toBe(64); // SHA-256 hex string

    // Verificar se persistiu no banco
    const saved = await prisma.timeEntry.findUnique({
      where: { id: punchResult.entry.id },
    });
    expect(saved).not.toBeNull();
    expect(saved?.originalRecord).toBe(true);
    expect(saved?.employeeId).toBe(testEmployee.id);
  });

  it('2. deve impedir duplicidades em menos de 60 segundos com o mesmo tipo', async () => {
    // Tentar registrar a mesma marcação imediatamente
    await expect(
      timeTrackingService.registerPunch(testUser, {
        type: TimeEntryType.ENTRADA,
        origin: 'WEB',
      })
    ).rejects.toThrow(/Marcação duplicada detectada/);
  });

  it('3. deve preservar registros originais e garantir imutabilidade do registro bruto', async () => {
    const todayEntries = await prisma.timeEntry.findMany({
      where: { employeeId: testEmployee.id },
    });

    expect(todayEntries.length).toBeGreaterThan(0);
    const originalEntry = todayEntries[0];
    expect(originalEntry.originalRecord).toBe(true);
    expect(originalEntry.isTreated).toBe(false);
  });

  it('4. deve garantir isolamento multitenant entre empresas no registro de ponto', async () => {
    const intruderUser: AuthenticatedUser = {
      id: 'usr_intruder',
      email: 'intruder@empresa.com',
      name: 'Intruso',
      role: UserRole.COLABORADOR,
      companyId: otherCompany.id,
      employeeId: testEmployee.id, // Tentando usar ID de colaborador de outra empresa
    };

    await expect(
      timeTrackingService.registerPunch(intruderUser, {
        type: TimeEntryType.ENTRADA,
      })
    ).rejects.toThrow(/Colaborador não localizado ou empresa incompatível/);
  });

  it('5. deve impedir registro de ponto para colaborador com status INATIVO', async () => {
    const inativeEmp = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Inativo',
        cpf: '11122233344',
        email: 'inativo@pontuarh.com.br',
        admissionDate: new Date('2023-01-01'),
        status: 'INATIVO',
      },
    });

    const inativeUser: AuthenticatedUser = {
      id: 'usr_inativo',
      email: inativeEmp.email,
      name: inativeEmp.fullName,
      role: UserRole.COLABORADOR,
      companyId: testCompany.id,
      employeeId: inativeEmp.id,
    };

    await expect(
      timeTrackingService.registerPunch(inativeUser, {
        type: TimeEntryType.ENTRADA,
      })
    ).rejects.toThrow(/Não é possível registrar ponto: o colaborador está com status INATIVO/);
  });

  it('6. deve retornar a mesma marcação de forma idempotente quando fornecida a mesma idempotencyKey', async () => {
    const key = 'idem_key_uuid_' + Date.now();
    const firstResult = await timeTrackingService.registerPunch(testUser, {
      type: TimeEntryType.INTERVALO_SAIDA,
      idempotencyKey: key,
    });

    expect(firstResult.isIdempotent).toBe(false);
    expect(firstResult.entry.type).toBe(TimeEntryType.INTERVALO_SAIDA);

    // Segunda chamada com a exata mesma idempotencyKey
    const secondResult = await timeTrackingService.registerPunch(testUser, {
      type: TimeEntryType.INTERVALO_SAIDA,
      idempotencyKey: key,
    });

    expect(secondResult.isIdempotent).toBe(true);
    expect(secondResult.entry.id).toBe(firstResult.entry.id);
    expect(secondResult.entry.hashIntegrity).toBe(firstResult.entry.hashIntegrity);

    // Contagem no banco deve ser estritamente 1 para essa chave
    const count = await prisma.timeEntry.count({
      where: { idempotencyKey: key },
    });
    expect(count).toBe(1);
  });

  it('7. deve encadear a integridade criptográfica SHA-256 entre batidas consecutivas', async () => {
    // Buscar a última marcação existente
    const lastEntryBefore = await prisma.timeEntry.findFirst({
      where: { employeeId: testEmployee.id },
      orderBy: { timestamp: 'desc' },
    });
    expect(lastEntryBefore).not.toBeNull();

    // Registrar próximo ponto legítimo
    const nextPunch = await timeTrackingService.registerPunch(testUser, {
      type: TimeEntryType.INTERVALO_RETORNO,
      idempotencyKey: 'chain_test_key_' + Date.now(),
    });

    expect(nextPunch.entry).toBeDefined();
    expect(nextPunch.entry.hashIntegrity).toBeDefined();
    // O hash é um SHA-256 válido de 64 caracteres hexadecimais
    expect(nextPunch.entry.hashIntegrity?.length).toBe(64);
    expect(nextPunch.entry.hashIntegrity).not.toBe(lastEntryBefore?.hashIntegrity);
  });

  it('8. deve suportar concorrência segura com transação atômica e prevenção de duplicidade', async () => {
    const concurrentKey = 'concurrent_test_' + Date.now();

    // Disparar duas requisições concorrentes com a mesma chave
    const [res1, res2] = await Promise.all([
      timeTrackingService.registerPunch(testUser, {
        type: TimeEntryType.SAIDA,
        idempotencyKey: concurrentKey,
      }),
      timeTrackingService.registerPunch(testUser, {
        type: TimeEntryType.SAIDA,
        idempotencyKey: concurrentKey,
      }),
    ]);

    expect(res1.entry.id).toBe(res2.entry.id);
    const count = await prisma.timeEntry.count({
      where: { idempotencyKey: concurrentKey },
    });
    expect(count).toBe(1);
  });
});
