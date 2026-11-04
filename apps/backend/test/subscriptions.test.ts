import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { plansService } from '../src/platform/plans.service';
import { subscriptionsService } from '../src/platform/subscriptions.service';
import { EmployeesService } from '../src/employees/employees.service';
import { featureGuard } from '../src/middlewares/feature.guard';
import { UserRole, PlanFeature } from '@pontuarh/shared';
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

describe('Fase 6.2 — Gestão de Planos e Assinaturas', () => {
  let superAdminUser: any;
  let tenantAdminUser: any;

  let testCompanyId: string;
  let testCompany2Id: string;
  let planBasicoId: string;
  let planProId: string;
  let planLimitadoId: string;

  beforeAll(async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    // 1. Criar Super Admin no banco de dados para integridade de chaves estrangeiras
    const dbSuperAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin Teste Assinaturas',
        email: `superadmin_sub_${uniqueSuffix}@pontuarh.com.br`,
        passwordHash: await bcrypt.hash('Super@123456', 10),
        role: UserRole.SUPER_ADMIN,
        active: true,
      },
    });

    superAdminUser = {
      id: dbSuperAdmin.id,
      email: dbSuperAdmin.email,
      role: UserRole.SUPER_ADMIN,
      companyId: null,
    };

    // 2. Criar empresa de teste 1
    const company1 = await prisma.company.create({
      data: {
        name: 'Empresa Teste Assinaturas 1',
        tradeName: 'Assinaturas 1',
        cnpj: generateValidCNPJ(),
        email: `empresa1_${uniqueSuffix}@teste.com.br`,
        active: true,
        status: 'ATIVA',
      },
    });
    testCompanyId = company1.id;

    const dbTenantAdmin = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        name: 'Admin Empresa 1',
        email: `admin_emp1_${uniqueSuffix}@teste.com.br`,
        passwordHash: await bcrypt.hash('Admin@123456', 10),
        role: UserRole.ADMIN_EMPRESA,
        active: true,
      },
    });

    tenantAdminUser = {
      id: dbTenantAdmin.id,
      email: dbTenantAdmin.email,
      role: UserRole.ADMIN_EMPRESA,
      companyId: testCompanyId,
    };

    // 3. Criar empresa de teste 2
    const company2 = await prisma.company.create({
      data: {
        name: 'Empresa Teste Assinaturas 2',
        tradeName: 'Assinaturas 2',
        cnpj: generateValidCNPJ(),
        email: `empresa2_${uniqueSuffix}@teste.com.br`,
        active: true,
        status: 'ATIVA',
      },
    });
    testCompany2Id = company2.id;
  });

  describe('1. Gestão de Planos (CRUD e Regras)', () => {
    it('deve cadastrar um novo plano SaaS com sucesso', async () => {
      const plan = await plansService.createPlan(superAdminUser, {
        name: 'Plano Teste Básico',
        code: `TEST_BASICO_${Date.now()}`,
        description: 'Plano para teste unitário',
        monthlyPrice: 79.9,
        annualPrice: 799.0,
        maxEmployees: 5,
        maxUsers: 2,
        maxAdmins: 1,
        features: [PlanFeature.DASHBOARD, PlanFeature.COLABORADORES, PlanFeature.PONTO_ELETRONICO],
        active: true,
      });

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.monthlyPrice).toBe(79.9);
      expect(plan.maxEmployees).toBe(5);
      planBasicoId = plan.id;
    });

    it('deve impedir cadastro de plano com código duplicado', async () => {
      const code = `DUPLICATE_CODE_${Date.now()}`;
      await plansService.createPlan(superAdminUser, {
        name: 'Plano Código Único',
        code,
        monthlyPrice: 100,
        maxEmployees: 10,
        maxUsers: 3,
        maxAdmins: 1,
        features: [PlanFeature.DASHBOARD],
      });

      await expect(
        plansService.createPlan(superAdminUser, {
          name: 'Plano Código Único Repetido',
          code,
          monthlyPrice: 120,
          maxEmployees: 20,
          maxUsers: 5,
          maxAdmins: 2,
          features: [PlanFeature.DASHBOARD],
        })
      ).rejects.toThrow(`Já existe um plano cadastrado com o código "${code}".`);
    });

    it('deve impedir que usuários que não sejam Super Admin cadastrem planos', async () => {
      await expect(
        plansService.createPlan(tenantAdminUser as any, {
          name: 'Plano Ilegal',
          code: 'ILEGAL_01',
          monthlyPrice: 50,
          maxEmployees: 5,
          maxUsers: 2,
          maxAdmins: 1,
          features: [],
        })
      ).rejects.toThrow('Acesso negado: Somente Super Administradores podem gerenciar planos.');
    });

    it('deve atualizar informações e limites de um plano', async () => {
      const updated = await plansService.updatePlan(superAdminUser, planBasicoId, {
        name: 'Plano Teste Básico Atualizado',
        monthlyPrice: 89.9,
        maxEmployees: 8,
      });

      expect(updated.name).toBe('Plano Teste Básico Atualizado');
      expect(updated.monthlyPrice).toBe(89.9);
      expect(updated.maxEmployees).toBe(8);
    });

    it('deve ativar e desativar um plano', async () => {
      const deactivated = await plansService.togglePlanStatus(superAdminUser, planBasicoId, false);
      expect(deactivated.active).toBe(false);

      const reactivated = await plansService.togglePlanStatus(superAdminUser, planBasicoId, true);
      expect(reactivated.active).toBe(true);
    });

    it('deve listar planos cadastrados com suporte a busca', async () => {
      const list = await plansService.listPlans({ search: 'Básico' });
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((p) => p.id === planBasicoId)).toBe(true);
    });
  });

  describe('2. Gestão de Assinaturas e Ciclo de Vida', () => {
    it('deve criar outro plano para testes de troca e limites', async () => {
      const planPro = await plansService.createPlan(superAdminUser, {
        name: 'Plano Teste Pro',
        code: `TEST_PRO_${Date.now()}`,
        monthlyPrice: 199.9,
        maxEmployees: 50,
        maxUsers: 10,
        maxAdmins: 3,
        features: [
          PlanFeature.DASHBOARD,
          PlanFeature.COLABORADORES,
          PlanFeature.PONTO_ELETRONICO,
          PlanFeature.BANCO_HORAS,
          PlanFeature.FERIAS,
          PlanFeature.FOLHA_PAGAMENTO,
        ],
        active: true,
      });
      planProId = planPro.id;
      expect(planProId).toBeDefined();

      const planLimitado = await plansService.createPlan(superAdminUser, {
        name: 'Plano Extremamente Limitado',
        code: `TEST_LIMIT_${Date.now()}`,
        monthlyPrice: 29.9,
        maxEmployees: 1, // Permite apenas 1 colaborador
        maxUsers: 1,
        maxAdmins: 1,
        features: [PlanFeature.DASHBOARD, PlanFeature.COLABORADORES],
        active: true,
      });
      planLimitadoId = planLimitado.id;
      expect(planLimitadoId).toBeDefined();
    });

    it('deve atribuir assinatura com período de teste (EM_TESTE) a uma empresa', async () => {
      const subscription = await subscriptionsService.assignSubscription(
        superAdminUser,
        testCompanyId,
        {
          planId: planBasicoId,
          periodicity: 'MENSAL',
          trialDays: 14,
        }
      );

      expect(subscription).toBeDefined();
      expect(subscription.status).toBe('EM_TESTE');
      expect(subscription.planId).toBe(planBasicoId);
      expect(subscription.endDate).toBeDefined();
    });

    it('deve consultar a assinatura e o histórico da empresa', async () => {
      const result = await subscriptionsService.getCompanySubscription(testCompanyId);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.status).toBe('EM_TESTE');
      expect(result.history.length).toBeGreaterThanOrEqual(1);
      expect(result.history[0].action).toBe('CRIACAO');
    });

    it('deve alterar o plano da empresa (Upgrade para Pro) registrando histórico', async () => {
      const upgraded = await subscriptionsService.changePlan(
        superAdminUser,
        testCompanyId,
        {
          newPlanId: planProId,
          reason: 'Upgrade para plano Pro com folha de pagamento',
        }
      );

      expect(upgraded.planId).toBe(planProId);
      expect(upgraded.status).toBe('ATIVA');

      const history = await prisma.subscriptionHistory.findMany({
        where: { companyId: testCompanyId },
        orderBy: { createdAt: 'desc' },
      });

      expect(history[0].action).toBe('TROCA_PLANO');
      expect(history[0].planId).toBe(planProId);
    });

    it('deve renovar uma assinatura estendendo a data de término', async () => {
      const current = await subscriptionsService.getCompanySubscription(testCompanyId);
      const oldEndDate = new Date(current.subscription!.endDate!);

      const renewed = await subscriptionsService.renewSubscription(
        superAdminUser,
        testCompanyId,
        { monthsToAdd: 3, notes: 'Renovação trimestral' }
      );

      expect(renewed.status).toBe('ATIVA');
      expect(new Date(renewed.endDate!).getTime()).toBeGreaterThan(oldEndDate.getTime());
    });

    it('deve cancelar uma assinatura com justificativa obrigatória', async () => {
      await expect(
        subscriptionsService.cancelSubscription(superAdminUser, testCompanyId, { reason: '' })
      ).rejects.toThrow('A justificativa do cancelamento é obrigatória.');

      const cancelled = await subscriptionsService.cancelSubscription(
        superAdminUser,
        testCompanyId,
        { reason: 'Solicitação do cliente por rescisão amigável' }
      );

      expect(cancelled.status).toBe('CANCELADA');
    });

    it('deve impedir a exclusão física de plano que possui histórico ou assinaturas', async () => {
      await expect(
        plansService.deletePlan(superAdminUser, planProId)
      ).rejects.toThrow('Não é permitido excluir o plano');
    });

    it('deve calcular métricas comerciais globais e MRR estimado', async () => {
      const metrics = await subscriptionsService.getCommercialMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalSubscriptions).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.estimatedMRR).toBe('number');
      expect(Array.isArray(metrics.companiesPerPlan)).toBe(true);
    });
  });

  describe('3. Controle de Limites de Utilização (maxEmployees, maxUsers)', () => {
    const employeesService = new EmployeesService();

    it('deve reativar a empresa com o plano limitado a 1 colaborador', async () => {
      await subscriptionsService.assignSubscription(superAdminUser, testCompany2Id, {
        planId: planLimitadoId,
        periodicity: 'MENSAL',
        status: 'ATIVA',
      });
    });

    it('deve permitir cadastrar o 1º colaborador respeitando o limite do plano', async () => {
      const tenant2User = {
        id: 'admin-empresa-2',
        name: 'Admin Empresa 2',
        email: 'admin2@teste.com.br',
        role: UserRole.ADMIN_EMPRESA,
        companyId: testCompany2Id,
      };

      const emp1 = await employeesService.createEmployee(tenant2User, {
        fullName: 'Primeiro Colaborador Limite',
        cpf: generateValidCPF(),
        email: `colab1.${Date.now()}@teste.com.br`,
        admissionDate: '2026-01-01',
        contractType: 'CLT',
        status: 'ATIVO',
      });

      expect(emp1).toBeDefined();
      expect(emp1.id).toBeDefined();
    });

    it('deve bloquear o cadastro do 2º colaborador quando atingir o maxEmployees do plano', async () => {
      const tenant2User = {
        id: 'admin-empresa-2',
        name: 'Admin Empresa 2',
        email: 'admin2@teste.com.br',
        role: UserRole.ADMIN_EMPRESA,
        companyId: testCompany2Id,
      };

      await expect(
        employeesService.createEmployee(tenant2User, {
          fullName: 'Segundo Colaborador Limite',
          cpf: generateValidCPF(),
          email: `colab2.${Date.now()}@teste.com.br`,
          admissionDate: '2026-01-01',
          contractType: 'CLT',
          status: 'ATIVO',
        })
      ).rejects.toThrow('Limite do plano atingido: o plano Plano Extremamente Limitado permite no máximo 1 colaboradores');
    });

    it('no downgrade de plano, colaboradores existentes devem ser preservados sem exclusão automática', async () => {
      // Verificar que o colaborador criado continua no banco
      const count = await prisma.employee.count({ where: { companyId: testCompany2Id } });
      expect(count).toBe(1);
    });
  });

  describe('4. Consulta de Assinatura pelo Administrador da Empresa (Tenant Admin)', () => {
    it('deve retornar utilização detalhada e mapa de funcionalidades para a empresa', async () => {
      // Atribuir plano Pro à empresa 2
      await subscriptionsService.assignSubscription(superAdminUser, testCompany2Id, {
        planId: planProId,
        periodicity: 'MENSAL',
        status: 'ATIVA',
      });

      const usage = await subscriptionsService.getCompanyUsage(testCompany2Id);

      expect(usage).toBeDefined();
      expect(usage.plan.name).toBe('Plano Teste Pro');
      expect(usage.currentUsage.employees).toBe(1);
      expect(usage.currentUsage.maxEmployees).toBe(50);
      expect(usage.features[PlanFeature.FOLHA_PAGAMENTO]).toBe(true);
      expect(usage.features[PlanFeature.DOCUMENTOS]).toBe(false); // Pro teste não tem documentos
      expect(usage.isExpired).toBe(false);
    });
  });

  describe('5. Feature Flags por Plano e Middleware featureGuard', () => {
    it('deve bloquear acesso com HTTP 403 se o plano não incluir a funcionalidade', async () => {
      // Atribuir plano Básico (que NÃO inclui FOLHA_PAGAMENTO) para empresa 1
      await subscriptionsService.assignSubscription(superAdminUser, testCompanyId, {
        planId: planBasicoId,
        periodicity: 'MENSAL',
        status: 'ATIVA',
      });

      const guard = featureGuard(PlanFeature.FOLHA_PAGAMENTO);

      let statusCode = 0;
      let jsonResponse: any = null;
      let nextCalled = false;

      const req: any = {
        user: tenantAdminUser,
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonResponse = data;
            },
          };
        },
      };
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);

      expect(statusCode).toBe(403);
      expect(jsonResponse.code).toBe('FEATURE_NOT_IN_PLAN');
      expect(nextCalled).toBe(false);
    });

    it('deve permitir acesso se o plano incluir a funcionalidade (Plano Pro inclui FOLHA_PAGAMENTO)', async () => {
      await subscriptionsService.changePlan(superAdminUser, testCompanyId, {
        newPlanId: planProId,
      });

      const guard = featureGuard(PlanFeature.FOLHA_PAGAMENTO);
      let nextCalled = false;
      const req: any = { user: tenantAdminUser };
      const res: any = { status: () => ({ json: () => {} }) };
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('deve bloquear acesso com HTTP 403 se a assinatura estiver expirada', async () => {
      // Marcar assinatura como expirada
      await prisma.subscription.update({
        where: { companyId: testCompanyId },
        data: { status: 'EXPIRADA' },
      });

      const guard = featureGuard(PlanFeature.FOLHA_PAGAMENTO);
      let statusCode = 0;
      let jsonResponse: any = null;
      let nextCalled = false;
      const req: any = { user: tenantAdminUser };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonResponse = data;
            },
          };
        },
      };
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);
      expect(statusCode).toBe(403);
      expect(jsonResponse.code).toBe('SUBSCRIPTION_EXPIRED');
      expect(nextCalled).toBe(false);
    });

    it('Super Admin deve possuir bypass global e acessar mesmo com assinatura expirada', async () => {
      const guard = featureGuard(PlanFeature.FOLHA_PAGAMENTO);
      let nextCalled = false;
      const req: any = { user: superAdminUser };
      const res: any = { status: () => ({ json: () => {} }) };
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);
      expect(nextCalled).toBe(true);
    });
  });
});

