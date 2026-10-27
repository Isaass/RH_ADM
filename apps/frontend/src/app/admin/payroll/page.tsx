'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import { RoadmapModulePlaceholder } from '@/components/ui/RoadmapModulePlaceholder';

export default function PayrollModulePage() {
  return (
    <RoadmapModulePlaceholder
      title="Gestão Financeira & Prévia de Folha"
      subtitle="Composição de remuneração, adicionais, benefícios, descontos e custos de pessoal."
      phase="FASE 5"
      icon={Wallet}
      plannedFeatures={[
        'Composição salarial: salário-base, horas extras, DSR, insalubridade e periculosidade',
        'Gestão de benefícios (VT, VR, VA, Plano de Saúde) e seus descontos legais',
        'Prévia mensal de custos da folha para conferência antes do fechamento',
        'Simulação e cálculo prévio de encargos patronais (INSS, FGTS)',
        'Exportação contábil para softwares de folha homologados',
      ]}
      legalBasis="Legislação Trabalhista e Previdenciária Brasileira"
    />
  );
}
