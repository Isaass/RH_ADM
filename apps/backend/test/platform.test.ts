import { describe, it, expect, beforeAll } from 'vitest';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@pontuarh/shared';
import { platformService } from '../src/platform/platform.service';
import { authService } from '../src/auth/auth.service';
import { authGuard, AuthenticatedRequest } from '../src/middlewares/auth.guard';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'pontuarh-jwt-super-secret-key-production-ready';

describe('Pontua RH — Fase 6.1: Super Admin e Gestão de Empresas', () => {
  let superAdminUser: any;
  let companyAdminUser: any;
  let regularEmployeeUser: any;
  let testCompany: any;

  function generateValidCNPJ(): string {
    const seed = Math.floor(10000000 + Math.random() * 90000000).toString();
    const n = seed + '0001';
    let size = 12;
    let numbers = n;
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    numbers = n + d1;
    size = 13;
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return n + d1 + d2;
  }

  let validCnpj1: string;
  let validCnpj2: string;
  let validCnpj3: string;

  beforeAll(async () => {
    validCnpj1 = generateValidCNPJ();
    validCnpj2 = generateValidCNPJ();
    validCnpj3 = generateValidCNPJ();
    const uniqueSuffix = Date.now().toString().slice(-6);

    // 1. Criar Super Admin
    const dbSuperAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin Teste',
        email: `superadmin_${uniqueSuffix}@pontuarh.com.br`,
        passwordHash: await bcrypt.hash('Super@123456', 10),
        role: UserRole.SUPER_ADMIN,
        active: true,
      },
    });

    superAdminUser = {
      id: dbSuperAdmin.id,
      name: dbSuperAdmin.name,
      email: dbSuperAdmin.email,
      role: UserRole.SUPER_ADMIN,
      companyId: null,
    };

    // 2. Criar Empresa de Teste
    testCompany = await prisma.company.create({
      data: {
        name: `Empresa Teste Base ${uniqueSuffix} Ltda`,
        tradeName: 'Base Testes Corp',
        cnpj: `59${uniqueSuffix}000144`.slice(0, 14),
        email: `contato_${uniqueSuffix}@base.com`,
        phone: '(11) 4002-8922',
        active: true,
        status: 'ATIVA',
      },
    });

    // 3. Criar Admin da Empresa de Teste
    const dbCompanyAdmin = await prisma.user.create({
      data: {
        companyId: testCompany.id,
        name: 'Admin Empresa Base',
        email: `admin_${uniqueSuffix}@base.com`,
        passwordHash: await bcrypt.hash('Admin@123456', 10),
        role: UserRole.ADMIN_EMPRESA,
        active: true,
      },
    });

    companyAdminUser = {
      id: dbCompanyAdmin.id,
      name: dbCompanyAdmin.name,
      email: dbCompanyAdmin.email,
      role: UserRole.ADMIN_EMPRESA,
      companyId: testCompany.id,
    };

    // 4. Criar Colaborador Comum
    const dbColab = await prisma.user.create({
      data: {
        companyId: testCompany.id,
        name: 'Colaborador Base',
        email: `colab_${uniqueSuffix}@base.com`,
        passwordHash: await bcrypt.hash('Colab@123456', 10),
        role: UserRole.COLABORADOR,
        active: true,
      },
    });

    regularEmployeeUser = {
      id: dbColab.id,
      name: dbColab.name,
      email: dbColab.email,
      role: UserRole.COLABORADOR,
      companyId: testCompany.id,
    };
  });

  describe('1. Métricas Globais da Plataforma', () => {
    it('deve retornar métricas consolidadas com dados reais para o Super Admin', async () => {
      const metrics = await platformService.getMetrics(superAdminUser);

      expect(metrics).toBeDefined();
      expect(metrics.totalCompanies).toBeGreaterThanOrEqual(1);
      expect(metrics.activeCompanies).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.suspendedCompanies).toBe('number');
      expect(typeof metrics.totalEmployees).toBe('number');
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(3);
    });

    it('deve bloquear acesso às métricas da plataforma por administradores de empresas ou colaboradores', async () => {
      await expect(platformService.getMetrics(companyAdminUser)).rejects.toThrow(
        'Operação restrita ao Super Administrador'
      );

      await expect(platformService.getMetrics(regularEmployeeUser)).rejects.toThrow(
        'Operação restrita ao Super Administrador'
      );
    });
  });

  describe('2. Cadastro e Validações de Empresas', () => {
    let createdCompanyId: string;
    const uniqueSuffix = Date.now().toString().slice(-4);

    it('deve cadastrar uma empresa com endereço e primeiro administrador de forma transacional', async () => {
      const adminEmail = `primeiro_admin_${uniqueSuffix}@acme.com`;

      const result = await platformService.createCompany(superAdminUser, {
        name: `Acme Inovações Tecnológicas ${uniqueSuffix} Ltda`,
        tradeName: `Acme Tech ${uniqueSuffix}`,
        cnpj: validCnpj1,
        email: `contato@acme${uniqueSuffix}.com`,
        phone: '(11) 98888-7777',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Andar 12',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        initialAdmin: {
          name: 'Renata Primeira Gestora',
          email: adminEmail,
          password: 'SenhaForte@2026',
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toContain('Acme Inovações');
      expect(result.cnpj).toBe(validCnpj1);
      expect(result.active).toBe(true);
      expect(result.status).toBe('ATIVA');
      expect(result.city).toBe('São Paulo');
      expect(result.state).toBe('SP');
      expect(result.initialAdmin).toBeDefined();
      expect(result.initialAdmin.email).toBe(adminEmail);
      expect(result.initialAdmin.role).toBe(UserRole.ADMIN_EMPRESA);

      createdCompanyId = result.id;

      // Verificar persistência no banco
      const inDb = await prisma.company.findUnique({
        where: { id: createdCompanyId },
        include: { users: true },
      });
      expect(inDb).toBeDefined();
      expect(inDb?.users.some((u) => u.email === adminEmail)).toBe(true);
    });

    it('deve impedir cadastro de empresa com CNPJ duplicado', async () => {
      await expect(
        platformService.createCompany(superAdminUser, {
          name: 'Tentativa Duplicada Ltda',
          cnpj: validCnpj1, // Já cadastrado no teste anterior
        })
      ).rejects.toThrow('Já existe uma empresa cadastrada com o CNPJ');
    });

    it('deve impedir cadastro com CNPJ matematicamente inválido', async () => {
      await expect(
        platformService.createCompany(superAdminUser, {
          name: 'Empresa CNPJ Inválido Ltda',
          cnpj: '11.222.333/0001-99', // Dígitos verificadores incorretos
        })
      ).rejects.toThrow('CNPJ inválido');
    });

    it('deve exigir Razão Social obrigatória', async () => {
      await expect(
        platformService.createCompany(superAdminUser, {
          name: '   ',
          cnpj: validCnpj2,
        })
      ).rejects.toThrow('A Razão Social da empresa é obrigatória');
    });

    it('deve validar requisitos de senha do primeiro administrador', async () => {
      await expect(
        platformService.createCompany(superAdminUser, {
          name: 'Empresa Senha Fraca Ltda',
          cnpj: validCnpj2,
          initialAdmin: {
            name: 'Admin Fraco',
            email: 'admin.fraco@teste.com',
            password: '123', // Menor que 8 caracteres
          },
        })
      ).rejects.toThrow('A senha do primeiro administrador deve possuir no mínimo 8 caracteres');
    });
  });

  describe('3. Listagem, Filtros e Detalhes de Empresas', () => {
    it('deve listar empresas com suporte a paginação e contadores', async () => {
      const res = await platformService.listCompanies(superAdminUser, {
        page: 1,
        pageSize: 5,
      });

      expect(res).toBeDefined();
      expect(res.data.length).toBeGreaterThanOrEqual(1);
      expect(res.total).toBeGreaterThanOrEqual(res.data.length);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(5);
      expect(res.data[0]._count).toBeDefined();
    });

    it('deve filtrar empresas por status (ATIVA / SUSPENSA)', async () => {
      const resAtivas = await platformService.listCompanies(superAdminUser, {
        status: 'ATIVA',
      });
      expect(resAtivas.data.every((c) => c.active === true)).toBe(true);
    });

    it('deve buscar empresas por nome ou CNPJ', async () => {
      const resSearch = await platformService.listCompanies(superAdminUser, {
        search: testCompany.name.slice(0, 10),
      });

      expect(resSearch.data.length).toBeGreaterThanOrEqual(1);
      expect(resSearch.data.some((c) => c.id === testCompany.id)).toBe(true);
    });

    it('deve consultar detalhes completos de uma empresa específica', async () => {
      const details = await platformService.getCompanyDetails(superAdminUser, testCompany.id);

      expect(details).toBeDefined();
      expect(details.id).toBe(testCompany.id);
      expect(details.users).toBeDefined();
      expect(details.users.some((u) => u.id === companyAdminUser.id)).toBe(true);
      expect(details._count).toBeDefined();
    });
  });

  describe('4. Atualização Cadastral de Empresas', () => {
    it('deve atualizar informações cadastrais e endereço da empresa', async () => {
      const updated = await platformService.updateCompany(superAdminUser, testCompany.id, {
        tradeName: 'Novo Nome Fantasia Teste',
        phone: '(11) 97777-6666',
        city: 'Campinas',
        state: 'SP',
      });

      expect(updated.tradeName).toBe('Novo Nome Fantasia Teste');
      expect(updated.phone).toBe('(11) 97777-6666');
      expect(updated.city).toBe('Campinas');
    });
  });

  describe('5. Suspensão e Reativação de Empresas', () => {
    let companyToSuspend: any;

    beforeAll(async () => {
      companyToSuspend = await prisma.company.create({
        data: {
          name: `Empresa Para Bloqueio ${Date.now()} Ltda`,
          cnpj: validCnpj3,
          active: true,
          status: 'ATIVA',
        },
      });
    });

    it('deve suspender uma empresa registrando motivo e data', async () => {
      const reason = 'Inadimplência contratual persistente superior a 60 dias.';
      const suspended = await platformService.suspendCompany(superAdminUser, companyToSuspend.id, reason);

      expect(suspended.active).toBe(false);
      expect(suspended.status).toBe('SUSPENSA');
      expect(suspended.suspensionReason).toBe(reason);
      expect(suspended.suspendedAt).toBeDefined();
      expect(suspended.suspendedById).toBe(superAdminUser.id);

      // Verificar registro de auditoria
      const audit = await prisma.auditLog.findFirst({
        where: {
          companyId: companyToSuspend.id,
          action: 'SUSPEND_COMPANY',
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.details).toContain(reason);
    });

    it('deve rejeitar suspensão sem motivo justificado', async () => {
      await expect(
        platformService.suspendCompany(superAdminUser, testCompany.id, '   ')
      ).rejects.toThrow('O motivo da suspensão é obrigatório');
    });

    it('deve rejeitar suspensão de empresa que já está suspensa', async () => {
      await expect(
        platformService.suspendCompany(superAdminUser, companyToSuspend.id, 'Outro motivo')
      ).rejects.toThrow('Esta empresa já se encontra suspensa');
    });

    it('deve reativar uma empresa suspensa restabelecendo o acesso', async () => {
      const reactivated = await platformService.reactivateCompany(superAdminUser, companyToSuspend.id);

      expect(reactivated.active).toBe(true);
      expect(reactivated.status).toBe('ATIVA');
      expect(reactivated.suspensionReason).toBeNull();
      expect(reactivated.suspendedAt).toBeNull();
    });
  });

  describe('6. Bloqueio Operacional em Tempo Real para Empresas Suspensas', () => {
    let suspendedCompany: any;
    let userOfSuspendedCompany: any;
    let validToken: string;

    beforeAll(async () => {
      const unique = Date.now().toString().slice(-5);
      suspendedCompany = await prisma.company.create({
        data: {
          name: `Empresa Operacional Suspensa ${unique} Ltda`,
          cnpj: `88${unique}000177`.slice(0, 14),
          active: true,
          status: 'ATIVA',
        },
      });

      userOfSuspendedCompany = await prisma.user.create({
        data: {
          companyId: suspendedCompany.id,
          name: 'Usuário Empresa Suspensa',
          email: `suspenso_${unique}@empresa.com`,
          passwordHash: await bcrypt.hash('Senha@123456', 10),
          role: UserRole.RH,
          active: true,
        },
      });

      // Gerar token JWT antes da suspensão (simula sessão ativa do usuário)
      validToken = jwt.sign(
        {
          id: userOfSuspendedCompany.id,
          email: userOfSuspendedCompany.email,
          name: userOfSuspendedCompany.name,
          role: userOfSuspendedCompany.role,
          companyId: suspendedCompany.id,
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
    });

    it('deve permitir acesso normalmente enquanto a empresa estiver ativa', async () => {
      // Teste do authGuard
      const req: any = {
        headers: { authorization: `Bearer ${validToken}` },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };
      const res: any = {
        status: () => res,
        json: () => res,
      };

      await authGuard(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('deve bloquear imediatamente novas requisições de sessão ativa assim que a empresa for suspensa', async () => {
      // Super Admin suspende a empresa
      await platformService.suspendCompany(
        superAdminUser,
        suspendedCompany.id,
        'Suspensão administrativa para validação de bloqueio em tempo real.'
      );

      // Nova requisição feita com o token JWT que ainda não expirou
      const req: any = {
        headers: { authorization: `Bearer ${validToken}` },
      };
      let statusCode = 0;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonBody = data;
          return res;
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await authGuard(req, res, next);

      // Deve ser bloqueado com 403 Forbidden e COMPANY_SUSPENDED
      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
      expect(jsonBody?.code).toBe('COMPANY_SUSPENDED');
      expect(jsonBody?.error).toContain('Empresa suspensa');
    });

    it('deve bloquear tentativa de novo login para usuários da empresa suspensa', async () => {
      await expect(
        authService.login(userOfSuspendedCompany.email, 'Senha@123456')
      ).rejects.toThrow('A empresa vinculada a esta conta está suspensa');
    });

    it('deve restaurar acesso imediatamente quando o Super Admin reativar a empresa', async () => {
      // Reativar
      await platformService.reactivateCompany(superAdminUser, suspendedCompany.id);

      // Re-tentar requisição com o mesmo token
      const req: any = {
        headers: { authorization: `Bearer ${validToken}` },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };
      const res: any = {
        status: () => res,
        json: () => res,
      };

      await authGuard(req, res, next);
      expect(nextCalled).toBe(true);

      // Re-tentar login
      const loginRes = await authService.login(userOfSuspendedCompany.email, 'Senha@123456');
      expect(loginRes.token).toBeDefined();
    });
  });

  describe('7. Gestão de Administradores da Empresa pelo Super Admin', () => {
    let createdAdminId: string;
    const unique = Date.now().toString().slice(-4);

    it('deve listar administradores vinculados à empresa', async () => {
      const admins = await platformService.listCompanyAdministrators(superAdminUser, testCompany.id);

      expect(admins).toBeDefined();
      expect(admins.length).toBeGreaterThanOrEqual(1);
      expect(admins.some((a) => a.id === companyAdminUser.id)).toBe(true);
      // Senha não deve ser exposta
      expect((admins[0] as any).passwordHash).toBeUndefined();
    });

    it('deve permitir ao Super Admin cadastrar um novo administrador para a empresa', async () => {
      const newAdmin = await platformService.createCompanyAdministrator(superAdminUser, testCompany.id, {
        name: 'Segundo Administrador Empresa',
        email: `segundo_admin_${unique}@base.com`,
        password: 'NovaSenhaSegura@2026',
      });

      expect(newAdmin).toBeDefined();
      expect(newAdmin.id).toBeDefined();
      expect(newAdmin.role).toBe(UserRole.ADMIN_EMPRESA);
      expect(newAdmin.active).toBe(true);
      createdAdminId = newAdmin.id;
    });

    it('deve permitir desativar e reativar a conta do administrador', async () => {
      const deactivated = await platformService.toggleAdministratorStatus(
        superAdminUser,
        testCompany.id,
        createdAdminId,
        false
      );
      expect(deactivated.active).toBe(false);

      const reactivated = await platformService.toggleAdministratorStatus(
        superAdminUser,
        testCompany.id,
        createdAdminId,
        true
      );
      expect(reactivated.active).toBe(true);
    });

    it('deve permitir redefinir a senha do administrador com hash seguro', async () => {
      const newPass = 'SenhaAtualizada@2026';
      const result = await platformService.resetAdministratorPassword(
        superAdminUser,
        testCompany.id,
        createdAdminId,
        newPass
      );

      expect(result.message).toContain('Senha redefinida com sucesso');

      // Validar que o hash da senha foi atualizado e confere com a nova senha
      const userInDb = await prisma.user.findUnique({ where: { id: createdAdminId } });
      expect(userInDb).toBeDefined();
      const match = await bcrypt.compare(newPass, userInDb!.passwordHash);
      expect(match).toBe(true);
    });
  });
});
