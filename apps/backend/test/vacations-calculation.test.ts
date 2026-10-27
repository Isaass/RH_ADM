import { describe, it, expect } from 'vitest';
import { vacationsCalculationService } from '../src/vacations/vacations-calculation.service';

describe('Motor de Cálculo de Férias — Regras da CLT (Fase 4)', () => {
  describe('Cenário 1 e 2: Cálculo de períodos aquisitivos e concessivos', () => {
    it('deve calcular corretamente os períodos aquisitivos e concessivos a partir da admissão', () => {
      const admissionDate = new Date('2024-03-01T00:00:00.000Z');
      const referenceDate = new Date('2026-03-15T00:00:00.000Z');

      const periods = vacationsCalculationService.generatePeriodsFromAdmission(admissionDate, referenceDate);

      // Deve gerar pelo menos 2 períodos completos e o 3º em andamento
      expect(periods.length).toBeGreaterThanOrEqual(2);

      // Período 1
      const p1 = periods[0];
      expect(p1.periodNumber).toBe(1);
      expect(p1.startDate.toISOString().slice(0, 10)).toBe('2024-03-01');
      expect(p1.endDate.toISOString().slice(0, 10)).toBe('2025-02-28');
      expect(p1.concessiveStartDate.toISOString().slice(0, 10)).toBe('2025-03-01');
      expect(p1.concessiveEndDate.toISOString().slice(0, 10)).toBe('2026-02-28');

      // Período 2
      const p2 = periods[1];
      expect(p2.periodNumber).toBe(2);
      expect(p2.startDate.toISOString().slice(0, 10)).toBe('2025-03-01');
      expect(p2.endDate.toISOString().slice(0, 10)).toBe('2026-02-28');
      expect(p2.concessiveStartDate.toISOString().slice(0, 10)).toBe('2026-03-01');
    });

    it('deve identificar período vencido quando ultrapassar o período concessivo (risco de dobra CLT Art. 137)', () => {
      const admissionDate = new Date('2023-01-01T00:00:00.000Z');
      const referenceDate = new Date('2026-10-01T00:00:00.000Z');

      const periods = vacationsCalculationService.generatePeriodsFromAdmission(admissionDate, referenceDate);
      const p1 = periods[0];

      expect(p1.isExpired).toBe(true);
      expect(p1.status).toBe('VENCIDO');
      expect(p1.daysUntilExpiry).toBeLessThan(0);
    });
  });

  describe('Cenário 3: Dias adquiridos e proporção conforme faltas injustificadas (CLT Art. 130)', () => {
    it('deve conceder 30 dias de férias para até 5 faltas injustificadas', () => {
      expect(vacationsCalculationService.calculateAcquiredDays(0).daysAcquired).toBe(30);
      expect(vacationsCalculationService.calculateAcquiredDays(5).daysAcquired).toBe(30);
      expect(vacationsCalculationService.calculateAcquiredDays(5).lostDays).toBe(0);
    });

    it('deve reduzir para 24 dias quando houver de 6 a 14 faltas', () => {
      const res = vacationsCalculationService.calculateAcquiredDays(10);
      expect(res.daysAcquired).toBe(24);
      expect(res.lostDays).toBe(6);
    });

    it('deve reduzir para 18 dias quando houver de 15 a 23 faltas', () => {
      const res = vacationsCalculationService.calculateAcquiredDays(18);
      expect(res.daysAcquired).toBe(18);
      expect(res.lostDays).toBe(12);
    });

    it('deve reduzir para 12 dias quando houver de 24 a 32 faltas', () => {
      const res = vacationsCalculationService.calculateAcquiredDays(25);
      expect(res.daysAcquired).toBe(12);
      expect(res.lostDays).toBe(18);
    });

    it('deve zerar o direito a férias se houver mais de 32 faltas injustificadas', () => {
      const res = vacationsCalculationService.calculateAcquiredDays(35);
      expect(res.daysAcquired).toBe(0);
      expect(res.lostDays).toBe(30);
    });
  });

  describe('Cenário 8 e 9: Validação de Fracionamento (CLT Art. 134 § 1º)', () => {
    it('deve aprovar fracionamento válido em 3 períodos (15 dias, 10 dias, 5 dias)', () => {
      // 1º período: 15 dias
      const val1 = vacationsCalculationService.validateFractioning(15, 0, [], 30);
      expect(val1.valid).toBe(true);

      // 2º período: 10 dias
      const val2 = vacationsCalculationService.validateFractioning(10, 0, [{ daysCount: 15 }], 30);
      expect(val2.valid).toBe(true);

      // 3º período: 5 dias (atinge 30 dias com um período >= 14 e nenhum < 5)
      const val3 = vacationsCalculationService.validateFractioning(5, 0, [{ daysCount: 15 }, { daysCount: 10 }], 30);
      expect(val3.valid).toBe(true);
    });

    it('deve aprovar período único integral de 30 dias', () => {
      const val = vacationsCalculationService.validateFractioning(30, 0, [], 30);
      expect(val.valid).toBe(true);
    });

    it('deve aprovar 20 dias de gozo com 10 dias de abono pecuniário (venda de férias)', () => {
      const val = vacationsCalculationService.validateFractioning(20, 10, [], 30);
      expect(val.valid).toBe(true);
    });

    it('deve REJEITAR período inferior a 5 dias corridos', () => {
      const val = vacationsCalculationService.validateFractioning(4, 0, [], 30);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('inferior a 5 dias');
    });

    it('deve REJEITAR fracionamento em mais de 3 períodos', () => {
      const existing = [{ daysCount: 14 }, { daysCount: 5 }, { daysCount: 5 }];
      const val = vacationsCalculationService.validateFractioning(6, 0, existing, 30);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('máximo 3 períodos');
    });

    it('deve REJEITAR fracionamento quando nenhum período atingir 14 dias corridos ao esgotar o saldo', () => {
      // Tentativa de 3 períodos de 10 dias (10 + 10 + 10 = 30, mas nenhum tem 14 dias)
      const existing = [{ daysCount: 10 }, { daysCount: 10 }];
      const val = vacationsCalculationService.validateFractioning(10, 0, existing, 30);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('no mínimo 14 dias');
    });

    it('deve REJEITAR abono pecuniário superior a 1/3 dos dias de direito', () => {
      // 15 dias de abono em 30 é metade (CLT permite apenas 1/3 = 10 dias)
      const val = vacationsCalculationService.validateFractioning(15, 15, [], 30);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('1/3 do período de direito');
    });

    it('deve REJEITAR quando a soma dos dias ultrapassar o saldo disponível', () => {
      const val = vacationsCalculationService.validateFractioning(25, 10, [], 30); // 35 dias
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('excede o saldo disponível');
    });
  });

  describe('Cenário: Início de férias e descanso semanal remunerado (CLT Art. 134 § 3º)', () => {
    it('deve REJEITAR início na quinta ou sexta-feira para escala segunda-a-sexta', () => {
      // 2026-11-19 é quinta-feira
      const thursday = new Date('2026-11-19T10:00:00.000Z');
      const valThu = vacationsCalculationService.validateStartDate(thursday, ['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(valThu.valid).toBe(false);
      expect(valThu.reason).toContain('2 dias que antecedem');

      // 2026-11-20 é sexta-feira
      const friday = new Date('2026-11-20T10:00:00.000Z');
      const valFri = vacationsCalculationService.validateStartDate(friday, ['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(valFri.valid).toBe(false);
    });

    it('deve REJEITAR início no sábado ou domingo', () => {
      const saturday = new Date('2026-11-21T10:00:00.000Z');
      const valSat = vacationsCalculationService.validateStartDate(saturday, ['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(valSat.valid).toBe(false);
    });

    it('deve ACEITAR início na segunda, terça ou quarta-feira', () => {
      // 2026-11-16 é segunda-feira
      const monday = new Date('2026-11-16T10:00:00.000Z');
      const valMon = vacationsCalculationService.validateStartDate(monday, ['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(valMon.valid).toBe(true);

      // 2026-11-17 é terça-feira
      const tuesday = new Date('2026-11-17T10:00:00.000Z');
      const valTue = vacationsCalculationService.validateStartDate(tuesday, ['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(valTue.valid).toBe(true);
    });
  });

  describe('Cenário 20: Cálculos financeiros preliminares (Salário base, 1/3 e abono)', () => {
    it('deve calcular corretamente os valores brutos para 30 dias de gozo integral', () => {
      const salary = 3000.0;
      const preview = vacationsCalculationService.calculateRemunerationPreview(salary, 30, 0);

      expect(preview.baseSalary).toBe(3000);
      expect(preview.dailyRate).toBe(100);
      expect(preview.vacationDays).toBe(30);
      expect(preview.vacationPay).toBe(3000);
      expect(preview.constitutionalThird).toBe(1000); // 1/3 de 3000
      expect(preview.sellDays).toBe(0);
      expect(preview.abonoPay).toBe(0);
      expect(preview.abonoThird).toBe(0);
      expect(preview.totalGrossPreview).toBe(4000); // 3000 + 1000
    });

    it('deve calcular corretamente 20 dias de férias com 10 dias de abono pecuniário', () => {
      const salary = 4500.0;
      const preview = vacationsCalculationService.calculateRemunerationPreview(salary, 20, 10);

      expect(preview.dailyRate).toBe(150); // 4500 / 30
      expect(preview.vacationPay).toBe(3000); // 20 * 150
      expect(preview.constitutionalThird).toBe(1000); // 1/3 de 3000
      expect(preview.abonoPay).toBe(1500); // 10 * 150
      expect(preview.abonoThird).toBe(500); // 1/3 de 1500
      expect(preview.totalGrossPreview).toBe(6000); // 3000 + 1000 + 1500 + 500
      expect(preview.legalNotice).toContain('Valores brutos informativos estimados');
    });
  });
});
