'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  RefreshCw,
  Edit,
  History,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  DollarSign,
  X,
  PlayCircle,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import {
  Subscription,
  SubscriptionHistory,
  Plan,
  formatCNPJ,
  formatCurrencyBRL,
} from '@pontuarh/shared';

export default function SuperAdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);

  // Modais de Ações
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [newPlanId, setNewPlanId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);

  // Modal Renovar
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [monthsToAdd, setMonthsToAdd] = useState(1);
  const [submittingRenew, setSubmittingRenew] = useState(false);

  // Modal Cancelar
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Modal Trial
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialDays, setTrialDays] = useState(14);
  const [submittingTrial, setSubmittingTrial] = useState(false);

  // Modal Histórico
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<SubscriptionHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (planFilter) params.append('planId', planFilter);
      if (statusFilter && statusFilter !== 'TODOS') params.append('status', statusFilter);

      const [subsRes, plansRes] = await Promise.all([
        api.get<{ data: Subscription[]; total: number; totalPages: number }>(`/platform/subscriptions?${params.toString()}`),
        api.get<Plan[]>('/platform/plans'),
      ]);

      setSubscriptions(subsRes.data || []);
      setTotal(subsRes.total || 0);
      setTotalPages(subsRes.totalPages || 1);
      setPlans(plansRes || []);
    } catch (err: any) {
      console.error('Erro ao carregar assinaturas:', err);
      showFeedback('error', err.message || 'Erro ao carregar assinaturas das empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, planFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newPlanId) return;
    setSubmittingChange(true);

    try {
      await api.put(`/platform/companies/${selectedSub.companyId}/subscription`, {
        newPlanId,
        reason: changeReason,
      });
      showFeedback('success', 'Plano da empresa alterado com sucesso!');
      setChangePlanModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao alterar plano da empresa.');
    } finally {
      setSubmittingChange(false);
    }
  };

  const handleRenew = async () => {
    if (!selectedSub) return;
    setSubmittingRenew(true);

    try {
      await api.post(`/platform/companies/${selectedSub.companyId}/subscription/renew`, {
        monthsToAdd,
      });
      showFeedback('success', `Assinatura renovada por mais ${monthsToAdd} mês(es)!`);
      setRenewModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao renovar assinatura.');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedSub) return;
    if (!cancelReason.trim()) {
      alert('Informe o motivo do cancelamento.');
      return;
    }
    setSubmittingCancel(true);

    try {
      await api.post(`/platform/companies/${selectedSub.companyId}/subscription/cancel`, {
        reason: cancelReason,
      });
      showFeedback('success', 'Assinatura cancelada com sucesso.');
      setCancelModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao cancelar assinatura.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleSetTrial = async () => {
    if (!selectedSub) return;
    setSubmittingTrial(true);

    try {
      await api.post(`/platform/companies/${selectedSub.companyId}/subscription/trial`, {
        days: trialDays,
      });
      showFeedback('success', `Período de teste configurado para ${trialDays} dias!`);
      setTrialModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao configurar período de teste.');
    } finally {
      setSubmittingTrial(false);
    }
  };

  const handleOpenHistory = async (sub: Subscription) => {
    setSelectedSub(sub);
    setHistoryModalOpen(true);
    setLoadingHistory(true);

    try {
      const res = await api.get<{ history: SubscriptionHistory[] }>(`/platform/companies/${sub.companyId}/subscription`);
      setHistoryList(res.history || []);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao carregar histórico da assinatura.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return <Badge variant="success">Ativa</Badge>;
      case 'EM_TESTE':
        return <Badge variant="warning">Em Teste (Trial)</Badge>;
      case 'EXPIRADA':
        return <Badge variant="danger">Expirada</Badge>;
      case 'CANCELADA':
        return <Badge variant="default">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Gestão de Assinaturas das Empresas"
        description="Monitore a situação contratual de cada empresa, renove períodos, defina testes e execute upgrades ou downgrades de planos."
        actions={
          <Link href="/super-admin/plans">
            <Button variant="outline" className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Ver Todos os Planos
            </Button>
          </Link>
        }
      />

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Buscar por empresa, nome fantasia ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os Planos</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>

            <select
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVA">Ativa</option>
              <option value="EM_TESTE">Em Teste (Trial)</option>
              <option value="EXPIRADA">Expirada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>

            <Button type="submit" variant="primary" className="bg-purple-600 text-xs">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Assinaturas */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Nenhuma assinatura encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Plano Contratado</th>
                    <th className="px-4 py-3">Valor / Período</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Vencimento / Renovação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <Link href={`/super-admin/companies/${sub.companyId}`} className="hover:text-purple-600 hover:underline">
                          {sub.company?.name || 'Empresa não identificada'}
                        </Link>
                        {sub.company?.cnpj && (
                          <span className="block text-[10px] font-mono text-slate-400 font-normal">
                            CNPJ: {formatCNPJ(sub.company.cnpj)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {sub.plan?.name || '—'}
                        </span>
                        <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                          {sub.plan?.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrencyBRL(sub.price)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {sub.periodicity === 'ANUAL' ? 'Cobrança Anual' : 'Cobrança Mensal'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(sub.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {sub.endDate ? (
                          <>
                            <span className="font-medium">
                              {new Date(sub.endDate).toLocaleDateString('pt-BR')}
                            </span>
                            {new Date() > new Date(sub.endDate) && sub.status !== 'CANCELADA' && (
                              <span className="block text-[10px] text-rose-500 font-semibold">
                                Vencida
                              </span>
                            )}
                          </>
                        ) : (
                          'Indeterminado'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Trocar Plano */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-purple-600 hover:bg-purple-50"
                            onClick={() => {
                              setSelectedSub(sub);
                              setNewPlanId(sub.planId);
                              setChangeReason('');
                              setChangePlanModalOpen(true);
                            }}
                            title="Trocar Plano (Upgrade / Downgrade)"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Plano
                          </Button>

                          {/* Renovar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-emerald-600 hover:bg-emerald-50"
                            onClick={() => {
                              setSelectedSub(sub);
                              setMonthsToAdd(sub.periodicity === 'ANUAL' ? 12 : 1);
                              setRenewModalOpen(true);
                            }}
                            title="Renovar Assinatura"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Renovar
                          </Button>

                          {/* Histórico */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-slate-500 hover:bg-slate-100"
                            onClick={() => handleOpenHistory(sub)}
                            title="Ver Histórico de Alterações"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>

                          {/* Mais ações: Cancelar / Trial */}
                          {sub.status !== 'CANCELADA' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] text-rose-500 hover:bg-rose-50"
                              onClick={() => {
                                setSelectedSub(sub);
                                setCancelReason('');
                                setCancelModalOpen(true);
                              }}
                              title="Cancelar Assinatura"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Página {page} de {totalPages} ({total} assinaturas)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Trocar Plano */}
      {changePlanModalOpen && selectedSub && (
        <Modal
          isOpen={changePlanModalOpen}
          onClose={() => setChangePlanModalOpen(false)}
          title={`Alterar Plano de ${selectedSub.company?.name || 'Empresa'}`}
        >
          <form onSubmit={handleChangePlan} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Selecione o Novo Plano *
              </label>
              <select
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {formatCurrencyBRL(p.monthlyPrice)}/mês • Até {p.maxEmployees} colabs
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Motivo / Justificativa da Alteração
              </label>
              <textarea
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex.: Solicitação de upgrade comercial para inclusão do módulo de folha..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300">
              <p className="font-semibold">Regra de Transição:</p>
              <p className="text-[11px] mt-0.5">
                Em downgrades, nenhum dado existente (colaboradores ou documentos) será excluído. Se a empresa estiver acima dos limites do novo plano, novas adições serão impedidas até a regularização.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setChangePlanModalOpen(false)} disabled={submittingChange}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white" isLoading={submittingChange}>
                Confirmar Alteração
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Renovar Assinatura */}
      {renewModalOpen && selectedSub && (
        <Modal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          title={`Renovar Assinatura: ${selectedSub.company?.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              A renovação estenderá a validade da assinatura a partir da data de vencimento atual (ou a partir de hoje caso já esteja vencida).
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Período a Adicionar (Meses)
              </label>
              <select
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={monthsToAdd}
                onChange={(e) => setMonthsToAdd(parseInt(e.target.value))}
              >
                <option value={1}>+ 1 Mês (Renovação Mensal Padrão)</option>
                <option value={3}>+ 3 Meses (Trimestral)</option>
                <option value={6}>+ 6 Meses (Semestral)</option>
                <option value={12}>+ 12 Meses (Anual)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRenewModalOpen(false)} disabled={submittingRenew}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleRenew} isLoading={submittingRenew}>
                Confirmar Renovação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cancelar Assinatura */}
      {cancelModalOpen && selectedSub && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title={`Cancelar Assinatura: ${selectedSub.company?.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ao cancelar a assinatura, os usuários e colaboradores desta empresa terão o acesso aos módulos operacionais do sistema bloqueados.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Justificativa do Cancelamento *
              </label>
              <textarea
                rows={3}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ex.: Solicitação de encerramento pelo cliente, inadimplência contínua..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCancelModalOpen(false)} disabled={submittingCancel}>
                Voltar
              </Button>
              <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" onClick={handleCancel} isLoading={submittingCancel}>
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Histórico de Alterações */}
      {historyModalOpen && selectedSub && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Histórico da Assinatura: ${selectedSub.company?.name}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {loadingHistory ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : historyList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum evento registrado no histórico.</p>
            ) : (
              <div className="space-y-3">
                {historyList.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        {h.action.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Plano: <strong>{h.planName}</strong></span>
                      <span>Status: <strong className="text-purple-600">{h.newStatus}</strong></span>
                      <span>Valor: <strong>{formatCurrencyBRL(h.price)}</strong></span>
                    </div>

                    {h.reason && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        &ldquo;{h.reason}&rdquo;
                      </p>
                    )}

                    {h.performedByName && (
                      <p className="text-[10px] text-slate-400">
                        Executado por: {h.performedByName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setHistoryModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
