'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  User,
  MessageSquare,
  Filter,
  Eye,
  Loader2,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { TimeAdjustmentRequest, RequestStatus } from '@pontuarh/shared';

export default function AdminAdjustmentsPage() {
  const [requests, setRequests] = useState<TimeAdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = statusFilter !== 'TODOS' ? `/adjustments?status=${statusFilter}` : '/adjustments';
      const res = await api.get<TimeAdjustmentRequest[]>(url);
      setRequests(res || []);
    } catch (err: any) {
      console.error('Erro ao listar solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const openReviewModal = async (req: TimeAdjustmentRequest) => {
    setErrorMsg(null);
    setDecisionNotes(req.decisionNotes || '');
    setReviewModalOpen(true);
    setLoadingDetails(true);
    try {
      const details = await api.get<any>(`/adjustments/${req.id}`);
      setSelectedRequestDetails(details);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar detalhes da ocorrência.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDecision = async (status: RequestStatus) => {
    if (!selectedRequestDetails?.request) return;
    setErrorMsg(null);

    if (status === RequestStatus.RECUSADA && !decisionNotes.trim()) {
      setErrorMsg('É obrigatório preencher a justificativa da recusa.');
      return;
    }

    try {
      setIsDeciding(true);
      await api.patch(`/adjustments/${selectedRequestDetails.request.id}/decision`, {
        status,
        decisionNotes,
      });

      setReviewModalOpen(false);
      await fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar decisão.');
    } finally {
      setIsDeciding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADA':
      case 'APROVADO':
        return <Badge variant="success">Aprovada</Badge>;
      case 'RECUSADA':
      case 'RECUSADO':
        return <Badge variant="danger">Recusada</Badge>;
      case 'EM_ANALISE':
        return <Badge variant="info">Em Análise</Badge>;
      case 'AGUARDANDO_INFORMACOES':
        return <Badge variant="warning">Aguardando Informações</Badge>;
      case 'CANCELADA':
      case 'CANCELADO':
        return <Badge variant="default">Cancelada</Badge>;
      default:
        return <Badge variant="warning">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Solicitações e Ajustes de Ponto"
        description="Análise e deliberação de ocorrências, justificativas de ausências e inclusões de marcações solicitadas pela equipe."
      />

      {/* Alerta de Preservação e Imutabilidade */}
      <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex items-start gap-3">
        <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Princípio da Imutabilidade das Marcações Brutas (Portaria MTP nº 671/2021)
          </p>
          <p className="mt-0.5">
            Ao aprovar uma solicitação, o sistema registra o tratamento legal correspondente sem jamais sobrescrever ou excluir as marcações originais. Toda decisão é registrada em trilha de auditoria inviolável.
          </p>
        </div>
      </div>

      {/* Filtros de Status */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filtrar por Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {['TODOS', 'PENDENTE', 'EM_ANALISE', 'AGUARDANDO_INFORMACOES', 'APROVADA', 'RECUSADA'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    statusFilter === st
                      ? 'bg-brand-primary text-white border-brand-primary font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {st === 'TODOS' ? 'Todos' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {requests.length} solicitação(ões) encontrada(s)
          </span>
        </CardContent>
      </Card>

      {/* Lista de Solicitações */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-brand-primary" />
              Carregando solicitações...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p>Nenhuma solicitação encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-3">Data Ocorrência</th>
                  <th className="py-3 px-3">Tipo / Evento</th>
                  <th className="py-3 px-3">Horário Solicitado</th>
                  <th className="py-3 px-4">Justificativa</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {req.employee?.fullName || 'Colaborador'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          CPF: {req.employee?.cpf}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {new Date(req.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {req.type}
                      </span>
                      {req.entryType && (
                        <span className="block text-[10px] text-brand-primary font-mono">
                          {req.entryType}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {req.proposedTime || '—'}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400" title={req.justification}>
                      {req.justification}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewModal(req)}
                        className="text-xs py-1 px-3 flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Analisar</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal de Análise e Deliberação */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Análise de Solicitação de Ajuste de Ponto"
        description="Avaliação das marcações originais do dia e decisão com parecer auditável"
      >
        {loadingDetails ? (
          <div className="py-8 flex justify-center text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-primary" />
            Carregando dados comparativos do dia...
          </div>
        ) : selectedRequestDetails ? (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Dados do Colaborador e da Solicitação */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Colaborador:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedRequestDetails.request.employee.fullName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data da Ocorrência:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedRequestDetails.request.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo / Motivo:</span>
                <span className="font-semibold text-brand-primary">{selectedRequestDetails.request.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horário Solicitado:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedRequestDetails.request.proposedTime || 'N/A'} ({selectedRequestDetails.request.entryType || 'Não especificado'})
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Justificativa do Colaborador:</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                  &quot;{selectedRequestDetails.request.justification}&quot;
                </p>
              </div>
            </div>

            {/* Comparativo: Marcações Originais Registradas no Dia */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-primary" />
                <span>Marcações Brutas Registradas pelo Colaborador na Data:</span>
              </p>

              {selectedRequestDetails.originalDayEntries.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
                  Nenhuma marcação bruta registrada no servidor para esta data (Falta ou Ausência Integral).
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  {selectedRequestDetails.originalDayEntries.map((punch: any, idx: number) => (
                    <span
                      key={punch.id}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      {new Date(punch.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({punch.type})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Parecer / Notas da Decisão */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parecer do Gestor / Justificativa (Obrigatório em caso de Indeferimento) *
              </label>
              <textarea
                rows={2}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Insira suas observações formais ou a justificativa legal em caso de indeferimento..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeciding}
                onClick={() => handleDecision(RequestStatus.AGUARDANDO_INFORMACOES)}
                className="text-xs"
              >
                Solicitar Informações
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isDeciding}
                onClick={() => handleDecision(RequestStatus.EM_ANALISE)}
                className="text-xs"
              >
                Em Análise
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isDeciding}
                onClick={() => handleDecision(RequestStatus.RECUSADA)}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                <span>Indeferir</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isDeciding}
                onClick={() => handleDecision(RequestStatus.APROVADA)}
                className="text-xs ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>{isDeciding ? 'Processando...' : 'Aprovar Ajuste (Deferir)'}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
