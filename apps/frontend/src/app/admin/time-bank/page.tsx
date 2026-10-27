'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Search,
  Filter,
  Plus,
  FileText,
  RotateCcw,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Eye,
  Loader2,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import {
  TimeBankPolicy,
  TimeBankTransaction,
  TimeBankCompensationRequest,
  EmployeeTimeBankSummary,
  TimeBankCompensationStatus,
  TimeBankOperation,
} from '@pontuarh/shared';

export default function AdminTimeBankPage() {
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger' | 'compensations' | 'policies' | 'payroll'>('balances');
  const [loading, setLoading] = useState(true);

  // Dados
  const [balances, setBalances] = useState<EmployeeTimeBankSummary[]>([]);
  const [transactions, setTransactions] = useState<TimeBankTransaction[]>([]);
  const [compensations, setCompensations] = useState<TimeBankCompensationRequest[]>([]);
  const [policies, setPolicies] = useState<TimeBankPolicy[]>([]);

  // Filtros
  const [searchEmployee, setSearchEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'POSITIVO' | 'NEGATIVO' | 'ZERADO' | 'EXPIRANDO' | 'VENCIDO'>('TODOS');
  const [txTypeFilter, setTxTypeFilter] = useState('TODOS');
  const [compStatusFilter, setCompStatusFilter] = useState('TODOS');

  // Modais
  const [extratoModalOpen, setExtratoModalOpen] = useState(false);
  const [selectedEmployeeExtrato, setSelectedEmployeeExtrato] = useState<EmployeeTimeBankSummary | null>(null);
  const [employeeTransactions, setEmployeeTransactions] = useState<TimeBankTransaction[]>([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedTxForReversal, setSelectedTxForReversal] = useState<TimeBankTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedCompForDecision, setSelectedCompForDecision] = useState<TimeBankCompensationRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'APROVADA' | 'RECUSADA'>('APROVADA');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Liquidação para folha
  const [payrollEmployeeId, setPayrollEmployeeId] = useState('');
  const [payrollHours, setPayrollHours] = useState('');
  const [payrollCompetence, setPayrollCompetence] = useState('2026-10');
  const [payrollDescription, setPayrollDescription] = useState('');
  const [isSubmittingPayroll, setIsSubmittingPayroll] = useState(false);

  // Nova política form state
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyPeriodMonths, setNewPolicyPeriodMonths] = useState(6);
  const [newPolicyMaxDailyCredit, setNewPolicyMaxDailyCredit] = useState(120);
  const [newPolicyMaxNegative, setNewPolicyMaxNegative] = useState(2400);
  const [newPolicyAllowNegative, setNewPolicyAllowNegative] = useState(true);
  const [newPolicyCreditRate, setNewPolicyCreditRate] = useState(1.0);
  const [newPolicyExpiryAction, setNewPolicyExpiryAction] = useState('PAGAR_FOLHA');
  const [newPolicyIsDefault, setNewPolicyIsDefault] = useState(false);
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregamento de dados
  const loadData = async () => {
    try {
      setLoading(true);
      const [balancesRes, txRes, compRes, polRes] = await Promise.allSettled([
        api.get<EmployeeTimeBankSummary[]>('/time-bank/balances'),
        api.get<TimeBankTransaction[]>('/time-bank/transactions'),
        api.get<TimeBankCompensationRequest[]>('/time-bank/compensations'),
        api.get<TimeBankPolicy[]>('/time-bank/policies'),
      ]);
      if (balancesRes.status === 'fulfilled') setBalances(balancesRes.value || []);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value || []);
      if (compRes.status === 'fulfilled') setCompensations(compRes.value || []);
      if (polRes.status === 'fulfilled') setPolicies(polRes.value || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados do banco de horas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Métricas Globais
  const metrics = useMemo(() => {
    const totalPositiveMins = balances
      .filter((b) => b.currentBalanceMinutes > 0)
      .reduce((acc, b) => acc + b.currentBalanceMinutes, 0);

    const totalNegativeMins = balances
      .filter((b) => b.currentBalanceMinutes < 0)
      .reduce((acc, b) => acc + Math.abs(b.currentBalanceMinutes), 0);

    const netTotalMins = totalPositiveMins - totalNegativeMins;
    const positiveCount = balances.filter((b) => b.currentBalanceMinutes > 0).length;
    const negativeCount = balances.filter((b) => b.currentBalanceMinutes < 0).length;

    const pendingCompensations = compensations.filter(
      (c) => c.status === TimeBankCompensationStatus.RESERVADA
    ).length;

    const totalPaidMinutes = transactions
      .filter((t) => t.type === 'TRANSFERENCIA_PAGAMENTO' && t.status === 'CONSOLIDADO')
      .reduce((acc, t) => acc + t.minutes, 0);

    return {
      netTotalFormatted: formatMinutesToHours(netTotalMins),
      positiveCount,
      negativeCount,
      pendingCompensations,
      totalPaidHoursFormatted: formatMinutesToHours(totalPaidMinutes),
    };
  }, [balances, compensations, transactions]);

  function formatMinutesToHours(mins: number): string {
    const isNeg = mins < 0;
    const abs = Math.abs(Math.round(mins));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return isNeg ? `-${str}` : `+${str}`;
  }

  // Filtragem de saldos
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matchSearch =
        !searchEmployee ||
        b.employee.fullName?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        b.employee.cpf?.includes(searchEmployee) ||
        b.employee.registrationNumber?.toLowerCase().includes(searchEmployee.toLowerCase());

      let matchStatus = true;
      if (statusFilter === 'POSITIVO') matchStatus = b.currentBalanceMinutes > 0;
      if (statusFilter === 'NEGATIVO') matchStatus = b.currentBalanceMinutes < 0;
      if (statusFilter === 'ZERADO') matchStatus = b.currentBalanceMinutes === 0;
      if (statusFilter === 'EXPIRANDO') matchStatus = Boolean(b.isExpiringSoon);
      if (statusFilter === 'VENCIDO') matchStatus = Boolean(b.isExpired);

      return matchSearch && matchStatus;
    });
  }, [balances, searchEmployee, statusFilter]);

  // Filtragem de transações do ledger
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txTypeFilter !== 'TODOS' && tx.type !== txTypeFilter) return false;
      return true;
    });
  }, [transactions, txTypeFilter]);

  // Filtragem de compensações
  const filteredCompensations = useMemo(() => {
    return compensations.filter((c) => {
      if (compStatusFilter !== 'TODOS' && c.status !== compStatusFilter) return false;
      return true;
    });
  }, [compensations, compStatusFilter]);

  // Abrir modal de extrato individual
  const handleOpenExtrato = async (summary: EmployeeTimeBankSummary) => {
    setSelectedEmployeeExtrato(summary);
    setExtratoModalOpen(true);
    setLoadingExtrato(true);
    try {
      const res = await api.get<TimeBankTransaction[]>(`/time-bank/transactions?employeeId=${summary.employeeId}`);
      setEmployeeTransactions(res || []);
    } catch (err) {
      console.error('Erro ao buscar extrato do colaborador:', err);
    } finally {
      setLoadingExtrato(false);
    }
  };

  // Enviar estorno de movimentação
  const handleConfirmReversal = async () => {
    if (!selectedTxForReversal) return;
    if (!reversalReason.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe a justificativa para o estorno.' });
      return;
    }

    try {
      setIsSubmittingReversal(true);
      await api.post(`/time-bank/transactions/${selectedTxForReversal.id}/reverse`, {
        reason: reversalReason.trim(),
      });
      setFeedbackMsg({ type: 'success', text: 'Movimentação estornada com sucesso no ledger.' });
      setReversalModalOpen(false);
      setSelectedTxForReversal(null);
      setReversalReason('');
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao estornar movimentação.' });
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  // Enviar decisão de compensação
  const handleConfirmDecision = async () => {
    if (!selectedCompForDecision) return;
    if (decisionType === 'RECUSADA' && !decisionNotes.trim()) {
      setFeedbackMsg({ type: 'error', text: 'É obrigatório informar a justificativa da recusa.' });
      return;
    }

    try {
      setIsSubmittingDecision(true);
      await api.post(`/time-bank/compensations/${selectedCompForDecision.id}/decide`, {
        status: decisionType,
        decisionNotes: decisionNotes.trim(),
      });
      setFeedbackMsg({
        type: 'success',
        text: `Solicitação ${decisionType === 'APROVADA' ? 'aprovada' : 'recusada'} com sucesso!`,
      });
      setDecisionModalOpen(false);
      setSelectedCompForDecision(null);
      setDecisionNotes('');
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao processar decisão.' });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Confirmar realização da compensação
  const handleRealizeCompensation = async (reqId: string) => {
    try {
      await api.post(`/time-bank/compensations/${reqId}/realize`, {});
      setFeedbackMsg({
        type: 'success',
        text: 'Compensação confirmada como realizada com sucesso! Débito consolidado no ledger.',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao confirmar realização da compensação.' });
    }
  };

  // Cancelar folha previamente aprovada
  const handleCancelApprovedCompensation = async (reqId: string) => {
    const reason = window.prompt('Informe o motivo do cancelamento desta compensação aprovada:');
    if (!reason || !reason.trim()) return;

    try {
      await api.post(`/time-bank/compensations/${reqId}/cancel`, { reason: reason.trim() });
      setFeedbackMsg({
        type: 'success',
        text: 'Compensação cancelada com sucesso! Reserva de saldo liberada.',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao cancelar compensação.' });
    }
  };

  // Enviar liquidação para folha
  const handleConfirmPayrollTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollEmployeeId) {
      setFeedbackMsg({ type: 'error', text: 'Selecione um colaborador com saldo positivo.' });
      return;
    }
    const mins = Math.round(parseFloat(payrollHours) * 60);
    if (isNaN(mins) || mins <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Informe uma quantidade válida de horas maior que zero.' });
      return;
    }

    try {
      setIsSubmittingPayroll(true);
      await api.post('/time-bank/transfer-payroll', {
        employeeId: payrollEmployeeId,
        minutes: mins,
        competence: payrollCompetence,
        description: payrollDescription.trim() || undefined,
      });
      setFeedbackMsg({
        type: 'success',
        text: `Transferência de ${payrollHours}h para a folha (${payrollCompetence}) consolidada com sucesso no ledger!`,
      });
      setPayrollHours('');
      setPayrollDescription('');
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro na transferência para a folha.' });
    } finally {
      setIsSubmittingPayroll(false);
    }
  };

  // Criar nova política
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'O nome da política é obrigatório.' });
      return;
    }

    try {
      setIsSubmittingPolicy(true);
      await api.post('/time-bank/policies', {
        name: newPolicyName.trim(),
        periodMonths: Number(newPolicyPeriodMonths),
        maxDailyCreditMinutes: Number(newPolicyMaxDailyCredit),
        maxNegativeBalanceMinutes: Number(newPolicyMaxNegative),
        allowNegativeBalance: newPolicyAllowNegative,
        creditRate: Number(newPolicyCreditRate),
        expiryAction: newPolicyExpiryAction,
        isDefault: newPolicyIsDefault,
      });
      setFeedbackMsg({ type: 'success', text: 'Política de Banco de Horas cadastrada com sucesso!' });
      setPolicyModalOpen(false);
      setNewPolicyName('');
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao criar política.' });
    } finally {
      setIsSubmittingPolicy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banco de Horas & Compensações"
        description="Módulo transacional de ledger, apuração de créditos e débitos, compensações e liquidação para folha."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success" className="px-3 py-1 font-semibold text-xs">
              FASE 3 — ENTREGUE
            </Badge>
            <Button
              variant="outline"
              onClick={() => setPolicyModalOpen(true)}
              className="flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nova Política
            </Button>
          </div>
        }
      />

      {/* Alertas de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards de Métricas do Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-brand-primary dark:bg-blue-950/50 dark:text-blue-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldo Líquido Total</p>
              <h3 className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                {metrics.netTotalFormatted}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldos Positivos</p>
              <h3 className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {metrics.positiveCount} colab.
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldos Negativos</p>
              <h3 className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                {metrics.negativeCount} colab.
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compensações Pendentes</p>
              <h3 className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {metrics.pendingCompensations}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Horas Pagas (Folha)</p>
              <h3 className="text-xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
                {metrics.totalPaidHoursFormatted}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-4">
        {[
          { key: 'balances', label: 'Saldos por Colaborador', icon: Users },
          { key: 'ledger', label: 'Livro de Movimentações (Ledger)', icon: FileText },
          { key: 'compensations', label: 'Solicitações de Compensação', icon: ArrowRightLeft },
          { key: 'policies', label: 'Políticas & Acordos', icon: ShieldCheck },
          { key: 'payroll', label: 'Transferência para Folha', icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-brand-primary text-brand-primary font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ABA 1: SALDOS POR COLABORADOR */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por colaborador, CPF..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500">Situação:</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-xs">
                {(['TODOS', 'POSITIVO', 'NEGATIVO', 'ZERADO', 'EXPIRANDO', 'VENCIDO'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      statusFilter === st
                        ? 'bg-brand-primary text-white font-medium shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {st === 'TODOS'
                      ? 'Todos'
                      : st === 'POSITIVO'
                      ? 'Positivos'
                      : st === 'NEGATIVO'
                      ? 'Negativos'
                      : st === 'ZERADO'
                      ? 'Zerados'
                      : st === 'EXPIRANDO'
                      ? 'Expirando'
                      : 'Vencidos (RH)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4">Política Vigente</th>
                    <th className="py-3 px-4 text-right">Saldo Atual</th>
                    <th className="py-3 px-4 text-right">Reservado</th>
                    <th className="py-3 px-4 text-right">Disponível Líquido</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
                        Carregando saldos do banco de horas...
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Nenhum colaborador encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((b) => {
                      const isPositive = b.currentBalanceMinutes > 0;
                      const isNegative = b.currentBalanceMinutes < 0;

                      return (
                        <tr
                          key={b.employeeId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {b.employee.fullName}
                              </p>
                              <p className="text-slate-400 text-xs">
                                CPF: {b.employee.cpf} {b.employee.registrationNumber && `• Matrícula: ${b.employee.registrationNumber}`}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {b.employee.department?.name || 'Geral'}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                {b.policy?.name || 'Padrão CLT (6 meses)'}
                              </span>
                              {b.isExpired && (
                                <Badge variant="danger" className="text-[10px] mt-1 block">
                                  VENCIDO (ANÁLISE RH)
                                </Badge>
                              )}
                              {b.isExpiringSoon && !b.isExpired && (
                                <Badge variant="warning" className="text-[10px] mt-1 block">
                                  EXPIRA EM {b.daysUntilExpiry}D
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span
                              className={
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isNegative
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500'
                              }
                            >
                              {b.currentBalanceFormatted}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                            {b.reservedMinutes > 0 ? b.reservedFormatted : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {b.availableBalanceFormatted}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenExtrato(b)}
                                className="h-8 text-xs flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Extrato
                              </Button>
                              {b.currentBalanceMinutes > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setPayrollEmployeeId(b.employeeId);
                                    setActiveTab('payroll');
                                  }}
                                  className="h-8 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                                >
                                  Pagar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ABA 2: LIVRO DE MOVIMENTAÇÕES (LEDGER) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Filtrar Operação:</span>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="TODOS">Todas as Operações</option>
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
                <option value="AJUSTE_CREDITO">Ajuste de Crédito</option>
                <option value="AJUSTE_DEBITO">Ajuste de Débito</option>
                <option value="COMPENSACAO">Compensação</option>
                <option value="TRANSFERENCIA_PAGAMENTO">Pagamento em Folha</option>
                <option value="ESTORNO">Estornos</option>
              </select>
            </div>

            <p className="text-xs text-slate-400">
              Total de lançamentos no livro: <span className="font-semibold">{filteredTransactions.length}</span>
            </p>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Quantidade</th>
                    <th className="py-3 px-4">Origem / Competência</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nenhuma movimentação registrada no livro.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isCredit = ['CREDITO', 'AJUSTE_CREDITO'].includes(tx.type);
                      const isReversed = tx.status === 'ESTORNADO';

                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                            isReversed ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                            {new Date(tx.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                            {tx.employee?.fullName || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                isCredit
                                  ? 'success'
                                  : tx.type === 'COMPENSACAO'
                                  ? 'warning'
                                  : tx.type === 'TRANSFERENCIA_PAGAMENTO'
                                  ? 'default'
                                  : tx.type === 'ESTORNO'
                                  ? 'danger'
                                  : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {tx.type}
                            </Badge>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              isCredit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isCredit ? `+${formatMinutesToHours(tx.minutes).replace('+', '')}` : `-${formatMinutesToHours(tx.minutes).replace('+', '')}`}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-medium">{tx.origin}</span>
                            <span className="text-slate-400 ml-1.5">({tx.competence})</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate" title={tx.description || ''}>
                            {tx.description || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isReversed ? (
                              <Badge variant="danger" className="text-[10px]">
                                ESTORNADO
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px]">
                                CONSOLIDADO
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {!isReversed && tx.type !== 'ESTORNO' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTxForReversal(tx);
                                  setReversalModalOpen(true);
                                }}
                                className="h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                Estornar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ABA 3: SOLICITAÇÕES DE COMPENSAÇÃO */}
      {activeTab === 'compensations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Situação:</span>
              <select
                value={compStatusFilter}
                onChange={(e) => setCompStatusFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="TODOS">Todas</option>
                <option value="RESERVADA">Pendentes de Análise (Reservadas)</option>
                <option value="APROVADA">Aprovadas (Aguardando Realização)</option>
                <option value="REALIZADA">Realizadas (Débito no Ledger)</option>
                <option value="RECUSADA">Recusadas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCompensations.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Nenhuma solicitação de compensação registrada.
              </div>
            ) : (
              filteredCompensations.map((comp) => {
                const isPending = comp.status === TimeBankCompensationStatus.RESERVADA;
                const isApproved = comp.status === TimeBankCompensationStatus.APROVADA;
                const isRealized = comp.status === TimeBankCompensationStatus.REALIZADA;

                return (
                  <Card
                    key={comp.id}
                    className="border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base text-slate-900 dark:text-white">
                          {comp.employee?.fullName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {comp.employee?.department?.name || 'Geral'} • Solicitado em{' '}
                          {new Date(comp.createdAt).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          isPending
                            ? 'warning'
                            : isApproved
                            ? 'info'
                            : isRealized
                            ? 'success'
                            : comp.status === TimeBankCompensationStatus.RECUSADA
                            ? 'danger'
                            : 'outline'
                        }
                      >
                        {comp.status === 'RESERVADA'
                          ? 'PENDENTE / RESERVADA'
                          : comp.status === 'APROVADA'
                          ? 'APROVADA (AGUARDANDO FRUIÇÃO)'
                          : comp.status === 'REALIZADA'
                          ? 'REALIZADA (CONSOLIDADA)'
                          : comp.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Tipo de Compensação:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {comp.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Data Pretendida:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(comp.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Duração a Debitar:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                            {formatMinutesToHours(comp.durationMinutes)} ({comp.durationMinutes} min)
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] mb-0.5">Justificativa do Colaborador:</span>
                        <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                          &quot;{comp.justification}&quot;
                        </p>
                      </div>

                      {comp.decisionNotes && (
                        <div>
                          <span className="text-slate-400 block text-[11px] mb-0.5">Parecer da Decisão:</span>
                          <p className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs">
                            {comp.decisionNotes}
                          </p>
                        </div>
                      )}

                      {/* Ações quando RESERVADA (Pendente) */}
                      {isPending && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            size="sm"
                            variant="success"
                            className="flex-1 text-xs"
                            onClick={() => {
                              setSelectedCompForDecision(comp);
                              setDecisionType('APROVADA');
                              setDecisionNotes('');
                              setDecisionModalOpen(true);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => {
                              setSelectedCompForDecision(comp);
                              setDecisionType('RECUSADA');
                              setDecisionNotes('');
                              setDecisionModalOpen(true);
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Recusar
                          </Button>
                        </div>
                      )}

                      {/* Ações quando APROVADA (Aguardando Realização) */}
                      {isApproved && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            size="sm"
                            variant="success"
                            className="flex-1 text-xs"
                            onClick={() => handleRealizeCompensation(comp.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Confirmar Realização
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => handleCancelApprovedCompensation(comp.id)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancelar Folha
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 4: POLÍTICAS DE BANCO DE HORAS */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((pol) => (
              <Card key={pol.id} className="border border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-900 dark:text-white">{pol.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Vigência: {pol.periodMonths} meses • CLT Art. 59
                    </CardDescription>
                  </div>
                  {pol.isDefault && (
                    <Badge variant="success" className="text-[10px]">
                      Padrão Empresa
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Máx. Crédito/Dia:</span>
                      <span className="font-semibold">{pol.maxDailyCreditMinutes} min (2h)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Saldo Negativo:</span>
                      <span className="font-semibold">
                        {pol.allowNegativeBalance ? `Até ${pol.maxNegativeBalanceMinutes / 60}h` : 'Bloqueado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Fator de Crédito:</span>
                      <span className="font-semibold">{pol.creditRate}x (1:1)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ao Vencer:</span>
                      <span className="font-semibold">{pol.expiryAction}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {pol.employeesCount || 0} colaborador(es) vinculado(s) a este regulamento.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ABA 5: TRANSFERÊNCIA PARA FOLHA DE PAGAMENTO */}
      {activeTab === 'payroll' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                Liquidação de Horas do Banco para Pagamento
              </CardTitle>
              <CardDescription>
                Selecione um colaborador com saldo positivo acumulado para encaminhar as horas à competência de folha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmPayrollTransfer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Colaborador Elegível:
                  </label>
                  <select
                    value={payrollEmployeeId}
                    onChange={(e) => setPayrollEmployeeId(e.target.value)}
                    required
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">Selecione um colaborador...</option>
                    {balances
                      .filter((b) => b.availableBalanceMinutes > 0)
                      .map((b) => (
                        <option key={b.employeeId} value={b.employeeId}>
                          {b.employee.fullName} • Saldo Disponível: {b.availableBalanceFormatted}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Horas a Liquidar (ex: 2.5):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      placeholder="Ex: 8.0"
                      value={payrollHours}
                      onChange={(e) => setPayrollHours(e.target.value)}
                      className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Competência da Folha (AAAA-MM):
                    </label>
                    <input
                      type="text"
                      required
                      value={payrollCompetence}
                      onChange={(e) => setPayrollCompetence(e.target.value)}
                      placeholder="2026-10"
                      className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Justificativa / Observação Contábil:
                  </label>
                  <textarea
                    rows={2}
                    value={payrollDescription}
                    onChange={(e) => setPayrollDescription(e.target.value)}
                    placeholder="Ex: Liquidação de saldo acumulado no fechamento de acordo coletivo..."
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingPayroll}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 shadow-sm"
                >
                  {isSubmittingPayroll ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Confirmar Liquidação no Ledger'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: EXTRATO INDIVIDUAL */}
      <Modal
        isOpen={extratoModalOpen}
        onClose={() => setExtratoModalOpen(false)}
        title={`Extrato de Banco de Horas — ${selectedEmployeeExtrato?.employee.fullName || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <div>
              <span className="text-xs text-slate-400 block">Saldo Atual</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {selectedEmployeeExtrato?.currentBalanceFormatted}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Reservado</span>
              <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                {selectedEmployeeExtrato?.reservedFormatted}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Disponível</span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {selectedEmployeeExtrato?.availableBalanceFormatted}
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingExtrato ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-primary" />
                Buscando movimentações...
              </div>
            ) : employeeTransactions.length === 0 ? (
              <div className="py-8 text-center text-slate-400">Nenhuma movimentação registrada no histórico.</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                    <th className="py-2 text-left">Data</th>
                    <th className="py-2 text-left">Operação</th>
                    <th className="py-2 text-right">Minutos</th>
                    <th className="py-2 text-left pl-3">Origem</th>
                    <th className="py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employeeTransactions.map((tx) => {
                    const isCredit = ['CREDITO', 'AJUSTE_CREDITO'].includes(tx.type);
                    return (
                      <tr key={tx.id} className="py-2">
                        <td className="py-2 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2 font-medium">{tx.type}</td>
                        <td
                          className={`py-2 text-right font-mono font-bold ${
                            isCredit ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isCredit ? `+${formatMinutesToHours(tx.minutes).replace('+', '')}` : `-${formatMinutesToHours(tx.minutes).replace('+', '')}`}
                        </td>
                        <td className="py-2 pl-3 text-slate-500">{tx.origin}</td>
                        <td className="py-2">
                          <Badge variant={tx.status === 'CONSOLIDADO' ? 'success' : 'danger'} className="text-[9px]">
                            {tx.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL: ESTORNO DE MOVIMENTAÇÃO */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title="Estornar Movimentação do Ledger"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Você está prestes a estornar a movimentação{' '}
            <strong className="text-slate-900 dark:text-white">#{selectedTxForReversal?.id}</strong> (
            {selectedTxForReversal?.type} de {selectedTxForReversal && formatMinutesToHours(selectedTxForReversal.minutes)}
            ). O histórico original será preservado e um registro compensatório será gerado.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Justificativa do Estorno (obrigatória):
            </label>
            <textarea
              rows={3}
              required
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Descreva o motivo do estorno desta movimentação..."
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setReversalModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isSubmittingReversal}
              onClick={handleConfirmReversal}
            >
              {isSubmittingReversal ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Estorno'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DECISÃO DE COMPENSAÇÃO */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={`Decisão de Compensação — ${decisionType === 'APROVADA' ? 'Aprovação' : 'Recusa'}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Colaborador:{' '}
            <strong className="text-slate-900 dark:text-white">{selectedCompForDecision?.employee?.fullName}</strong> •{' '}
            {selectedCompForDecision && formatMinutesToHours(selectedCompForDecision.durationMinutes)} em{' '}
            {selectedCompForDecision && new Date(selectedCompForDecision.date).toLocaleDateString('pt-BR')}.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {decisionType === 'APROVADA' ? 'Observações (Opcional):' : 'Motivo da Recusa (Obrigatório):'}
            </label>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder={
                decisionType === 'APROVADA'
                  ? 'Notas para o colaborador sobre a aprovação...'
                  : 'Informe a razão de a compensação não poder ser concedida nesta data...'
              }
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDecisionModalOpen(false)}>
              Voltar
            </Button>
            <Button
              variant={decisionType === 'APROVADA' ? 'success' : 'danger'}
              size="sm"
              disabled={isSubmittingDecision}
              onClick={handleConfirmDecision}
            >
              {isSubmittingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirmar ${decisionType}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: NOVA POLÍTICA */}
      <Modal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title="Cadastrar Política de Banco de Horas"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Política:
            </label>
            <input
              type="text"
              required
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
              placeholder="Ex: Acordo Individual 2026 (Semestral)"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Período de Compensação (Meses):
              </label>
              <select
                value={newPolicyPeriodMonths}
                onChange={(e) => setNewPolicyPeriodMonths(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value={6}>6 Meses (Acordo Individual - CLT Art. 59 § 5º)</option>
                <option value={12}>12 Meses (Convenção Coletiva - CLT Art. 59 § 2º)</option>
                <option value={1}>1 Mês (Compensação Mensal - CLT Art. 59 § 6º)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Máximo de Horas Extras/Dia (Minutos):
              </label>
              <input
                type="number"
                value={newPolicyMaxDailyCredit}
                onChange={(e) => setNewPolicyMaxDailyCredit(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">120 min = 2 horas (CLT Art. 59)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Permitir Saldo Negativo:
              </label>
              <select
                value={newPolicyAllowNegative ? 'SIM' : 'NAO'}
                onChange={(e) => setNewPolicyAllowNegative(e.target.value === 'SIM')}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="SIM">Sim, permitir débitos acumulados</option>
                <option value="NAO">Não, bloquear débitos sem saldo prévio</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ao Final do Período (Expiração):
              </label>
              <select
                value={newPolicyExpiryAction}
                onChange={(e) => setNewPolicyExpiryAction(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="PAGAR_FOLHA">Pagar saldo positivo em folha (com adicional)</option>
                <option value="EXPIRAR">Expirar</option>
                <option value="ACUMULAR">Acumular para próximo período</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefaultPolicy"
              checked={newPolicyIsDefault}
              onChange={(e) => setNewPolicyIsDefault(e.target.checked)}
              className="rounded text-brand-primary"
            />
            <label htmlFor="isDefaultPolicy" className="text-slate-700 dark:text-slate-300 font-medium">
              Definir como política padrão para novos colaboradores da empresa
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setPolicyModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmittingPolicy}>
              {isSubmittingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Política'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
