'use client';

import React, { useEffect, useState } from 'react';
import { Landmark, Shield, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCNPJ } from '@pontuarh/shared';

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/companies/current')
      .then(setCompany)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Dados da Empresa (Tenant)"
        description="Parâmetros cadastrais e isolamento da organização contratante."
      />

      {company && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{company.tradeName || company.name}</CardTitle>
                <CardDescription>Razão Social: {company.name}</CardDescription>
              </div>
              <Badge variant={company.active ? 'success' : 'danger'}>
                {company.active ? 'Conta Ativa' : 'Suspensa'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">CNPJ</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {formatCNPJ(company.cnpj)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">E-mail Institucional</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {company.email || 'Não informado'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Telefone de Contato</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {company.phone || 'Não informado'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Identificador Único (Tenant ID)</p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                  {company.id}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 flex items-start gap-3">
              <Shield className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Garantia de Isolamento Multiempresa (Multitenancy)
                </p>
                <p className="mt-0.5">
                  Todas as consultas realizadas no sistema aplicam estritamente o Tenant ID desta organização. Usuários não autorizados são impedidos por filtros no backend de visualizar ou manipular dados entre diferentes empresas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
