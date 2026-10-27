import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { adjustmentsService } from '../src/adjustments/adjustments.service';
import { timesheetService } from '../src/timesheet/timesheet.service';
import { TimeEntryType, UserRole, RequestStatus, AdjustmentType } from '@pontuarh/shared';
import { AuthenticatedUser } from '../src/middlewares/auth.guard';

describe('Módulo de Ajustes e Solicitações de Ponto — Fluxo de Gestão e Tratamento Legal', () => {
  let testCompany: any;
  let empGestor: any;
  let empColab1: any;
  let empColabOutroGestor: any;

  let userGestor: AuthenticatedUser;
  let userColab1: AuthenticatedUser;
  let userColabOutro: AuthenticatedUser;
  let userRH: AuthenticatedUser;

  beforeAll(async () => {
    testCompany = await prisma.company.create({
      data: {
        name: 'Empresa Teste Ajustes Ltda',
        cnpj: '55.666.777/0001-88',
      },
    });

    // Usuário Gestor
    const userGestorDb = await prisma.user.create({
      data: {
        companyId: testCompany.id,
        name: 'Gestor de Equipe Alfa',
        email: 'gestor.alfa@pontuarh.com.br',
        passwordHash: 'hash_test',
        role: UserRole.GESTOR,
      },
    });

    // Gestor
    empGestor = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        userId: userGestorDb.id,
        fullName: 'Gestor de Equipe Alfa',
        cpf: '12389045611',
        email: userGestorDb.email,
        admissionDate: new Date('2022-01-01'),
        status: 'ATIVO',
      },
    });

    // Colaborador liderado pelo Gestor Alfa
    empColab1 = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Liderado Alfa',
        cpf: '88877766655',
        email: 'colab.alfa@pontuarh.com.br',
        admissionDate: new Date('2023-01-01'),
        managerId: empGestor.id,
        status: 'ATIVO',
      },
    });

    // Colaborador de OUTRA equipe (não gerenciado pelo Gestor Alfa)
    empColabOutroGestor = await prisma.employee.create({
      data: {
        companyId: testCompany.id,
        fullName: 'Colaborador Outra Equipe',
        cpf: '44455566677',
        email: 'colab.outro@pontuarh.com.br',
        admissionDate: new Date('2023-05-01'),
        status: 'ATIVO',
      },
    });

    userGestor = {
      id: userGestorDb.id,
      email: userGestorDb.email,
      name: userGestorDb.name,
      role: UserRole.GESTOR,
      companyId: testCompany.id,
      employeeId: empGestor.id,
    };

    userColab1 = {
      id: 'usr_colab_alfa',
      email: empColab1.email,
      name: empColab1.fullName,
      role: UserRole.COLABORADOR,
      companyId: testCompany.id,
      employeeId: empColab1.id,
    };

    userColabOutro = {
      id: 'usr_colab_outro',
      email: empColabOutroGestor.email,
      name: empColabOutroGestor.fullName,
      role: UserRole.COLABORADOR,
      companyId: testCompany.id,
      employeeId: empColabOutroGestor.id,
    };

    userRH = {
      id: 'usr_rh_central',
      email: 'rh.central@pontuarh.com.br',
      name: 'Mariana RH',
      role: UserRole.RH,
      companyId: testCompany.id,
    };
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.timeAdjustmentRequest.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.timeEntry.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.employee.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.user.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.company.deleteMany({ where: { id: testCompany.id } });
  });

  it('1. colaborador deve criar solicitação de inclusão de marcação esquecida', async () => {
    const request = await adjustmentsService.createRequest(userColab1, {
      date: '2026-10-10',
      type: AdjustmentType.ESQUECIMENTO,
      entryType: TimeEntryType.ENTRADA,
      proposedTime: '08:00',
      justification: 'Esqueci de registrar ao chegar devido à reunião externa matinal.',
    });

    expect(request).toBeDefined();
    expect(request.id).toBeDefined();
    expect(request.status).toBe(RequestStatus.PENDENTE);
    expect(request.employeeId).toBe(empColab1.id);
  });

  it('2. gestor deve visualizar apenas solicitações dos seus liderados diretos', async () => {
    // Criar solicitação para o outro colaborador
    await adjustmentsService.createRequest(userColabOutro, {
      date: '2026-10-10',
      type: AdjustmentType.HORARIO_INCORRETO,
      proposedTime: '17:00',
      justification: 'Marcação feita com horário divergente.',
    });

    // Gestor Alfa lista solicitações
    const gestorRequests = await adjustmentsService.listRequestsForReview(userGestor, {});
    expect(gestorRequests.length).toBe(1);
    expect(gestorRequests[0].employeeId).toBe(empColab1.id);

    // RH Central lista solicitações e deve ver todas da empresa (2)
    const rhRequests = await adjustmentsService.listRequestsForReview(userRH, {});
    expect(rhRequests.length).toBe(2);
  });

  it('3. gestor deve aprovar solicitação gerando marcação tratada sem alterar a original', async () => {
    const gestorRequests = await adjustmentsService.listRequestsForReview(userGestor, {});
    const targetRequest = gestorRequests[0];

    const approved = await adjustmentsService.decideRequest(userGestor, targetRequest.id, {
      status: RequestStatus.APROVADA,
      decisionNotes: 'Aprovado conforme autorização prévia de reunião.',
    });

    expect(approved.status).toBe(RequestStatus.APROVADA);
    expect(approved.reviewerId).toBe(userGestor.id);
    expect(approved.decidedAt).toBeDefined();

    // Conferir se gerou marcação tratada no banco de dados
    const treatedEntry = await prisma.timeEntry.findFirst({
      where: {
        adjustmentRequestId: targetRequest.id,
      },
    });

    expect(treatedEntry).not.toBeNull();
    expect(treatedEntry?.isTreated).toBe(true);
    expect(treatedEntry?.originalRecord).toBe(false); // REGISTRO TRATADO (não original)
    expect(treatedEntry?.type).toBe(TimeEntryType.ENTRADA);
  });

  it('4. gestor deve poder recusar solicitação exigindo justificativa obrigatória', async () => {
    // Colaborador cria nova solicitação
    const reqToReject = await adjustmentsService.createRequest(userColab1, {
      date: '2026-10-11',
      type: AdjustmentType.OUTRO,
      proposedTime: '14:00',
      justification: 'Ajuste sem comprovação.',
    });

    // Tentativa de recusa sem justificativa deve falhar
    await expect(
      adjustmentsService.decideRequest(userGestor, reqToReject.id, {
        status: RequestStatus.RECUSADA,
        decisionNotes: '',
      })
    ).rejects.toThrow(/É obrigatório justificar o motivo da recusa/);

    // Recusa com justificativa
    const rejected = await adjustmentsService.decideRequest(userGestor, reqToReject.id, {
      status: RequestStatus.RECUSADA,
      decisionNotes: 'Solicitação indeferida por ausência de autorização do gestor para ausência.',
    });

    expect(rejected.status).toBe(RequestStatus.RECUSADA);
    expect(rejected.decisionNotes).toContain('indeferida');

    // Não deve criar marcação tratada
    const treatedEntry = await prisma.timeEntry.findFirst({
      where: { adjustmentRequestId: reqToReject.id },
    });
    expect(treatedEntry).toBeNull();
  });
});
