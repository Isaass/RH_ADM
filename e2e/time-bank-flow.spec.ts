import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Pontua RH — Ciclo Operacional Completo de Banco de Horas (Fase 3.1 E2E)', () => {
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
        // Limpa solicitações de teste anteriores para garantir saldo disponível limpo
        await prisma.timeBankCompensationRequest.deleteMany({
          where: { employeeId: colab.id },
        });
        // Remove compensações do ledger geradas em execuções de teste anteriores
        await prisma.timeBankTransaction.deleteMany({
          where: { employeeId: colab.id, origin: 'SOLICITACAO_COMPENSACAO' },
        });
        // Remove férias de teste para evitar conflito de agenda no dia de compensação
        await prisma.vacationRequest.deleteMany({
          where: { employeeId: colab.id },
        });
        // Assegura crédito ativo de 240 minutos (+04:00)
        const hasCredit = await prisma.timeBankTransaction.findFirst({
          where: { employeeId: colab.id, type: 'CREDITO' },
        });
        if (!hasCredit) {
          await prisma.timeBankTransaction.create({
            data: {
              companyId: colab.companyId,
              employeeId: colab.id,
              type: 'CREDITO',
              minutes: 240,
              competence: '2026-10',
              origin: 'APURACAO_PONTO',
              description: 'Crédito apurado de horas excedentes (Acordo Individual)',
              status: 'CONSOLIDADO',
            },
          });
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('Fluxo completo obrigatório de 10 passos: Colaborador consulta saldo -> Solicita compensação -> Saldo reservado -> Gestor aprova -> Reserva mantida -> Compensação confirmada -> Ledger atualizado -> Colaborador valida saldo final', async ({ page }) => {
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
    // PASSO 2: Consulta seu banco de horas
    // ------------------------------------------------------------------------
    await page.locator('a[href="/portal/time-bank"]').first().click();
    await page.waitForURL('**/portal/time-bank', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Meu Banco de Horas');
    await expect(page.locator('text=Saldo Atual Acumulado')).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 3: Solicita uma compensação
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Solicitar Compensação")');
    await expect(page.locator('h3:has-text("Solicitar Compensação de Banco de Horas")')).toBeVisible();

    await page.selectOption('select', 'SAIDA_ANTECIPADA');
    await page.fill('input[type="date"]', '2026-11-20');
    await page.fill('input[type="number"]', '1.0'); // 1 hora (60 minutos)
    await page.fill('textarea', 'Consulta médica especializada pré-agendada.');
    await page.click('button:has-text("Enviar Solicitação")');

    await expect(page.locator('text=Solicitação de compensação enviada com sucesso!')).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // PASSO 4: O saldo fica reservado
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Minhas Solicitações")');
    await expect(page.locator('text=PENDENTE / RESERVADA').first()).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 5: Gestor realiza login
    // ------------------------------------------------------------------------
    await page.goto('/login');
    await page.fill('input[type="email"]', gestorEmail);
    await page.fill('input[type="password"]', gestorPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.goto('/admin/time-bank');
    await expect(page.locator('h1')).toContainText('Banco de Horas & Compensações');

    // ------------------------------------------------------------------------
    // PASSO 6: Aprova a solicitação
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Solicitações de Compensação")');
    await expect(page.locator('text=Lucas Ferreira Lima').first()).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Aprovar")').first().click();
    await expect(page.locator('h3:has-text("Decisão de Compensação — Aprovação")')).toBeVisible();
    await page.fill('textarea', 'Aprovado para fruição na data programada.');
    await page.click('button:has-text("Confirmar APROVADA")');

    await expect(page.locator('text=Solicitação aprovada com sucesso!')).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // PASSO 7: O sistema mantém a reserva até a realização
    // ------------------------------------------------------------------------
    await expect(page.locator('text=APROVADA (AGUARDANDO FRUIÇÃO)').first()).toBeVisible({ timeout: 10000 });
    // Botão de confirmar realização deve estar disponível
    await expect(page.locator('button:has-text("Confirmar Realização")').first()).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 8: A compensação é confirmada (Realização)
    // ------------------------------------------------------------------------
    await page.locator('button:has-text("Confirmar Realização")').first().click();
    await expect(page.locator('text=Compensação confirmada como realizada com sucesso!')).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // PASSO 9: O ledger registra a movimentação
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Livro de Movimentações (Ledger)")');
    await expect(page.locator('text=COMPENSACAO').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=CONSOLIDADO').first()).toBeVisible();

    // ------------------------------------------------------------------------
    // PASSO 10: O colaborador consulta o saldo atualizado
    // ------------------------------------------------------------------------
    await page.goto('/login');
    await page.fill('input[type="email"]', colabEmail);
    await page.fill('input[type="password"]', colabPass);
    await page.click('button[type="submit"]');

    await page.goto('/portal/time-bank');
    await page.click('button:has-text("Minhas Solicitações")');
    await expect(page.locator('text=REALIZADA').first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Extrato Detalhado do Ledger")');
    await expect(page.locator('text=COMPENSACAO').first()).toBeVisible();
  });
});
