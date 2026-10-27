import { prisma } from '../prisma/prisma.service';
import { canViewSalaries, canManageEmployees, UserRole, isValidCPF } from '@pontuarh/shared';
import { AuthenticatedUser } from '../middlewares/auth.guard';

export interface EmployeeFilterOptions {
  search?: string;
  departmentId?: string;
  status?: string;
}

export class EmployeesService {
  /**
   * Listagem de colaboradores com isolamento por empresa, filtros e proteção salarial
   */
  async listEmployees(user: AuthenticatedUser, filters: EmployeeFilterOptions) {
    if (!user.companyId) {
      throw new Error('Usuário sem empresa vinculada.');
    }

    // Regra de privacidade: Colaboradores comuns não têm permissão para listar todos os colegas
    if (user.role === UserRole.COLABORADOR) {
      if (!user.employeeId) return [];
      const self = await this.getEmployeeById(user, user.employeeId);
      return self ? [self] : [];
    }

    const whereClause: any = {
      companyId: user.companyId,
    };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.departmentId) {
      whereClause.departmentId = filters.departmentId;
    }

    if (filters.search) {
      const term = filters.search.trim();
      whereClause.OR = [
        { fullName: { contains: term } },
        { email: { contains: term } },
        { cpf: { contains: term } },
        { registrationNumber: { contains: term } },
      ];
    }

