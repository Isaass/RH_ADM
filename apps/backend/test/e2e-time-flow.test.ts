import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma/prisma.service';
import { authService } from '../src/auth/auth.service';
import { timeTrackingService } from '../src/time-tracking/time-tracking.service';
import { adjustmentsService } from '../src/adjustments/adjustments.service';
import { timesheetService } from '../src/timesheet/timesheet.service';
import { TimeEntryType, UserRole, RequestStatus, AdjustmentType } from '@pontuarh/shared';
import { AuthenticatedUser } from '../src/middlewares/auth.guard';

describe('Fluxo E2E Completo — Ciclo de Ponto, Solicitação, Aprovação e Apuração', () => {
  let company: any;
  let schedule: any;
  let userColabDb: any;
  let empColab: any;
  let userGestorDb: any;
  let empGestor: any;

  const passwordRaw = 'TestPass@12345';

  beforeAll(async () => {
    company = await prisma.company.create({
      data: {
        name: 'Empresa Fluxo E2E Completo Ltda',
        cnpj: '44.555.666/0001-99',
      },
    });

    schedule = await prisma.workSchedule.create({
      data: {
        companyId: company.id,
        name: 'Jornada E2E 8h',
        dailyHours: 8.0,
        weeklyHours: 40.0,
        expectedEntry: '09:00',
        expectedExit: '18:00',
        expectedBreak: '01:00',
        daysOfWeek: 'MON,TUE,WED,THU,FRI',
      },
    });

    const passwordHash = await bcrypt.hash(passwordRaw, 10);

    // Gestor
    userGestorDb = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Roberto Gestor E2E',
        email: 'gestor.e2e@empresa.com',
        passwordHash,
        role: UserRole.GESTOR,
      },
    });

    empGestor = await prisma.employee.create({
      data: {
        companyId: company.id,
        userId: userGestorDb.id,
        fullName: 'Roberto Gestor E2E',
        cpf: '77788899911',
        email: userGestorDb.email,
        admissionDate: new Date('2022-01-01'),
        status: 'ATIVO',
        workScheduleId: schedule.id,
      },
    });

    // Colaborador liderado pelo Gestor
    userColabDb = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Juliana Colaboradora E2E',
        email: 'juliana.colab.e2e@empresa.com',
        passwordHash,
        role: UserRole.COLABORADOR,
      },
    });

    empColab = await prisma.employee.create({
      data: {
        companyId: company.id,
        userId: userColabDb.id,
        fullName: 'Juliana Colaboradora E2E',
        cpf: '88899900022',
        email: userColabDb.email,
        admissionDate: new Date('2023-01-01'),
        managerId: empGestor.id,
        status: 'ATIVO',
        workScheduleId: schedule.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { companyId: company.id } });
    await prisma.timeAdjustmentRequest.deleteMany({ where: { companyId: company.id } });
    await prisma.timeEntry.deleteMany({ where: { companyId: company.id } });
    await prisma.employee.deleteMany({ where: { companyId: company.id } });
    await prisma.user.deleteMany({ where: { companyId: company.id } });
    await prisma.workSchedule.deleteMany({ where: { companyId: company.id } });
    await prisma.company.deleteMany({ where: { id: company.id } });
  });

  it('deve executar o ciclo de vida completo de ponta a ponta', async () => {
    // -------------------------------------------------------------------------
    // ETAPA 1: Colaborador realiza login
    // -------------------------------------------------------------------------
    const loginColab = await authService.login(userColabDb.email, passwordRaw);
    expect(loginColab.token).toBeDefined();
    expect(loginColab.user.role).toBe(UserRole.COLABORADOR);
    expect(loginColab.user.employeeId).toBe(empColab.id);

    const authColabUser: AuthenticatedUser = {
      id: loginColab.user.id,
      email: loginColab.user.email,
      name: loginColab.user.name,
      role: loginColab.user.role as UserRole,
      companyId: loginColab.user.companyId,
      employeeId: loginColab.user.employeeId,
    };

    // -------------------------------------------------------------------------
    // ETAPA 2: Colaborador registra ponto (Entrada)
    // -------------------------------------------------------------------------
    const punchResult = await timeTrackingService.registerPunch(authColabUser, {
      type: TimeEntryType.ENTRADA,
      origin: 'WEB',
    });

    expect(punchResult.entry).toBeDefined();
    expect(punchResult.entry.type).toBe(TimeEntryType.ENTRADA);
    expect(punchResult.entry.originalRecord).toBe(true);
    expect(punchResult.entry.hashIntegrity).toBeDefined();

    // -------------------------------------------------------------------------
    // ETAPA 3: Colaborador consulta histórico de marcações de hoje
    // -------------------------------------------------------------------------
    const todayEntries = await timeTrackingService.getTodayEntries(authColabUser);
    expect(todayEntries.count).toBeGreaterThanOrEqual(1);
    expect(todayEntries.entries.some((e) => e.type === TimeEntryType.ENTRADA)).toBe(true);

    // -------------------------------------------------------------------------
    // ETAPA 4: Colaborador solicita ajuste de ponto (marcação esquecida de saída)
    // -------------------------------------------------------------------------
    const adjustmentReq = await adjustmentsService.createRequest(authColabUser, {
      date: '2026-10-15',
      type: AdjustmentType.ESQUECIMENTO,
      entryType: TimeEntryType.SAIDA,
      proposedTime: '18:00',
      justification: 'Esquecimento de registro no encerramento da jornada.',
    });

    expect(adjustmentReq.id).toBeDefined();
    expect(adjustmentReq.status).toBe(RequestStatus.PENDENTE);
    expect(adjustmentReq.employeeId).toBe(empColab.id);

    // -------------------------------------------------------------------------
    // ETAPA 5: Gestor realiza login
    // -------------------------------------------------------------------------
    const loginGestor = await authService.login(userGestorDb.email, passwordRaw);
    expect(loginGestor.token).toBeDefined();
    expect(loginGestor.user.role).toBe(UserRole.GESTOR);

    const authGestorUser: AuthenticatedUser = {
      id: loginGestor.user.id,
      email: loginGestor.user.email,
      name: loginGestor.user.name,
      role: loginGestor.user.role as UserRole,
      companyId: loginGestor.user.companyId,
      employeeId: loginGestor.user.employeeId,
    };

    // -------------------------------------------------------------------------
    // ETAPA 6: Gestor consulta e aprova a solicitação do liderado
    // -------------------------------------------------------------------------
    const gestorPendingRequests = await adjustmentsService.listRequestsForReview(authGestorUser, {
      status: RequestStatus.PENDENTE,
    });

    expect(gestorPendingRequests.length).toBeGreaterThan(0);
    const targetReq = gestorPendingRequests.find((r) => r.id === adjustmentReq.id);
    expect(targetReq).toBeDefined();

    const approvalResult = await adjustmentsService.decideRequest(authGestorUser, adjustmentReq.id, {
      status: RequestStatus.APROVADA,
      decisionNotes: 'Aprovado conforme verificação de presença física na unidade.',
    });

    expect(approvalResult.status).toBe(RequestStatus.APROVADA);
    expect(approvalResult.reviewerId).toBe(userGestorDb.id);

    // Verificar que a marcação original NÃO foi alterada e a tratada foi criada
    const treatedRecord = await prisma.timeEntry.findFirst({
      where: { adjustmentRequestId: adjustmentReq.id },
    });

    expect(treatedRecord).not.toBeNull();
    expect(treatedRecord?.isTreated).toBe(true);
    expect(treatedRecord?.originalRecord).toBe(false);

    // -------------------------------------------------------------------------
    // ETAPA 7: Colaborador visualiza resultado atualizado no espelho de ponto
    // -------------------------------------------------------------------------
    const mySummary = await timesheetService.calculateTimesheet(authColabUser, empColab.id, '2026-10');
    expect(mySummary).toBeDefined();

    const targetDay = mySummary.days.find((d) => d.date === '2026-10-15');
    expect(targetDay).toBeDefined();
    // A marcação tratada de saída deve constar nas marcações tratadas do dia
    expect(targetDay?.treatedPunches.some((p) => p.isTreated && p.type === TimeEntryType.SAIDA)).toBe(true);
  });
});
