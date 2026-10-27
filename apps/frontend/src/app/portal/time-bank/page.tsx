'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  FileText,
  ShieldCheck,
  Loader2,
  Trash2,
  HelpCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import {
  EmployeeTimeBankSummary,
  TimeBankTransaction,
  TimeBankCompensationRequest,
  TimeBankCompensationType,
  TimeBankCompensationStatus,
} from '@pontuarh/shared';

export default function PortalTimeBankPage() {
  const [summary, setSummary] = useState<EmployeeTimeBankSummary | null>(null);
  const [transactions, setTransactions] = useState<TimeBankTransaction[]>([]);
  const [compensations, setCompensations] = useState<TimeBankCompensationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro do extrato
  const [activeTab, setActiveTab] = useState<'extrato' | 'solicitacoes'>('extrato');
  const [txFilter, setTxFilter] = useState<'TODOS' | 'CREDITO' | 'DEBITO' | 'COMPENSACAO'>('TODOS');

  // Modal de solicitação de compensação
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compType, setCompType] = useState<string>(TimeBankCompensationType.FOLGA_INTEGRAL);
  const [compDate, setCompDate] = useState('');
  const [compHours, setCompHours] = useState('');
  const [compJustification, setCompJustification] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, txRes, compRes] = await Promise.all([
        api.get<EmployeeTimeBankSummary>('/time-bank/balances/my'),
        api.get<TimeBankTransaction[]>('/time-bank/transactions'),
        api.get<TimeBankCompensationRequest[]>('/time-bank/compensations'),
      ]);
      setSummary(sumRes);
      setTransactions(txRes || []);
      setCompensations(compRes || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados do portal do banco de horas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function formatMinutes(totalMinutes: number): string {
    const isNeg = totalMinutes < 0;
    const abs = Math.abs(Math.round(totalMinutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return isNeg ? `-${str}` : `+${str}`;
  }

  // Filtragem de transações
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter === 'CREDITO') return ['CREDITO', 'AJUSTE_CREDITO'].includes(tx.type);
      if (txFilter === 'DEBITO') return ['DEBITO', 'AJUSTE_DEBITO'].includes(tx.type);
      if (txFilter === 'COMPENSACAO') return tx.type === 'COMPENSACAO';
      return true;
    });
  }, [transactions, txFilter]);

  // Envio de nova solicitação de compensação
  const handleCreateCompensation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const minutes = Math.round(parseFloat(compHours) * 60);
    if (isNaN(minutes) || minutes <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Informe uma quantidade válida de horas (ex: 2.0 ou 8.0).' });
      return;
    }

    if (summary && summary.availableBalanceMinutes < minutes) {
      setFeedbackMsg({
        type: 'error',
        text: `Saldo disponível insuficiente (${summary.availableBalanceFormatted}). Você solicitou ${formatMinutes(minutes)}.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/time-bank/compensations', {
        type: compType,
        date: compDate,
        durationMinutes: minutes,
        justification: compJustification.trim(),
        idempotencyKey: `comp-my-${Date.now()}`,
      });

      setFeedbackMsg({
        type: 'success',
        text: 'Solicitação de compensação enviada com sucesso! As horas foram reservadas preventivamente até a análise do gestor.',
      });
      setModalOpen(false);
      setCompDate('');
      setCompHours('');
      setCompJustification('');
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao enviar solicitação.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar solicitação própria
  const handleCancelRequest = async (id: string) => {
    try {
      await api.post(`/time-bank/compensations/${id}/cancel`, {});
      setFeedbackMsg({ type: 'success', text: 'Solicitação cancelada e saldo reservado liberado.' });
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao cancelar solicitação.' });
    }
  };

  const isPositive = (summary?.currentBalanceMinutes || 0) > 0;
  const isNegative = (summary?.currentBalanceMinutes || 0) < 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-brand-primary dark:text-blue-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            Meu Banco de Horas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe seus créditos acumulados, débitos, horas compensadas e faça novas solicitações de folga.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Solicitar Compensação
        </Button>
      </div>

      {/* Alerta de Feedback */}
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

      {/* CARD PRINCIPAL DE SALDO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-blue-950/20 shadow-xs relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Saldo Atual Acumulado
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                {summary?.policy?.name || 'Acordo Individual Semestral'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-baseline gap-4 sm:gap-6">
              <h2
                className={`text-5xl font-black font-mono tracking-tight ${
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isNegative
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {loading ? '—:—' : summary?.currentBalanceFormatted || '+00:00'}
              </h2>
              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  Saldo Disponível para Compensar:{' '}
                  <strong className="font-mono text-slate-900 dark:text-white text-sm">
                    {summary?.availableBalanceFormatted || '+00:00'}
                  </strong>
                </p>
                {summary && summary.reservedMinutes > 0 && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    ({summary.reservedFormatted} retidos preventivamente em solicitações pendentes)
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Créditos Acumulados</span>
                <span className="text-emerald-600 font-mono font-bold text-sm">
                  +{summary ? formatMinutes(summary.accumulatedCreditMinutes).replace('+', '') : '00:00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Compensações Realizadas</span>
                <span className="text-amber-600 font-mono font-bold text-sm">
                  {summary ? formatMinutes(summary.compensatedMinutes) : '00:00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Horas Liquidadas/Pagas</span>
                <span className="text-purple-600 font-mono font-bold text-sm">
                  {summary ? formatMinutes(summary.paidMinutes) : '00:00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Informativo de Legislação e Regras */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              Regras do Acordo de Banco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <p>
              • <strong>CLT Art. 59 § 5º:</strong> Compensação em até 6 meses mediante acordo individual escrito.
            </p>
            <p>
              • <strong>Limite Diário:</strong> Máximo de 2 horas extras por dia de trabalho.
            </p>
            <p>
              • <strong>Feriados e DSRs:</strong> Trabalho em feriados não compensados é pago com adicional legal.
            </p>
            <p>
              • <strong>Prevenção de Duplo Uso:</strong> Ao solicitar folga, o saldo correspondente fica reservado até a decisão do gestor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navegação de Abas do Colaborador */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('extrato')}
          className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'extrato'
              ? 'border-brand-primary text-brand-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          Extrato Detalhado do Ledger
        </button>

        <button
          onClick={() => setActiveTab('solicitacoes')}
          className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'solicitacoes'
              ? 'border-brand-primary text-brand-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Minhas Solicitações de Folga/Compensação
          {compensations.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {compensations.length}
            </span>
          )}
        </button>
      </div>

      {/* ABA: EXTRATO DETALHADO */}
      {activeTab === 'extrato' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrar:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-xs">
              {(['TODOS', 'CREDITO', 'DEBITO', 'COMPENSACAO'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTxFilter(filter)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    txFilter === filter
                      ? 'bg-brand-primary text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {filter === 'TODOS'
                    ? 'Todas'
                    : filter === 'CREDITO'
                    ? 'Créditos'
                    : filter === 'DEBITO'
                    ? 'Débitos'
                    : 'Compensações'}
                </button>
              ))}
            </div>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Operação</th>
                    <th className="py-3 px-4 text-right">Quantidade</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-primary" />
                        Carregando extrato...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma movimentação no período.
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
                            isReversed ? 'opacity-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                            {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
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
                            {isCredit
                              ? `+${formatMinutes(tx.minutes).replace('+', '')}`
                              : `-${formatMinutes(tx.minutes).replace('+', '')}`}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                            {tx.origin}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                            {tx.description || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={isReversed ? 'danger' : 'success'} className="text-[10px]">
                              {tx.status}
                            </Badge>
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

      {/* ABA: MINHAS SOLICITAÇÕES */}
      {activeTab === 'solicitacoes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {compensations.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Você ainda não realizou solicitações de compensação.
              </div>
            ) : (
              compensations.map((c) => {
                const isPending = c.status === TimeBankCompensationStatus.RESERVADA;
                return (
                  <Card key={c.id} className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base text-slate-900 dark:text-white">
                          {c.type.replace('_', ' ')}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Para a data: {new Date(c.date).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          isPending
                            ? 'warning'
                            : c.status === TimeBankCompensationStatus.APROVADA
                            ? 'info'
                            : c.status === TimeBankCompensationStatus.REALIZADA
                            ? 'success'
                            : c.status === TimeBankCompensationStatus.RECUSADA
                            ? 'danger'
                            : 'outline'
                        }
                      >
                        {c.status === 'RESERVADA'
                          ? 'PENDENTE / RESERVADA'
                          : c.status === 'APROVADA'
                          ? 'APROVADA (AGUARDANDO FRUIÇÃO)'
                          : c.status === 'REALIZADA'
                          ? 'REALIZADA'
                          : c.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Horas Solicitadas:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatMinutes(c.durationMinutes)} ({c.durationMinutes} min)
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] mb-0.5">Sua Justificativa:</span>
                        <p className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                          &quot;{c.justification}&quot;
                        </p>
                      </div>

                      {c.decisionNotes && (
                        <div>
                          <span className="text-slate-400 block text-[11px] mb-0.5">Parecer da Gestão:</span>
                          <p className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {c.decisionNotes}
                          </p>
                        </div>
                      )}

                      {(isPending || c.status === TimeBankCompensationStatus.APROVADA) && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelRequest(c.id)}
                            className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {c.status === 'APROVADA' ? 'Cancelar Folha Aprovada' : 'Cancelar Solicitação'}
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

      {/* MODAL: NOVA SOLICITAÇÃO DE COMPENSAÇÃO */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Solicitar Compensação de Banco de Horas"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCompensation} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
            <p className="font-semibold">
              Seu Saldo Disponível:{' '}
              <span className="font-mono">{summary?.availableBalanceFormatted || '+00:00'}</span>
            </p>
            <p className="text-[11px] mt-0.5 opacity-90">
              As horas solicitadas ficarão reservadas preventivamente até a homologação da chefia.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Compensação:
            </label>
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
            >
              <option value={TimeBankCompensationType.FOLGA_INTEGRAL}>Folga Compensatória Integral</option>
              <option value={TimeBankCompensationType.SAIDA_ANTECIPADA}>Saída Antecipada</option>
              <option value={TimeBankCompensationType.ENTRADA_POSTERIOR}>Entrada Posterior</option>
              <option value={TimeBankCompensationType.REDUCAO_JORNADA}>Redução de Jornada Parcial</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Pretendida:
              </label>
              <input
                type="date"
                required
                value={compDate}
                onChange={(e) => setCompDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horas a Compensar (ex: 2.0 ou 8.0):
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                placeholder="Ex: 8.0"
                value={compHours}
                onChange={(e) => setCompHours(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Justificativa:
            </label>
            <textarea
              rows={3}
              required
              value={compJustification}
              onChange={(e) => setCompJustification(e.target.value)}
              placeholder="Descreva a razão da folha/saída antecipada para o seu gestor..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Solicitação'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
