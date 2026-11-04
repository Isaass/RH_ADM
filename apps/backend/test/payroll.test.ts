import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@pontuarh/shared';
import { payrollService } from '../src/payroll/payroll.service';

const prisma = new PrismaClient();

describe('Pontua RH — Fase 5: Gestão Financeira e Prévia de Folha de Pagamento', () => {
  let companyA: any;
  let companyB: any;
  let deptA: any;
  let employee1: any;
  let employee2: any;
  let employeeB: any;

  let hrUserA: any;
  let accountantUserA: any;
  let colabUserA: any;
  let hrUserB: any;

  const testCompetence = '2026-10';

  beforeAll(async () => {
    // 1. Criar empresas para isolamento multiempresa
    const uniqueSuffix = Date.now().toString().slice(-8);
    companyA = await prisma.company.create({
      data: {
        name: `Tech Payroll A ${uniqueSuffix}`,
        cnpj: `11${uniqueSuffix}000199`.slice(0, 14),
      },
    });

    companyB = await prisma.company.create({
      data: {
        name: `Tech Payroll B ${uniqueSuffix}`,
        cnpj: `22${uniqueSuffix}000199`.slice(0, 14),
      },
    });

    deptA = await prisma.department.create({
      data: { companyId: companyA.id, name: 'Engenharia e Finanças' },
    });

    // 2. Colaborador 1: Salário R$ 4.400,00 (padrão 44h semanais -> divisor 220, valor/hora = R$ 20,00)
    employee1 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Lucas Folha Silva',
        cpf: `77${uniqueSuffix}111`.slice(0, 11),
        email: `lucas_${uniqueSuffix}@tech.com`,
        admissionDate: new Date('2024-01-10T00:00:00.000Z'),
        departmentId: deptA.id,
        baseSalary: 4400.0,
      },
    });

    // 3. Colaborador 2: Salário R$ 6.000,00
    employee2 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Mariana Folha Souza',
        cpf: `88${uniqueSuffix}222`.slice(0, 11),
        email: `mariana_${uniqueSuffix}@tech.com`,
        admissionDate: new Date('2023-05-15T00:00:00.000Z'),
        departmentId: deptA.id,
        baseSalary: 6000.0,
      },
    });

    // 4. Colaborador Empresa B
    employeeB = await prisma.employee.create({
      data: {
        companyId: companyB.id,
        fullName: 'Roberto Outra Empresa',
        cpf: `99${uniqueSuffix}333`.slice(0, 11),
        email: `roberto_${uniqueSuffix}@empb.com`,
        admissionDate: new Date('2024-02-01T00:00:00.000Z'),
        baseSalary: 5000.0,
      },
    });

    // 5. Criar registros reais de User para respeitar Foreign Key em AuditLog
    const dbHrA = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: `rh_${uniqueSuffix}@tech.com`,
        name: 'Gestora RH',
        passwordHash: 'dummyhash',
        role: UserRole.RH,
      },
    });

    const dbAccA = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: `contador_${uniqueSuffix}@tech.com`,
        name: 'Contador Oficial',
        passwordHash: 'dummyhash',
        role: UserRole.CONTADOR,
      },
    });

    const dbColabA = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: employee1.email,
        name: employee1.fullName,
        passwordHash: 'dummyhash',
        role: UserRole.COLABORADOR,
      },
    });

    const dbHrB = await prisma.user.create({
      data: {
        companyId: companyB.id,
        email: `rh_b_${uniqueSuffix}@empb.com`,
        name: 'RH Empresa B',
        passwordHash: 'dummyhash',
        role: UserRole.RH,
      },
    });

    // Vincular employee1 ao seu User
    await prisma.employee.update({
      where: { id: employee1.id },
      data: { userId: dbColabA.id },
    });

    // Contextos de Usuários Autenticados para testes
    hrUserA = {
      id: dbHrA.id,
      userId: dbHrA.id,
      companyId: companyA.id,
      role: UserRole.RH,
      name: dbHrA.name,
      email: dbHrA.email,
    };

    accountantUserA = {
      id: dbAccA.id,
      userId: dbAccA.id,
      companyId: companyA.id,
      role: UserRole.CONTADOR,
      name: dbAccA.name,
      email: dbAccA.email,
    };

    colabUserA = {
      id: dbColabA.id,
      userId: dbColabA.id,
      companyId: companyA.id,
      role: UserRole.COLABORADOR,
      name: dbColabA.name,
      email: dbColabA.email,
    };

    hrUserB = {
      id: dbHrB.id,
      userId: dbHrB.id,
      companyId: companyB.id,
      role: UserRole.RH,
      name: dbHrB.name,
      email: dbHrB.email,
    };

    // 6. Criar registros de ponto no mês de teste para gerar horas extras para employee1
    await prisma.timeEntry.createMany({
      data: [
        {
          companyId: companyA.id,
          employeeId: employee1.id,
          timestamp: new Date('2026-10-05T08:00:00.000Z'),
          type: 'ENTRADA',
          origin: 'WEB',
        },
        {
          companyId: companyA.id,
          employeeId: employee1.id,
          timestamp: new Date('2026-10-05T12:00:00.000Z'),
          type: 'INTERVALO_SAIDA',
          origin: 'WEB',
        },
        {
          companyId: companyA.id,
          employeeId: employee1.id,
          timestamp: new Date('2026-10-05T13:00:00.000Z'),
          type: 'INTERVALO_RETORNO',
          origin: 'WEB',
        },
        {
          companyId: companyA.id,
          employeeId: employee1.id,
          timestamp: new Date('2026-10-05T19:00:00.000Z'), // 10h trabalhadas
          type: 'SAIDA',
          origin: 'WEB',
        },
      ],
    });
  });

  describe('1. Geração de Prévia de Competência e Cálculos Financeiros', () => {
    it('deve gerar a prévia da competência com base salarial consolidada', async () => {
      const competence = await payrollService.calculateOrRecalculateCompetence(hrUserA, testCompetence);

      expect(competence).toBeDefined();
      expect(competence.companyId).toBe(companyA.id);
      expect(competence.competence).toBe(testCompetence);
      expect(competence.status).toBe('ABERTA');
      expect(competence.totalEmployees).toBe(2);

      // Total bruto deve ser pelo menos a soma dos salários base (4400 + 6000 = 10400)
      expect(competence.totalGross).toBeGreaterThanOrEqual(10400);
      expect(competence.totalNet).toBe(
        Number((competence.totalGross - competence.totalDeductions).toFixed(2))
      );

      // Verificar os detalhes da competência
      const details = await payrollService.getCompetenceDetails(hrUserA, testCompetence);
      expect(details).toBeDefined();
      expect(details?.summaries.length).toBe(2);

      const summary1 = details?.summaries.find((s: any) => s.employeeId === employee1.id);
      expect(summary1).toBeDefined();
      expect(summary1?.baseSalary).toBe(4400.0);

      // Deve conter o item de salário base
      const baseSalaryItem = summary1?.items.find(
        (i: any) => i.code === '001' || i.category === 'SALARIO_BASE'
      );
      expect(baseSalaryItem).toBeDefined();
      expect(baseSalaryItem?.amount).toBe(4400.0);
      expect(baseSalaryItem?.type).toBe('PROVENTO');
    });

    it('deve permitir ao CONTADOR consultar o histórico e detalhes da competência', async () => {
      const list = await payrollService.listCompetences(accountantUserA);
      expect(list.length).toBeGreaterThanOrEqual(1);

      const details = await payrollService.getCompetenceDetails(accountantUserA, testCompetence);
      expect(details?.competence).toBe(testCompetence);
    });

    it('deve bloquear acesso de COLABORADOR comum ao módulo financeiro (RBAC)', async () => {
      await expect(
        payrollService.listCompetences(colabUserA)
      ).rejects.toThrow('Acesso negado: Você não possui autorização financeira');

      await expect(
        payrollService.getCompetenceDetails(colabUserA, testCompetence)
      ).rejects.toThrow('Acesso negado: Você não possui autorização financeira');

      await expect(
        payrollService.calculateOrRecalculateCompetence(colabUserA, testCompetence)
      ).rejects.toThrow('Acesso negado: Você não possui autorização financeira');
    });
  });

  describe('2. Lançamentos Manuais de Rubricas (Proventos e Descontos)', () => {
    let createdItemId: string;

    it('deve adicionar um provento manual (ex: Bônus de Desempenho) e recalcular os totais', async () => {
      const item = await payrollService.addManualItem(hrUserA, testCompetence, {
        employeeId: employee1.id,
        name: 'Bônus de Desempenho',
        code: 'BONUS_METAS',
        type: 'PROVENTO',
        category: 'ADICIONAL_MANUAL',
        amount: 550.0,
        reference: 'Meta Q3 atingida',
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.isManual).toBe(true);
      expect(item.amount).toBe(550.0);
      createdItemId = item.id;

      // Verificar que o sumário do colaborador atualizou
      const details = await payrollService.getCompetenceDetails(hrUserA, testCompetence);
      const summary1 = details?.summaries.find((s: any) => s.employeeId === employee1.id);
      expect(summary1?.otherEarnings).toBeGreaterThanOrEqual(550.0);

      // Verificar que o total bruto e líquido refletem o provento
      const expectedEarnings = Number(
        (
          (summary1?.baseSalary || 0) +
          (summary1?.overtimeAmount || 0) +
          (summary1?.timeBankAmount || 0) +
          (summary1?.vacationAmount || 0) +
          (summary1?.otherEarnings || 0)
        ).toFixed(2)
      );
      expect(summary1?.totalEarnings).toBe(expectedEarnings);
    });

    it('deve adicionar um desconto manual (ex: Vale Refeição) e abater do líquido', async () => {
      const deductionItem = await payrollService.addManualItem(hrUserA, testCompetence, {
        employeeId: employee1.id,
        name: 'Desconto Coparticipação VR/VA',
        code: 'DESC_VR',
        type: 'DESCONTO',
        category: 'BENEFICIO',
        amount: 150.0,
        reference: 'Participação 20%',
      });

      expect(deductionItem).toBeDefined();
      expect(deductionItem.type).toBe('DESCONTO');
      expect(deductionItem.amount).toBe(150.0);

      const details = await payrollService.getCompetenceDetails(hrUserA, testCompetence);
      const summary1 = details?.summaries.find((s: any) => s.employeeId === employee1.id);
      expect(summary1?.totalDeductions).toBeGreaterThanOrEqual(150.0);
      expect(summary1?.netSalary).toBe(
        Number(((summary1?.totalEarnings || 0) - (summary1?.totalDeductions || 0)).toFixed(2))
      );
    });

    it('deve remover um lançamento manual e atualizar os totais', async () => {
      expect(createdItemId).toBeDefined();
      await payrollService.deleteManualItem(hrUserA, testCompetence, createdItemId);

      const details = await payrollService.getCompetenceDetails(hrUserA, testCompetence);
      const summary1 = details?.summaries.find((s: any) => s.employeeId === employee1.id);
      const exists = summary1?.items.some((i: any) => i.id === createdItemId);
      expect(exists).toBe(false);
    });

    it('deve rejeitar adicionar lançamento com valor negativo ou zero', async () => {
      await expect(
        payrollService.addManualItem(hrUserA, testCompetence, {
          employeeId: employee1.id,
          name: 'Valor Inválido',
          type: 'PROVENTO',
          category: 'ADICIONAL_MANUAL',
          amount: -50.0,
        })
      ).rejects.toThrow('Nome e valor positivo são obrigatórios');
    });
  });

  describe('3. Imutabilidade e Fechamento de Folha', () => {
    it('deve fechar a competência e torná-la imutável', async () => {
      const closed = await payrollService.closeCompetence(
        hrUserA,
        testCompetence,
        'Folha fechada com aprovação da diretoria'
      );

      expect(closed.status).toBe('FECHADA');
      expect(closed.closedAt).toBeDefined();
      expect(closed.closedById).toBe(hrUserA.id);
      expect(closed.notes).toContain('aprovação da diretoria');
    });

    it('não deve permitir adicionar novos lançamentos manuais em competência fechada', async () => {
      await expect(
        payrollService.addManualItem(hrUserA, testCompetence, {
          employeeId: employee1.id,
          name: 'Tentativa após fechamento',
          type: 'PROVENTO',
          category: 'ADICIONAL_MANUAL',
          amount: 200.0,
        })
      ).rejects.toThrow('Não é possível adicionar lançamentos a uma competência fechada');
    });

    it('não deve permitir remover lançamentos em competência fechada', async () => {
      const details = await payrollService.getCompetenceDetails(hrUserA, testCompetence);
      const summary1 = details?.summaries.find((s: any) => s.employeeId === employee1.id);
      const anyItem = summary1?.items[0];

      if (anyItem) {
        await expect(
          payrollService.deleteManualItem(hrUserA, testCompetence, anyItem.id)
        ).rejects.toThrow('Não é possível remover lançamentos de uma competência fechada');
      }
    });

    it('não deve permitir recalcular uma competência já fechada', async () => {
      await expect(
        payrollService.calculateOrRecalculateCompetence(hrUserA, testCompetence)
      ).rejects.toThrow('não pode ser recalculada');
    });

    it('não deve permitir fechar uma competência que já está fechada', async () => {
      await expect(
        payrollService.closeCompetence(hrUserA, testCompetence)
      ).rejects.toThrow('já se encontra fechada');
    });
  });

  describe('4. Isolamento Multiempresa', () => {
    it('deve permitir que empresas diferentes tenham a mesma competência independente', async () => {
      const competenceB = await payrollService.calculateOrRecalculateCompetence(hrUserB, testCompetence);
      expect(competenceB.companyId).toBe(companyB.id);
      expect(competenceB.competence).toBe(testCompetence);
      expect(competenceB.status).toBe('ABERTA'); // Empresa A está FECHADA, Empresa B está ABERTA
      expect(competenceB.totalEmployees).toBe(1);
    });

    it('não deve permitir que Empresa B consulte dados ou competência da Empresa A', async () => {
      // Competência 2026-11 em A
      const compFuture = '2026-11';
      await payrollService.calculateOrRecalculateCompetence(hrUserA, compFuture);

      // Empresa B consulta 2026-11 (não calculada em B ainda) -> deve retornar null
      const detailsB = await payrollService.getCompetenceDetails(hrUserB, compFuture);
      expect(detailsB).toBeNull();

      // Empresa B tenta fechar 2026-11 -> deve lançar erro pois não existe para Empresa B
      await expect(
        payrollService.closeCompetence(hrUserB, compFuture)
      ).rejects.toThrow('não encontrada');
    });

    it('não deve permitir adicionar lançamentos para colaborador de outra empresa', async () => {
      await expect(
        payrollService.addManualItem(hrUserB, testCompetence, {
          employeeId: employee1.id, // Pertence à empresa A!
          name: 'Tentativa Cross Tenant',
          type: 'PROVENTO',
          category: 'ADICIONAL_MANUAL',
          amount: 100.0,
        })
      ).rejects.toThrow('Demonstrativo do colaborador não encontrado');
    });
  });

  describe('5. Exportação de Resumo em CSV', () => {
    it('deve gerar arquivo CSV com UTF-8 BOM, cabeçalhos adequados e linhas de colaboradores', async () => {
      const csv = await payrollService.exportCompetenceCSV(hrUserA, testCompetence);

      expect(csv).toBeDefined();
      expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM para Excel
      expect(csv).toContain('Matrícula;Colaborador;CPF;Departamento;Cargo;Salário Base (R$)');
      expect(csv).toContain('Lucas Folha Silva');
      expect(csv).toContain('Mariana Folha Souza');
      expect(csv).toContain('4400,00');
      expect(csv).toContain('6000,00');
      expect(csv).toContain('TOTAL GERAL');
    });
  });
});
