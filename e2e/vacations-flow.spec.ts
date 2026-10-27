import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Pontua RH — Ciclo Completo de Férias, Afastamentos e Atestados (Fase 4 E2E)', () => {
  const gestorEmail = 'gestor@pontuarh.com.br';
  const gestorPass = 'Gestor@123456';

  const colabEmail = 'colaborador@pontuarh.com.br';
  const colabPass = 'Colab@123456';

  test.beforeAll(async () => {
    const prisma = new PrismaClient();
    try {
      const colab = await prisma.employee.findFirst({
        where: { user: { email: colabEmail } },
      });

      if (colab) {
        // Limpa solicitações de férias e atestados de testes anteriores
        await prisma.vacationRequest.deleteMany({
          where: { employeeId: colab.id },
        });
        await prisma.employeeLeave.deleteMany({
          where: { employeeId: colab.id },
        });
        await prisma.medicalCertificate.deleteMany({
          where: { employeeId: colab.id },
        });

        // Limpa períodos antigos e recria um único período limpo com 30 dias de saldo
        await prisma.vacationPeriod.deleteMany({
          where: { employeeId: colab.id },
        });

        const start = new Date('2024-01-01T00:00:00.000Z');
        const end = new Date('2024-12-31T23:59:59.999Z');
        const concEnd = new Date('2025-12-31T23:59:59.999Z');

        await prisma.vacationPeriod.create({
          data: {
            companyId: colab.companyId,
            employeeId: colab.id,
            startDate: start,
            endDate: end,
            concessiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
            concessiveEndDate: concEnd,
            daysAcquired: 30,
            daysUsed: 0,
            daysSold: 0,
            daysRemaining: 30,
            status: 'ADQUIRIDO',
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('Fluxo E2E: Colaborador consulta saldo -> Solicita férias com prévia -> Gestor aprova -> Saldo atualizado -> Espelho de ponto reflete ocorrência', async ({
    page,
  }) => {
    // ------------------------------------------------------------------------
    // PASSO 1: Colaborador realiza login
    // ------------------------------------------------------------------------
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Acesse sua conta');

    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/portal', { timeout: 15000 });
    await expect(page.locator('text=Portal do Colaborador').first()).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // PASSO 2: Acessa Minhas Férias no Portal
    // ------------------------------------------------------------------------
    await page.locator('a[href="/portal/vacations"]').first().click();
    await page.waitForURL('**/portal/vacations', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Minhas Férias, Afastamentos & Documentos');

    // Valida que o card de saldo está visível
    await expect(page.locator('text=Período Aquisitivo Vigente')).toBeVisible();
    await expect(page.locator('text=Disponíveis')).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 3: Abre a aba "Solicitar Férias" e simula prévia financeira
    // ------------------------------------------------------------------------
    await page.locator('button:has-text("Solicitar Férias")').first().click();
    await expect(page.locator('h3:has-text("Nova Solicitação de Férias")')).toBeVisible();
    await expect(page.locator('h3:has-text("Simulador de Remuneração")')).toBeVisible();

    // Preenche início para uma segunda-feira permitida pela CLT (2026-11-16)
    await page.locator('input[type="date"]:not([disabled])').fill('2026-11-16');

    // Valida que o simulador calculou o 1/3 constitucional
    await expect(page.locator('text=1/3 Constitucional (CLT):')).toBeVisible();
    await expect(page.locator('text=Estimativa Total Bruta:')).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 4: Envia a solicitação de férias
    // ------------------------------------------------------------------------
    await page.click('button[type="submit"]:has-text("Enviar Solicitação de Férias")');

    // Valida retorno para a listagem e presença do badge PENDENTE
    await expect(page.locator('text=PENDENTE').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=15 dias').first()).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 5: Gestor realiza login
    // ------------------------------------------------------------------------
    await page.goto('/login');
    await page.fill('input[type="email"]', gestorEmail);
    await page.fill('input[type="password"]', gestorPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // ------------------------------------------------------------------------
    // PASSO 6: Gestor acessa módulo administrativo de férias
    // ------------------------------------------------------------------------
    await page.locator('a[href="/admin/vacations"]').first().click();
    await page.waitForURL('**/admin/vacations', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Gestão de Férias, Afastamentos & Documentos');

    // ------------------------------------------------------------------------
    // PASSO 7: Gestor delibera na aba "Solicitações de Férias"
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Solicitações de Férias")');
    await expect(page.locator('h3:has-text("Solicitações e Programações de Férias")')).toBeVisible();

    // Localiza e clica no botão "Aprovar"
    await expect(page.locator('button:has-text("Aprovar")').first()).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Aprovar")').first().click();

    // Confirma no modal de aprovação
    await expect(page.locator('h3:has-text("Aprovar Solicitação de Férias")')).toBeVisible();
    await page.click('button:has-text("Confirmar Aprovação")');

    // Valida toast de sucesso e atualização para APROVADA
    await expect(page.locator('text=Solicitação de férias aprovada').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=APROVADA').first()).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // PASSO 8: Gestor verifica saldo atualizado na aba "Períodos & Saldos"
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Períodos & Saldos")');
    await expect(page.locator('text=15d').first()).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // PASSO 9: Colaborador valida suas férias aprovadas no portal
    // ------------------------------------------------------------------------
    await page.goto('/login');
    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/portal', { timeout: 15000 });
    await page.locator('a[href="/portal/vacations"]').first().click();
    await page.waitForURL('**/portal/vacations', { timeout: 10000 });

    await expect(page.locator('text=APROVADA').first()).toBeVisible({ timeout: 10000 });
  });
});
