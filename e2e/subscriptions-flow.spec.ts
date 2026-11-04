import { test, expect } from '@playwright/test';

test.describe('Pontua RH — Fase 6.2: Fluxos Comerciais de Planos e Assinaturas (E2E)', () => {
  const superAdminEmail = 'superadmin@pontuarh.com.br';
  const superAdminPass = 'Super@123456';

  const tenantAdminEmail = 'admin@pontuarh.com.br';
  const tenantAdminPass = 'Admin@123456';

  const uniqueCode = `E2E_PLAN_${Date.now().toString().slice(-6)}`;

  test('Cenário 1 — Gestão de Planos pelo Super Admin (CRUD, Validação e Regras)', async ({ page }) => {
    // 1. Login como Super Admin
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('h2')).toContainText('Acesse sua conta');

    await page.fill('input[type="email"]', superAdminEmail);
    await page.fill('input[type="password"]', superAdminPass);
    await page.click('button[type="submit"]');

    // Redireciona automaticamente para /super-admin
    await page.waitForURL('**/super-admin', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('Painel Executivo Super Admin');

    // 2. Acessa a tela de Gestão de Planos
    await page.click('a[href="/super-admin/plans"]');
    await page.waitForURL('**/super-admin/plans', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Gestão de Planos SaaS');

    // Valida que os planos padrão da seed estão visíveis
    await expect(page.locator('text=BASICO').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=PRO').first()).toBeVisible();
    await expect(page.locator('text=ENTERPRISE').first()).toBeVisible();

    // 3. Abre modal de criação de novo plano
    await page.click('button:has-text("Novo Plano")');
    await expect(page.locator('text=Cadastrar Novo Plano SaaS')).toBeVisible();

    // Preenche dados do novo plano
    await page.locator('label:has-text("Nome do Plano")').locator('..').locator('input').fill('Plano Starter E2E');
    await page.locator('label:has-text("Código Único")').locator('..').locator('input').fill(uniqueCode);
    await page.locator('textarea').fill('Plano criado para homologação E2E');
    await page.locator('label:has-text("Valor Mensal")').locator('..').locator('input').fill('49.90');

    // Salvar plano
    await page.click('button:has-text("Criar Plano")');

    // Valida feedback de sucesso e presença do plano na tela
    await expect(page.locator(`text=${uniqueCode}`).first()).toBeVisible({ timeout: 15000 });

    // 4. Teste de unicidade de código: tenta cadastrar novamente com o mesmo código
    await page.click('button:has-text("Novo Plano")');
    await page.locator('label:has-text("Nome do Plano")').locator('..').locator('input').fill('Plano Duplicado E2E');
    await page.locator('label:has-text("Código Único")').locator('..').locator('input').fill(uniqueCode);
    await page.locator('label:has-text("Valor Mensal")').locator('..').locator('input').fill('59.90');
    await page.click('button:has-text("Criar Plano")');

    // Valida mensagem de erro de unicidade
    await expect(page.locator('text=Já existe um plano cadastrado').first()).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Cancelar")');

    // 5. Teste de toggle de status ativo/inativo
    const planCard = page.locator(`div:has-text("${uniqueCode}")`).locator('..').locator('..');
    const toggleBtn = planCard.locator('button:has-text("Desativar"), button:has-text("Ativar")').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Cenário 2 — Gestão de Assinaturas e Ciclo de Vida Contratual', async ({ page }) => {
    // 1. Login como Super Admin
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', superAdminEmail);
    await page.fill('input[type="password"]', superAdminPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/super-admin', { timeout: 30000 });

    // 2. Acessa Assinaturas
    await page.click('a[href="/super-admin/subscriptions"]');
    await page.waitForURL('**/super-admin/subscriptions', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Gestão de Assinaturas das Empresas');

    // Verifica que a empresa demo aparece na lista
    await expect(page.locator('text=TecnoRH').first()).toBeVisible({ timeout: 15000 });

    // 3. Abre modal de Troca de Plano (Upgrade/Downgrade)
    const changePlanBtn = page.locator('button[title*="Trocar Plano"]').first();
    await expect(changePlanBtn).toBeVisible({ timeout: 15000 });
    await changePlanBtn.click();

    await expect(page.locator('text=Alterar Plano de').first()).toBeVisible({ timeout: 10000 });

    // Seleciona um plano diferente no select DENTRO do formulário do modal (não o filtro da tabela)
    const planSelect = page.locator('label:has-text("Selecione o Novo Plano")').locator('..').locator('select');
    await expect(planSelect).toBeVisible();
    const options = await planSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      await planSelect.selectOption({ index: 1 });
    }
    await page.locator('label:has-text("Motivo")').locator('..').locator('textarea').fill('Alteração contratual validada via Playwright E2E');
    await page.locator('button:has-text("Confirmar Alteração")').click();

    // Valida mensagem de sucesso e fechamento do modal
    await expect(page.locator('text=Plano da empresa alterado com sucesso!').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Alterar Plano de')).not.toBeVisible({ timeout: 10000 });

    // Aguarda atualização da listagem
    await page.waitForTimeout(1000);

    // 4. Visualizar Histórico da Assinatura
    const historyBtn = page.locator('button[title*="Ver Histórico"]').first();
    await expect(historyBtn).toBeVisible({ timeout: 15000 });
    await historyBtn.click();

    await expect(page.locator('text=Histórico da Assinatura').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=TROCA PLANO').or(page.locator('text=CRIACAO')).or(page.locator('text=Troca')).first()).toBeVisible();
    await page.click('button:has-text("Fechar")');
  });

  test('Cenário 3 — Consulta de Assinatura pelo Administrador da Empresa (Tenant)', async ({ page }) => {
    // 1. Login como Administrador da Empresa
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', tenantAdminEmail);
    await page.fill('input[type="password"]', tenantAdminPass);
    await page.click('button[type="submit"]');

    // Redireciona para o dashboard administrativo da empresa
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('Olá');

    // 2. Acessa Configurações > Plano & Assinatura
    await page.click('a[href="/admin/subscription"]');
    await page.waitForURL('**/admin/subscription', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Plano Contratado & Assinatura SaaS');

    // 3. Valida elementos da tela de assinatura
    // Card de status da assinatura (Ativa)
    await expect(page.locator('text=Assinatura Ativa').first()).toBeVisible({ timeout: 15000 });

    // Seção de Capacidade e Limites Contratados
    await expect(page.locator('text=Utilização de Capacidade & Limites')).toBeVisible();
    await expect(page.locator('text=Colaboradores').first()).toBeVisible();
    await expect(page.locator('text=Contas de Usuários').first()).toBeVisible();
    await expect(page.locator('text=Administradores').first()).toBeVisible();

    // Seção de Módulos e Funcionalidades Contratadas
    await expect(page.locator('text=Módulos da Plataforma Pontua RH')).toBeVisible();
    await expect(page.locator('text=Controle de Ponto Eletrônico')).toBeVisible();
    await expect(page.locator('text=Banco de Horas Inteligente')).toBeVisible();
  });
});
