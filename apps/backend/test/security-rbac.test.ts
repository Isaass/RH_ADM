import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { employeesService } from '../src/employees/employees.service';
import { timeTrackingService } from '../src/time-tracking/time-tracking.service';
import { adjustmentsService } from '../src/adjustments/adjustments.service';
import { schedulesService } from '../src/schedules/schedules.service';
import { UserRole, RequestStatus } from '@pontuarh/shared';
import { AuthenticatedUser } from '../src/middlewares/auth.guard';

describe('Segurança, Multitenancy e RBAC — Testes de Integração com PostgreSQL', () => {
  let companyA: any;
  let companyB: any;
  let employeeA1: any; // Subordinado ao Gestor A
  let employeeA2: any; // Subordinado a outro gestor
  let managerA: any;   // Gestor de A1
  let employeeB: any;  // Colaborador da Empresa B

  let userAdminA: AuthenticatedUser;
  let userGestorA: AuthenticatedUser;
  let userColabA1: AuthenticatedUser;
  let userColabB: AuthenticatedUser;

  beforeAll(async () => {
    // 1. Criar Empresa A e Empresa B
    companyA = await prisma.company.create({
      data: { name: 'Empresa Alfa Segurança Ltda', cnpj: '01.111.222/0001-01' },
    });

    companyB = await prisma.company.create({
      data: { name: 'Empresa Beta Isolada Ltda', cnpj: '02.222.333/0001-02' },
    });

    // 2. Criar Gestor da Empresa A
    managerA = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Gestor Carlos Alfa',
        cpf: '10101010101',
        email: 'gestor.alfa@pontuarh.com.br',
        admissionDate: new Date('2023-01-01'),
        baseSalary: 12500.0,
        status: 'ATIVO',
      },
    });

    // 3. Criar Colaborador A1 (liderado por managerA)
    employeeA1 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Colaborador Bruno Alfa',
        cpf: '20202020202',
        email: 'bruno.alfa@pontuarh.com.br',
        admissionDate: new Date('2024-01-01'),
        baseSalary: 4500.0,
        managerId: managerA.id,
        status: 'ATIVO',
      },
    });

    // 4. Criar Colaborador A2 (não liderado por managerA)
    employeeA2 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Colaborador Daniel Alfa',
        cpf: '30303030303',
        email: 'daniel.alfa@pontuarh.com.br',
        admissionDate: new Date('2024-02-01'),
        baseSalary: 5200.0,
        status: 'ATIVO',
      },
    });

    // 5. Criar Colaborador B (Empresa B)
    employeeB = await prisma.employee.create({
      data: {
        companyId: companyB.id,
        fullName: 'Colaboradora Elena Beta',
        cpf: '40404040404',
        email: 'elena.beta@empresa-b.com.br',
        admissionDate: new Date('2024-01-15'),
        baseSalary: 6000.0,
        status: 'ATIVO',
      },
    });

    // Usuários autenticados correspondentes
    userAdminA = {
      id: 'usr_sec_admin_a',
      email: 'admin@alfa.com',
      name: 'Admin Alfa',
      role: UserRole.ADMIN_EMPRESA,
      companyId: companyA.id,
    };

    userGestorA = {
      id: 'usr_sec_gestor_a',
      email: managerA.email,
      name: managerA.fullName,
      role: UserRole.GESTOR,
      companyId: companyA.id,
      employeeId: managerA.id,
    };

    userColabA1 = {
      id: 'usr_sec_colab_a1',
      email: employeeA1.email,
      name: employeeA1.fullName,
      role: UserRole.COLABORADOR,
      companyId: companyA.id,
      employeeId: employeeA1.id,
    };

    userColabB = {
      id: 'usr_sec_colab_b',
      email: employeeB.email,
      name: employeeB.fullName,
      role: UserRole.COLABORADOR,
      companyId: companyB.id,
      employeeId: employeeB.id,
    };
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.timeAdjustmentRequest.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.timeEntry.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.employee.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
  });

  it('1. deve garantir isolamento estrito entre empresas (Multitenancy)', async () => {
    // Admin da Empresa A tenta listar colaboradores da Empresa B
    const listEmpA = await employeesService.listEmployees(userAdminA, {});
    const idsEmpA = listEmpA.map((e) => e.id);

    expect(idsEmpA).toContain(employeeA1.id);
    expect(idsEmpA).toContain(employeeA2.id);
    expect(idsEmpA).toContain(managerA.id);
    // Em hipótese alguma colaborador da Empresa B deve aparecer
    expect(idsEmpA).not.toContain(employeeB.id);

    // Tentativa de obter colaborador da Empresa B usando usuário da Empresa A
    await expect(
      employeesService.getEmployeeById(userAdminA, employeeB.id)
    ).rejects.toThrow(/Colaborador não encontrado/);
  });

  it('2. deve garantir isolamento entre colaboradores (Privacidade e Acesso Próprio)', async () => {
    // Colaborador A1 tenta consultar marcações de Colaborador A2
    await expect(
      timeTrackingService.getEmployeeEntries(userColabA1, employeeA2.id)
    ).rejects.toThrow(/Acesso negado: Você não possui autorização para consultar marcações de outro colaborador/);

    // Colaborador A1 consulta apenas a si mesmo
    const myEntries = await timeTrackingService.getEmployeeEntries(userColabA1, employeeA1.id);
    expect(Array.isArray(myEntries)).toBe(true);
  });

  it('3. deve restringir o perfil GESTOR estritamente aos seus liderados diretos', async () => {
    // Gestor A consulta liderado direto A1 (permitido)
    const subEntries = await timeTrackingService.getEmployeeEntries(userGestorA, employeeA1.id);
    expect(Array.isArray(subEntries)).toBe(true);

    // Gestor A tenta consultar A2 que não é seu liderado (bloqueado)
    await expect(
      timeTrackingService.getEmployeeEntries(userGestorA, employeeA2.id)
    ).rejects.toThrow(/Acesso negado: Este colaborador não pertence à sua equipe de gestão/);

    // Gestor A tenta consultar colaborador de outra empresa (bloqueado)
    await expect(
      timeTrackingService.getEmployeeEntries(userGestorA, employeeB.id)
    ).rejects.toThrow(/Acesso negado: Este colaborador não pertence à sua equipe de gestão/);
  });

  it('4. deve proteger dados salariais contra visualização por perfis não autorizados', async () => {
    // Gestor consultando detalhes do colaborador
    const colabDetailsViewedByGestor = await employeesService.getEmployeeById(userGestorA, employeeA1.id);
    expect(colabDetailsViewedByGestor?.baseSalary).toBeNull();

    // Colaborador consultando seus próprios detalhes
    const colabDetailsViewedBySelf = await employeesService.getEmployeeById(userColabA1, employeeA1.id);
    expect(colabDetailsViewedBySelf?.baseSalary).toBeNull();

    // Admin da Empresa possui permissão explícita para ver salário
    const colabDetailsViewedByAdmin = await employeesService.getEmployeeById(userAdminA, employeeA1.id);
    expect(colabDetailsViewedByAdmin?.baseSalary).toBe(4500.0);
  });

  it('5. deve impedir aprovação de solicitações próprias (segregação de funções)', async () => {
    // Gestor cria uma solicitação para si mesmo
    const gestorRequest = await adjustmentsService.createRequest(userGestorA, {
      date: '2026-10-24',
      type: 'ESQUECIMENTO',
      justification: 'Esqueci de bater o ponto na saída de almoço',
    });

    expect(gestorRequest.status).toBe(RequestStatus.PENDENTE);

    // Gestor tenta aprovar sua própria solicitação
    await expect(
      adjustmentsService.decideRequest(userGestorA, gestorRequest.id, {
        status: RequestStatus.APROVADA,
        decisionNotes: 'Auto-aprovação indevida',
      })
    ).rejects.toThrow(/Não é permitido aprovar ou reprovar a sua própria solicitação de ajuste/);

    // Garantir que permaneceu pendente no banco
    const checkDb = await prisma.timeAdjustmentRequest.findUnique({
      where: { id: gestorRequest.id },
    });
    expect(checkDb?.status).toBe(RequestStatus.PENDENTE);
  });

  it('6. deve impedir manipulação de identificadores (IDOR) entre empresas', async () => {
    // Usuário da Empresa B tenta registrar ponto usando employeeId da Empresa A
    const attackerUser: AuthenticatedUser = {
      id: 'usr_attacker',
      email: 'attacker@beta.com',
      name: 'Atacante',
      role: UserRole.COLABORADOR,
      companyId: companyB.id,
      employeeId: employeeA1.id, // ID da Empresa A injetado
    };

    await expect(
      timeTrackingService.registerPunch(attackerUser, { type: 'ENTRADA' })
    ).rejects.toThrow(/Colaborador não localizado ou empresa incompatível/);
  });

  it('7. deve proteger endpoints e serviços administrativos contra perfis não autorizados', async () => {
    // Colaborador comum tentando criar uma jornada de trabalho
    await expect(
      schedulesService.createSchedule(userColabA1, {
        name: 'Jornada Hacker',
        dailyHours: 2.0,
        weeklyHours: 10.0,
        expectedEntry: '10:00',
        expectedExit: '12:00',
        expectedBreak: '00:00',
        daysOfWeek: 'MON',
      })
    ).rejects.toThrow(/Acesso negado: Perfil sem permissão para cadastrar jornadas/);
  });

  it('8. deve validar extensões e conteúdo de arquivos anexados para prevenir upload malicioso', async () => {
    // Tentativa com executável .exe
    await expect(
      adjustmentsService.createRequest(userColabA1, {
        date: '2026-10-24',
        type: 'ATESTADO',
        justification: 'Atestado médico',
        attachmentUrl: 'https://cdn.empresa.com/uploads/malware.exe',
      })
    ).rejects.toThrow(/Extensão de anexo não permitida/);

    // Tentativa com script bash .sh
    await expect(
      adjustmentsService.createRequest(userColabA1, {
        date: '2026-10-24',
        type: 'ATESTADO',
        justification: 'Atestado médico',
        attachmentUrl: 'https://cdn.empresa.com/uploads/script.sh',
      })
    ).rejects.toThrow(/Extensão de anexo não permitida/);

    // Tentativa com javascript URI
    await expect(
      adjustmentsService.createRequest(userColabA1, {
        date: '2026-10-24',
        type: 'ATESTADO',
        justification: 'Atestado médico',
        attachmentUrl: 'javascript:alert(1)',
      })
    ).rejects.toThrow(/Tipo de anexo inválido ou potencialmente inseguro/);

    // Anexo legítimo (PDF) deve passar com sucesso
    const validRequest = await adjustmentsService.createRequest(userColabA1, {
      date: '2026-10-24',
      type: 'ATESTADO',
      justification: 'Atestado odontológico legítimo',
      attachmentUrl: 'https://cdn.empresa.com/uploads/atestado_medico.pdf',
    });
    expect(validRequest.id).toBeDefined();
    expect(validRequest.attachmentUrl).toBe('https://cdn.empresa.com/uploads/atestado_medico.pdf');
  });

  it('9. deve proteger contra elevação indevida de privilégios em cadastro e atualização', async () => {
    // Colaborador comum não pode atualizar cadastro nem alterar seu próprio papel
    await expect(
      employeesService.updateEmployee(userColabA1, employeeA1.id, {
        fullName: 'Novo Nome',
      })
    ).rejects.toThrow(/Acesso negado: Perfil sem permissão para atualizar dados de colaboradores/);
  });
});
