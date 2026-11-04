import * as bcrypt from 'bcryptjs';
import { prisma } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import {
  UserRole,
  isValidCNPJ,
  formatCNPJ,
  CreateCompanyDTO,
  UpdateCompanyDTO,
  CreateCompanyAdminDTO,
  PlatformMetrics,
  CompanyListResponse,
} from '@pontuarh/shared';

export class PlatformService {
  /**
   * Valida permissão estrita de Super Admin
   */
  private checkSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Acesso negado: Operação restrita ao Super Administrador da plataforma.');
    }
  }

  /**
   * Limpa formatação de CNPJ mantendo apenas dígitos
   */
  private cleanCNPJ(cnpj: string): string {
    return cnpj ? cnpj.replace(/\D/g, '') : '';
  }

  /**
   * Obtém métricas consolidadas da plataforma
   */
  async getMetrics(user: AuthenticatedUser): Promise<PlatformMetrics> {
    this.checkSuperAdmin(user);

    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalEmployees,
      totalUsers,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { active: true } }),
      prisma.company.count({ where: { active: false } }),
      prisma.employee.count(),
      prisma.user.count(),
    ]);

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalEmployees,
      totalUsers,
    };
  }

  /**
   * Lista empresas cadastradas com filtros e paginação
   */
  async listCompanies(
    user: AuthenticatedUser,
    params: {
      search?: string;
      status?: string;
      page?: number | string;
      pageSize?: number | string;
    }
  ): Promise<CompanyListResponse> {
    this.checkSuperAdmin(user);

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Filtro por status
    if (params.status === 'ATIVA') {
      where.active = true;
    } else if (params.status === 'SUSPENSA') {
      where.active = false;
    }

    // Filtro por busca textual (nome, razão social, fantasia, CNPJ)
    if (params.search && params.search.trim()) {
      const search = params.search.trim();
      const cleanSearch = this.cleanCNPJ(search);

      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];

      if (cleanSearch) {
        where.OR.push({ cnpj: { contains: cleanSearch } });
      }
    }

    const [total, data] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              employees: true,
              users: true,
              departments: true,
              positions: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      data: data as any,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Obtém detalhes completos de uma empresa específica
   */
  async getCompanyDetails(user: AuthenticatedUser, companyId: string) {
    this.checkSuperAdmin(user);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
            departments: true,
            positions: true,
            workSchedules: true,
          },
        },
        users: {
          where: { role: UserRole.ADMIN_EMPRESA },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    return company;
  }

  /**
   * Cadastra uma nova empresa, opcionalmente com seu primeiro administrador de forma transacional
   */
  async createCompany(user: AuthenticatedUser, data: CreateCompanyDTO) {
    this.checkSuperAdmin(user);

    if (!data.name || !data.name.trim()) {
      throw new Error('A Razão Social da empresa é obrigatória.');
    }

    const cleanCnpj = this.cleanCNPJ(data.cnpj);
    if (!cleanCnpj || !isValidCNPJ(cleanCnpj)) {
      throw new Error('CNPJ inválido. Forneça um número de CNPJ válido com 14 dígitos.');
    }

    // Validação de unicidade de CNPJ
    const existingCnpj = await prisma.company.findUnique({
      where: { cnpj: cleanCnpj },
    });
    if (existingCnpj) {
      throw new Error(`Já existe uma empresa cadastrada com o CNPJ ${formatCNPJ(cleanCnpj)}.`);
    }

    // Se fornecido administrador inicial, validar dados
    let adminEmail = '';
    let adminPassHash = '';
    if (data.initialAdmin) {
      const { name, email, password } = data.initialAdmin;
      if (!name || !name.trim()) {
        throw new Error('O nome do primeiro administrador é obrigatório.');
      }
      if (!email || !email.includes('@')) {
        throw new Error('O e-mail do primeiro administrador é inválido.');
      }
      if (!password || password.length < 8) {
        throw new Error('A senha do primeiro administrador deve possuir no mínimo 8 caracteres.');
      }

      adminEmail = email.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      if (existingUser) {
        throw new Error(`O e-mail ${adminEmail} já está em uso por outro usuário.`);
      }

      adminPassHash = await bcrypt.hash(password, 10);
    }

    // Criação transacional
    return prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.name.trim(),
          tradeName: data.tradeName ? data.tradeName.trim() : null,
          cnpj: cleanCnpj,
          email: data.email ? data.email.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          street: data.street ? data.street.trim() : null,
          number: data.number ? data.number.trim() : null,
          complement: data.complement ? data.complement.trim() : null,
          neighborhood: data.neighborhood ? data.neighborhood.trim() : null,
          city: data.city ? data.city.trim() : null,
          state: data.state ? data.state.trim().toUpperCase() : null,
          zipCode: data.zipCode ? data.zipCode.replace(/\D/g, '') : null,
          active: true,
          status: 'ATIVA',
        },
      });

      let adminUser: any = null;
      if (data.initialAdmin) {
        adminUser = await tx.user.create({
          data: {
            companyId: company.id,
            name: data.initialAdmin.name.trim(),
            email: adminEmail,
            passwordHash: adminPassHash,
            role: UserRole.ADMIN_EMPRESA,
            active: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
          },
        });
      }

      // Registro de Auditoria
      await tx.auditLog.create({
        data: {
          companyId: company.id,
          userId: user.id,
          action: 'CREATE_COMPANY',
          entity: 'Company',
          entityId: company.id,
          details: `Empresa "${company.name}" cadastrada pelo Super Admin.${adminUser ? ` Primeiro administrador: ${adminUser.email}` : ''}`,
        },
      });

      return {
        ...company,
        initialAdmin: adminUser,
      };
    });
  }

  /**
   * Atualiza dados cadastrais de uma empresa
   */
  async updateCompany(user: AuthenticatedUser, companyId: string, data: UpdateCompanyDTO) {
    this.checkSuperAdmin(user);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('A Razão Social não pode ser vazia.');
      updateData.name = data.name.trim();
    }

    if (data.tradeName !== undefined) {
      updateData.tradeName = data.tradeName ? data.tradeName.trim() : null;
    }

    if (data.cnpj !== undefined) {
      const cleanCnpj = this.cleanCNPJ(data.cnpj);
      if (!cleanCnpj || !isValidCNPJ(cleanCnpj)) {
        throw new Error('CNPJ inválido.');
      }

      if (cleanCnpj !== company.cnpj) {
        const existing = await prisma.company.findUnique({ where: { cnpj: cleanCnpj } });
        if (existing) {
          throw new Error(`O CNPJ ${formatCNPJ(cleanCnpj)} já pertence a outra empresa.`);
        }
        updateData.cnpj = cleanCnpj;
      }
    }

    if (data.email !== undefined) updateData.email = data.email ? data.email.trim() : null;
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
    if (data.street !== undefined) updateData.street = data.street ? data.street.trim() : null;
    if (data.number !== undefined) updateData.number = data.number ? data.number.trim() : null;
    if (data.complement !== undefined) updateData.complement = data.complement ? data.complement.trim() : null;
    if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood ? data.neighborhood.trim() : null;
    if (data.city !== undefined) updateData.city = data.city ? data.city.trim() : null;
    if (data.state !== undefined) updateData.state = data.state ? data.state.trim().toUpperCase() : null;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode ? data.zipCode.replace(/\D/g, '') : null;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: 'UPDATE_COMPANY',
        entity: 'Company',
        entityId: company.id,
        details: `Dados cadastrais da empresa ${company.name} atualizados pelo Super Admin.`,
      },
    });

    return updated;
  }

  /**
   * Suspende uma empresa com motivo registrado
   */
  async suspendCompany(user: AuthenticatedUser, companyId: string, reason: string) {
    this.checkSuperAdmin(user);

    if (!reason || !reason.trim()) {
      throw new Error('O motivo da suspensão é obrigatório para fins de auditoria e compliance.');
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    if (!company.active || company.status === 'SUSPENSA') {
      throw new Error('Esta empresa já se encontra suspensa.');
    }

    const suspended = await prisma.company.update({
      where: { id: companyId },
      data: {
        active: false,
        status: 'SUSPENSA',
        suspensionReason: reason.trim(),
        suspendedAt: new Date(),
        suspendedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: 'SUSPEND_COMPANY',
        entity: 'Company',
        entityId: company.id,
        details: `Empresa suspensa pelo Super Admin. Motivo: ${reason.trim()}`,
      },
    });

    return suspended;
  }

  /**
   * Reativa uma empresa suspensa
   */
  async reactivateCompany(user: AuthenticatedUser, companyId: string) {
    this.checkSuperAdmin(user);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    if (company.active && company.status === 'ATIVA') {
      throw new Error('Esta empresa já está com status ATIVA.');
    }

    const reactivated = await prisma.company.update({
      where: { id: companyId },
      data: {
        active: true,
        status: 'ATIVA',
        suspensionReason: null,
        suspendedAt: null,
        suspendedById: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: 'REACTIVATE_COMPANY',
        entity: 'Company',
        entityId: company.id,
        details: `Empresa reativada pelo Super Admin. Acesso restabelecido.`,
      },
    });

    return reactivated;
  }

  /**
   * Lista administradores vinculados a uma empresa
   */
  async listCompanyAdministrators(user: AuthenticatedUser, companyId: string) {
    this.checkSuperAdmin(user);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: UserRole.ADMIN_EMPRESA,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins;
  }

  /**
   * Cadastra um novo administrador para a empresa
   */
  async createCompanyAdministrator(
    user: AuthenticatedUser,
    companyId: string,
    data: CreateCompanyAdminDTO
  ) {
    this.checkSuperAdmin(user);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    if (!data.name || !data.name.trim()) {
      throw new Error('O nome do administrador é obrigatório.');
    }

    const cleanEmail = data.email ? data.email.toLowerCase().trim() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('E-mail inválido.');
    }

    if (!data.password || data.password.length < 8) {
      throw new Error('A senha do administrador deve possuir no mínimo 8 caracteres.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      throw new Error(`O e-mail ${cleanEmail} já está em uso.`);
    }

    // Verificar limites do plano SaaS contratado (Fase 6.2)
    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (subscription && subscription.plan) {
      const currentUsers = await prisma.user.count({ where: { companyId } });
      if (currentUsers >= subscription.plan.maxUsers) {
        throw new Error(`Limite do plano atingido: o plano ${subscription.plan.name} permite no máximo ${subscription.plan.maxUsers} usuários.`);
      }
      const currentAdmins = await prisma.user.count({ where: { companyId, role: UserRole.ADMIN_EMPRESA } });
      if (currentAdmins >= subscription.plan.maxAdmins) {
        throw new Error(`Limite do plano atingido: o plano ${subscription.plan.name} permite no máximo ${subscription.plan.maxAdmins} administradores.`);
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        companyId,
        name: data.name.trim(),
        email: cleanEmail,
        passwordHash,
        role: UserRole.ADMIN_EMPRESA,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: user.id,
        action: 'CREATE_ADMIN',
        entity: 'User',
        entityId: newAdmin.id,
        details: `Administrador ${newAdmin.email} criado para a empresa ${company.name} pelo Super Admin.`,
      },
    });

    return newAdmin;
  }

  /**
   * Ativa ou desativa a conta de um administrador
   */
  async toggleAdministratorStatus(
    user: AuthenticatedUser,
    companyId: string,
    adminId: string,
    active: boolean
  ) {
    this.checkSuperAdmin(user);

    const targetUser = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!targetUser || targetUser.companyId !== companyId) {
      throw new Error('Administrador não encontrado nesta empresa.');
    }

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: user.id,
        action: active ? 'ACTIVATE_ADMIN' : 'DEACTIVATE_ADMIN',
        entity: 'User',
        entityId: adminId,
        details: `Administrador ${targetUser.email} ${active ? 'ativado' : 'desativado'} pelo Super Admin.`,
      },
    });

    return updated;
  }

  /**
   * Redefine a senha de um administrador de forma segura
   */
  async resetAdministratorPassword(
    user: AuthenticatedUser,
    companyId: string,
    adminId: string,
    newPasswordPlain: string
  ) {
    this.checkSuperAdmin(user);

    if (!newPasswordPlain || newPasswordPlain.length < 8) {
      throw new Error('A nova senha deve possuir no mínimo 8 caracteres.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!targetUser || targetUser.companyId !== companyId) {
      throw new Error('Administrador não encontrado nesta empresa.');
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);

    await prisma.user.update({
      where: { id: adminId },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: user.id,
        action: 'RESET_PASSWORD',
        entity: 'User',
        entityId: adminId,
        details: `Senha do administrador ${targetUser.email} redefinida pelo Super Admin.`,
      },
    });

    return {
      message: 'Senha redefinida com sucesso.',
    };
  }
}

export const platformService = new PlatformService();
