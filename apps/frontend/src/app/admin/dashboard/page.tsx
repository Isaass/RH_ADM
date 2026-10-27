'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Building2,
  DollarSign,
  PlusCircle,
  ArrowRight,
  Shield,
  Activity,
  Calendar,
  Lock,
  Clock,
  CheckSquare,
  Palmtree,
  Scale,
  FileCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrencyBRL } from '@pontuarh/shared';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departmentsCount: number;
  departmentsBreakdown: { id: string; name: string; count: number }[];
  estimatedPayroll: number | null;
  recentAudits: {
    id: string;
    action: string;
    entity: string;
    details: string | null;
    createdAt: string;
    user: { name: string; role: string } | null;
  }[];
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingAdjustmentsCount, setPendingAdjustmentsCount] = useState<number>(0);
  const [vacationOverview, setVacationOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<DashboardStats>('/dashboard/stats'),
      api.get<any[]>('/adjustments?status=PENDENTE'),
      api.get<any>('/vacations/overview'),
    ])
      .then(([statsRes, adjRes, vacRes]) => {
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (adjRes.status === 'fulfilled') setPendingAdjustmentsCount(adjRes.value?.length || 0);
        if (vacRes.status === 'fulfilled') setVacationOverview(vacRes.value);
      })
      .catch((err) => console.error('Erro ao carregar métricas:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner de Boas-vindas Limpo */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-primary dark:text-blue-400 text-xs font-semibold mb-2 border border-blue-200 dark:border-blue-800/60">
            <Shield className="w-3.5 h-3.5" />
            <span>Painel de Controle • Gestão Integrada</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-slate-100">
            Olá, {user?.name || 'Administrador'}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl">
            Visão unificada de colaboradores, ponto eletrônico, banco de horas e controle de ausências em conformidade com a CLT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/employees/new">
            <Button variant="primary" className="bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs">
              <PlusCircle className="w-4 h-4 mr-2" />
              <span>Novo Colaborador</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumo Operacional de Gestão (Conforme UI/UX Skill) */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Resumo Operacional de Hoje
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Colaboradores Ativos"
            value={loading ? '...' : (stats?.activeEmployees ?? 0)}
            description="Vínculos contratuais regulares"
            icon={<UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            trend={{ value: '100% Regular', isPositive: true }}
            colorScheme="green"
          />

          <StatCard
            title="Ajustes Pendentes"
            value={loading ? '...' : pendingAdjustmentsCount}
            description="Solicitações aguardando deliberação"
            icon={<CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            colorScheme="amber"
          />

          <StatCard
            title="Em Férias Hoje"
            value={loading ? '...' : (vacationOverview?.onVacationCount ?? 0)}
            description="Férias em gozo na organização"
            icon={<Palmtree className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            colorScheme="blue"
          />

          <StatCard
            title="Afastamentos & Atestados"
            value={
              loading
                ? '...'
                : (vacationOverview?.activeLeavesCount ?? 0) +
                  (vacationOverview?.pendingCertificatesCount ?? 0)
            }
            description="Licenças e atestados em acompanhamento"
            icon={<Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            colorScheme="slate"
          />
        </div>
      </div>

      {/* Indicadores Estruturais e Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Cadastros"
          value={loading ? '...' : (stats?.totalEmployees ?? 0)}
          description="Cadastros registrados no sistema"
          icon={<Users className="w-5 h-5" />}
          colorScheme="slate"
        />

        <StatCard
          title="Departamentos Ativos"
          value={loading ? '...' : (stats?.departmentsCount ?? 0)}
          description="Áreas corporativas estruturadas"
          icon={<Building2 className="w-5 h-5" />}
          colorScheme="slate"
        />

        <StatCard
          title="Folha Salarial Estimada"
          value={
            loading
              ? '...'
              : stats?.estimatedPayroll !== null
              ? formatCurrencyBRL(stats?.estimatedPayroll)
              : 'Confidencial'
          }
          description={
            stats?.estimatedPayroll !== null
              ? 'Soma dos salários-base ativos'
              : 'Restrito ao RH e Diretoria'
          }
          icon={
            stats?.estimatedPayroll !== null ? (
              <DollarSign className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )
          }
          colorScheme="slate"
        />
      </div>

      {/* Seção Central: Departamentos e Trilha de Auditoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Departamento */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Equipes e Departamentos</CardTitle>
                <CardDescription>Distribuição de colaboradores</CardDescription>
              </div>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Carregando dados...</p>
            ) : !stats?.departmentsBreakdown?.length ? (
              <p className="text-sm text-slate-500">Nenhum departamento cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {stats.departmentsBreakdown.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {dept.name}
                    </span>
                    <Badge variant="default" className="font-mono">
                      {dept.count} colaborador{dept.count === 1 ? '' : 'es'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trilha de Auditoria Recente (LGPD / Segurança) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trilha de Auditoria Recente</CardTitle>
                <CardDescription>Registro cronológico de alterações e segurança (LGPD)</CardDescription>
              </div>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Carregando auditoria...</p>
            ) : !stats?.recentAudits?.length ? (
              <p className="text-sm text-slate-500">Nenhum registro de auditoria disponível.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentAudits.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info" className="text-[10px] font-mono">
                          {log.action}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                          {log.user?.name || 'Sistema'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {log.details || `Operação executada na entidade ${log.entity}`}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acesso Rápido aos Módulos Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/adjustments" className="block">
          <Card className="hover:border-brand-primary hover:shadow-xs transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Ajustes de Ponto
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pendingAdjustmentsCount} aguardando análise
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/time-bank" className="block">
          <Card className="hover:border-brand-primary hover:shadow-xs transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-brand-primary dark:text-blue-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Banco de Horas
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saldos e compensações
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/vacations" className="block">
          <Card className="hover:border-brand-primary hover:shadow-xs transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Férias & Licenças
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Períodos e afastamentos
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/time-tracking" className="block">
          <Card className="hover:border-brand-primary hover:shadow-xs transition-all h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Espelho de Ponto
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Marcações da competência
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

