'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Shield,
  Lock,
  Layers,
  Calendar,
  DollarSign,
  HelpCircle,
  ExternalLink,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { CompanyUsage, PlanFeature, formatCurrencyBRL } from '@pontuarh/shared';

const MODULES_LIST: Array<{ key: PlanFeature; label: string; desc: string; icon: string }> = [
  { key: PlanFeature.DASHBOARD, label: 'Dashboard & Indicadores', desc: 'Métricas gerais de jornada e equipes em tempo real.', icon: '📊' },
  { key: PlanFeature.COLABORADORES, label: 'Gestão de Colaboradores', desc: 'Cadastro, admissão, cargos e departamentos.', icon: '👥' },
  { key: PlanFeature.PONTO_ELETRONICO, label: 'Controle de Ponto Eletrônico', desc: 'Marcações de ponto em conformidade com a CLT.', icon: '⏱️' },
  { key: PlanFeature.ESPELHO_PONTO, label: 'Espelho de Ponto Mensal', desc: 'Apuração mensal de batidas, atrasos e faltas.', icon: '📅' },
  { key: PlanFeature.AJUSTES, label: 'Ajustes e Justificativas', desc: 'Tratamento de esquecimentos e atestados médicos.', icon: '✍️' },
  { key: PlanFeature.BANCO_HORAS, label: 'Banco de Horas Inteligente', desc: 'Controle de créditos, débitos e compensações.', icon: '⚖️' },
  { key: PlanFeature.FERIAS, label: 'Férias & Afastamentos', desc: 'Controle de períodos aquisitivos e licenças.', icon: '🌴' },
  { key: PlanFeature.DOCUMENTOS, label: 'Repositório de Documentos', desc: 'Gestão de arquivos admissionais e recibos.', icon: '📁' },
  { key: PlanFeature.FOLHA_PAGAMENTO, label: 'Prévia de Folha de Pagamento', desc: 'Apuração financeira de rubricas e proventos.', icon: '💼' },
  { key: PlanFeature.RELATORIOS, label: 'Relatórios Gerenciais', desc: 'Exportações analíticas para auditoria e contabilidade.', icon: '📈' },
];

export default function AdminSubscriptionPage() {
  const [usage, setUsage] = useState<CompanyUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<CompanyUsage>('/companies/current/subscription');
      setUsage(data);
    } catch (err: any) {
      console.error('Erro ao consultar assinatura da empresa:', err);
      setError(err.message || 'Falha ao carregar informações do plano da empresa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-xs text-slate-500">Carregando informações do plano contratado...</p>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Situação da Assinatura
          </div>
          <p className="text-xs leading-relaxed">
            {error || 'Não foi possível localizar uma assinatura ativa para esta organização.'}
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            Entre em contato com o administrador da plataforma para regularizar a ativação do seu plano SaaS.
          </p>
        </div>
      </div>
    );
  }

  const { plan, subscription, currentUsage, features, isExpired, isTrial, daysRemaining } = usage;

  const getStatusBadge = () => {
    if (isExpired) return <Badge variant="danger">Assinatura Expirada</Badge>;
    if (isTrial) return <Badge variant="warning">Período de Teste ({daysRemaining} dias restantes)</Badge>;
    if (subscription.status === 'ATIVA') return <Badge variant="success">Assinatura Ativa</Badge>;
    if (subscription.status === 'CANCELADA') return <Badge variant="default">Cancelada</Badge>;
    return <Badge>{subscription.status}</Badge>;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Plano Contratado & Assinatura SaaS"
        description="Consulte os limites de colaboradores, vigência contratual e módulos liberados para a sua empresa."
      />

      {/* Alerta de Expiração */}
      {isExpired && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-900 dark:text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Atenção: A assinatura da sua empresa está expirada.</p>
            <p className="mt-0.5 leading-relaxed">
              O acesso aos módulos operacionais foi temporariamente restrito. Entre em contato com a equipe de suporte ou com o administrador da plataforma para renovar sua contratação.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Período de Teste */}
      {isTrial && !isExpired && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Modo de Avaliação (Trial Ativo)</p>
            <p className="mt-0.5 leading-relaxed">
              Sua empresa está utilizando o Pontua RH em período de teste. Restam <strong>{daysRemaining} dias</strong> de vigência para experimentação dos recursos contratados.
            </p>
          </div>
        </div>
      )}

      {/* Card Principal do Plano */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-brand-primary/10 via-purple-500/10 to-transparent p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary px-2 py-0.5 bg-brand-primary/10 rounded">
                  Plano Atual
                </span>
                {getStatusBadge()}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {plan.name}
              </h2>
              {plan.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {plan.description}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-slate-400 block font-medium">Valor Contratado:</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {formatCurrencyBRL(subscription.price)}
                <span className="text-xs font-normal text-slate-400">
                  {subscription.periodicity === 'ANUAL' ? '/ano' : '/mês'}
                </span>
              </span>
              {subscription.endDate && (
                <span className="block text-[11px] text-slate-500 mt-0.5 font-mono">
                  Válido até: {new Date(subscription.endDate).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Como alterar ou expandir meu plano?</strong> Por segurança institucional e governança multi-tenant, os upgrades de plano, contratação de novos pacotes e ajustes de periodicidade são gerenciados pelo administrador da plataforma Pontua RH.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Utilização Atual vs. Limites Contratuais */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Utilização de Capacidade & Limites
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Colaboradores */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-primary" /> Colaboradores
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {currentUsage.employees} / {currentUsage.maxEmployees}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    currentUsage.employeesPercentage >= 90
                      ? 'bg-rose-500'
                      : currentUsage.employeesPercentage >= 75
                      ? 'bg-amber-500'
                      : 'bg-brand-primary'
                  }`}
                  style={{ width: `${currentUsage.employeesPercentage}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{currentUsage.employeesPercentage}% utilizado</span>
                <span>Restam {Math.max(0, currentUsage.maxEmployees - currentUsage.employees)} vagas</span>
              </div>
            </CardContent>
          </Card>

          {/* Usuários Autenticáveis */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-600" /> Contas de Usuários
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {currentUsage.users} / {currentUsage.maxUsers}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    currentUsage.usersPercentage >= 90 ? 'bg-rose-500' : 'bg-purple-600'
                  }`}
                  style={{ width: `${currentUsage.usersPercentage}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{currentUsage.usersPercentage}% utilizado</span>
                <span>Restam {Math.max(0, currentUsage.maxUsers - currentUsage.users)} contas</span>
              </div>
            </CardContent>
          </Card>

          {/* Administradores */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" /> Administradores
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {currentUsage.admins} / {currentUsage.maxAdmins}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    currentUsage.adminsPercentage >= 90 ? 'bg-rose-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${currentUsage.adminsPercentage}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{currentUsage.adminsPercentage}% utilizado</span>
                <span>Restam {Math.max(0, currentUsage.maxAdmins - currentUsage.admins)} vagas</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Funcionalidades & Módulos Disponíveis */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Módulos da Plataforma Pontua RH
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODULES_LIST.map((mod) => {
            const isAvailable = Boolean(features[mod.key]);
            return (
              <div
                key={mod.key}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isAvailable
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{mod.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {mod.label}
                      </p>
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" /> Incluso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <Lock className="w-3 h-3" /> Bloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
