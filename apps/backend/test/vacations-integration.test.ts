import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@pontuarh/shared';
import { vacationsService } from '../src/vacations/vacations.service';
import { leavesService } from '../src/leaves/leaves.service';
import { medicalCertificatesService } from '../src/medical-certificates/medical-certificates.service';
import { documentsService } from '../src/documents/documents.service';
import { timesheetService } from '../src/timesheet/timesheet.service';
import { timeBankService } from '../src/time-bank/time-bank.service';

const prisma = new PrismaClient();

describe('Pontua RH — Fase 4: Integração de Férias, Afastamentos, Atestados e Documentos', () => {
  let companyA: any;
  let companyB: any;
  let deptA: any;
  let managerA: any;
  let employee1: any;
  let employee2: any;
  let employeeB: any;

  let hrUser: any;
  let managerUser: any;
  let colab1User: any;
  let colab2User: any;

  beforeAll(async () => {
    // 1. Criar empresas para isolamento multitenant
    companyA = await prisma.company.create({
      data: {
        name: 'Tech Férias Corp A',
        cnpj: `44${Date.now().toString().slice(-12)}`,
      },
    });

    companyB = await prisma.company.create({
      data: {
        name: 'Tech Férias Corp B',
        cnpj: `55${Date.now().toString().slice(-12)}`,
      },
    });

    deptA = await prisma.department.create({
      data: { companyId: companyA.id, name: 'Tecnologia & Operações' },
    });

    // 2. Criar Gestor e Colaboradores
    managerA = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Carlos Gerente Tech',
        cpf: `66${Date.now().toString().slice(-9)}`,
        email: `gerente_${Date.now()}@tech.com`,
        admissionDate: new Date('2022-01-01T00:00:00.000Z'),
        departmentId: deptA.id,
        baseSalary: 12000.0,
      },
    });

    employee1 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Lucas Desenvolvedor 1',
        cpf: `77${Date.now().toString().slice(-9)}`,
        email: `lucas_${Date.now()}@tech.com`,
        admissionDate: new Date('2023-01-01T00:00:00.000Z'),
        departmentId: deptA.id,
        managerId: managerA.id,
        baseSalary: 6000.0,
      },
    });

    employee2 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        fullName: 'Mariana Designer 2',
        cpf: `88${Date.now().toString().slice(-9)}`,
        email: `mariana_${Date.now()}@tech.com`,
        admissionDate: new Date('2023-06-01T00:00:00.000Z'),
        departmentId: deptA.id,
        managerId: managerA.id,
        baseSalary: 5500.0,
      },
    });

    employeeB = await prisma.employee.create({
      data: {
        companyId: companyB.id,
        fullName: 'João Outra Empresa B',
        cpf: `99${Date.now().toString().slice(-9)}`,
        email: `joao_${Date.now()}@corpb.com`,
        admissionDate: new Date('2023-01-01T00:00:00.000Z'),
        baseSalary: 4000.0,
      },
    });

    // Criar registros reais de User para respeitar Foreign Key em AuditLog
    const userHr = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: `rh_${Date.now()}@tech.com`,
        name: 'RH Gestora',
        passwordHash: 'dummyhash',
        role: UserRole.RH,
      },
    });

    const userMgr = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: managerA.email,
        name: managerA.fullName,
        passwordHash: 'dummyhash',
        role: UserRole.GESTOR,
      },
    });

    const userColab1 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: employee1.email,
        name: employee1.fullName,
        passwordHash: 'dummyhash',
        role: UserRole.COLABORADOR,
      },
    });

    const userColab2 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        email: employee2.email,
        name: employee2.fullName,
        passwordHash: 'dummyhash',
        role: UserRole.COLABORADOR,
      },
    });

    hrUser = {
      id: userHr.id,
      email: userHr.email,
      name: userHr.name,
      role: UserRole.RH,
      companyId: companyA.id,
    };

    managerUser = {
      id: userMgr.id,
      email: userMgr.email,
      name: userMgr.name,
      role: UserRole.GESTOR,
      companyId: companyA.id,
      employeeId: managerA.id,
    };

    colab1User = {
      id: userColab1.id,
      email: userColab1.email,
      name: userColab1.name,
      role: UserRole.COLABORADOR,
      companyId: companyA.id,
      employeeId: employee1.id,
    };

    colab2User = {
      id: userColab2.id,
      email: userColab2.email,
      name: userColab2.name,
      role: UserRole.COLABORADOR,
      companyId: companyA.id,
      employeeId: employee2.id,
    };
  });

  afterAll(async () => {
    // Cleanup das empresas de teste
    if (companyA) await prisma.company.delete({ where: { id: companyA.id } }).catch(() => {});
    if (companyB) await prisma.company.delete({ where: { id: companyB.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1. Ciclo de Férias: Solicitação, Aprovação, Recusa e Cancelamento', () => {
    let createdPeriod: any;
    let vacationReq: any;

    it('deve gerar e listar períodos aquisitivos para o colaborador', async () => {
      const periods = await vacationsService.listEmployeePeriods(employee1.id, hrUser);
      expect(periods.length).toBeGreaterThanOrEqual(1);

      createdPeriod = periods[0];
      expect(createdPeriod.daysAcquired).toBe(30);
      expect(createdPeriod.daysRemaining).toBe(30);
    });

    it('Cenário 4: Colaborador solicita férias válidas de 15 dias', async () => {
      // 2026-11-16 é segunda-feira
      vacationReq = await vacationsService.createVacationRequest(colab1User, {
        vacationPeriodId: createdPeriod.id,
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        daysCount: 15,
        employeeNotes: 'Férias de fim de ano com a família.',
      });

      expect(vacationReq).toBeDefined();
      expect(vacationReq.status).toBe('PENDENTE');
      expect(vacationReq.daysCount).toBe(15);
      expect(vacationReq.fractionNumber).toBe(1);
    });

    it('Cenário 5: Gestor aprova a solicitação de férias de seu subordinado', async () => {
      const approved = await vacationsService.decideVacationRequest(managerUser, vacationReq.id, {
        status: 'APROVADA',
        decisionNotes: 'Aprovado conforme planejamento da equipe.',
      });

      expect(approved.status).toBe('APROVADA');

      // Verifica que o saldo do período aquisitivo foi atualizado
      const periodAfter = await prisma.vacationPeriod.findUnique({ where: { id: createdPeriod.id } });
      expect(periodAfter?.daysRemaining).toBe(15); // 30 - 15 = 15
      expect(periodAfter?.daysUsed).toBe(15);
      expect(periodAfter?.status).toBe('PARCIALMENTE_USUFRUIDO');
    });

    it('Cenário 7: Cancelamento de férias aprovadas deve restituir os dias ao período aquisitivo', async () => {
      const canceled = await vacationsService.cancelVacationRequest(
        colab1User,
        vacationReq.id,
        'Mudança de planos pessoais'
      );

      expect(canceled.status).toBe('CANCELADA');

      const periodAfterCancel = await prisma.vacationPeriod.findUnique({ where: { id: createdPeriod.id } });
      expect(periodAfterCancel?.daysRemaining).toBe(30);
      expect(periodAfterCancel?.daysUsed).toBe(0);
      expect(periodAfterCancel?.status).toBe('ADQUIRIDO');
    });

    it('Cenário 6: Recusa de férias com motivo obrigatório preserva saldo', async () => {
      // Nova solicitação de 20 dias
      const newReq = await vacationsService.createVacationRequest(colab1User, {
        vacationPeriodId: createdPeriod.id,
        startDate: '2026-11-16',
        endDate: '2026-12-05',
        daysCount: 20,
      });

      // Recusa sem motivo deve falhar
      await expect(
        vacationsService.decideVacationRequest(managerUser, newReq.id, {
          status: 'RECUSADA',
          decisionNotes: '',
        })
      ).rejects.toThrow('É obrigatório informar a justificativa');

      // Recusa com motivo
      const rejected = await vacationsService.decideVacationRequest(managerUser, newReq.id, {
        status: 'RECUSADA',
        decisionNotes: 'Período de alta demanda no projeto.',
      });

      expect(rejected.status).toBe('RECUSADA');

      const periodAfter = await prisma.vacationPeriod.findUnique({ where: { id: createdPeriod.id } });
      expect(periodAfter?.daysRemaining).toBe(30);
      expect(periodAfter?.daysUsed).toBe(0);
    });
  });

  describe('2. Cenário 10: Sobreposição de Períodos', () => {
    it('deve REJEITAR solicitação de férias sobreposta a outra solicitação já ativa', async () => {
      const periods = await vacationsService.listEmployeePeriods(employee1.id, hrUser);
      const period = periods[0];

      // Cria e aprova período 1
      const req1 = await vacationsService.createVacationRequest(colab1User, {
        vacationPeriodId: period.id,
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        daysCount: 15,
      });

      await vacationsService.decideVacationRequest(hrUser, req1.id, { status: 'APROVADA' });

      // Tentativa de criar férias sobrepostas no mesmo intervalo (iniciando em 17/11, terça-feira)
      await expect(
        vacationsService.createVacationRequest(colab1User, {
          vacationPeriodId: period.id,
          startDate: '2026-11-17',
          endDate: '2026-12-01',
          daysCount: 15,
        })
      ).rejects.toThrow('Conflito de período com outra solicitação de férias');
    });
  });

  describe('3. Cenários 11 e 12: Integração com Controle de Ponto e Banco de Horas', () => {
    it('Cenário 11: Férias aprovadas no espelho de ponto não geram falta injustificada e não debitam banco', async () => {
      // 2026-11-16 a 2026-11-30 (novembro de 2026) possui férias aprovadas para employee1
      const timesheet = await timesheetService.calculateTimesheet(
        colab1User,
        employee1.id,
        '2026-11'
      );

      expect(timesheet).toBeDefined();

      // Localiza o dia 16/11/2026
      const day16 = timesheet.days.find((d: any) => d.date === '2026-11-16');
      expect(day16).toBeDefined();
      expect(day16.occurrences).toContain('Férias Remuneradas (CLT)');
      expect(day16.occurrences).not.toContain('Falta Integral');
      expect(day16.delayMinutes).toBe(0);
      expect(day16.balanceHours).toBe(0);
      expect(day16.timeBankMinutes).toBe(0);
    });

    it('Cenário 12: Bloqueio de compensação de banco de horas em dia com férias programadas', async () => {
      // Adiciona crédito inicial no banco de horas para employee1
      await prisma.timeBankTransaction.create({
        data: {
          companyId: companyA.id,
          employeeId: employee1.id,
          type: 'CREDITO',
          minutes: 480, // 8h
          competence: '2026-11',
          origin: 'APURACAO_PONTO',
          status: 'CONSOLIDADO',
        },
      });

      // Tentativa de solicitar folga de banco de horas no dia 2026-11-18 (durante as férias)
      await expect(
        timeBankService.createCompensationRequest(
          companyA.id,
          employee1.id,
          {
            type: 'FOLGA_INTEGRAL',
            date: '2026-11-18',
            durationMinutes: 480,
            justification: 'Tentativa de compensar em dia de férias',
          },
          employee1.id
        )
      ).rejects.toThrow('possui férias programadas na data pretendida');
    });
  });

  describe('4. Cenários 13 e 14: Afastamentos e Atestados Médicos', () => {
    let leaveId: string;
    let certId: string;

    it('Cenário 13: Registro de afastamento e bloqueio de compensação em dia de licença', async () => {
      const leave = await leavesService.createLeave(hrUser, {
        employeeId: employee2.id,
        type: 'LICENCA_MATERNIDADE',
        startDate: '2026-12-01',
        endDate: '2027-03-31',
        reason: 'Licença-maternidade legal de 120 dias.',
      });

      expect(leave).toBeDefined();
      expect(leave.status).toBe('ATIVO');
      leaveId = leave.id;

      // Adiciona crédito no banco de employee2
      await prisma.timeBankTransaction.create({
        data: {
          companyId: companyA.id,
          employeeId: employee2.id,
          type: 'CREDITO',
          minutes: 240,
          competence: '2026-12',
          origin: 'APURACAO_PONTO',
          status: 'CONSOLIDADO',
        },
      });

      // Tentativa de solicitar folga de banco durante o afastamento
      await expect(
        timeBankService.createCompensationRequest(
          companyA.id,
          employee2.id,
          {
            type: 'SAIDA_ANTECIPADA',
            date: '2026-12-15',
            durationMinutes: 60,
            justification: 'Compensação durante licença',
          },
          employee2.id
        )
      ).rejects.toThrow('possui afastamento/licença ativo');
    });

    it('Cenário 14: Envio de atestado pelo colaborador e homologação pelo RH criando afastamento', async () => {
      const cert = await medicalCertificatesService.createCertificate(colab1User, {
        issueDate: '2026-10-10',
        startDate: '2026-10-10',
        daysOff: 3,
        doctorName: 'Dr. Roberto Santos',
        crmNumber: '123456',
        crmState: 'SP',
        cidCode: 'J06.9',
        justification: 'Infecção aguda das vias aéreas superiores.',
      });

      expect(cert).toBeDefined();
      expect(cert.status).toBe('PENDENTE');
      certId = cert.id;

      // RH homologa o atestado médico
      const approvedCert = await medicalCertificatesService.decideCertificate(hrUser, cert.id, {
        status: 'APROVADO',
        decisionNotes: 'Atestado formal e CRM validado.',
      });

      expect(approvedCert.status).toBe('APROVADO');
      expect(approvedCert.employeeLeaveId).toBeDefined();

      // Confirma que gerou o afastamento correspondente no banco
      const generatedLeave = await prisma.employeeLeave.findUnique({
        where: { id: approvedCert.employeeLeaveId! },
      });
      expect(generatedLeave).toBeDefined();
      expect(generatedLeave?.type).toBe('DOENCA_ATE_15D');
    });

    it('Cenário 15 (LGPD): Gestor não visualiza CID médico de seus colaboradores', async () => {
      const certsForManager = await medicalCertificatesService.listCertificates(companyA.id, managerUser, {
        employeeId: employee1.id,
      });

      const cert = certsForManager.find((c) => c.id === certId);
      expect(cert).toBeDefined();
      expect(cert?.cidCode).toBeUndefined(); // Protegido!

      // RH deve visualizar o CID
      const certsForHr = await medicalCertificatesService.listCertificates(companyA.id, hrUser, {
        employeeId: employee1.id,
      });
      const certHr = certsForHr.find((c) => c.id === certId);
      expect(certHr?.cidCode).toBe('J06.9');
    });
  });

  describe('5. Cenários 15 e 16: Permissões RBAC e Isolamento Multitenant', () => {
    it('Cenário 15: Colaborador não pode autoaprovar suas próprias férias', async () => {
      const periods = await vacationsService.listEmployeePeriods(employee1.id, hrUser);
      const req = await vacationsService.createVacationRequest(colab1User, {
        vacationPeriodId: periods[0].id,
        startDate: '2027-01-11',
        endDate: '2027-01-25',
        daysCount: 15,
      });

      await expect(
        vacationsService.decideVacationRequest(colab1User, req.id, {
          status: 'APROVADA',
        })
      ).rejects.toThrow('Acesso negado: seu perfil não possui permissão');
    });

    it('Cenário 15: Gestor não pode aprovar férias de colaborador fora de sua equipe', async () => {
      // Cria colaborador em outro departamento com outro gestor
      const otherEmployee = await prisma.employee.create({
        data: {
          companyId: companyA.id,
          fullName: 'Paula Outra Equipe',
          cpf: `11${Date.now().toString().slice(-9)}`,
          email: `paula_${Date.now()}@tech.com`,
          admissionDate: new Date('2023-01-01T00:00:00.000Z'),
          baseSalary: 7000.0,
        },
      });

      const periods = await vacationsService.listEmployeePeriods(otherEmployee.id, hrUser);
      const req = await vacationsService.createVacationRequest(hrUser, {
        employeeId: otherEmployee.id,
        vacationPeriodId: periods[0].id,
        startDate: '2027-02-01',
        endDate: '2027-02-15',
        daysCount: 15,
      });

      // ManagerUser tenta aprovar
      await expect(
        vacationsService.decideVacationRequest(managerUser, req.id, {
          status: 'APROVADA',
        })
      ).rejects.toThrow('Acesso negado: o colaborador não é seu subordinado direto');
    });

    it('Cenário 16: Isolamento Multitenant impede consulta entre empresas', async () => {
      await expect(
        vacationsService.listEmployeePeriods(employeeB.id, hrUser) // hrUser é da CompanyA
      ).rejects.toThrow();
    });
  });

  describe('6. Cenários 17 e 18: Gestão Documental e Acesso Seguro', () => {
    let docId: string;

    it('Cenário 17: Upload seguro de documento com validação e armazenamento em repositório seguro', async () => {
      const dummyPdfBase64 = Buffer.from('%PDF-1.4 dummy pdf content for testing').toString('base64');

      const doc = await documentsService.uploadDocument(hrUser, {
        employeeId: employee1.id,
        category: 'AVISO_FERIAS',
        title: 'Aviso Prévio de Férias 2026',
        fileName: 'aviso_ferias_lucas.pdf',
        fileBase64: dummyPdfBase64,
        mimeType: 'application/pdf',
        isConfidential: true,
      });

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.fileKey).toContain('aviso_ferias_lucas.pdf');
      docId = doc.id;
    });

    it('Cenário 18: Bloqueio de download de documento confidencial por gestor não autorizado', async () => {
      await expect(
        documentsService.getDocumentFile(companyA.id, docId, managerUser)
      ).rejects.toThrow('este documento é classificado como confidencial');

      // Colaborador titular ou RH podem baixar
      const ownerDownload = await documentsService.getDocumentFile(companyA.id, docId, colab1User);
      expect(ownerDownload.fileBuffer).toBeDefined();

      const hrDownload = await documentsService.getDocumentFile(companyA.id, docId, hrUser);
      expect(hrDownload.fileBuffer).toBeDefined();
    });
  });
});
