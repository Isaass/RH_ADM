import { VacationRemunerationPreview } from '@pontuarh/shared';

export interface VacationPeriodDefinition {
  periodNumber: number;
  startDate: Date;
  endDate: Date;
  concessiveStartDate: Date;
  concessiveEndDate: Date;
  daysAcquired: number;
  daysRemaining: number;
  status: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
}

export class VacationsCalculationService {
  /**
   * Tabela legal de aquisição de férias conforme faltas injustificadas (CLT Art. 130)
   */
  calculateAcquiredDays(unjustifiedAbsences: number = 0): { daysAcquired: number; lostDays: number; reason?: string } {
    if (unjustifiedAbsences < 0) unjustifiedAbsences = 0;

    if (unjustifiedAbsences <= 5) {
      return { daysAcquired: 30, lostDays: 0 };
    } else if (unjustifiedAbsences <= 14) {
      return { daysAcquired: 24, lostDays: 6, reason: 'Redução para 24 dias devido a 6 a 14 faltas injustificadas (CLT Art. 130, II).' };
    } else if (unjustifiedAbsences <= 23) {
      return { daysAcquired: 18, lostDays: 12, reason: 'Redução para 18 dias devido a 15 a 23 faltas injustificadas (CLT Art. 130, III).' };
    } else if (unjustifiedAbsences <= 32) {
      return { daysAcquired: 12, lostDays: 18, reason: 'Redução para 12 dias devido a 24 a 32 faltas injustificadas (CLT Art. 130, IV).' };
    } else {
      return { daysAcquired: 0, lostDays: 30, reason: 'Perda total do direito a férias por mais de 32 faltas injustificadas no período aquisitivo (CLT Art. 130).' };
    }
  }

  /**
   * Gera períodos aquisitivos e concessivos sucessivos a partir da admissão do funcionário
   */
  generatePeriodsFromAdmission(
    admissionDate: Date,
    referenceDate: Date = new Date(),
    unjustifiedAbsences: number = 0
  ): VacationPeriodDefinition[] {
    const periods: VacationPeriodDefinition[] = [];
    const adm = new Date(admissionDate);
    const startYear = adm.getUTCFullYear();
    const startMonth = adm.getUTCMonth();
    const startDay = adm.getUTCDate();

    let currentStart = new Date(Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0));
    const ref = new Date(referenceDate);

    let periodIdx = 1;

    // Gera períodos até cobrir a data de referência
    while (currentStart <= ref || periodIdx === 1) {
      // Fim do aquisitivo = 1 ano depois menos 1 dia (em UTC)
      const aquisitiveEnd = new Date(currentStart);
      aquisitiveEnd.setUTCFullYear(aquisitiveEnd.getUTCFullYear() + 1);
      aquisitiveEnd.setUTCDate(aquisitiveEnd.getUTCDate() - 1);

      // Início do concessivo = dia seguinte ao fim do aquisitivo
      const concessiveStart = new Date(aquisitiveEnd);
      concessiveStart.setUTCDate(concessiveStart.getUTCDate() + 1);

      // Fim do concessivo = 1 ano depois do início do concessivo menos 1 dia
      const concessiveEnd = new Date(concessiveStart);
      concessiveEnd.setUTCFullYear(concessiveEnd.getUTCFullYear() + 1);
      concessiveEnd.setUTCDate(concessiveEnd.getUTCDate() - 1);

      // Cálculo de dias adquiridos (apenas períodos vencidos adquirem integralmente)
      const isPeriodComplete = ref > aquisitiveEnd;
      const { daysAcquired } = this.calculateAcquiredDays(isPeriodComplete ? unjustifiedAbsences : 0);

      // Status do período
      const diffTime = concessiveEnd.getTime() - ref.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isExpired = daysUntilExpiry < 0;
      const isExpiringSoon = !isExpired && daysUntilExpiry <= 60;

      let status = 'ABERTO';
      if (isPeriodComplete) {
        if (isExpired) {
          status = 'VENCIDO';
        } else {
          status = 'ADQUIRIDO';
        }
      }

      periods.push({
        periodNumber: periodIdx,
        startDate: new Date(currentStart),
        endDate: new Date(aquisitiveEnd),
        concessiveStartDate: new Date(concessiveStart),
        concessiveEndDate: new Date(concessiveEnd),
        daysAcquired,
        daysRemaining: daysAcquired,
        status,
        isExpired,
        isExpiringSoon,
        daysUntilExpiry,
      });

      // Avança para o próximo período aquisitivo
      currentStart = new Date(concessiveStart);
      periodIdx++;

      // Previne loops infinitos caso a data de admissão seja inválida
      if (periodIdx > 50) break;
    }

