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

test.describe('Pontua RH — Finalização Funcional: Integração e Estabilização (E2E)', () => {
  const adminEmail = 'admin@pontuarh.com.br';
  const adminPass = 'Admin@123456';
  const rhEmail = 'rh@pontuarh.com.br';
  const rhPass = 'Rh@123456';
  const gestorEmail = 'gestor@pontuarh.com.br';
  const gestorPass = 'Gestor@123456';
  const colabEmail = 'colaborador@pontuarh.com.br';
  const colabPass = 'Colab@123456';
  const contadorEmail = 'contador@pontuarh.com.br';
  const contadorPass = 'Contador@123456';
  const superAdminEmail = 'superadmin@pontuarh.com.br';
  const superAdminPass = 'Super@123456';

  // =========================================================================
  // CENÁRIO 1: FLUXO COMPLETO DE GESTÃO DE COLABORADORES
  // =========================================================================
  test('Cenário 1 — Gestão Completa de Colaboradores (Cadastro, Consulta, Edição, Inativação e Vínculos)', async ({ page }) => {
    const unique = Date.now().toString().slice(-5);
    const colabName = `Colaborador Teste ${unique}`;
    const colabCpf = generateValidCPF();

    // 1. Login do Administrador
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 25000 });
    await expect(page.locator('h1')).toContainText('Olá');

    // 2. Navegação para Colaboradores
    await page.click('a[href="/admin/employees"]');
    await page.waitForURL('**/admin/employees', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Gestão de Colaboradores');

    // 3. Cadastrar Novo Colaborador
    await page.click('a[href="/admin/employees/new"]');
    await page.waitForURL('**/admin/employees/new', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Novo Colaborador');

    // Preenche formulário usando labels
    await page.locator('label:has-text("Nome Completo")').locator('..').locator('input').fill(colabName);
    await page.locator('label:has-text("CPF")').locator('..').locator('input').fill(colabCpf);
    await page.locator('label:has-text("E-mail Corporativo")').locator('..').locator('input').fill(`colab${unique}@pontuarh.com.br`);
    await page.locator('label:has-text("Telefone")').locator('..').locator('input').fill('(11) 98765-4321');
    await page.locator('label:has-text("Matrícula")').locator('..').locator('input').fill(`MAT-${unique}`);
    await page.locator('label:has-text("Salário")').locator('..').locator('input').fill('4500.00');

    // Seleciona departamento
    const deptSelect = page.locator('select').first();
    const deptOptions = await deptSelect.locator('option').all();
    if (deptOptions.length > 1) {
      await deptSelect.selectOption({ index: 1 });
    }

    // Submete formulário
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/admin/employees', { timeout: 20000 });

    // 4. Consulta e Pesquisa
    await page.fill('input[placeholder*="Pesquisar por nome"]', colabName);
    await page.press('input[placeholder*="Pesquisar por nome"]', 'Enter');
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${colabName}`).first()).toBeVisible({ timeout: 10000 });

    // 5. Edição cadastral
    await page.click(`tr:has-text("${colabName}") a[href*="/admin/employees/"]`);
    await page.waitForURL('**/admin/employees/**', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(colabName);

    // Atualiza telefone
    const phoneInput = page.locator('label:has-text("Telefone")').locator('..').locator('input');
    await phoneInput.fill('(11) 91111-2222');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('text=Dados cadastrais atualizados com sucesso!').first()).toBeVisible({ timeout: 10000 });

    // 6. Inativação / Reativação
    await page.click('a:has-text("Voltar para lista")');
    await page.waitForURL('**/admin/employees', { timeout: 15000 });

    // Clica no botão de alternar status
    const row = page.locator(`tr:has-text("${colabName}")`);
    const toggleBtn = row.locator('button[title*="Desativar"], button[title*="Reativar"]').first();
    await toggleBtn.click();
    const confirmBtn = page.locator('button:has-text("Confirmar")');
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(1000);

    // Logout
    await page.locator('button[title*="Sair do sistema"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });
  });

  // =========================================================================
  // CENÁRIO 2: FLUXO COMPLETO DE FOLHA DE PAGAMENTO
  // =========================================================================
  test('Cenário 2 — Gestão Financeira e Prévia de Folha (Cálculo, Lançamentos Manuais e Exportação CSV)', async ({ page }) => {
    // 1. Login do Administrador
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 25000 });

    // 2. Acesso à Prévia de Folha
    await page.click('a[href="/admin/payroll"]');
    await page.waitForURL('**/admin/payroll', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Gestão Financeira & Folha de Pagamento');

    // 3. Gerar / Recalcular Prévia
    const calcBtn = page.locator('button:has-text("Gerar Prévia"), button:has-text("Recalcular")').first();
    await expect(calcBtn).toBeVisible({ timeout: 10000 });
    await calcBtn.click();
    await page.waitForTimeout(1500);

    // 4. Validação dos StatCards Consolidados
    await expect(page.locator('text=Total Bruto (Proventos)').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Total de Descontos').first()).toBeVisible();
    await expect(page.locator('text=Líquido Estimado').first()).toBeVisible();

    // 5. Demonstrativo Individual e Lançamento Manual
    const viewDetailBtn = page.locator('button:has-text("Demonstrativo")').first();
    await expect(viewDetailBtn).toBeVisible({ timeout: 10000 });
    await viewDetailBtn.click();

    // Valida abertura do modal de demonstrativo
    await expect(page.locator('text=Demonstrativo —').first()).toBeVisible({ timeout: 10000 });

    // Clica para adicionar rubrica manual se a competência estiver aberta
    const addRubricaBtn = page.locator('button:has-text("Novo Lançamento Manual")').first();
    if (await addRubricaBtn.isVisible()) {
      await addRubricaBtn.click();
      await page.locator('label:has-text("Descrição da Rubrica")').locator('..').locator('input').fill('Bônus de Desempenho E2E');
      await page.locator('label:has-text("Valor")').locator('..').locator('input').fill('350,00');
      await page.locator('button:has-text("Confirmar Lançamento")').click();
      await expect(page.locator('text=Lançamento manual adicionado com sucesso!').first()).toBeVisible({ timeout: 10000 });
    }

    // Fecha modal de detalhes
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 6. Teste do Botão de Exportação CSV
    const exportBtn = page.locator('button:has-text("Exportar CSV")').first();
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click();
    await expect(page.locator('text=Arquivo CSV da folha gerado e baixado com sucesso!').first()).toBeVisible({ timeout: 15000 });

    // Logout
    await page.locator('button[title*="Sair do sistema"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });
  });

  // =========================================================================
  // CENÁRIO 3: MATRIZ DE PERFIS E RBAC
  // =========================================================================
  test('Cenário 3 — Matriz de Perfis e Permissões (SUPER_ADMIN, RH, CONTADOR, GESTOR e COLABORADOR)', async ({ page }) => {
    // 3.1 GESTOR: tem acesso ao dashboard operacional, mas É BLOQUEADO na folha de pagamento
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', gestorEmail);
    await page.fill('input[type="password"]', gestorPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 25000 });
    await expect(page.locator('h1')).toContainText('Olá');

    // Sidebar do Gestor NÃO deve exibir link de Folha de Pagamento
    await expect(page.locator('a[href="/admin/payroll"]')).not.toBeVisible();

    // Se o Gestor tentar navegar diretamente via URL para /admin/payroll
    await page.goto('/admin/payroll');
    await expect(page.locator('text=Acesso Restrito ao Módulo Financeiro')).toBeVisible({ timeout: 10000 });

    // Logout Gestor
    await page.locator('button[title*="Sair do sistema"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 3.2 CONTADOR: tem acesso à folha de pagamento e dashboard
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', contadorEmail);
    await page.fill('input[type="password"]', contadorPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 25000 });
    // Sidebar do Contador DEVE exibir link para folha
    await expect(page.locator('a[href="/admin/payroll"]')).toBeVisible({ timeout: 10000 });
    await page.click('a[href="/admin/payroll"]');
    await page.waitForURL('**/admin/payroll', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Gestão Financeira & Folha de Pagamento');

    // Logout Contador
    await page.locator('button[title*="Sair do sistema"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 3.3 COLABORADOR: redireciona para /portal e é BLOQUEADO na área administrativa
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/portal', { timeout: 25000 });
    await expect(page.locator('text=Portal do Colaborador').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Bater Ponto Agora")').first()).toBeVisible({ timeout: 15000 });

    // Tentativa de invasão da área administrativa
    await page.goto('/admin/dashboard');
    // Deve ser rechaçado de volta para o /portal pelo layout guard
    await page.waitForURL('**/portal', { timeout: 15000 });

    // Logout Colaborador
    await page.locator('button[title*="Sair"], button[aria-label*="Sair"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 3.4 SUPER ADMIN: acessa a área da plataforma /super-admin
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', superAdminEmail);
    await page.fill('input[type="password"]', superAdminPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/super-admin', { timeout: 25000 });
    await expect(page.locator('h1')).toContainText('Painel Executivo Super Admin');

    // Logout Super Admin
    await page.locator('button[title*="Encerrar sessão"]').click();
    await page.waitForURL('**/login', { timeout: 15000 });
  });
});
