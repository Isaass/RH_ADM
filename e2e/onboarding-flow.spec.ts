import { test, expect } from '@playwright/test';

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

test.describe('Pontua RH — Fase 6.3: Onboarding e Configuração Inicial de Empresas (E2E)', () => {
  const unique = Date.now().toString().slice(-6);
  const companyName = `Nova Empresa Onb ${unique} Ltda`;
  const adminName = `Admin Onboarding ${unique}`;
  const adminEmail = `admin.onb${unique}@empresa.com.br`;
  const adminPass = 'Admin@123456';
  const superAdminEmail = 'superadmin@pontuarh.com.br';
  const superAdminPass = 'Super@123456';

  const validCnpj = generateValidCNPJ();
  const validCpf = generateValidCPF();

  test('Fluxo Completo de Onboarding: Criação pelo Super Admin, Ativação de Plano, Configuração em 5 Etapas e Isolamento', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('response', res => {
      if (res.status() >= 400) {
        console.log('HTTP ERROR:', res.status(), res.url());
      }
    });

    // ----------------------------------------------------
    // ETAPA A: SUPER ADMIN PROVISIONA A EMPRESA E O PLANO
    // ----------------------------------------------------
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('h2')).toContainText('Acesse sua conta');

    await page.fill('input[type="email"]', superAdminEmail);
    await page.fill('input[type="password"]', superAdminPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/super-admin', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('Painel Executivo Super Admin');

    // Navega para cadastro de nova empresa
    await page.click('a[href="/super-admin/companies/new"]');
    await page.waitForURL('**/super-admin/companies/new', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Cadastrar Nova Empresa');

    // Preenche dados da nova organização usando placeholders específicos
    await page.fill('input[placeholder*="Alfa Soluções"]', companyName);
    await page.fill('input[placeholder*="00.000.000"]', validCnpj);
    await page.fill('input[placeholder*="contato@empresa"]', `contato.onb${unique}@empresa.com.br`);

    // Administrador inicial
    await page.fill('input[placeholder*="Carlos Silva"]', adminName);
    await page.fill('input[placeholder*="admin@empresa"]', adminEmail);
    await page.fill('input[placeholder*="••••••••"]', adminPass);

    // Salvar e Provisionar Empresa
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/super-admin/companies/**', { timeout: 25000 });

    // Confirma que a empresa foi aberta em detalhes
    await expect(page.locator(`text=${companyName}`).first()).toBeVisible({ timeout: 15000 });

    // Vincula um plano comercial à nova empresa
    await page.click('button:has-text("Plano & Assinatura")');
    await page.waitForTimeout(1000);

    const assignPlanBtn = page.locator('button:has-text("Atribuir Plano"), button:has-text("Alterar Plano")').first();
    await expect(assignPlanBtn).toBeVisible({ timeout: 10000 });
    await assignPlanBtn.click();

    await expect(page.locator('text=Atribuir ou Alterar Plano SaaS')).toBeVisible({ timeout: 10000 });
    const planSelect = page.locator('select').first();
    await planSelect.waitFor({ state: 'visible' });
    const firstOptionVal = await planSelect.locator('option:not([disabled])').first().getAttribute('value');
    if (firstOptionVal) {
      await planSelect.selectOption(firstOptionVal);
    }
    await page.locator('button:has-text("Confirmar")').click();

    await expect(page.locator('text=Plano da empresa configurado com sucesso!').first()).toBeVisible({ timeout: 15000 });

    // Super Admin encerra sessão
    await page.locator('button[title*="Encerrar sessão"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // ----------------------------------------------------
    // ETAPA B: PRIMEIRO ACESSO DO ADMINISTRADOR DA EMPRESA
    // ----------------------------------------------------
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');

    // Como onboardingCompleted é false, o sistema direciona automaticamente para /admin/onboarding
    await page.waitForURL('**/admin/onboarding', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('Onboarding Pontua RH');

    // ----------------------------------------------------
    // ETAPA C: ONBOARDING — PASSO 1 (DADOS DA EMPRESA)
    // ----------------------------------------------------
    await expect(page.locator('text=Etapa 1: Dados Cadastrais e Operacionais')).toBeVisible();

    // Complementa endereço
    await page.locator('label:has-text("Logradouro")').locator('..').locator('input').fill('Avenida Paulista');
    await page.locator('label:has-text("Número")').locator('..').locator('input').fill('1500');
    await page.locator('label:has-text("Bairro")').locator('..').locator('input').fill('Bela Vista');
    await page.locator('label:has-text("Cidade")').locator('..').locator('input').fill('São Paulo');
    await page.locator('label:has-text("Estado (UF)")').locator('..').locator('input').fill('SP');

    await page.click('button:has-text("Salvar & Avançar")');

    // ----------------------------------------------------
    // ETAPA D: ONBOARDING — PASSO 2 (ESTRUTURA ORGANIZACIONAL)
    // ----------------------------------------------------
    await expect(page.locator('text=Etapa 2: Estrutura Organizacional')).toBeVisible({ timeout: 15000 });

    // Cadastra Departamento
    await page.fill('input[placeholder*="Novo departamento"]', 'Engenharia e Inovação');
    await page.locator('form:has(input[placeholder*="Novo departamento"]) button[type="submit"]').click();
    await expect(page.locator('text=Engenharia e Inovação').first()).toBeVisible({ timeout: 10000 });

    // Teste de bloqueio de duplicidade de departamento
    await page.fill('input[placeholder*="Novo departamento"]', 'Engenharia e Inovação');
    await page.locator('form:has(input[placeholder*="Novo departamento"]) button[type="submit"]').click();
    await expect(page.locator('text=Já existe um departamento cadastrado').first()).toBeVisible({ timeout: 10000 });

    // Cadastra Cargo
    await page.fill('input[placeholder*="Novo cargo"]', 'Engenheiro de Software');
    await page.locator('form:has(input[placeholder*="Novo cargo"]) button[type="submit"]').click();
    await expect(page.locator('text=Engenheiro de Software').first()).toBeVisible({ timeout: 10000 });

    // Teste de bloqueio de duplicidade de cargo
    await page.fill('input[placeholder*="Novo cargo"]', 'Engenheiro de Software');
    await page.locator('form:has(input[placeholder*="Novo cargo"]) button[type="submit"]').click();
    await expect(page.locator('text=Já existe um cargo cadastrado').first()).toBeVisible({ timeout: 10000 });

    // Avança para o Passo 3
    await page.click('button:has-text("Avançar para Jornadas")');

    // ----------------------------------------------------
    // ETAPA E: ONBOARDING — PASSO 3 (JORNADA DE TRABALHO)
    // ----------------------------------------------------
    await expect(page.locator('text=Etapa 3: Jornada & Horários de Trabalho')).toBeVisible({ timeout: 15000 });

    // Salva a jornada padrão preenchida
    await page.click('button:has-text("Salvar Jornada & Avançar")');

    // ----------------------------------------------------
    // ETAPA F: ONBOARDING — PASSO 4 (PRIMEIRO COLABORADOR)
    // ----------------------------------------------------
    await expect(page.locator('text=Etapa 4: Cadastro do Primeiro Colaborador')).toBeVisible({ timeout: 15000 });

    await page.locator('label:has-text("Nome Completo")').locator('..').locator('input').fill('Marina Duarte Alencar');
    await page.locator('label:has-text("CPF Oficial")').locator('..').locator('input').fill(validCpf);
    await page.locator('label:has-text("E-mail *")').locator('..').locator('input').fill(`marina.duarte${unique}@empresa.com.br`);

    // Seleciona departamento e cargo
    const deptSelect = page.locator('label:has-text("Departamento")').locator('..').locator('select');
    await deptSelect.selectOption({ label: 'Engenharia e Inovação' });

    const posSelect = page.locator('label:has-text("Cargo")').locator('..').locator('select');
    await posSelect.selectOption({ label: 'Engenheiro de Software' });

    await page.click('button:has-text("Cadastrar & Avançar")');

    // ----------------------------------------------------
    // ETAPA G: ONBOARDING — PASSO 5 (RESUMO & CONCLUSÃO)
    // ----------------------------------------------------
    await expect(page.locator('text=Etapa 5: Resumo e Ativação Operacional')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=Estrutura Organizacional').first()).toBeVisible();
    await expect(page.locator('text=Marina Duarte Alencar').first()).toBeVisible();
    await expect(page.locator('text=Checklist de Prontidão Operacional')).toBeVisible();

    // Conclui o Onboarding
    await page.click('button:has-text("Concluir Onboarding & Ir para o Painel")');

    // Redireciona para o Dashboard Administrativo da empresa
    await page.waitForURL('**/admin/dashboard**', { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('Olá');

    // ----------------------------------------------------
    // ETAPA H: VALIDAÇÕES DE VÍNCULO, ISOLAMENTO E PERSISTÊNCIA
    // ----------------------------------------------------
    // 1. Confirma que o colaborador aparece na listagem da empresa
    await page.click('a[href="/admin/employees"]');
    await page.waitForURL('**/admin/employees', { timeout: 15000 });
    await expect(page.locator('text=Marina Duarte Alencar').first()).toBeVisible({ timeout: 10000 });

    // 2. Logout do novo tenant
    await page.locator('button[title*="Sair do sistema"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 3. Login como TecnoRH (outro tenant) para testar isolamento estrito
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'admin@pontuarh.com.br');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 20000 });
    await page.click('a[href="/admin/employees"]');
    await page.waitForURL('**/admin/employees', { timeout: 15000 });

    // Marina Duarte NÃO pode existir na empresa TecnoRH
    await expect(page.locator('text=Marina Duarte Alencar')).not.toBeVisible();

    // 4. Logout TecnoRH e Login novamente com a empresa recém-configurada
    await page.locator('button[title*="Sair do sistema"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');

    // Agora que o onboarding está concluído, deve abrir DIRETO no dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 20000 });
    await expect(page.locator('h1')).toContainText('Olá');

    // Confirma que o banner de pendência de onboarding NÃO está mais visível
    await expect(page.locator('text=Configuração Inicial da Empresa em Andamento')).not.toBeVisible();
  });
});
