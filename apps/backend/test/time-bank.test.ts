import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/prisma/prisma.service';
import { timeBankService } from '../src/time-bank/time-bank.service';
import { UserRole, TimeBankCompensationStatus } from '@pontuarh/shared';
import { AuthenticatedUser } from '../src/middlewares/auth.guard';

describe('Módulo de Banco de Horas e Compensações — Testes de Estabilização e Integridade (Fase 3.1)', () => {
  let companyA: any;
  let companyB: any;
  let policyA: any;
  let policyNoNegative: any;

  let empGestorA: any;
  let empColabA1: any;
  let empColabA2: any;
  let empColabB: any;

  let userRHA: AuthenticatedUser;
  let userGestorA: AuthenticatedUser;
  let userColabA1: AuthenticatedUser;
  let userColabA2: AuthenticatedUser;

  beforeAll(async () => {
    // 1. Criar empresas para isolamento multitenant
    companyA = await prisma.company.create({
      data: {
        name: 'Empresa Teste Banco de Horas A Ltda',
        cnpj: '91.222.333/0001-44',
      },
    });

    companyB = await prisma.company.create({
      data: {
        name: 'Empresa Teste B (Multitenant) Ltda',
        cnpj: '91.222.333/0002-55',
      },
    });

    // 2. Políticas de Banco de Horas
    policyA = await prisma.timeBankPolicy.create({
      data: {
        companyId: companyA.id,
        name: 'Política Padrão Semestral (Permite Negativo)',
        periodMonths: 6,
        allowNegativeBalance: true,
        maxNegativeBalanceMinutes: 600, // Máx 10h negativas
        isDefault: true,
      },
    });

    policyNoNegative = await prisma.timeBankPolicy.create({
      data: {
        companyId: companyA.id,
        name: 'Política Restritiva (Sem Saldo Negativo)',
        periodMonths: 6,
        allowNegativeBalance: false,
        maxNegativeBalanceMinutes: 0,
        isDefault: false,
      },
    });

    // 3. Usuários e Colaboradores da Empresa A
    const uRH = await prisma.user.create({
      data: {
        companyId: companyA.id,
        name: 'Mariana RH',
        email: 'mariana.rh.tb99@teste.com',
        passwordHash: 'hash',
        role: UserRole.RH,
      },
    });
    userRHA = {
      id: uRH.id,
      email: uRH.email,
      name: uRH.name,
      role: UserRole.RH,
      companyId: companyA.id,
    };

    const uGestor = await prisma.user.create({
      data: {
        companyId: companyA.id,
        name: 'Carlos Gestor',
        email: 'carlos.gestor.tb99@teste.com',
        passwordHash: 'hash',
        role: UserRole.GESTOR,
      },
    });
    empGestorA = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        userId: uGestor.id,
        fullName: 'Carlos Gestor',
        cpf: '71100000001',
        email: uGestor.email,
        admissionDate: new Date('2022-01-01'),
        status: 'ATIVO',
      },
    });
    userGestorA = {
      id: uGestor.id,
      email: uGestor.email,
      name: uGestor.name,
      role: UserRole.GESTOR,
      companyId: companyA.id,
      employeeId: empGestorA.id,
    };

    const uColab1 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        name: 'Lucas Colaborador',
        email: 'lucas.colab.tb99@teste.com',
        passwordHash: 'hash',
        role: UserRole.COLABORADOR,
      },
    });
    empColabA1 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        userId: uColab1.id,
        fullName: 'Lucas Colaborador',
        cpf: '71100000002',
        email: uColab1.email,
        admissionDate: new Date('2022-03-01'),
        managerId: empGestorA.id, // Liderado do Carlos Gestor
        status: 'ATIVO',
      },
    });
    userColabA1 = {
      id: uColab1.id,
      email: uColab1.email,
      name: uColab1.name,
      role: UserRole.COLABORADOR,
      companyId: companyA.id,
      employeeId: empColabA1.id,
    };

    const uColab2 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        name: 'Fernanda Colaboradora',
        email: 'fernanda.colab.tb99@teste.com',
        passwordHash: 'hash',
        role: UserRole.COLABORADOR,
      },
    });
    empColabA2 = await prisma.employee.create({
      data: {
        companyId: companyA.id,
        userId: uColab2.id,
        fullName: 'Fernanda Colaboradora',
        cpf: '71100000003',
        email: uColab2.email,
        admissionDate: new Date('2023-01-15'),
        managerId: null, // NÃO liderada do Carlos
        timeBankPolicyId: policyNoNegative.id,
        status: 'ATIVO',
      },
    });
    userColabA2 = {
      id: uColab2.id,
      email: uColab2.email,
      name: uColab2.name,
      role: UserRole.COLABORADOR,
      companyId: companyA.id,
      employeeId: empColabA2.id,
    };

    // 4. Colaborador na Empresa B (para isolamento multitenant)
    const uColabB = await prisma.user.create({
      data: {
        companyId: companyB.id,
        name: 'Pedro Empresa B',
        email: 'pedro.b.tb99@teste.com',
        passwordHash: 'hash',
        role: UserRole.COLABORADOR,
      },
    });
    empColabB = await prisma.employee.create({
      data: {
        companyId: companyB.id,
        userId: uColabB.id,
        fullName: 'Pedro Empresa B',
        cpf: '71100000004',
        email: uColabB.email,
        admissionDate: new Date('2023-05-10'),
        status: 'ATIVO',
      },
    });
  });

  afterAll(async () => {
    if (companyA?.id) {
      await prisma.timeBankTransaction.deleteMany({ where: { companyId: companyA.id } });
      await prisma.timeBankCompensationRequest.deleteMany({ where: { companyId: companyA.id } });
      await prisma.timeBankPolicy.deleteMany({ where: { companyId: companyA.id } });
      await prisma.auditLog.deleteMany({ where: { companyId: companyA.id } });
      await prisma.employee.deleteMany({ where: { companyId: companyA.id } });
      await prisma.user.deleteMany({ where: { companyId: companyA.id } });
      await prisma.company.delete({ where: { id: companyA.id } });
    }
    if (companyB?.id) {
      await prisma.timeBankTransaction.deleteMany({ where: { companyId: companyB.id } });
      await prisma.timeBankCompensationRequest.deleteMany({ where: { companyId: companyB.id } });
      await prisma.timeBankPolicy.deleteMany({ where: { companyId: companyB.id } });
      await prisma.auditLog.deleteMany({ where: { companyId: companyB.id } });
      await prisma.employee.deleteMany({ where: { companyId: companyB.id } });
      await prisma.user.deleteMany({ where: { companyId: companyB.id } });
      await prisma.company.delete({ where: { id: companyB.id } });
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIOS PREPARATÓRIOS: CRÉDITOS E SALDO INICIAL
  // --------------------------------------------------------------------------

  it('Setup: Deve registrar créditos iniciais de horas para os testes', async () => {
    const tx = await timeBankService.createTransaction(
      companyA.id,
      {
        employeeId: empColabA1.id,
        type: 'CREDITO',
        minutes: 600, // +10h
        competence: '2026-10',
        origin: 'APURACAO_PONTO',
        description: 'Crédito de 10 horas excedentes',
        idempotencyKey: 'setup-credit-600',
      },
      userRHA.id
    );

    expect(tx).toBeDefined();
    expect(tx.minutes).toBe(600);

    const balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balance.currentBalanceMinutes).toBe(600);
    expect(balance.availableBalanceMinutes).toBe(600);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 1: FOLGA FUTURA APROVADA
  // --------------------------------------------------------------------------

  it('1. Folga futura aprovada: horas devem permanecer reservadas sem débito prematuro no ledger', async () => {
    const balanceBefore = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    const initialCurrent = balanceBefore.currentBalanceMinutes;

    const req = await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA1.id,
      {
        type: 'FOLGA_INTEGRAL',
        date: '2026-11-15',
        durationMinutes: 120, // 2h
        justification: 'Folga futura para compromisso',
        idempotencyKey: 'scen-1-future-approved',
      },
      userColabA1.id
    );

    expect(req.status).toBe(TimeBankCompensationStatus.RESERVADA);

    // Gestor aprova a folga futura
    const approved = await timeBankService.decideCompensationRequest(
      companyA.id,
      req.id,
      { status: 'APROVADA', decisionNotes: 'Aprovado pelo gestor' },
      userGestorA
    );
    expect(approved.status).toBe(TimeBankCompensationStatus.APROVADA);

    // Auditoria dos saldos: o saldo do ledger NÃO sofreu baixa e as horas continuam reservadas
    const balanceAfter = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balanceAfter.currentBalanceMinutes).toBe(initialCurrent); // Sem baixa prematura!
    expect(balanceAfter.reservedMinutes).toBe(120); // Horas reservadas!
    expect(balanceAfter.availableBalanceMinutes).toBe(initialCurrent - 120);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 2: FOLGA EFETIVAMENTE REALIZADA
  // --------------------------------------------------------------------------

  it('2. Folga efetivamente realizada: consolida débito COMPENSACAO no ledger e liquida reserva', async () => {
    const req = await prisma.timeBankCompensationRequest.findFirst({
      where: { companyId: companyA.id, idempotencyKey: 'scen-1-future-approved' },
    });
    expect(req).toBeDefined();

    const balanceBefore = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);

    // Confirma realização da folga
    const realized = await timeBankService.realizeCompensationRequest(
      companyA.id,
      req!.id,
      userGestorA,
      'Colaborador usufruiu a folga integral'
    );
    expect(realized.status).toBe(TimeBankCompensationStatus.REALIZADA);
    expect(realized.ledgerTransactionId).toBeDefined();

    // Verifica que a movimentação COMPENSACAO foi criada no ledger
    const ledgerTx = await prisma.timeBankTransaction.findUnique({
      where: { id: realized.ledgerTransactionId! },
    });
    expect(ledgerTx?.type).toBe('COMPENSACAO');
    expect(ledgerTx?.minutes).toBe(120);

    // Saldo atual diminui 120, reserva é zerada, disponível líquido permanece estável
    const balanceAfter = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balanceAfter.currentBalanceMinutes).toBe(balanceBefore.currentBalanceMinutes - 120);
    expect(balanceAfter.reservedMinutes).toBe(0);
    expect(balanceAfter.availableBalanceMinutes).toBe(balanceBefore.availableBalanceMinutes);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 3: CANCELAMENTO ANTES DA REALIZAÇÃO (DE RESERVADA PARA CANCELADA)
  // --------------------------------------------------------------------------

  it('3. Cancelamento antes da realização: de RESERVADA para CANCELADA liberando a reserva', async () => {
    const req = await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA1.id,
      {
        type: 'SAIDA_ANTECIPADA',
        date: '2026-11-20',
        durationMinutes: 60,
        justification: 'Consulta',
        idempotencyKey: 'scen-3-cancel-reserved',
      },
      userColabA1.id
    );

    let balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balance.reservedMinutes).toBe(60);

    const canceled = await timeBankService.cancelCompensationRequest(
      companyA.id,
      req.id,
      userColabA1,
      'Consulta remarcada'
    );
    expect(canceled.status).toBe(TimeBankCompensationStatus.CANCELADA);

    balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balance.reservedMinutes).toBe(0);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 4: CANCELAMENTO DE FOLGA PREVIAMENTE APROVADA
  // --------------------------------------------------------------------------

  it('4. Cancelamento de folga previamente aprovada: de APROVADA para CANCELADA liberando a reserva', async () => {
    const req = await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA1.id,
      {
        type: 'FOLGA_INTEGRAL',
        date: '2026-11-25',
        durationMinutes: 120,
        justification: 'Folga planejada',
        idempotencyKey: 'scen-4-cancel-approved',
      },
      userColabA1.id
    );

    await timeBankService.decideCompensationRequest(companyA.id, req.id, { status: 'APROVADA' }, userGestorA);

    let balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balance.reservedMinutes).toBe(120);

    // Cancelamento da folga APROVADA
    const canceled = await timeBankService.cancelCompensationRequest(
      companyA.id,
      req.id,
      userColabA1,
      'Cancelada pelo colaborador após aprovação'
    );
    expect(canceled.status).toBe(TimeBankCompensationStatus.CANCELADA);

    balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balance.reservedMinutes).toBe(0);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 5: TENTATIVA DE COMPENSAÇÃO DUPLICADA / CONSUMO EXCESSIVO
  // --------------------------------------------------------------------------

  it('5. Tentativa de compensação duplicada: bloqueia quando horas já foram reservadas', async () => {
    const balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    const available = balance.availableBalanceMinutes;

    // Reserva a totalidade do saldo disponível
    await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA1.id,
      {
        type: 'FOLGA_INTEGRAL',
        date: '2026-11-28',
        durationMinutes: available,
        justification: 'Reserva integral',
        idempotencyKey: 'scen-5-full-reserve',
      },
      userColabA1.id
    );

    // Tentar reservar mais horas quando o saldo disponível foi a zero
    await expect(
      timeBankService.createCompensationRequest(
        companyA.id,
        empColabA1.id,
        {
          type: 'SAIDA_ANTECIPADA',
          date: '2026-11-29',
          durationMinutes: 30,
          justification: 'Tentativa duplicada com saldo esgotado',
          idempotencyKey: 'scen-5-duplicate-attempt',
        },
        userColabA1.id
      )
    ).rejects.toThrow('Saldo disponível insuficiente para compensação');

    // Limpa a solicitação do teste 5
    const req5 = await prisma.timeBankCompensationRequest.findFirst({
      where: { idempotencyKey: 'scen-5-full-reserve' },
    });
    if (req5) {
      await timeBankService.cancelCompensationRequest(companyA.id, req5.id, userColabA1);
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 6: SOLICITAÇÃO COM SALDO INSUFICIENTE
  // --------------------------------------------------------------------------

  it('6. Solicitação com saldo insuficiente deve ser prontamente rejeitada', async () => {
    const balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    await expect(
      timeBankService.createCompensationRequest(
        companyA.id,
        empColabA1.id,
        {
          type: 'FOLGA_INTEGRAL',
          date: '2026-12-01',
          durationMinutes: balance.availableBalanceMinutes + 100,
          justification: 'Acima do limite',
        },
        userColabA1.id
      )
    ).rejects.toThrow('Saldo disponível insuficiente para compensação');
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 7: VENCIMENTO DE SALDO POSITIVO (ALERTA RH SEM EXCLUSÃO AUTOMÁTICA)
  // --------------------------------------------------------------------------

  it('7. Vencimento de saldo positivo: deve sinalizar alerta de análise para o RH sem exclusão automática', async () => {
    const expiredPolicy = await prisma.timeBankPolicy.create({
      data: {
        companyId: companyA.id,
        name: 'Política Expirada',
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-06-30'),
        allowNegativeBalance: true,
        active: true,
      },
    });

    await prisma.employee.update({
      where: { id: empColabA2.id },
      data: { timeBankPolicyId: expiredPolicy.id },
    });

    await timeBankService.createTransaction(
      companyA.id,
      {
        employeeId: empColabA2.id,
        type: 'CREDITO',
        minutes: 180,
        competence: '2025-05',
        idempotencyKey: 'scen-7-expired-credit',
      },
      userRHA.id
    );

    const balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA2.id);

    expect(balance.currentBalanceMinutes).toBeGreaterThanOrEqual(180);
    expect(balance.isExpired).toBe(true);
    expect(balance.expiryNotice).toContain('Requer análise e deliberação administrativa pelo RH (sem baixa automática)');

    const expiredList = await timeBankService.listCompanyBalances(companyA.id, { status: 'VENCIDO' });
    expect(expiredList.some((s) => s.employeeId === empColabA2.id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 8: GESTOR TENTANDO CONSULTAR SALDO DE OUTRA EQUIPE
  // --------------------------------------------------------------------------

  it('8. Gestor tentando consultar saldo de outra equipe deve ver exclusivamente seus liderados', async () => {
    // Carlos Gestor lidera empColabA1, mas NÃO lidera empColabA2
    const gestorBalances = await timeBankService.listCompanyBalances(companyA.id, {}, userGestorA);

    const hasSubordinate = gestorBalances.some((b) => b.employeeId === empColabA1.id);
    const hasOther = gestorBalances.some((b) => b.employeeId === empColabA2.id);

    expect(hasSubordinate).toBe(true);
    expect(hasOther).toBe(false); // Rigorosamente ocultado da visão do gestor
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 9: GESTOR TENTANDO APROVAR SOLICITAÇÃO NÃO AUTORIZADA
  // --------------------------------------------------------------------------

  it('9. Gestor tentando aprovar solicitação não autorizada (fora de sua alçada) deve ser bloqueado', async () => {
    const otherReq = await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA2.id,
      {
        type: 'SAIDA_ANTECIPADA',
        date: '2026-11-28',
        durationMinutes: 30,
        justification: 'Saída da colaboradora de outra equipe',
        idempotencyKey: 'scen-9-unauthorized-request',
      },
      userColabA2.id
    );

    await expect(
      timeBankService.decideCompensationRequest(
        companyA.id,
        otherReq.id,
        { status: 'APROVADA' },
        userGestorA
      )
    ).rejects.toThrow('Este colaborador não é seu liderado direto');
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 10: REPROCESSAMENTO DA MESMA COMPETÊNCIA (IDEMPOTÊNCIA DO RECÁLCULO)
  // --------------------------------------------------------------------------

  it('10. Reprocessamento da mesma competência não deve duplicar transações no ledger', async () => {
    const dateStr = '2026-10-25';
    const tx1 = await timeBankService.syncDayAdjustment(companyA.id, empColabA1.id, dateStr, 45, userRHA.id);
    expect(tx1).toBeDefined();

    // Reprocessamento idêntico
    const tx2 = await timeBankService.syncDayAdjustment(companyA.id, empColabA1.id, dateStr, 45, userRHA.id);
    expect(tx2?.id).toBe(tx1?.id); // Retornou a mesma transação sem criar duplicata
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 11: AJUSTE RETROATIVO APÓS COMPENSAÇÃO
  // --------------------------------------------------------------------------

  it('11. Ajuste retroativo após compensação deve recalcular o ledger sem quebrar solicitações já realizadas', async () => {
    const balanceBefore = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);

    // Ajuste retroativo retirando 30 min daquele dia
    await timeBankService.syncDayAdjustment(companyA.id, empColabA1.id, '2026-10-25', 15, userRHA.id);

    const balanceAfter = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    // Saldo ajustado com exatidão (-30 min líquidos da retificação do ponto)
    expect(balanceAfter.currentBalanceMinutes).toBe(balanceBefore.currentBalanceMinutes - 30);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 12: AJUSTE RETROATIVO APÓS TRANSFERÊNCIA PARA FOLHA
  // --------------------------------------------------------------------------

  it('12. Ajuste retroativo após transferência para folha: horas enviadas para folha permanecem protegidas', async () => {
    const payrollTx = await timeBankService.transferToPayroll(
      companyA.id,
      {
        employeeId: empColabA1.id,
        minutes: 60,
        competence: '2026-10',
        description: 'Transferência para folha antes de ajuste retroativo',
        idempotencyKey: 'scen-12-payroll-tx',
      },
      userRHA.id
    );
    expect(payrollTx).toBeDefined();

    // Agora ocorre um ajuste de ponto retroativo
    await timeBankService.syncDayAdjustment(companyA.id, empColabA1.id, '2026-10-26', 60, userRHA.id);

    // A transação de pagamento permanece intacta e o saldo foi incrementado pelos 60 min adicionais
    const payrollCheck = await prisma.timeBankTransaction.findUnique({ where: { id: payrollTx.id } });
    expect(payrollCheck?.status).toBe('CONSOLIDADO');
    expect(payrollCheck?.minutes).toBe(60);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 13: DUAS SOLICITAÇÕES CONCORRENTES UTILIZANDO O MESMO SALDO
  // --------------------------------------------------------------------------

  it('13. Duas solicitações concorrentes utilizando o mesmo saldo: lock transacional previne gasto duplo', async () => {
    const balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    const available = balance.availableBalanceMinutes;

    // Dispara 2 solicitações simultâneas que excedem o saldo caso somadas
    const amount = Math.floor(available * 0.7); // 70% cada = 140% somadas

    const promises = [
      timeBankService.createCompensationRequest(
        companyA.id,
        empColabA1.id,
        {
          type: 'FOLGA_INTEGRAL',
          date: '2026-12-05',
          durationMinutes: amount,
          justification: 'Concorrência 1',
        },
        userColabA1.id
      ),
      timeBankService.createCompensationRequest(
        companyA.id,
        empColabA1.id,
        {
          type: 'FOLGA_INTEGRAL',
          date: '2026-12-06',
          durationMinutes: amount,
          justification: 'Concorrência 2',
        },
        userColabA1.id
      ),
    ];

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Uma atendeu e a outra falhou por insuficiência de saldo
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Limpa a solicitação bem-sucedida para não travar os próximos testes
    if (fulfilled[0].status === 'fulfilled') {
      const successfulReq = (fulfilled[0] as PromiseFulfilledResult<any>).value;
      await timeBankService.cancelCompensationRequest(companyA.id, successfulReq.id, userColabA1);
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 14: TRANSFERÊNCIA PARA FOLHA DURANTE UMA RESERVA EXISTENTE
  // --------------------------------------------------------------------------

  it('14. Transferência para folha durante uma reserva existente deve ser limitada ao saldo disponível líquido', async () => {
    // Colaborador reserva 100 min
    const req = await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA1.id,
      {
        type: 'FOLGA_INTEGRAL',
        date: '2026-12-10',
        durationMinutes: 100,
        justification: 'Reserva para folha teste',
        idempotencyKey: 'scen-14-reserved-comp',
      },
      userColabA1.id
    );

    const balance = await timeBankService.calculateEmployeeBalance(companyA.id, empColabA1.id);
    expect(balance.reservedMinutes).toBe(100);

    // Tentar transferir o saldo total bruto para folha (ignorando a reserva) deve falhar
    await expect(
      timeBankService.transferToPayroll(
        companyA.id,
        {
          employeeId: empColabA1.id,
          minutes: balance.currentBalanceMinutes,
          competence: '2026-10',
        },
        userRHA.id
      )
    ).rejects.toThrow('Saldo positivo insuficiente para transferência');

    // Limpa a reserva
    await timeBankService.cancelCompensationRequest(companyA.id, req.id, userColabA1);
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 15: ESTORNO DUPLICADO
  // --------------------------------------------------------------------------

  it('15. Estorno duplicado de uma mesma movimentação deve ser bloqueado', async () => {
    const tx = await timeBankService.createTransaction(
      companyA.id,
      {
        employeeId: empColabA1.id,
        type: 'CREDITO',
        minutes: 30,
        competence: '2026-10',
        idempotencyKey: 'scen-15-double-reversal',
      },
      userRHA.id
    );

    // Primeiro estorno
    await timeBankService.reverseTransaction(companyA.id, tx.id, 'Primeiro estorno legítimo', userRHA.id);

    // Tentativa de segundo estorno da mesma transação
    await expect(
      timeBankService.reverseTransaction(companyA.id, tx.id, 'Segundo estorno concorrente', userRHA.id)
    ).rejects.toThrow('Esta movimentação já foi estornada anteriormente');
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 16: REUTILIZAÇÃO DE CHAVE DE IDEMPOTÊNCIA COM CONTEÚDO DIFERENTE
  // --------------------------------------------------------------------------

  it('16. Reutilização de chave de idempotência com conteúdo diferente deve ser rejeitada com erro de conflito', async () => {
    const key = 'idem-unique-conflict-test-key';

    await timeBankService.createTransaction(
      companyA.id,
      {
        employeeId: empColabA1.id,
        type: 'CREDITO',
        minutes: 60,
        competence: '2026-10',
        idempotencyKey: key,
      },
      userRHA.id
    );

    // Tentativa com mesma chave mas minutos diferentes (120 min)
    await expect(
      timeBankService.createTransaction(
        companyA.id,
        {
          employeeId: empColabA1.id,
          type: 'CREDITO',
          minutes: 120, // Diferente!
          competence: '2026-10',
          idempotencyKey: key,
        },
        userRHA.id
      )
    ).rejects.toThrow('Conflito de idempotência');
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 17: TENTATIVAS DE TRANSIÇÃO INVÁLIDA ENTRE ESTADOS
  // --------------------------------------------------------------------------

  it('17. Tentativas de transição inválida entre estados devem ser rejeitadas pela máquina de estados', async () => {
    const req = await timeBankService.createCompensationRequest(
      companyA.id,
      empColabA1.id,
      {
        type: 'FOLGA_INTEGRAL',
        date: '2026-12-18',
        durationMinutes: 30,
        justification: 'Teste de estados inválidos',
        idempotencyKey: 'scen-17-invalid-states',
      },
      userColabA1.id
    );

    // 1. Tentar REALIZAR direto do estado RESERVADA sem aprovação
    await expect(
      timeBankService.realizeCompensationRequest(companyA.id, req.id, userGestorA)
    ).rejects.toThrow('Transição de estado inválida: Não é possível realizar uma compensação que ainda não foi aprovada pelo gestor');

    // 2. Aprova a folga
    await timeBankService.decideCompensationRequest(companyA.id, req.id, { status: 'APROVADA' }, userGestorA);

    // 3. Tentar deliberar novamente sobre uma solicitação já APROVADA
    await expect(
      timeBankService.decideCompensationRequest(companyA.id, req.id, { status: 'APROVADA' }, userGestorA)
    ).rejects.toThrow('Esta solicitação já foi aprovada');

    // 4. Realiza a folga (REALIZADA)
    await timeBankService.realizeCompensationRequest(companyA.id, req.id, userGestorA);

    // 5. Tentar CANCELAR uma folga que já foi REALIZADA
    await expect(
      timeBankService.cancelCompensationRequest(companyA.id, req.id, userGestorA, 'Cancelando após realização')
    ).rejects.toThrow('Transição de estado inválida: Não é possível cancelar uma compensação que já foi efetivamente realizada');

    // 6. Tentar REALIZAR novamente
    await expect(
      timeBankService.realizeCompensationRequest(companyA.id, req.id, userGestorA)
    ).rejects.toThrow('Esta compensação já foi realizada anteriormente');
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 18: FALHA DURANTE UMA TRANSAÇÃO (ROLLBACK E INTEGRIDADE DOS DADOS)
  // --------------------------------------------------------------------------

  it('18. Falha durante uma transação: deve garantir rollback completo e integridade dos dados', async () => {
    const countBefore = await prisma.timeBankTransaction.count({ where: { companyId: companyA.id } });

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.timeBankTransaction.create({
          data: {
            companyId: companyA.id,
            employeeId: empColabA1.id,
            type: 'CREDITO',
            minutes: 999,
            competence: '2026-10',
            origin: 'APURACAO_PONTO',
            status: 'CONSOLIDADO',
          },
        });
        // Lança erro no meio da transação
        throw new Error('Falha transacional intencional para teste de rollback');
      })
    ).rejects.toThrow('Falha transacional intencional para teste de rollback');

    const countAfter = await prisma.timeBankTransaction.count({ where: { companyId: companyA.id } });
    expect(countAfter).toBe(countBefore); // Nenhum dado persistido indevidamente!
  });
});
