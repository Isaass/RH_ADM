'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  MessageSquare,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { TimeAdjustmentRequest, AdjustmentType, TimeEntryType, RequestStatus } from '@pontuarh/shared';

export default function PortalAdjustmentsPage() {
  const [requests, setRequests] = useState<TimeAdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<string>(AdjustmentType.ESQUECIMENTO);
  const [formEntryType, setFormEntryType] = useState<string>(TimeEntryType.ENTRADA);
  const [formProposedTime, setFormProposedTime] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get<TimeAdjustmentRequest[]>('/adjustments/my-requests');
      setRequests(res || []);
    } catch (err: any) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formDate || !formJustification) {
      setErrorMsg('Informe a data e escreva a justificativa.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/adjustments', {
        date: formDate,
        type: formType,
        entryType: formEntryType,
        proposedTime: formProposedTime || null,
        justification: formJustification,
        attachmentUrl: formAttachmentUrl || null,
      });

      setSuccessMsg('Solicitação enviada com sucesso ao seu gestor!');
      setModalOpen(false);
      // Reset form
      setFormDate('');
      setFormProposedTime('');
      setFormJustification('');
      setFormAttachmentUrl('');
      await fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao enviar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Deseja realmente cancelar esta solicitação de ajuste?')) return;
    try {
      await api.patch(`/adjustments/${id}/cancel`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar solicitação.');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 text-xs font-semibold mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Ajustes & Justificativas — Fase 2</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Minhas Solicitações de Ajuste
          </h1>
          <p className="text-xs text-slate-500">
            Inclusão de marcações esquecidas e envio de justificativas de atrasos ou ausências.
          </p>
        </div>

        <Button
          onClick={() => {
            setErrorMsg(null);
            setModalOpen(true);
          }}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Solicitação</span>
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Lista de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Solicitações</CardTitle>
          <CardDescription>
            Acompanhe a análise das suas ocorrências pelo Gestor de Equipe ou RH.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-primary" />
              Carregando solicitações...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                Você não possui nenhuma solicitação de ajuste registrada.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Caso tenha esquecido de bater o ponto ou precise justificar um atraso, clique em &quot;Nova Solicitação&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(req.status)}
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        Data: {new Date(req.date).toLocaleDateString('pt-BR')}
                      </span>
                      {req.proposedTime && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-medium text-slate-700 dark:text-slate-300">
                          Horário: {req.proposedTime}
                        </span>
                      )}
                      {req.entryType && (
                        <span className="text-[11px] text-brand-primary font-semibold">
                          ({req.entryType})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 pt-1">
                      <strong className="text-slate-500 font-medium">Motivo / Tipo:</strong> {req.type}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-500 font-medium">Justificativa:</strong> {req.justification}
                    </p>

                    {req.decisionNotes && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            Parecer do Gestor / RH:
                          </p>
                          <p className="text-[11px] mt-0.5">{req.decisionNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {req.status === RequestStatus.PENDENTE && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(req.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação de Solicitação de Ajuste */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Solicitar Ajuste de Ponto"
        description="Inclusão de marcação esquecida ou justificativa de ocorrência"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data da Ocorrência *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário Sugerido (HH:MM)
              </label>
              <input
                type="time"
                value={formProposedTime}
                onChange={(e) => setFormProposedTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo da Ocorrência *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value={AdjustmentType.ESQUECIMENTO}>Esquecimento de Marcação</option>
                <option value={AdjustmentType.HORARIO_INCORRETO}>Horário Incorreto</option>
                <option value={AdjustmentType.PROBLEMA_TECNICO}>Problema Técnico / Conexão</option>
                <option value={AdjustmentType.ATESTADO}>Atestado Médico / Declaração</option>
                <option value={AdjustmentType.OUTRO}>Outro Motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo da Batida
              </label>
              <select
                value={formEntryType}
                onChange={(e) => setFormEntryType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value={TimeEntryType.ENTRADA}>Entrada</option>
                <option value={TimeEntryType.INTERVALO_SAIDA}>Saída para Intervalo</option>
                <option value={TimeEntryType.INTERVALO_RETORNO}>Retorno do Intervalo</option>
                <option value={TimeEntryType.SAIDA}>Saída do Expediente</option>
                <option value={TimeEntryType.MARCACAO_ADICIONAL}>Marcação Adicional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Justificativa Detalhada *
            </label>
            <textarea
              required
              rows={3}
              value={formJustification}
              onChange={(e) => setFormJustification(e.target.value)}
              placeholder="Descreva o motivo da solicitação para avaliação do gestor..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Link ou Identificador de Comprovante (Opcional)
            </label>
            <input
              type="text"
              value={formAttachmentUrl}
              onChange={(e) => setFormAttachmentUrl(e.target.value)}
              placeholder="Ex: Atestado Médico Dr. Fulano / Anexo GED"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="w-1/2"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-1/2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar Solicitação</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
