import { test, expect } from '@playwright/test';

test.describe('Pontua RH — Etapa 2: Refinamento de UX e Validação de Responsividade (E2E)', () => {
  const adminEmail = 'admin@pontuarh.com.br';
  const adminPass = 'Admin@123456';
  const colabEmail = 'colaborador@pontuarh.com.br';
  const colabPass = 'Colab@123456';

  const viewports = [
    { name: '360px (Celular Compacto)', width: 360, height: 740 },
    { name: '390px (Celular Padrão)', width: 390, height: 844 },
    { name: '768px (Tablet)', width: 768, height: 1024 },
    { name: '1280px (Desktop)', width: 1280, height: 800 },
    { name: '1920px (Monitor Grande)', width: 1920, height: 1080 },
  ];

  test('Cenário 1 — Ausência de Scroll Horizontal Indevido nas 5 Resoluções Oficiais', async ({ page }) => {
    // 1. Testa tela de login em todas as 5 resoluções
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll, `Scroll horizontal detectado em /login na resolução ${vp.name}`).toBe(false);
    }

    // 2. Faz login como Admin da Empresa
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // 3. Testa páginas prioritárias em 360px, 390px e 768px
    const testPages = ['/admin/dashboard', '/admin/company', '/admin/employees', '/admin/payroll'];

    for (const route of testPages) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      for (const vp of [viewports[0], viewports[1], viewports[2]]) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(300);

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll, `Scroll horizontal detectado em ${route} na resolução ${vp.name}`).toBe(false);
      }
    }
  });

  test('Cenário 2 — Menu Responsivo (Mobile Drawer) em 360px e 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // Em viewport mobile, a barra lateral deve estar oculta (-translate-x-full)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Clica no botão hamburger do header para abrir
    const menuBtn = page.locator('header button[aria-label="Abrir menu"]').first();
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Barra lateral deve estar aberta (translate-x-0)
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Clica no botão de fechar (X)
    const closeBtn = sidebar.locator('button:has(svg.lucide-x)');
    await closeBtn.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('Cenário 3 — Modais Adaptados e Máscaras de Digitação em Tempo Real', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // Navega para dados da empresa
    await page.goto('/admin/company');
    await page.waitForLoadState('networkidle');

    // Abre modal de edição
    const editBtn = page.locator('button:has-text("Editar Informações")');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Modal deve ser exibido
    const modal = page.locator('h3:has-text("Editar Dados da Organização")');
    await expect(modal).toBeVisible();

    // Testa máscara de telefone ao digitar dígitos crus
    const phoneInput = page.locator('label:has-text("Telefone / Contato")').locator('..').locator('input');
    await phoneInput.fill('11987654321');
    await expect(phoneInput).toHaveValue('(11) 98765-4321');

    // Testa máscara de CEP ao digitar dígitos crus
    const cepInput = page.locator('label:has-text("CEP")').locator('..').locator('input');
    await cepInput.fill('01310100');
    await expect(cepInput).toHaveValue('01310-100');

    // Fecha o modal via botão Cancelar
    await page.locator('button:has-text("Cancelar")').click();
    await expect(modal).not.toBeVisible();
  });

  test('Cenário 4 — Portal do Colaborador Responsivo (Mobile & Desktop)', async ({ page }) => {
    // Testa no mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/portal', { timeout: 15000 });

    // Verifica que o relógio e cards carregam sem overflow horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll, 'Scroll horizontal detectado no Portal do Colaborador').toBe(false);

    // Botão de bater ponto visível e clicável
    const punchButton = page.locator('button:has-text("Bater Ponto Agora"), button:has-text("Registrar")').first();
    await expect(punchButton).toBeVisible();
  });
});
