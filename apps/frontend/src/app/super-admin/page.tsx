'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCheck,
  ShieldAlert,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  Layers,
  Sparkles,
  DollarSign,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { api } from '@/lib/api';
import { PlatformMetrics, CommercialMetrics, Company, formatCNPJ, formatCurrencyBRL } from '@pontuarh/shared';

export default function SuperAdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    totalEmployees: 0,
    totalUsers: 0,
  });
  const [commercialMetrics, setCommercialMetrics] = useState<CommercialMetrics>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    expiredSubscriptions: 0,
    cancelledSubscriptions: 0,
    estimatedMRR: 0,
    companiesPerPlan: [],
  });
  const [recentCompanies, setRecentCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, commercialRes, companiesRes] = await Promise.all([
        api.get<PlatformMetrics>('/platform/metrics'),
        api.get<CommercialMetrics>('/platform/subscriptions/metrics'),
        api.get<{ data: Company[] }>('/platform/companies?pageSize=5'),
      ]);

      setMetrics(metricsRes);
      setCommercialMetrics(commercialRes);
      setRecentCompanies(companiesRes.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados do Super Admin:', err);
      setError(err.message || 'Falha ao conectar com o serviço administrativo global.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title="Painel Executivo Super Admin"
        description="Controle centralizado da infraestrutura multi-tenant, gestão de planos e saúde operacional do SaaS."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/super-admin/plans">
              <Button variant="outline" className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                <Layers className="w-4 h-4 mr-2" />
                Planos SaaS
              </Button>
            </Link>
            <Link href="/super-admin/subscriptions">
              <Button variant="outline" className="border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                <Sparkles className="w-4 h-4 mr-2" />
                Assinaturas
              </Button>
            </Link>
            <Link href="/super-admin/companies/new">
              <Button variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Empresa
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Indicadores Comerciais & Financeiros (Fase 6.2) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Indicadores Comerciais & Assinaturas SaaS (Fase 6.2)
          </h2>
          <span className="text-[11px] text-slate-400">
            Valores contratuais recorrentes estimados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="MRR Estimado"
            value={formatCurrencyBRL(commercialMetrics.estimatedMRR)}
            description="Receita Mensal Recorrente contratual"
            icon={<TrendingUp className="w-5 h-5" />}
            colorScheme="green"
            trend={{ value: 'Contratual', isPositive: true }}
          />

          <StatCard
            title="Assinaturas Ativas"
            value={commercialMetrics.activeSubscriptions}
            description={`${commercialMetrics.trialSubscriptions} em período de teste`}
            icon={<CheckCircle2 className="w-5 h-5" />}
            colorScheme="blue"
          />

          <StatCard
            title="Em Período de Teste"
            value={commercialMetrics.trialSubscriptions}
            description="Potenciais conversões"
            icon={<Clock className="w-5 h-5" />}
            colorScheme="amber"
          />

          <StatCard
            title="Assinaturas Expiradas"
            value={commercialMetrics.expiredSubscriptions}
            description={`${commercialMetrics.cancelledSubscriptions} canceladas`}
            icon={<ShieldAlert className="w-5 h-5" />}
            colorScheme={commercialMetrics.expiredSubscriptions > 0 ? 'amber' : 'slate'}
          />
        </div>

        <p className="text-[11px] text-slate-400 italic">
          * O MRR representa a soma contratual das assinaturas ativas divididas pelo período e não reflete recebimentos financeiros ou liquidações bancárias reais.
        </p>
      </div>

      {/* Distribuição por Planos SaaS */}
      {commercialMetrics.companiesPerPlan.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              Distribuição de Empresas por Plano Contratado
            </CardTitle>
            <CardDescription className="text-xs">
              Visão consolidada da base de clientes por plano SaaS ativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {commercialMetrics.companiesPerPlan.map((p) => (
                <div
                  key={p.planId}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.planName}</p>
                    <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold">{p.planCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{p.count}</p>
                    <p className="text-[10px] text-slate-400">empresas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores Operacionais Globais da Plataforma */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-500" />
          Infraestrutura e Escala da Plataforma
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Empresas"
            value={metrics.totalCompanies}
            description={`${metrics.activeCompanies} ativas no sistema`}
            icon={<Building2 className="w-5 h-5" />}
            colorScheme="blue"
          />

          <StatCard
            title="Empresas Suspensas"
            value={metrics.suspendedCompanies}
            description="Acesso operacional bloqueado"
            icon={<ShieldAlert className="w-5 h-5" />}
            colorScheme={metrics.suspendedCompanies > 0 ? 'amber' : 'slate'}
          />

          <StatCard
            title="Total de Colaboradores"
            value={metrics.totalEmployees}
            description="Cadastrados em todas as empresas"
            icon={<Users className="w-5 h-5" />}
            colorScheme="blue"
          />

          <StatCard
            title="Usuários Autenticáveis"
            value={metrics.totalUsers}
            description="Contas de acesso à plataforma"
            icon={<UserCheck className="w-5 h-5" />}
            colorScheme="blue"
          />
        </div>
      </div>

      {/* Empresas Recentes */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Empresas Recentemente Cadastradas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Últimas organizações provisionadas no ambiente Pontua RH
            </CardDescription>
          </div>
          <Link
            href="/super-admin/companies"
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            Ver todas as empresas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : recentCompanies.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhuma empresa cadastrada no sistema.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="pb-2 font-semibold">Razão Social / Fantasia</th>
                    <th className="pb-2 font-semibold">CNPJ</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Cadastrada em</th>
                    <th className="pb-2 text-right font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {company.name}
                        {company.tradeName && (
                          <span className="block text-[11px] text-slate-400 font-normal">
                            {company.tradeName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-slate-400">
                        {formatCNPJ(company.cnpj)}
                      </td>
                      <td className="py-3">
                        <Badge variant={company.status === 'ATIVA' ? 'success' : 'danger'}>
                          {company.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/super-admin/companies/${company.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-600">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