    // Gestores veem os colaboradores do seu departamento ou seus liderados diretos
    if (user.role === UserRole.GESTOR && user.employeeId) {
      whereClause.OR = [
        { managerId: user.employeeId },
        { id: user.employeeId },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        department: true,
        position: true,
        workSchedule: true,
        manager: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const hasSalaryPermission = canViewSalaries(user.role);

    // Sanitização e sigilo salarial
    return employees.map((emp) => {
      const { baseSalary, ...rest } = emp;
      return {
        ...rest,
        baseSalary: hasSalaryPermission ? baseSalary : null,
      };
    });
  }

  /**
   * Obter detalhes de um colaborador específico com validação de segurança e sigilo salarial
   */
  async getEmployeeById(user: AuthenticatedUser, employeeId: string) {
    if (!user.companyId) {
      throw new Error('Usuário sem empresa vinculada.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        position: true,
        workSchedule: true,
        manager: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });

    if (!employee || employee.companyId !== user.companyId) {
      throw new Error('Colaborador não encontrado.');
    }

    // Se for COLABORADOR, só pode ver seu próprio registro
    if (user.role === UserRole.COLABORADOR && employee.id !== user.employeeId && employee.userId !== user.id) {
      throw new Error('Acesso negado: Você não possui autorização para consultar dados de outro colaborador.');
    }

    const hasSalaryPermission = canViewSalaries(user.role);
    const { baseSalary, ...rest } = employee;

    return {
      ...rest,
      baseSalary: hasSalaryPermission ? baseSalary : null,
    };
  }

  /**
   * Cadastro de novo colaborador com validação de CPF e unicidade
   */
  async createEmployee(user: AuthenticatedUser, data: any) {
    if (!user.companyId) {
      throw new Error('Empresa não identificada.');
    }

    if (!canManageEmployees(user.role)) {
      throw new Error('Acesso negado: Perfil sem permissão para cadastrar colaboradores.');
    }

    const cleanCPF = data.cpf ? data.cpf.replace(/\D/g, '') : '';
    if (!isValidCPF(cleanCPF)) {
      throw new Error('O CPF informado é inválido de acordo com as regras da Receita Federal.');
    }

    // Verificar unicidade de CPF
    const existingCPF = await prisma.employee.findUnique({
      where: { cpf: cleanCPF },
    });
    if (existingCPF) {
      throw new Error('Já existe um colaborador cadastrado com este CPF.');
    }

    const newEmployee = await prisma.employee.create({
      data: {
        companyId: user.companyId,
        fullName: data.fullName.trim(),
        cpf: cleanCPF,
        email: data.email.toLowerCase().trim(),
        phone: data.phone || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        registrationNumber: data.registrationNumber || null,
        departmentId: data.departmentId || null,
        positionId: data.positionId || null,
        managerId: data.managerId || null,
        admissionDate: new Date(data.admissionDate),
        contractType: data.contractType || 'CLT',
        status: data.status || 'ATIVO',
        baseSalary: data.baseSalary ? Number(data.baseSalary) : null,
        workScheduleId: data.workScheduleId || null,
      },
      include: {
        department: true,
        position: true,
        workSchedule: true,
      },
    });

    // Auditoria segura
    let auditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) auditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: auditUserId,
        action: 'CREATE_EMPLOYEE',
        entity: 'Employee',
        entityId: newEmployee.id,
        details: `Cadastro do colaborador ${newEmployee.fullName} (CPF: ${cleanCPF}).`,
      },
    });

    return newEmployee;
  }

  /**
   * Atualização cadastral de colaborador
   */
  async updateEmployee(user: AuthenticatedUser, employeeId: string, data: any) {
    if (!user.companyId) {
      throw new Error('Empresa não identificada.');
    }

    if (!canManageEmployees(user.role)) {
      throw new Error('Acesso negado: Perfil sem permissão para atualizar dados de colaboradores.');
    }

    const existing = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existing || existing.companyId !== user.companyId) {
      throw new Error('Colaborador não encontrado nesta empresa.');
    }

    let cleanCPF = existing.cpf;
    if (data.cpf && data.cpf !== existing.cpf) {
      cleanCPF = data.cpf.replace(/\D/g, '');
      if (!isValidCPF(cleanCPF)) {
        throw new Error('O novo CPF informado é inválido.');
      }
      const duplicateCPF = await prisma.employee.findUnique({
        where: { cpf: cleanCPF },
      });
      if (duplicateCPF && duplicateCPF.id !== employeeId) {
        throw new Error('Já existe outro colaborador cadastrado com este CPF.');
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        fullName: data.fullName !== undefined ? data.fullName.trim() : existing.fullName,
        cpf: cleanCPF,
        email: data.email !== undefined ? data.email.toLowerCase().trim() : existing.email,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        birthDate: data.birthDate !== undefined ? (data.birthDate ? new Date(data.birthDate) : null) : existing.birthDate,
        registrationNumber: data.registrationNumber !== undefined ? data.registrationNumber : existing.registrationNumber,
        departmentId: data.departmentId !== undefined ? data.departmentId : existing.departmentId,
        positionId: data.positionId !== undefined ? data.positionId : existing.positionId,
        managerId: data.managerId !== undefined ? data.managerId : existing.managerId,
        admissionDate: data.admissionDate !== undefined ? new Date(data.admissionDate) : existing.admissionDate,
        contractType: data.contractType !== undefined ? data.contractType : existing.contractType,
        status: data.status !== undefined ? data.status : existing.status,
        baseSalary: data.baseSalary !== undefined ? (data.baseSalary ? Number(data.baseSalary) : null) : existing.baseSalary,
        workScheduleId: data.workScheduleId !== undefined ? data.workScheduleId : existing.workScheduleId,
      },
      include: {
        department: true,
        position: true,
        workSchedule: true,
      },
    });

    // Auditoria segura
    let updateAuditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) updateAuditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: updateAuditUserId,
        action: 'UPDATE_EMPLOYEE',
        entity: 'Employee',
        entityId: updated.id,
        details: `Atualização dos dados cadastrais do colaborador ${updated.fullName}.`,
      },
    });

    return updated;
  }

  /**
   * Ativar / Desativar vínculo de colaborador
   */
  async toggleStatus(user: AuthenticatedUser, employeeId: string) {
    if (!user.companyId) {
      throw new Error('Empresa não identificada.');
    }

    if (!canManageEmployees(user.role)) {
      throw new Error('Acesso negado: Perfil sem permissão para alterar status de colaboradores.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.companyId !== user.companyId) {
      throw new Error('Colaborador não encontrado.');
    }

    const nextStatus = employee.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: { status: nextStatus },
    });

    let toggleAuditUserId: string | null = null;
    if (user.id) {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
      if (u) toggleAuditUserId = u.id;
    }

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: toggleAuditUserId,
        action: nextStatus === 'ATIVO' ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
        entity: 'Employee',
        entityId: employee.id,
        details: `Alteração de status do colaborador ${employee.fullName} para ${nextStatus}.`,
      },
    });

    return updated;
  }
}

export const employeesService = new EmployeesService();
