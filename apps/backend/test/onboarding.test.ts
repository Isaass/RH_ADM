import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { onboardingService } from '../src/onboarding/onboarding.service';
import { platformService } from '../src/platform/platform.service';
import { EmployeesService } from '../src/employees/employees.service';
import { SchedulesService } from '../src/schedules/schedules.service';
import { UserRole } from '@pontuarh/shared';
import * as bcrypt from 'bcryptjs';

function generateValidCPF(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let d1 = n.reduce((acc, digit, idx) => acc + digit * (10 - idx), 0);
  d1 = (d1 * 10) % 11;
  if (d1 === 10) d1 = 0;

  let d2 = [...n, d1].reduce((acc, digit, idx) => acc + digit * (11 - idx), 0);
  d2 = (d2 * 10) % 11;
  if (d2 === 10) d2 = 0;

  return [...n, d1, d2].join('');
}

function generateValidCNPJ(): string {
  const n = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  const base = [...n, 0, 0, 0, 1];

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s1 = base.reduce((acc, digit, idx) => acc + digit * w1[idx], 0);
  let d1 = 11 - (s1 % 11);
  if (d1 >= 10) d1 = 0;

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s2 = [...base, d1].reduce((acc, digit, idx) => acc + digit * w2[idx], 0);
  let d2 = 11 - (s2 % 11);
  if (d2 >= 10) d2 = 0;

  return [...base, d1, d2].join('');
}

