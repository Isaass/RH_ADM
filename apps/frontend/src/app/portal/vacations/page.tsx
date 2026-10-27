'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Palmtree,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Download,
  ShieldCheck,
  Plus,
  Loader2,
  DollarSign,
  HeartPulse,
  FolderOpen,
  CalendarClock,
  Info,
  CalendarDays,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import {
  VacationPeriod,
  VacationRequest,
  EmployeeLeave,
  MedicalCertificate,
  EmployeeDocument,
  VacationRemunerationPreview,
} from '@pontuarh/shared';

export default function PortalVacationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'vacations' | 'request' | 'leaves' | 'certificate' | 'documents'>('vacations');
  const [loading, setLoading] = useState(true);

  // Dados do Colaborador
  const [periods, setPeriods] = useState<VacationPeriod[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);

  // Formulário de Solicitação de Férias
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [reqStartDate, setReqStartDate] = useState('');
  const [reqEndDate, setReqEndDate] = useState('');
  const [reqDaysCount, setReqDaysCount] = useState<number>(15);
  const [reqSellDays, setReqSellDays] = useState<number>(0);
  const [reqAdvance13th, setReqAdvance13th] = useState(false);
  const [reqNotes, setReqNotes] = useState('');
  const [isSubmittingVacation, setIsSubmittingVacation] = useState(false);

  // Prévia de Remuneração em Tempo Real
  const [previewRemuneration, setPreviewRemuneration] = useState<VacationRemunerationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Formulário de Atestado Médico
  const [certStartDate, setCertStartDate] = useState('');
  const [certDaysOff, setCertDaysOff] = useState(1);
  const [certDoctorName, setCertDoctorName] = useState('');
  const [certDoctorCrm, setCertDoctorCrm] = useState('');
  const [certCid, setCertCid] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [isSubmittingCert, setIsSubmittingCert] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Carregar dados do colaborador
  const loadPortalData = async () => {
    try {
      setLoading(true);
      const [periodsRes, requestsRes, leavesRes, certsRes, docsRes] = await Promise.allSettled([
        api.get<VacationPeriod[]>('/vacations/periods'),
        api.get<VacationRequest[]>('/vacations/requests'),
        api.get<EmployeeLeave[]>('/leaves'),
        api.get<MedicalCertificate[]>('/medical-certificates'),
        api.get<EmployeeDocument[]>('/documents'),
      ]);

      if (periodsRes.status === 'fulfilled') {
        setPeriods(periodsRes.value);
        if (periodsRes.value.length > 0 && !selectedPeriodId) {
          // Seleciona o primeiro período com saldo disponível
          const availablePeriod = periodsRes.value.find((p) => p.daysRemaining > 0) || periodsRes.value[0];
          setSelectedPeriodId(availablePeriod.id);
        }
      }
      if (requestsRes.status === 'fulfilled') setRequests(requestsRes.value);
      if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value);
      if (certsRes.status === 'fulfilled') setCertificates(certsRes.value);
      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value);
    } catch (err: any) {
      showFeedback('error', 'Erro ao carregar seus dados de férias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Calcular automaticamente a data final quando a data inicial ou número de dias mudar
  useEffect(() => {
    if (reqStartDate && reqDaysCount > 0) {
      const [y, m, d] = reqStartDate.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d));
      // Data final inclusive = start + (daysCount - 1) dias
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + (reqDaysCount - 1));
      setReqEndDate(end.toISOString().split('T')[0]);
    }
  }, [reqStartDate, reqDaysCount]);

  // Atualizar prévia de remuneração em tempo real
  useEffect(() => {
    const fetchPreview = async () => {
      if (!reqDaysCount || reqDaysCount <= 0) return;
      try {
        setLoadingPreview(true);
        const data = await api.get<VacationRemunerationPreview>(
          `/vacations/remuneration-preview?daysCount=${reqDaysCount}&sellDays=${reqSellDays}&advance13th=${reqAdvance13th}`
        );
        setPreviewRemuneration(data);
      } catch (err) {
        setPreviewRemuneration(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [reqDaysCount, reqSellDays, reqAdvance13th]);

  // Submeter Solicitação de Férias
  const handleRequestVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId || !reqStartDate || !reqEndDate || !reqDaysCount) {
      showFeedback('error', 'Preencha todos os campos da solicitação.');
      return;
    }

    try {
      setIsSubmittingVacation(true);
      await api.post('/vacations/requests', {
        vacationPeriodId: selectedPeriodId,
        startDate: reqStartDate,
        endDate: reqEndDate,
        daysCount: Number(reqDaysCount),
        sellDays: Number(reqSellDays || 0),
        advance13th: reqAdvance13th,
        employeeNotes: reqNotes.trim() || undefined,
      });

      showFeedback('success', 'Solicitação de férias enviada com sucesso para análise do gestor/RH!');
      setReqNotes('');
      setActiveTab('vacations');
      await loadPortalData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao enviar solicitação de férias.');
    } finally {
      setIsSubmittingVacation(false);
    }
  };

  // Cancelar Solicitação de Férias
  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Deseja realmente cancelar esta solicitação de férias?')) return;
    try {
      await api.post(`/vacations/requests/${requestId}/cancel`, {
        reason: 'Cancelado pelo próprio colaborador no portal.',
      });
      showFeedback('success', 'Solicitação de férias cancelada.');
      await loadPortalData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao cancelar férias.');
    }
  };

  // Enviar Atestado Médico
  const handleSubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certStartDate || !certDaysOff || certDaysOff <= 0) {
      showFeedback('error', 'Informe a data inicial e a quantidade de dias de repouso.');
      return;
    }

    try {
      setIsSubmittingCert(true);

      let documentBase64: string | undefined = undefined;
      let fileName: string | undefined = undefined;

      if (certFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(certFile);
        documentBase64 = await base64Promise;
        fileName = certFile.name;
      }

      await api.post('/medical-certificates', {
        startDate: certStartDate,
        daysOff: Number(certDaysOff),
        doctorName: certDoctorName.trim() || undefined,
        doctorCrm: certDoctorCrm.trim() || undefined,
        cidCode: certCid.trim() || undefined,
        fileName,
        documentBase64,
      });

      showFeedback('success', 'Atestado médico enviado com sucesso para homologação do RH!');
      setCertStartDate('');
      setCertDaysOff(1);
      setCertDoctorName('');
      setCertDoctorCrm('');
      setCertCid('');
      setCertFile(null);
      setActiveTab('certificate');
      await loadPortalData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao enviar atestado médico.');
    } finally {
      setIsSubmittingCert(false);
    }
  };

  // Download de Documento
  const handleDownloadDoc = async (doc: EmployeeDocument) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pontuarh_token') : '';
      const response = await fetch(`http://localhost:3001/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Não foi possível baixar o documento.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao baixar arquivo.');
    }
  };

  // Período com saldo atual
  const activePeriod = periods.find((p) => p.daysRemaining > 0) || periods[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all animate-in slide-in-from-top duration-300 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Minhas Férias, Afastamentos & Documentos"
        description="Consulte seus períodos aquisitivos, simule a remuneração de férias, envie atestados e consulte recibos."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setActiveTab('request')}
              className="gap-2 bg-brand-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar Férias</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('certificate')}
              className="gap-2"
            >
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>Enviar Atestado</span>
            </Button>
          </div>
        }
      />

      {/* Card de Resumo do Saldo de Férias */}
      {activePeriod && (
        <Card className="bg-gradient-to-tr from-brand-primary/10 via-blue-500/5 to-transparent border-brand-primary/20">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Palmtree className="w-5 h-5 text-brand-primary" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Período Aquisitivo Vigente
                  </span>
                  <Badge variant="info" className="text-[10px]">
                    {activePeriod.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Aquisitivo: <b>{new Date(activePeriod.startDate).toLocaleDateString('pt-BR')} a {new Date(activePeriod.endDate).toLocaleDateString('pt-BR')}</b> • Limite para Gozo (CLT): <b>{new Date(activePeriod.concessiveEndDate).toLocaleDateString('pt-BR')}</b>
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Adquiridos</span>
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                    {activePeriod.daysAcquired}d
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Usufruídos</span>
                  <span className="text-xl font-bold text-slate-500">
                    {activePeriod.daysUsed}d
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Vendidos</span>
                  <span className="text-xl font-bold text-slate-500">
                    {activePeriod.daysSold}d
                  </span>
                </div>
                <div className="text-center pl-3 border-l border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-brand-primary block uppercase font-bold">Disponíveis</span>
                  <span className="text-2xl font-black text-brand-primary">
                    {activePeriod.daysRemaining}d
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('vacations')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'vacations'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>Minhas Férias</span>
        </button>

        <button
          onClick={() => setActiveTab('request')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'request'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Solicitar Férias</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'leaves'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Meus Afastamentos</span>
        </button>

        <button
          onClick={() => setActiveTab('certificate')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'certificate'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Enviar Atestado</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'documents'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Meus Documentos</span>
        </button>
      </div>

      {/* TAB 1: MINHAS FÉRIAS & HISTÓRICO */}
      {activeTab === 'vacations' && (
        <div className="space-y-6">
          {/* Solicitações em Aberto e Programadas */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base font-semibold">Minhas Programações e Solicitações</CardTitle>
              <CardDescription className="text-xs">
                Acompanhe o andamento das solicitações de férias e o calendário aprovado.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span>Carregando solicitações...</span>
                </div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Você ainda não possui solicitações de férias registradas.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {requests.map((req) => (
                    <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {new Date(req.startDate).toLocaleDateString('pt-BR')} a{' '}
                            {new Date(req.endDate).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs font-bold text-brand-primary">({req.daysCount} dias)</span>
                          <Badge
                            variant={
                              req.status === 'APROVADA' || req.status === 'PROGRAMADA'
                                ? 'info'
                                : req.status === 'EM_GOZO'
                                ? 'success'
                                : req.status === 'RECUSADA' || req.status === 'CANCELADA'
                                ? 'danger'
                                : 'warning'
                            }
                            className="text-[10px]"
                          >
                            {req.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Fracionamento: {req.fractionNumber}º período</span>
                          {req.sellDays > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              • Abono Pecuniário: {req.sellDays} dias
                            </span>
                          )}
                          {req.advance13th && <span>• 1ª Parcela do 13º Adiantada</span>}
                        </div>

                        {req.decisionNotes && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg mt-1">
                            Parecer do RH: {req.decisionNotes}
                          </div>
                        )}
                      </div>

                      {['PENDENTE', 'EM_ANALISE', 'APROVADA', 'PROGRAMADA'].includes(req.status) && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Períodos Aquisitivos */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base font-semibold">Histórico dos Períodos Contratuais</CardTitle>
              <CardDescription className="text-xs">
                Acompanhamento completo de períodos aquisitivos gerados conforme seu tempo de serviço.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Período Aquisitivo</th>
                      <th className="py-2.5 px-3">Limite Concessivo</th>
                      <th className="py-2.5 px-2 text-center">Adquiridos</th>
                      <th className="py-2.5 px-2 text-center">Usufruídos</th>
                      <th className="py-2.5 px-2 text-center">Vendidos</th>
                      <th className="py-2.5 px-2 text-center font-bold text-brand-primary">Saldo</th>
                      <th className="py-2.5 px-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {periods.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono">
                          {new Date(p.startDate).toLocaleDateString('pt-BR')} a{' '}
                          {new Date(p.endDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {new Date(p.concessiveEndDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-2 text-center">{p.daysAcquired}d</td>
                        <td className="py-3 px-2 text-center">{p.daysUsed}d</td>
                        <td className="py-3 px-2 text-center">{p.daysSold}d</td>
                        <td className="py-3 px-2 text-center font-bold text-brand-primary">{p.daysRemaining}d</td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              p.status === 'TOTALMENTE_USUFRUIDO'
                                ? 'success'
                                : p.status === 'PROGRAMADO'
                                ? 'info'
                                : p.status === 'VENCIDO'
                                ? 'danger'
                                : 'default'
                            }
                            className="text-[10px]"
                          >
                            {p.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SOLICITAR FÉRIAS COM PRÉVIA DE REMUNERAÇÃO */}
      {activeTab === 'request' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="md:col-span-2">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                <CardTitle className="text-base font-semibold">Nova Solicitação de Férias</CardTitle>
                <CardDescription className="text-xs">
                  Respeite as regras da CLT: fracionamento em até 3 períodos, um com no mínimo 14 dias e nenhum menor que 5 dias. Início vedado nos 2 dias antes de DSR/feriado.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleRequestVacation} className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Período Aquisitivo de Direito *
                    </label>
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => setSelectedPeriodId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
                    >
                      {periods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {new Date(p.startDate).toLocaleDateString('pt-BR')} a{' '}
                          {new Date(p.endDate).toLocaleDateString('pt-BR')} — Saldo: {p.daysRemaining} dias disponíveis
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Data de Início *
                      </label>
                      <input
                        type="date"
                        required
                        value={reqStartDate}
                        onChange={(e) => setReqStartDate(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Dias de Férias *
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        required
                        value={reqDaysCount}
                        onChange={(e) => setReqDaysCount(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Data Final (Calculada)
                      </label>
                      <input
                        type="date"
                        disabled
                        value={reqEndDate}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Abono Pecuniário (Venda de até 10 dias)
                      </label>
                      <select
                        value={reqSellDays}
                        onChange={(e) => setReqSellDays(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
                      >
                        <option value={0}>Não desejo vender dias</option>
                        <option value={5}>Converter 5 dias em abono</option>
                        <option value={10}>Converter 10 dias em abono (1/3 CLT 143)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="advance13th"
                        checked={reqAdvance13th}
                        onChange={(e) => setReqAdvance13th(e.target.checked)}
                        className="rounded text-brand-primary focus:ring-brand-primary"
                      />
                      <label htmlFor="advance13th" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        Solicitar adiantamento da 1ª parcela do 13º salário
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Observações ou Justificativa (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={reqNotes}
                      onChange={(e) => setReqNotes(e.target.value)}
                      placeholder="Ex: Viagem programada em família..."
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmittingVacation || !reqStartDate}
                      className="w-full bg-brand-primary py-2.5 font-semibold text-sm"
                    >
                      {isSubmittingVacation ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Enviar Solicitação de Férias'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Card de Simulação e Prévia Financeira */}
          <div>
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-slate-50/50 dark:bg-slate-900/40">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <CardTitle className="text-sm font-semibold">Simulador de Remuneração</CardTitle>
                </div>
                <CardDescription className="text-[11px]">
                  Prévia preliminar bruta com adicional de 1/3 e abono pecuniário.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {loadingPreview ? (
                  <div className="p-6 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>Calculando prévia bruta...</span>
                  </div>
                ) : previewRemuneration ? (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500">Dias de Gozo ({previewRemuneration.vacationDays}d):</span>
                      <span className="font-mono font-medium">
                        R$ {previewRemuneration.vacationPay.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500">1/3 Constitucional (CLT):</span>
                      <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        + R$ {previewRemuneration.constitutionalThird.toFixed(2)}
                      </span>
                    </div>

                    {previewRemuneration.sellDays > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Abono Pecuniário ({previewRemuneration.sellDays}d + 1/3):</span>
                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          + R$ {(previewRemuneration.abonoPay + previewRemuneration.abonoThird).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 text-sm font-bold text-slate-900 dark:text-white">
                      <span>Estimativa Total Bruta:</span>
                      <span className="font-mono text-brand-primary">
                        R$ {previewRemuneration.totalGrossPreview.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 mt-3 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{previewRemuneration.legalNotice}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-4">
                    Informe os dias desejados para visualizar a estimativa financeira preliminar.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: MEUS AFASTAMENTOS */}
      {activeTab === 'leaves' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-base font-semibold">Meus Afastamentos e Licenças</CardTitle>
            <CardDescription className="text-xs">
              Histórico de afastamentos previdenciários, licenças legais e previsões de retorno.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {leaves.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Você não possui histórico de afastamentos ou licenças.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.map((l) => (
                  <div key={l.id} className="p-4 flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {l.type.replace(/_/g, ' ')}
                        </span>
                        <Badge
                          variant={l.status === 'ATIVO' ? 'danger' : l.status === 'CONCLUIDO' ? 'success' : 'default'}
                          className="text-[10px]"
                        >
                          {l.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Início: {new Date(l.startDate).toLocaleDateString('pt-BR')} • Previsão de Retorno:{' '}
                        {l.expectedReturnDate
                          ? new Date(l.expectedReturnDate).toLocaleDateString('pt-BR')
                          : l.endDate
                          ? new Date(l.endDate).toLocaleDateString('pt-BR')
                          : 'Em aberto'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 italic">&ldquo;{l.reason}&rdquo;</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ENVIAR ATESTADO MÉDICO */}
      {activeTab === 'certificate' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base font-semibold">Envio de Atestado Médico</CardTitle>
              <CardDescription className="text-xs">
                Justifique ausências de saúde anexando a declaração médica oficial.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmitCertificate} className="space-y-3.5 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Data de Início *</label>
                    <input
                      type="date"
                      required
                      value={certStartDate}
                      onChange={(e) => setCertStartDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Dias de Repouso *</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      value={certDaysOff}
                      onChange={(e) => setCertDaysOff(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nome do Médico</label>
                    <input
                      type="text"
                      placeholder="Dr. Exemplo"
                      value={certDoctorName}
                      onChange={(e) => setCertDoctorName(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">CRM / Estado</label>
                    <input
                      type="text"
                      placeholder="12345/SP"
                      value={certDoctorCrm}
                      onChange={(e) => setCertDoctorCrm(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    CID-10 (Opcional - Requer consentimento expresso)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: J06.9"
                    value={certCid}
                    onChange={(e) => setCertCid(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Foto ou PDF do Atestado *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <b>Sigilo LGPD:</b> Suas informações médicas são protegidas e acessíveis apenas pelo departamento de Recursos Humanos e Medicina do Trabalho autorizada.
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingCert || !certStartDate}
                  className="w-full bg-brand-primary"
                >
                  {isSubmittingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Atestado'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Atestados Enviados */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base font-semibold">Atestados Enviados</CardTitle>
              <CardDescription className="text-xs">
                Acompanhe o parecer de homologação do departamento de RH.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {certificates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Nenhum atestado enviado anteriormente.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {certificates.map((c) => (
                    <div key={c.id} className="p-4 space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {c.daysOff} dias a partir de {new Date(c.startDate).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge
                          variant={c.status === 'APROVADO' ? 'success' : c.status === 'RECUSADO' ? 'danger' : 'warning'}
                          className="text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.doctorName ? `Médico: ${c.doctorName}` : 'Profissional não especificado'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: MEUS DOCUMENTOS */}
      {activeTab === 'documents' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-base font-semibold">Prontuário Digital & Documentos</CardTitle>
            <CardDescription className="text-xs">
              Acesse e baixe com segurança seus contratos, avisos e recibos de férias arquivados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum documento disponível para download no seu prontuário.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-brand-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-900 dark:text-white">{doc.fileName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{doc.category.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDoc(doc)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