    return periods;
  }

  /**
   * Validação rigorosa de regras de fracionamento de férias (CLT Art. 134 § 1º)
   */
  validateFractioning(
    requestedDays: number,
    sellDays: number = 0,
    existingFractions: { daysCount: number }[] = [],
    totalAvailableDays: number = 30
  ): { valid: boolean; reason?: string } {
    if (requestedDays <= 0) {
      return { valid: false, reason: 'A quantidade de dias de férias deve ser maior que zero.' };
    }

    if (sellDays < 0) {
      return { valid: false, reason: 'Quantidade de dias de abono pecuniário não pode ser negativa.' };
    }

    // Limite de abono pecuniário: máx 1/3 do total de dias adquiridos (máx 10 dias em 30)
    const maxSellDays = Math.floor(totalAvailableDays / 3);
    if (sellDays > maxSellDays) {
      return {
        valid: false,
        reason: `Abono pecuniário não pode exceder 1/3 do período de direito (máximo de ${maxSellDays} dias, CLT Art. 143).`,
      };
    }

    // Quantidade mínima por período: nenhum menor que 5 dias
    if (requestedDays < 5) {
      return {
        valid: false,
        reason: 'Nenhum período de férias fracionadas pode ser inferior a 5 dias corridos (CLT Art. 134 § 1º).',
      };
    }

    const currentFractionsCount = existingFractions.length + 1;
    if (currentFractionsCount > 3) {
      return {
        valid: false,
        reason: 'O fracionamento de férias é limitado a no máximo 3 períodos (CLT Art. 134 § 1º).',
      };
    }

    // Soma de dias já agendados
    const alreadyUsedDays = existingFractions.reduce((acc, f) => acc + f.daysCount, 0);
    const totalConsumingDays = alreadyUsedDays + requestedDays + sellDays;

    if (totalConsumingDays > totalAvailableDays) {
      return {
        valid: false,
        reason: `A soma de dias solicitados (${requestedDays}d) + abono (${sellDays}d) + períodos existentes (${alreadyUsedDays}d) excede o saldo disponível de ${totalAvailableDays} dias.`,
      };
    }

    // Regra do período maior: pelo menos um período deve ter no mínimo 14 dias
    const allDays = [...existingFractions.map((f) => f.daysCount), requestedDays];
    const hasAtLeast14Days = allDays.some((d) => d >= 14);

    // Se estiver no último período possível (3º período ou quando zerar o saldo disponível), exige que a regra dos 14 dias tenha sido satisfeita
    const willExhaustDays = totalConsumingDays === totalAvailableDays;
    const isThirdPeriod = currentFractionsCount === 3;

    if ((willExhaustDays || isThirdPeriod) && !hasAtLeast14Days) {
      return {
        valid: false,
        reason: 'Pelo menos um dos períodos de férias fracionadas deve possuir no mínimo 14 dias corridos (CLT Art. 134 § 1º).',
      };
    }

    return { valid: true };
  }

  /**
   * Validação de data de início: proibição de início 2 dias antes de DSR ou feriado (CLT Art. 134 § 3º)
   */
  validateStartDate(
    startDate: Date,
    workDays: string[] = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  ): { valid: boolean; reason?: string } {
    const start = new Date(startDate);
    const dayOfWeek = start.getUTCDay(); // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado

    // Para jornada comercial padrão (segunda a sexta, DSR em sábado e domingo):
    // Não pode iniciar na quinta-feira (2 dias antes do sábado) nem na sexta-feira (1 dia antes do sábado)
    const isStandardMondayToFriday =
      workDays.includes('MON') &&
      workDays.includes('FRI') &&
      !workDays.includes('SAT') &&
      !workDays.includes('SUN');

    if (isStandardMondayToFriday) {
      if (dayOfWeek === 4) { // Quinta-feira
        return {
          valid: false,
          reason: 'É vedado o início das férias nos 2 dias que antecedem o descanso semanal remunerado (início na quinta-feira vedado, CLT Art. 134 § 3º).',
        };
      }
      if (dayOfWeek === 5) { // Sexta-feira
        return {
          valid: false,
          reason: 'É vedado o início das férias no dia imediatamente anterior ao descanso semanal remunerado (início na sexta-feira vedado, CLT Art. 134 § 3º).',
        };
      }
      if (dayOfWeek === 6 || dayOfWeek === 0) { // Sábado ou Domingo
        return {
          valid: false,
          reason: 'As férias não podem iniciar em dia de descanso semanal remunerado (sábado ou domingo, CLT Art. 134 § 3º).',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Cálculo de prévia estimativa de remuneração de férias (Salário base + 1/3 constitucional + abono pecuniário)
   * Isola cálculos brutos sem pretensão de valores líquidos definitivos (CLT / CF/88 Art. 7º XVII)
   */
  calculateRemunerationPreview(
    baseSalary: number,
    vacationDays: number,
    sellDays: number = 0
  ): VacationRemunerationPreview {
    const salary = Number(baseSalary) || 0;
    const dailyRate = Math.round((salary / 30) * 100) / 100;

    const vacationPay = Math.round(dailyRate * vacationDays * 100) / 100;
    const constitutionalThird = Math.round((vacationPay / 3) * 100) / 100;

    const abonoPay = Math.round(dailyRate * sellDays * 100) / 100;
    const abonoThird = Math.round((abonoPay / 3) * 100) / 100;

    const totalGrossPreview = Math.round((vacationPay + constitutionalThird + abonoPay + abonoThird) * 100) / 100;

    return {
      baseSalary: salary,
      dailyRate,
      vacationDays,
      vacationPay,
      constitutionalThird,
      sellDays,
      abonoPay,
      abonoThird,
      totalGrossPreview,
      legalNotice: 'Valores brutos informativos estimados com base no salário base contratual e 1/3 constitucional (Art. 7º XVII da CF/88). Descontos legais de INSS e IRRF, bem como médias de horas extras, adicionais noturnos e insalubridade serão calculados oficialmente na folha de pagamento da Fase 5.',
    };
  }
}

export const vacationsCalculationService = new VacationsCalculationService();