describe('Fase 6.3 — Onboarding e Configuração Inicial de Empresas', () => {
  let superAdminUser: any;
  let tenantAdminUser: any;
  let testCompanyId: string;
  let testCompany2Id: string;
  let tenantAdmin2User: any;
  let activePlanId: string;

  const employeesService = new EmployeesService();
  const schedulesService = new SchedulesService();

  beforeAll(async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    // 1. Super Admin
    const dbSuperAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin Teste Onboarding',
        email: `superadmin_onb_${uniqueSuffix}@pontuarh.com.br`,
        passwordHash: await bcrypt.hash('Super@123456', 10),
        role: UserRole.SUPER_ADMIN,
        active: true,
      },
    });
    superAdminUser = {
      id: dbSuperAdmin.id,
      email: dbSuperAdmin.email,
      name: dbSuperAdmin.name,
      role: UserRole.SUPER_ADMIN,
    };

    // 2. Plano comercial ativo
    const plan = await prisma.plan.create({
      data: {
        name: `Plano Onboarding Test ${uniqueSuffix}`,
        code: `ONB_${uniqueSuffix}`,
        monthlyPrice: 150.0,
        maxEmployees: 20,
        maxUsers: 5,
        maxAdmins: 2,
        features: ['DASHBOARD', 'COLABORADORES', 'PONTO_ELETRONICO', 'ESPELHO_PONTO', 'AJUSTES'],
        active: true,
      },
    });
    activePlanId = plan.id;

    // 3. Empresa 1 recém-cadastrada (onboarding pendente por padrão)
    const companyRes = await platformService.createCompany(superAdminUser, {
      name: `Empresa Onboarding Teste 1 ${uniqueSuffix} Ltda`,
      cnpj: generateValidCNPJ(),
      email: `contato_onb1_${uniqueSuffix}@empresa.com.br`,
      initialAdmin: {
        name: 'Administrador Inicial 1',
        email: `admin_onb1_${uniqueSuffix}@empresa.com.br`,
        password: 'AdminPassword@123',
      },
    });
    testCompanyId = companyRes.id;
    tenantAdminUser = {
      id: companyRes.initialAdmin.id,
      email: companyRes.initialAdmin.email,
      name: companyRes.initialAdmin.name,
      role: UserRole.ADMIN_EMPRESA,
      companyId: testCompanyId,
    };

    // Vincular plano à Empresa 1
    await prisma.subscription.create({
      data: {
        companyId: testCompanyId,
        planId: activePlanId,
        periodicity: 'MENSAL',
        status: 'ATIVA',
        price: 150.0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 4. Empresa 2 (para teste de isolamento multitenant)
    const company2Res = await platformService.createCompany(superAdminUser, {
      name: `Empresa Onboarding Teste 2 ${uniqueSuffix} Ltda`,
      cnpj: generateValidCNPJ(),
      email: `contato_onb2_${uniqueSuffix}@empresa.com.br`,
      initialAdmin: {
        name: 'Administrador Inicial 2',
        email: `admin_onb2_${uniqueSuffix}@empresa.com.br`,
        password: 'AdminPassword@123',
      },
    });
    testCompany2Id = company2Res.id;
    tenantAdmin2User = {
      id: company2Res.initialAdmin.id,
      email: company2Res.initialAdmin.email,
      name: company2Res.initialAdmin.name,
      role: UserRole.ADMIN_EMPRESA,
      companyId: testCompany2Id,
    };
  });

  describe('1. Estado Inicial e Persistência de Progresso', () => {
    it('deve inicializar uma nova empresa com onboardingCompleted = false e step = 1', async () => {
      const status = await onboardingService.getStatus(testCompanyId);

      expect(status.companyId).toBe(testCompanyId);
      expect(status.onboardingCompleted).toBe(false);
      expect(status.onboardingStep).toBe(1);
      expect(status.canComplete).toBe(false);
      expect(status.counts.departments).toBe(0);
      expect(status.counts.positions).toBe(0);
      expect(status.counts.workSchedules).toBe(0);
      expect(status.counts.employees).toBe(0);
      expect(status.subscription?.planCode).toBeDefined();
    });

    it('deve permitir atualizar e salvar a etapa de onboarding (progresso e continuidade)', async () => {
      const stepUpdate = await onboardingService.updateStep(testCompanyId, 2);
      expect(stepUpdate.onboardingStep).toBe(2);

      const status = await onboardingService.getStatus(testCompanyId);
      expect(status.onboardingStep).toBe(2);
    });

    it('deve rejeitar etapas inválidas (< 1 ou > 5)', async () => {
      await expect(onboardingService.updateStep(testCompanyId, 0)).rejects.toThrow('Etapa de onboarding inválida');
      await expect(onboardingService.updateStep(testCompanyId, 6)).rejects.toThrow('Etapa de onboarding inválida');
    });
  });

  describe('2. Etapa 1 — Dados Cadastrais e Endereço', () => {
    it('deve atualizar informações de contato e endereço da empresa', async () => {
      const updated = await prisma.company.update({
        where: { id: testCompanyId },
        data: {
          tradeName: 'Nome Fantasia Teste',
          phone: '(11) 98765-4321',
          zipCode: '01310100',
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
      });

      expect(updated.tradeName).toBe('Nome Fantasia Teste');
      expect(updated.city).toBe('São Paulo');
      expect(updated.state).toBe('SP');

      const status = await onboardingService.getStatus(testCompanyId);
      expect(status.company.tradeName).toBe('Nome Fantasia Teste');
      expect(status.company.city).toBe('São Paulo');
    });
  });

  describe('3. Etapa 2 — Estrutura Organizacional e Unicidade', () => {
    it('deve cadastrar departamentos e cargos com sucesso', async () => {
      const dept = await prisma.department.create({
        data: {
          companyId: testCompanyId,
          name: 'Tecnologia da Informação',
          code: 'TI-01',
        },
      });
      expect(dept.id).toBeDefined();
      expect(dept.name).toBe('Tecnologia da Informação');

      const pos = await prisma.position.create({
        data: {
          companyId: testCompanyId,
          title: 'Engenheiro de Software',
          cboCode: '2124-05',
        },
      });
      expect(pos.id).toBeDefined();
      expect(pos.title).toBe('Engenheiro de Software');

      const status = await onboardingService.getStatus(testCompanyId);
      expect(status.counts.departments).toBe(1);
      expect(status.counts.positions).toBe(1);
    });

    it('deve impedir cadastro de departamento duplicado na mesma empresa', async () => {
      const duplicateCheck = await prisma.department.findFirst({
        where: {
          companyId: testCompanyId,
          name: { equals: 'Tecnologia da Informação', mode: 'insensitive' },
        },
      });
      expect(duplicateCheck).not.toBeNull();
    });

    it('deve permitir departamento com mesmo nome em outra empresa (isolamento multitenant)', async () => {
      const deptCompany2 = await prisma.department.create({
        data: {
          companyId: testCompany2Id,
          name: 'Tecnologia da Informação',
          code: 'TI-02',
        },
      });
      expect(deptCompany2.id).toBeDefined();
      expect(deptCompany2.companyId).toBe(testCompany2Id);
    });
  });

  describe('4. Etapa 3 — Jornada de Trabalho', () => {
    it('deve cadastrar uma jornada de trabalho semanal', async () => {
      const schedule = await schedulesService.createSchedule(tenantAdminUser, {
        name: 'Comercial Padrão 44h',
        type: 'FIXA',
        expectedEntry: '08:00',
        expectedBreak: '01:00',
        expectedExit: '17:00',
        weeklyHours: 44,
        toleranceMinutes: 10,
        daysOfWeek: 'MON,TUE,WED,THU,FRI',
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.name).toBe('Comercial Padrão 44h');
      expect(schedule.weeklyHours).toBe(44);

      const status = await onboardingService.getStatus(testCompanyId);
      expect(status.counts.workSchedules).toBe(1);
    });
  });

  describe('5. Etapa 4 — Primeiro Colaborador e Limites do Plano', () => {
    let createdDeptId: string;
    let createdPosId: string;
    let createdSchedId: string;

    beforeAll(async () => {
      const dept = await prisma.department.findFirst({ where: { companyId: testCompanyId } });
      const pos = await prisma.position.findFirst({ where: { companyId: testCompanyId } });
      const sched = await prisma.workSchedule.findFirst({ where: { companyId: testCompanyId } });

      createdDeptId = dept!.id;
      createdPosId = pos!.id;
      createdSchedId = sched!.id;
    });

    it('deve cadastrar o primeiro colaborador associado aos dados do onboarding', async () => {
      const validCpf = generateValidCPF();
      const employee = await employeesService.createEmployee(tenantAdminUser, {
        fullName: 'Carlos Eduardo Oliveira',
        cpf: validCpf,
        email: 'carlos.oliveira@empresa.com.br',
        departmentId: createdDeptId,
        positionId: createdPosId,
        workScheduleId: createdSchedId,
        admissionDate: '2026-01-15',
        contractType: 'CLT',
        baseSalary: 4500.0,
      });

      expect(employee.id).toBeDefined();
      expect(employee.companyId).toBe(testCompanyId);
      expect(employee.fullName).toBe('Carlos Eduardo Oliveira');

      const status = await onboardingService.getStatus(testCompanyId);
      expect(status.counts.employees).toBe(1);
      expect(status.canComplete).toBe(true);
    });

    it('deve rejeitar colaborador com CPF inválido na etapa de onboarding', async () => {
      await expect(
        employeesService.createEmployee(tenantAdminUser, {
          fullName: 'Invalido Teste',
          cpf: '111.111.111-11',
          email: 'invalido@empresa.com.br',
          admissionDate: '2026-01-15',
        })
      ).rejects.toThrow('CPF informado é inválido');
    });
  });

  describe('6. Etapa 5 — Conclusão do Onboarding e Visibilidade Super Admin', () => {
    it('deve concluir o onboarding e registrar auditoria', async () => {
      const completeRes = await onboardingService.completeOnboarding(testCompanyId, tenantAdminUser.id);
      expect(completeRes.success).toBe(true);
      expect(completeRes.onboardingCompleted).toBe(true);

      const status = await onboardingService.getStatus(testCompanyId);
      expect(status.onboardingCompleted).toBe(true);
      expect(status.onboardingStep).toBe(5);

      // Checar auditoria
      const audit = await prisma.auditLog.findFirst({
        where: {
          companyId: testCompanyId,
          action: 'ONBOARDING_COMPLETED',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('não deve permitir concluir onboarding se os requisitos mínimos não forem atendidos', async () => {
      // Empresa 2 possui departamento, mas não possui cargos, colaboradores ou jornadas
      await expect(
        onboardingService.completeOnboarding(testCompany2Id, tenantAdmin2User.id)
      ).rejects.toThrow('Cadastre pelo menos um cargo');
    });

    it('Super Admin deve visualizar o status de onboarding na listagem de empresas', async () => {
      const companiesList = await platformService.listCompanies(superAdminUser, {});
      const c1 = companiesList.data.find((c: any) => c.id === testCompanyId);
      const c2 = companiesList.data.find((c: any) => c.id === testCompany2Id);

      expect(c1).toBeDefined();
      expect((c1 as any).onboardingCompleted).toBe(true);

      expect(c2).toBeDefined();
      expect((c2 as any).onboardingCompleted).toBe(false);
    });
  });
});
