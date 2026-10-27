import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ ERRO CRÍTICO: Execução de seed com contas demonstrativas é proibida em ambiente de produção!');
    process.exit(1);
  }

  console.log('🌱 Iniciando seed do banco de dados Pontua RH...');

  // 1. Limpeza em cascata para re-seed seguro
  await prisma.auditLog.deleteMany({});
  await prisma.timeBankCompensationRequest.deleteMany({});
  await prisma.timeBankTransaction.deleteMany({});
  await prisma.timeAdjustmentRequest.deleteMany({});
  await prisma.timeEntry.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.timeBankPolicy.deleteMany({});
  await prisma.workSchedule.deleteMany({});
  await prisma.position.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // 2. Criação da Empresa Demo
  const company = await prisma.company.create({
    data: {
      name: 'TecnoRH Soluções Corporativas Ltda',
      tradeName: 'Pontua RH Brasil',
      cnpj: '12.345.678/0001-90',
      email: 'contato@pontuarh.com.br',
      phone: '(11) 3456-7890',
      active: true,
    },
  });
  console.log(`✅ Empresa criada: ${company.name} (${company.id})`);

  // 3. Departamentos
  const depRH = await prisma.department.create({
    data: { companyId: company.id, name: 'Recursos Humanos', code: 'RH-01' },
  });
  const depTI = await prisma.department.create({
    data: { companyId: company.id, name: 'Engenharia de Software', code: 'ENG-02' },
  });
  const depComercial = await prisma.department.create({
    data: { companyId: company.id, name: 'Comercial & Expansão', code: 'COM-03' },
  });

  // 4. Cargos
  const posGerenteTI = await prisma.position.create({
    data: { companyId: company.id, title: 'Gerente de Engenharia', cboCode: '1425-05', description: 'Gestão técnica e liderança da equipe de desenvolvimento.' },
  });
  const posDevSenior = await prisma.position.create({
    data: { companyId: company.id, title: 'Desenvolvedor Full Stack Sênior', cboCode: '2124-05', description: 'Desenvolvimento e manutenção da plataforma SaaS.' },
  });
  const posAnalistaRH = await prisma.position.create({
    data: { companyId: company.id, title: 'Analista de Recursos Humanos Pleno', cboCode: '2524-05', description: 'Gestão de benefícios, folha, ponto e admissões.' },
  });
  const posAssistente = await prisma.position.create({
    data: { companyId: company.id, title: 'Assistente Administrativo', cboCode: '4110-10', description: 'Suporte a processos internos e rotinas de escritório.' },
  });

  // 5. Jornada de Trabalho Contratual
  const schedulePadrao = await prisma.workSchedule.create({
    data: {
      companyId: company.id,
      name: 'Padrão Comercial 44h (Seg-Sex)',
      dailyHours: 8.8,
      weeklyHours: 44.0,
      expectedEntry: '08:00',
      expectedBreak: '01:00',
      expectedExit: '17:48',
      daysOfWeek: 'MON,TUE,WED,THU,FRI',
      active: true,
    },
  });

  // 5.1 Política Padrão de Banco de Horas (CLT Art. 59 § 5º - Acordo Individual 6 Meses)
  const policyPadrao = await prisma.timeBankPolicy.create({
    data: {
      companyId: company.id,
      name: 'Acordo Individual Padrão (Semestral - 6 Meses)',
      compensationType: 'BANCO_HORAS_PADRAO',
      periodMonths: 6,
      validFrom: new Date('2026-01-01'),
      maxDailyCreditMinutes: 120, // Máx 2h/dia
      maxNegativeBalanceMinutes: 2400, // Máx 40h de débito
      allowNegativeBalance: true,
      creditRate: 1.0,
      requireManagerApproval: true,
      expiryAction: 'PAGAR_FOLHA',
      active: true,
      isDefault: true,
    },
  });

  // 6. Hashes de senhas padronizadas
  const salt = await bcrypt.genSalt(10);
  const hashAdmin = await bcrypt.hash('Admin@123456', salt);
  const hashRh = await bcrypt.hash('Rh@123456', salt);
  const hashGestor = await bcrypt.hash('Gestor@123456', salt);
  const hashColab = await bcrypt.hash('Colab@123456', salt);
  const hashContador = await bcrypt.hash('Contador@123456', salt);

  // 7. Usuários do Sistema
  const userAdmin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Diretoria Administrativa',
      email: 'admin@pontuarh.com.br',
      passwordHash: hashAdmin,
      role: 'ADMIN_EMPRESA',
      active: true,
    },
  });

  const userRH = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Mariana Santos',
      email: 'rh@pontuarh.com.br',
      passwordHash: hashRh,
      role: 'RH',
      active: true,
    },
  });

  const userGestor = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Carlos Alberto Silva',
      email: 'gestor@pontuarh.com.br',
      passwordHash: hashGestor,
      role: 'GESTOR',
      active: true,
    },
  });

  const userColab = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Lucas Ferreira Lima',
      email: 'colaborador@pontuarh.com.br',
      passwordHash: hashColab,
      role: 'COLABORADOR',
      active: true,
    },
  });

  const userContador = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Roberto Contabilidade',
      email: 'contador@pontuarh.com.br',
      passwordHash: hashContador,
      role: 'CONTADOR',
      active: true,
    },
  });

  // 8. Colaboradores vinculados
  // Gestor (Carlos Silva)
  const empGestor = await prisma.employee.create({
    data: {
      companyId: company.id,
      userId: userGestor.id,
      fullName: 'Carlos Alberto Silva',
      cpf: '24376891001',
      email: 'gestor@pontuarh.com.br',
      phone: '(11) 98765-4321',
      birthDate: new Date('1985-04-12'),
      registrationNumber: 'MAT-0010',
      departmentId: depTI.id,
      positionId: posGerenteTI.id,
      admissionDate: new Date('2021-02-01'),
      contractType: 'CLT',
      status: 'ATIVO',
      baseSalary: 14500.0,
      workScheduleId: schedulePadrao.id,
    },
  });

  // Analista de RH (Mariana Santos)
  const empRH = await prisma.employee.create({
    data: {
      companyId: company.id,
      userId: userRH.id,
      fullName: 'Mariana Santos',
      cpf: '38194720055',
      email: 'rh@pontuarh.com.br',
      phone: '(11) 97123-4567',
      birthDate: new Date('1990-08-25'),
      registrationNumber: 'MAT-0015',
      departmentId: depRH.id,
      positionId: posAnalistaRH.id,
      admissionDate: new Date('2022-05-15'),
      contractType: 'CLT',
      status: 'ATIVO',
      baseSalary: 6200.0,
      workScheduleId: schedulePadrao.id,
    },
  });

  // Colaborador Desenvolvedor (Lucas Ferreira Lima) sob gestão do Carlos Silva
  const empColab = await prisma.employee.create({
    data: {
      companyId: company.id,
      userId: userColab.id,
      fullName: 'Lucas Ferreira Lima',
      cpf: '45981230044',
      email: 'colaborador@pontuarh.com.br',
      phone: '(11) 99887-6655',
      birthDate: new Date('1996-11-30'),
      registrationNumber: 'MAT-0042',
      departmentId: depTI.id,
      positionId: posDevSenior.id,
      managerId: empGestor.id,
      admissionDate: new Date('2023-01-10'),
      contractType: 'CLT',
      status: 'ATIVO',
      baseSalary: 9800.0,
      workScheduleId: schedulePadrao.id,
      timeBankPolicyId: policyPadrao.id,
    },
  });

  // Colaborador Assistente (Beatriz Lima)
  const empBeatriz = await prisma.employee.create({
    data: {
      companyId: company.id,
      fullName: 'Beatriz Vasconcelos Lima',
      cpf: '15893240078',
      email: 'beatriz.lima@pontuarh.com.br',
      phone: '(11) 96543-2109',
      birthDate: new Date('1999-03-14'),
      registrationNumber: 'MAT-0056',
      departmentId: depRH.id,
      positionId: posAssistente.id,
      managerId: empRH.id,
      admissionDate: new Date('2023-06-01'),
      contractType: 'CLT',
      status: 'ATIVO',
      baseSalary: 3200.0,
      workScheduleId: schedulePadrao.id,
      timeBankPolicyId: policyPadrao.id,
    },
  });

  // 8.1 Movimentações Iniciais de Banco de Horas
  await prisma.timeBankTransaction.create({
    data: {
      companyId: company.id,
      employeeId: empColab.id,
      policyId: policyPadrao.id,
      type: 'CREDITO',
      minutes: 240, // +4h de crédito inicial
      balanceAfter: 240,
      competence: '2026-10',
      origin: 'APURACAO_PONTO',
      referenceId: '2026-10-15',
      createdById: userAdmin.id,
      description: 'Crédito apurado de horas excedentes (Acordo Individual)',
      status: 'CONSOLIDADO',
      idempotencyKey: 'seed-tx-colab-1',
    },
  });

  // 9. Trilha de Auditoria Inicial
  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userAdmin.id,
      action: 'SYSTEM_SEED',
      entity: 'Company',
      entityId: company.id,
      details: 'Inicialização automatizada do banco de dados Pontua RH (Fase 1).',
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('👥 Usuários de demonstração prontos:');
  console.log('   - Admin:       admin@pontuarh.com.br       / Admin@123456');
  console.log('   - RH:          rh@pontuarh.com.br          / Rh@123456');
  console.log('   - Gestor:      gestor@pontuarh.com.br      / Gestor@123456');
  console.log('   - Colaborador: colaborador@pontuarh.com.br / Colab@123456');
  console.log('   - Contador:    contador@pontuarh.com.br    / Contador@123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
