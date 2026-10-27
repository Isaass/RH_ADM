import { test, expect } from '@playwright/test';

test.describe('Pontua RH — Ciclo Operacional Completo E2E (Playwright)', () => {
  const adminEmail = 'admin@pontuarh.com.br';
  const adminPass = 'Admin@123456';

  const gestorEmail = 'gestor@pontuarh.com.br';
  const gestorPass = 'Gestor@123456';

  const colabEmail = 'colaborador@pontuarh.com.br';
  const colabPass = 'Colab@123456';

  test('Fluxo completo obrigatório de 10 passos: Administrador -> Jornada -> Vínculo -> Colaborador -> Ponto -> Histórico -> Ajuste -> Gestor -> Aprovação -> Espelho', async ({ page, context }) => {
    // -------------------------------------------------------------
    // PASSO 1: Administrador realiza login
    // -------------------------------------------------------------
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Acesse sua conta');

    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Painel de Controle')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // PASSO 2: Cadastra uma nova jornada de trabalho
    // -------------------------------------------------------------
    await page.goto('/admin/schedules');
    await expect(page.locator('h1')).toContainText('Gestão de Jornadas de Trabalho');

    // Clicar em "Criar Nova Jornada"
    const newScheduleBtn = page.locator('button:has-text("Criar Nova Jornada")');
    await newScheduleBtn.click();

    // Preencher formulário de criação de jornada
    const scheduleName = 'Jornada E2E Playwright ' + Date.now();
    await page.fill('input[placeholder*="Comercial"]', scheduleName);
    await page.click('button:has-text("Salvar Jornada")');

    // Validar que o card da jornada foi renderizado na lista
    await expect(page.locator(`text=${scheduleName}`)).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // PASSO 3: Associa um colaborador à jornada criada
    // -------------------------------------------------------------
    // Localizar o card da jornada recém-criada e clicar no botão "Vincular"
    const scheduleCard = page.locator(`div:has-text("${scheduleName}")`).locator('..').locator('..');
    const vincularBtn = scheduleCard.locator('button:has-text("Vincular")').first();
    await vincularBtn.click();

    // No modal de vinculação, marcar o primeiro colaborador da lista
    await expect(page.locator('h3:has-text("Vincular Colaboradores à Jornada")')).toBeVisible({ timeout: 5000 });
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (!(await firstCheckbox.isChecked())) {
      await firstCheckbox.check();
    }
    await page.click('button:has-text("Salvar (")');

    // Aguardar fechamento do modal
    await expect(page.locator('h3:has-text("Vincular Colaboradores à Jornada")')).not.toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------
    // PASSO 4: Colaborador realiza login
    // -------------------------------------------------------------
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');

    // Deve redirecionar para o Portal do Colaborador
    await page.waitForURL('**/portal', { timeout: 15000 });
    await expect(page.locator('text=Controle Eletrônico de Ponto (REP-P)')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // PASSO 5: Colaborador registra ponto eletrônico
    // -------------------------------------------------------------
    const punchButton = page.locator('button:has-text("Bater Ponto Agora")');
    await expect(punchButton).toBeVisible();
    await punchButton.click();

    // Modal de comprovante REP-P deve abrir
    await expect(page.locator('text=Ponto Registrado com Sucesso!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Portaria MTP nº 671/2021').first()).toBeVisible();

    // Fechar modal de comprovante
    await page.click('button:has-text("Fechar")');

    // -------------------------------------------------------------
    // PASSO 6: Consulta seu histórico de marcações
    // -------------------------------------------------------------
    // Na tela inicial do portal, a seção de marcações de hoje deve estar visível
    await expect(page.locator('text=Minhas Marcações de Hoje')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // PASSO 7: Colaborador solicita correção de ponto
    // -------------------------------------------------------------
    await page.goto('/portal/adjustments');
    await expect(page.locator('h1')).toContainText('Minhas Solicitações de Ajuste');

    // Clicar em "Nova Solicitação"
    await page.click('button:has-text("Nova Solicitação")');

    // Preencher formulário de ajuste
    const todayStr = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', todayStr);
    await page.fill('textarea[placeholder*="motivo da solicitação"]', 'Ajuste de teste E2E: Esquecimento de registro na entrada');
    await page.click('button:has-text("Enviar Solicitação")');

    // Verificar mensagem de sucesso
    await expect(page.locator('text=Solicitação enviada com sucesso ao seu gestor!')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // PASSO 8: Gestor realiza login
    // -------------------------------------------------------------
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.fill('input[type="email"]', gestorEmail);
    await page.fill('input[type="password"]', gestorPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // -------------------------------------------------------------
    // PASSO 9: Gestor aprova a solicitação do colaborador
    // -------------------------------------------------------------
    await page.goto('/admin/adjustments');
    await expect(page.locator('h1')).toContainText('Central de Solicitações e Ajustes');

    // Localizar a solicitação pendente e clicar em Analisar
    const analisarBtn = page.locator('button:has-text("Analisar")').first();
    await expect(analisarBtn).toBeVisible({ timeout: 10000 });
    await analisarBtn.click();

    // No modal de análise, inserir parecer e aprovar
    await page.fill('textarea[placeholder*="observações"]', 'Aprovado via Teste Automatizado E2E');
    await page.click('button:has-text("Aprovar Ajuste")');

    // Aguardar fechamento do modal
    await expect(page.locator('h3:has-text("Análise de Solicitação de Ajuste de Ponto")')).not.toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------
    // PASSO 10: Colaborador consulta o espelho de ponto atualizado
    // -------------------------------------------------------------
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/portal', { timeout: 15000 });

    // Navegar para o espelho de ponto
    await page.goto('/portal/timesheet');
    await expect(page.locator('h1')).toContainText('Meu Espelho de Ponto');

    // Validar que os cards de resumo e a tabela de apuração foram carregados com sucesso
    await expect(page.locator('text=Trabalhadas')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Saldo Líquido')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
