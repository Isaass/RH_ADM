'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Palmtree,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Download,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Loader2,
  Info,
  CalendarClock,
  HeartPulse,
  FolderOpen,
  ChevronRight,
  TrendingDown,
  UserCheck,
  FileCheck,
  AlertCircle,
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
  VacationDashboardMetrics,
  UserRole,
} from '@pontuarh/shared';

export default function AdminVacationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'leaves' | 'certificates' | 'documents'>('overview');
  const [loading, setLoading] = useState(true);

  // Dados principais
  const [metrics, setMetrics] = useState<VacationDashboardMetrics>({
    employeesOnVacationCount: 0,
    scheduledVacationsCount: 0,
    expiringVacationsCount: 0,
    pendingRequestsCount: 0,
    activeLeavesCount: 0,
    pendingCertificatesCount: 0,
  });

  const [overviewEmployees, setOverviewEmployees] = useState<any[]>([]);
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Filtros
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('TODOS');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('TODOS');
  const [docCategoryFilter, setDocCategoryFilter] = useState('TODOS');

  // Modais de Férias
  const [periodsModalOpen, setPeriodsModalOpen] = useState(false);
  const [selectedEmployeePeriods, setSelectedEmployeePeriods] = useState<any>(null);
  const [employeePeriodsList, setEmployeePeriodsList] = useState<VacationPeriod[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedReqForDecision, setSelectedReqForDecision] = useState<VacationRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'APROVADA' | 'RECUSADA'>('APROVADA');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Modal de Afastamento
  const [newLeaveModalOpen, setNewLeaveModalOpen] = useState(false);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('DOENCA_ATE_15D');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveExpectedReturn, setLeaveExpectedReturn] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveCid, setLeaveCid] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const [endLeaveModalOpen, setEndLeaveModalOpen] = useState(false);
  const [selectedLeaveForEnd, setSelectedLeaveForEnd] = useState<EmployeeLeave | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState('');
  const [endLeaveNotes, setEndLeaveNotes] = useState('');
  const [isSubmittingEndLeave, setIsSubmittingEndLeave] = useState(false);

  // Modal de Atestados
  const [certDecisionModalOpen, setCertDecisionModalOpen] = useState(false);
  const [selectedCertForDecision, setSelectedCertForDecision] = useState<MedicalCertificate | null>(null);
  const [certDecisionType, setCertDecisionType] = useState<'APROVADO' | 'RECUSADO'>('APROVADO');
  const [certDecisionNotes, setCertDecisionNotes] = useState('');
  const [isSubmittingCertDecision, setIsSubmittingCertDecision] = useState(false);

  // Modal de Documentos
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [docEmployeeId, setDocEmployeeId] = useState('');
  const [docCategory, setDocCategory] = useState('DOCUMENTO_ADMISSIONAL');
  const [docDescription, setDocDescription] = useState('');
  const [docIsConfidential, setDocIsConfidential] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Carregar dados gerais
  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, requestsRes, leavesRes, certsRes, docsRes, deptRes] = await Promise.allSettled([
        api.get<any>('/vacations/overview'),
        api.get<VacationRequest[]>('/vacations/requests'),
        api.get<EmployeeLeave[]>('/leaves'),
        api.get<MedicalCertificate[]>('/medical-certificates'),
        api.get<EmployeeDocument[]>('/documents'),
        api.get<any[]>('/departments'),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setMetrics(overviewRes.value.metrics || {});
        setOverviewEmployees(overviewRes.value.employees || []);
      }
      if (requestsRes.status === 'fulfilled') setVacationRequests(requestsRes.value);
      if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value);
      if (certsRes.status === 'fulfilled') setCertificates(certsRes.value);
      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value);
    } catch (err: any) {
      showFeedback('error', 'Erro ao carregar dados do módulo de férias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sincronizar períodos aquisitivos de todos os colaboradores
  const handleSyncPeriods = async () => {
    try {
      setLoading(true);
      await api.post('/vacations/periods/sync', {});
      showFeedback('success', 'Períodos aquisitivos sincronizados com base na data de admissão e CLT.');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao sincronizar períodos.');
    } finally {
      setLoading(false);
    }
  };

  // Abrir períodos de um colaborador
  const handleOpenPeriods = async (emp: any) => {
    setSelectedEmployeePeriods(emp);
    setPeriodsModalOpen(true);
    setLoadingPeriods(true);
    try {
      const data = await api.get<VacationPeriod[]>(`/vacations/periods?employeeId=${emp.id}`);
      setEmployeePeriodsList(data);
    } catch (err: any) {
      showFeedback('error', 'Erro ao carregar períodos aquisitivos.');
    } finally {
      setLoadingPeriods(false);
    }
  };

  // Decisão de Férias (Aprovar / Recusar)
  const handleDecideVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForDecision) return;

    if (decisionType === 'RECUSADA' && !decisionNotes.trim()) {
      showFeedback('error', 'Informe a justificativa da recusa.');
      return;
    }

    try {
      setIsSubmittingDecision(true);
      await api.post(`/vacations/requests/${selectedReqForDecision.id}/decide`, {
        status: decisionType,
        decisionNotes: decisionNotes.trim() || undefined,
      });

      showFeedback(
        'success',
        decisionType === 'APROVADA'
          ? 'Solicitação de férias aprovada com sucesso! Dias deduzidos e período agendado.'
          : 'Solicitação de férias recusada.'
      );
      setDecisionModalOpen(false);
      setSelectedReqForDecision(null);
      setDecisionNotes('');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao processar decisão de férias.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Cancelar Férias
  const handleCancelVacation = async (req: VacationRequest) => {
    if (!confirm(`Deseja realmente cancelar as férias de ${req.employee?.fullName}? Os dias serão estornados ao período aquisitivo.`)) {
      return;
    }

    try {
      await api.post(`/vacations/requests/${req.id}/cancel`, {
        reason: 'Cancelamento administrativo realizado pelo RH/Gestor.',
      });
      showFeedback('success', 'Férias canceladas e saldo restituído ao período aquisitivo.');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao cancelar solicitação.');
    }
  };

  // Criar Afastamento
  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployeeId || !leaveStartDate || !leaveReason.trim()) {
      showFeedback('error', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSubmittingLeave(true);
      await api.post('/leaves', {
        employeeId: leaveEmployeeId,
        type: leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate || undefined,
        expectedReturnDate: leaveExpectedReturn || undefined,
        reason: leaveReason.trim(),
        cidCode: leaveCid.trim() || undefined,
      });

      showFeedback('success', 'Afastamento/licença registrado com sucesso!');
      setNewLeaveModalOpen(false);
      setLeaveEmployeeId('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveExpectedReturn('');
      setLeaveReason('');
      setLeaveCid('');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao registrar afastamento.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Encerrar Afastamento com Retorno Efetivo
  const handleEndLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveForEnd || !actualReturnDate) {
      showFeedback('error', 'Informe a data de retorno efetivo.');
      return;
    }

    try {
      setIsSubmittingEndLeave(true);
      await api.patch(`/leaves/${selectedLeaveForEnd.id}/end`, {
        actualReturnDate,
        notes: endLeaveNotes.trim() || undefined,
      });

      showFeedback('success', 'Retorno de afastamento registrado! Situação concluída.');
      setEndLeaveModalOpen(false);
      setSelectedLeaveForEnd(null);
      setActualReturnDate('');
      setEndLeaveNotes('');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao encerrar afastamento.');
    } finally {
      setIsSubmittingEndLeave(false);
    }
  };

  // Deliberar Atestado Médico
  const handleDecideCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertForDecision) return;

    try {
      setIsSubmittingCertDecision(true);
      await api.post(`/medical-certificates/${selectedCertForDecision.id}/decide`, {
        status: certDecisionType,
        notes: certDecisionNotes.trim() || undefined,
      });

      showFeedback(
        'success',
        certDecisionType === 'APROVADO'
          ? 'Atestado médico homologado! Licença gerada e vinculada à jornada.'
          : 'Atestado médico recusado.'
      );
      setCertDecisionModalOpen(false);
      setSelectedCertForDecision(null);
      setCertDecisionNotes('');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao deliberar atestado médico.');
    } finally {
      setIsSubmittingCertDecision(false);
    }
  };

  // Upload de Documento
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docEmployeeId || !docFile) {
      showFeedback('error', 'Selecione o colaborador e o arquivo.');
      return;
    }

    try {
      setIsUploadingDoc(true);

      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(',')[1];
          await api.post('/documents/upload', {
            employeeId: docEmployeeId,
            category: docCategory,
            fileName: docFile.name,
            mimeType: docFile.type || 'application/octet-stream',
            fileBase64: base64Content,
            description: docDescription.trim() || undefined,
            isConfidential: docIsConfidential,
          });

          showFeedback('success', 'Documento arquivado com segurança no repositório!');
          setUploadDocModalOpen(false);
          setDocEmployeeId('');
          setDocFile(null);
          setDocDescription('');
          setDocIsConfidential(false);
          await loadData();
        } catch (err: any) {
          showFeedback('error', err.message || 'Erro no envio do documento.');
        } finally {
          setIsUploadingDoc(false);
        }
      };
      reader.readAsDataURL(docFile);
    } catch (err: any) {
      showFeedback('error', 'Falha ao processar arquivo.');
      setIsUploadingDoc(false);
    }
  };

  // Download seguro de documento
  const handleDownloadDoc = async (doc: EmployeeDocument) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pontuarh_token') : '';
      const response = await fetch(`http://localhost:3001/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Acesso negado ou documento não encontrado.');
      }

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
      showFeedback('error', err.message || 'Erro ao realizar download seguro.');
    }
  };

  // Filtros de colaboradores
  const filteredEmployees = useMemo(() => {
    return overviewEmployees.filter((emp) => {
      const matchSearch =
        !searchEmployee ||
        emp.employee.fullName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        emp.employee.cpf.includes(searchEmployee);

      const matchDept = !selectedDepartment || emp.employee.department === selectedDepartment;
      return matchSearch && matchDept;
    });
  }, [overviewEmployees, searchEmployee, selectedDepartment]);

  // Filtros de solicitações
  const filteredRequests = useMemo(() => {
    return vacationRequests.filter((req) => {
      if (reqStatusFilter !== 'TODOS' && req.status !== reqStatusFilter) return false;
      if (searchEmployee) {
        const name = req.employee?.fullName?.toLowerCase() || '';
        if (!name.includes(searchEmployee.toLowerCase())) return false;
      }
      return true;
    });
  }, [vacationRequests, reqStatusFilter, searchEmployee]);

  // Filtros de afastamentos
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (leaveStatusFilter !== 'TODOS' && l.status !== leaveStatusFilter) return false;
      if (searchEmployee) {
        const name = l.employee?.fullName?.toLowerCase() || '';
        if (!name.includes(searchEmployee.toLowerCase())) return false;
      }
      return true;
    });
  }, [leaves, leaveStatusFilter, searchEmployee]);

  // Filtros de documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (docCategoryFilter !== 'TODOS' && d.category !== docCategoryFilter) return false;
      if (searchEmployee) {
        const name = d.employee?.fullName?.toLowerCase() || '';
        if (!name.includes(searchEmployee.toLowerCase())) return false;
      }
      return true;
    });
  }, [documents, docCategoryFilter, searchEmployee]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all animate-in slide-in-from-top duration-300 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Gestão de Férias, Afastamentos & Documentos"
        description="Acompanhamento legal de períodos aquisitivos, concessivos, atestados e repositório protegido."
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={handleSyncPeriods} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Períodos</span>
            </Button>
            <Button size="sm" onClick={() => setNewLeaveModalOpen(true)} className="gap-2 bg-brand-primary">
              <Plus className="w-4 h-4" />
              <span>Novo Afastamento</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUploadDocModalOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              <span>Anexar Documento</span>
            </Button>
          </div>
        }
      />

      {/* Métricas do Dashboard Administrativo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Em Férias</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Palmtree className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {metrics.employeesOnVacationCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Colaboradores em gozo</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Programadas</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-brand-primary dark:bg-blue-950/50 dark:text-blue-400">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {metrics.scheduledVacationsCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Aprovadas no calendário</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Risco de Dobra</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-2">
              {metrics.expiringVacationsCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Concessivo &lt; 60d (CLT 137)</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Solicitações</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {metrics.pendingRequestsCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Aguardando deliberação</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Afastamentos</span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <HeartPulse className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {metrics.activeLeavesCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Licenças ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Atestados</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {metrics.pendingCertificatesCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Aguardando análise</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palmtree className="w-4 h-4" />
            <span>Períodos & Saldos</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Solicitações de Férias</span>
            {metrics.pendingRequestsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center">
                {metrics.pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'leaves'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Afastamentos & Licenças</span>
            {metrics.activeLeavesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[11px] font-bold flex items-center justify-center">
                {metrics.activeLeavesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'certificates'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Atestados Médicos</span>
            {metrics.pendingCertificatesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center">
                {metrics.pendingCertificatesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'documents'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Repositório Documental</span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador ou CPF..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: PERÍODOS & SALDOS */}
      {activeTab === 'overview' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Acompanhamento dos Períodos Aquisitivos e Concessivos</CardTitle>
              <CardDescription className="text-xs">
                Controle legal em conformidade com os artigos 130 (aquisição) e 134 (concessão) da CLT.
              </CardDescription>
            </div>
            {departments.length > 0 && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="">Todos os Departamentos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Carregando períodos aquisitivos...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Nenhum colaborador encontrado com os filtros informados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-3">Admissão</th>
                      <th className="py-3 px-3">Período Aquisitivo</th>
                      <th className="py-3 px-3">Limite Concessivo</th>
                      <th className="py-3 px-2 text-center">Adquiridos</th>
                      <th className="py-3 px-2 text-center">Usufruídos</th>
                      <th className="py-3 px-2 text-center">Vendidos</th>
                      <th className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-200">Saldo</th>
                      <th className="py-3 px-3 text-center">Situação</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEmployees.map((item) => {
                      const emp = item.employee;
                      const period = item.activePeriod;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white">{emp.fullName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <span>CPF: {emp.cpf}</span>
                              {emp.department && <span>• {emp.department}</span>}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                            {new Date(emp.admissionDate).toLocaleDateString('pt-BR')}
                          </td>

                          <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                            {period ? (
                              <span>
                                {new Date(period.startDate).toLocaleDateString('pt-BR')} a{' '}
                                {new Date(period.endDate).toLocaleDateString('pt-BR')}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-xs">
                            {period ? (
                              <div className="flex items-center gap-1.5">
                                <span className={item.hasExpired ? 'text-rose-500 font-bold' : item.hasExpiringSoon ? 'text-amber-500 font-medium' : 'text-slate-600 dark:text-slate-300'}>
                                  {new Date(period.concessiveEndDate).toLocaleDateString('pt-BR')}
                                </span>
                                {item.hasExpired && (
                                  <Badge variant="danger" className="text-[10px] px-1 py-0">
                                    Dobra CLT
                                  </Badge>
                                )}
                                {item.hasExpiringSoon && (
                                  <Badge variant="warning" className="text-[10px] px-1 py-0">
                                    Vence Breve
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                            {period ? `${period.daysAcquired}d` : '0d'}
                          </td>

                          <td className="py-3 px-2 text-center text-xs text-slate-500">
                            {period ? `${period.daysUsed}d` : '0d'}
                          </td>

                          <td className="py-3 px-2 text-center text-xs text-slate-500">
                            {period ? `${period.daysSold}d` : '0d'}
                          </td>

                          <td className="py-3 px-2 text-center text-xs font-bold text-brand-primary">
                            {period ? `${period.daysRemaining}d` : '0d'}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {period ? (
                              <Badge
                                variant={
                                  period.status === 'TOTALMENTE_USUFRUIDO'
                                    ? 'success'
                                    : period.status === 'PROGRAMADO'
                                    ? 'info'
                                    : period.status === 'VENCIDO'
                                    ? 'danger'
                                    : 'default'
                                }
                                className="text-[11px]"
                              >
                                {period.status.replace(/_/g, ' ')}
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-[11px]">SEM PERÍODO</Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPeriods(emp)}
                              className="text-xs h-8 gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Histórico ({item.totalPeriodsCount})</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: SOLICITAÇÕES DE FÉRIAS */}
      {activeTab === 'requests' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Solicitações e Programações de Férias</CardTitle>
              <CardDescription className="text-xs">
                Workflow completo: Análise, Deliberação, Fracionamento e Registro de Gozo.
              </CardDescription>
            </div>
            <select
              value={reqStatusFilter}
              onChange={(e) => setReqStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="APROVADA">Aprovadas</option>
              <option value="PROGRAMADA">Programadas</option>
              <option value="EM_GOZO">Em Gozo</option>
              <option value="CONCLUIDA">Concluídas</option>
              <option value="RECUSADA">Recusadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Carregando solicitações...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Nenhuma solicitação de férias cadastrada com o status selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-3">Período de Fruição</th>
                      <th className="py-3 px-2 text-center">Duração</th>
                      <th className="py-3 px-2 text-center">Abono Pecuniário</th>
                      <th className="py-3 px-2 text-center">Fracionamento</th>
                      <th className="py-3 px-2 text-center">13º Antecipado</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {req.employee?.fullName || 'Colaborador'}
                          </div>
                          {req.employeeNotes && (
                            <div className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                              &ldquo;{req.employeeNotes}&rdquo;
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          {new Date(req.startDate).toLocaleDateString('pt-BR')} a{' '}
                          {new Date(req.endDate).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="py-3 px-2 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          {req.daysCount} dias
                        </td>

                        <td className="py-3 px-2 text-center text-xs text-slate-600 dark:text-slate-400">
                          {req.sellDays > 0 ? (
                            <Badge variant="warning" className="text-[10px]">
                              {req.sellDays} dias (1/3)
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>

                        <td className="py-3 px-2 text-center text-xs text-slate-500 font-mono">
                          {req.fractionNumber}º período
                        </td>

                        <td className="py-3 px-2 text-center text-xs">
                          {req.advance13th ? (
                            <Badge variant="info" className="text-[10px]">Sim</Badge>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              req.status === 'APROVADA' || req.status === 'PROGRAMADA'
                                ? 'info'
                                : req.status === 'EM_GOZO'
                                ? 'success'
                                : req.status === 'CONCLUIDA'
                                ? 'default'
                                : req.status === 'RECUSADA' || req.status === 'CANCELADA'
                                ? 'danger'
                                : 'warning'
                            }
                            className="text-[11px]"
                          >
                            {req.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {['PENDENTE', 'EM_ANALISE'].includes(req.status) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReqForDecision(req);
                                    setDecisionType('APROVADA');
                                    setDecisionModalOpen(true);
                                  }}
                                  className="text-xs h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  Aprovar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReqForDecision(req);
                                    setDecisionType('RECUSADA');
                                    setDecisionModalOpen(true);
                                  }}
                                  className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  Recusar
                                </Button>
                              </>
                            )}

                            {['APROVADA', 'PROGRAMADA'].includes(req.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelVacation(req)}
                                className="text-xs h-7 px-2 text-slate-500 hover:text-rose-600"
                              >
                                Cancelar
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
          </CardContent>
        </Card>
      )}

      {/* TAB 3: AFASTAMENTOS & LICENÇAS */}
      {activeTab === 'leaves' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Afastamentos, Licenças Legais e Ausências Justificadas</CardTitle>
              <CardDescription className="text-xs">
                Controle de previsões de retorno, interrupção e suspensão contratual (CLT Art. 471 e 476).
              </CardDescription>
            </div>
            <select
              value={leaveStatusFilter}
              onChange={(e) => setLeaveStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="CONCLUIDO">Concluídos</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Carregando afastamentos...</span>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Nenhum afastamento ou licença registrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-3">Tipo de Afastamento</th>
                      <th className="py-3 px-3">Data Início</th>
                      <th className="py-3 px-3">Previsão Retorno</th>
                      <th className="py-3 px-3">Retorno Efetivo</th>
                      <th className="py-3 px-3">Motivo / Justificativa</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {l.employee?.fullName || 'Colaborador'}
                          </div>
                          <div className="text-xs text-slate-400">CPF: {l.employee?.cpf}</div>
                        </td>

                        <td className="py-3 px-3">
                          <Badge variant="info" className="text-[11px]">
                            {l.type.replace(/_/g, ' ')}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          {new Date(l.startDate).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {l.expectedReturnDate
                            ? new Date(l.expectedReturnDate).toLocaleDateString('pt-BR')
                            : l.endDate
                            ? new Date(l.endDate).toLocaleDateString('pt-BR')
                            : 'Em aberto'}
                        </td>

                        <td className="py-3 px-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                          {l.actualReturnDate
                            ? new Date(l.actualReturnDate).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {l.reason}
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={l.status === 'ATIVO' ? 'danger' : l.status === 'CONCLUIDO' ? 'success' : 'default'}
                            className="text-[11px]"
                          >
                            {l.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {l.status === 'ATIVO' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLeaveForEnd(l);
                                setActualReturnDate(new Date().toISOString().split('T')[0]);
                                setEndLeaveModalOpen(true);
                              }}
                              className="text-xs h-7 px-2 text-brand-primary"
                            >
                              Registrar Retorno
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ATESTADOS MÉDICOS */}
      {activeTab === 'certificates' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Atestados Médicos & Homologação de Ausências</CardTitle>
                <CardDescription className="text-xs">
                  Tratamento de dados pessoais sensíveis conforme a LGPD e Resolução CFM nº 1.658/2002.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                <Lock className="w-3.5 h-3.5" />
                <span>Sigilo Clínico Ativo: CID-10 protegido</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Carregando atestados...</span>
              </div>
            ) : certificates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Nenhum atestado médico enviado para homologação.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-3">Data Início</th>
                      <th className="py-3 px-2 text-center">Dias de Repouso</th>
                      <th className="py-3 px-3">Profissional / CRM</th>
                      <th className="py-3 px-3">CID-10</th>
                      <th className="py-3 px-3">Comprovante</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {cert.employee?.fullName || 'Colaborador'}
                          </div>
                          <div className="text-xs text-slate-400">CPF: {cert.employee?.cpf}</div>
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          {new Date(cert.startDate).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="py-3 px-2 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          {cert.daysOff} dias
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {cert.doctorName ? (
                            <div>
                              <span>{cert.doctorName}</span>
                              {cert.crmNumber && <span className="block text-[10px] text-slate-400">CRM: {cert.crmNumber}{cert.crmState ? `/${cert.crmState}` : ''}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400">Não informado</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs">
                          {cert.cidCode ? (
                            <Badge variant="default" className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800">
                              {cert.cidCode}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Restrito / Ausente
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs">
                          {cert.documentUrl ? (
                            <a
                              href={cert.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ver Anexo</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">Sem anexo</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={cert.status === 'APROVADO' ? 'success' : cert.status === 'RECUSADO' ? 'danger' : 'warning'}
                            className="text-[11px]"
                          >
                            {cert.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {cert.status === 'PENDENTE' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCertForDecision(cert);
                                  setCertDecisionType('APROVADO');
                                  setCertDecisionModalOpen(true);
                                }}
                                className="text-xs h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              >
                                Homologar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCertForDecision(cert);
                                  setCertDecisionType('RECUSADO');
                                  setCertDecisionModalOpen(true);
                                }}
                                className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                Recusar
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: GESTÃO DOCUMENTAL */}
      {activeTab === 'documents' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Repositório Digital de Documentos Protegidos</CardTitle>
              <CardDescription className="text-xs">
                Guarda de contratos, avisos e recibos de férias, declarações e documentos admissionais.
              </CardDescription>
            </div>
            <select
              value={docCategoryFilter}
              onChange={(e) => setDocCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="TODOS">Todas as Categorias</option>
              <option value="DOCUMENTO_ADMISSIONAL">Admissionais</option>
              <option value="DOCUMENTO_CONTRATUAL">Contratuais</option>
              <option value="AVISO_FERIAS">Avisos de Férias</option>
              <option value="RECIBO_FERIAS">Recibos de Férias</option>
              <option value="ATESTADO_MEDICO">Atestados Médicos</option>
              <option value="DECLARACAO_COMPARECIMENTO">Declarações</option>
              <option value="OUTROS_ADMINISTRATIVOS">Outros</option>
            </select>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Carregando documentos...</span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Nenhum documento arquivado com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Documento / Arquivo</th>
                      <th className="py-3 px-3">Colaborador</th>
                      <th className="py-3 px-3">Categoria</th>
                      <th className="py-3 px-2 text-center">Tamanho</th>
                      <th className="py-3 px-3">Data de Envio</th>
                      <th className="py-3 px-3 text-center">Sigilo</th>
                      <th className="py-3 px-4 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand-primary" />
                            <span>{doc.fileName}</span>
                          </div>
                          {doc.title && doc.title !== doc.fileName && (
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{doc.title}</div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300">
                          {doc.employee?.fullName || 'Colaborador'}
                        </td>

                        <td className="py-3 px-3">
                          <Badge variant="default" className="text-[10px]">
                            {doc.category.replace(/_/g, ' ')}
                          </Badge>
                        </td>

                        <td className="py-3 px-2 text-center text-xs text-slate-500 font-mono">
                          {Math.round(doc.fileSize / 1024)} KB
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {doc.isConfidential ? (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0 flex items-center gap-1 justify-center">
                              <Lock className="w-2.5 h-2.5" /> Confidencial
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Padrão</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDoc(doc)}
                            className="text-xs h-7 px-2.5 gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: HISTÓRICO DE PERÍODOS AQUISITIVOS DO COLABORADOR */}
      <Modal
        isOpen={periodsModalOpen}
        onClose={() => setPeriodsModalOpen(false)}
        title={`Períodos Aquisitivos — ${selectedEmployeePeriods?.fullName || 'Colaborador'}`}
      >
        <div className="space-y-4">
          {loadingPeriods ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <span>Buscando histórico contratual...</span>
            </div>
          ) : employeePeriodsList.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Nenhum período aquisitivo registrado para este colaborador.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {employeePeriodsList.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Período #{idx + 1}
                    </span>
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
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Aquisitivo:</span>
                      <span className="font-mono">
                        {new Date(p.startDate).toLocaleDateString('pt-BR')} a{' '}
                        {new Date(p.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Concessivo (Limite):</span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {new Date(p.concessiveEndDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <span>Adquiridos: <b>{p.daysAcquired}d</b></span>
                    <span>Usufruídos: <b>{p.daysUsed}d</b></span>
                    <span>Abono: <b>{p.daysSold}d</b></span>
                    <span className="text-brand-primary font-bold">Saldo: {p.daysRemaining}d</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setPeriodsModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: DELIBERAR SOLICITAÇÃO DE FÉRIAS */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={decisionType === 'APROVADA' ? 'Aprovar Solicitação de Férias' : 'Recusar Solicitação de Férias'}
      >
        <form onSubmit={handleDecideVacation} className="space-y-4 text-sm">
          {selectedReqForDecision && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <div>
                Colaborador: <b>{selectedReqForDecision.employee?.fullName}</b>
              </div>
              <div>
                Período pretendido:{' '}
                <b>
                  {new Date(selectedReqForDecision.startDate).toLocaleDateString('pt-BR')} a{' '}
                  {new Date(selectedReqForDecision.endDate).toLocaleDateString('pt-BR')} ({selectedReqForDecision.daysCount} dias)
                </b>
              </div>
              {selectedReqForDecision.sellDays > 0 && (
                <div>Abono Pecuniário solicitado: <b>{selectedReqForDecision.sellDays} dias</b></div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Observações / Justificativa {decisionType === 'RECUSADA' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder={decisionType === 'RECUSADA' ? 'Motivo da recusa obrigatório...' : 'Observações adicionais (opcional)...'}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDecisionModalOpen(false)}>
              Voltar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmittingDecision}
              className={decisionType === 'APROVADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {isSubmittingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : decisionType === 'APROVADA' ? 'Confirmar Aprovação' : 'Confirmar Recusa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: NOVO AFASTAMENTO / LICENÇA */}
      <Modal isOpen={newLeaveModalOpen} onClose={() => setNewLeaveModalOpen(false)} title="Registrar Afastamento ou Licença">
        <form onSubmit={handleCreateLeave} className="space-y-3.5 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Colaborador *</label>
            <select
              value={leaveEmployeeId}
              onChange={(e) => setLeaveEmployeeId(e.target.value)}
              required
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            >
              <option value="">Selecione o colaborador...</option>
              {overviewEmployees.map((e) => (
                <option key={e.employee.id} value={e.employee.id}>
                  {e.employee.fullName} ({e.employee.cpf})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tipo de Afastamento *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            >
              <option value="DOENCA_ATE_15D">Auxílio Doença (Até 15 dias - Empresa)</option>
              <option value="DOENCA_INSS">Auxílio Doença Acidentário / Previdenciário (INSS)</option>
              <option value="ACIDENTE_TRABALHO">Acidente de Trabalho</option>
              <option value="MATERNIDADE">Licença Maternidade (120 dias)</option>
              <option value="PATERNIDADE">Licença Paternidade (5 a 20 dias)</option>
              <option value="CASAMENTO">Licença Casamento / Gala (3 dias CLT)</option>
              <option value="LUTO">Licença Luto / Nojo (2 a 5 dias CLT)</option>
              <option value="DOACAO_SANGUE">Doação de Sangue (1 dia)</option>
              <option value="ALISTAMENTO_ELEITORAL">Alistamento Eleitoral (2 dias)</option>
              <option value="SERVICO_MILITAR">Serviço Militar Obrigatório</option>
              <option value="AFASTAMENTO_ADMINISTRATIVO">Afastamento Administrativo / Preventivo</option>
              <option value="OUTROS">Outros Afastamentos</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Data Inicial *</label>
              <input
                type="date"
                required
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Previsão de Retorno</label>
              <input
                type="date"
                value={leaveExpectedReturn}
                onChange={(e) => setLeaveExpectedReturn(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Motivo / Justificativa Legal *</label>
            <textarea
              rows={2}
              required
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Ex: Apresentação de laudo pericial INSS ou certidão..."
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Código CID-10 (Opcional - Dado Sensível LGPD)
            </label>
            <input
              type="text"
              placeholder="Ex: J06.9"
              value={leaveCid}
              onChange={(e) => setLeaveCid(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setNewLeaveModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmittingLeave} className="bg-brand-primary">
              {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar Afastamento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: REGISTRAR RETORNO DE AFASTAMENTO */}
      <Modal isOpen={endLeaveModalOpen} onClose={() => setEndLeaveModalOpen(false)} title="Registrar Retorno de Afastamento">
        <form onSubmit={handleEndLeave} className="space-y-3.5 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Data de Retorno Efetivo *</label>
            <input
              type="date"
              required
              value={actualReturnDate}
              onChange={(e) => setActualReturnDate(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Observações de Reintegração</label>
            <textarea
              rows={2}
              value={endLeaveNotes}
              onChange={(e) => setEndLeaveNotes(e.target.value)}
              placeholder="Ex: Atestado de saúde ocupacional (ASO) de retorno realizado..."
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEndLeaveModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmittingEndLeave} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmittingEndLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Retorno'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: HOMOLOGAR ATESTADO MÉDICO */}
      <Modal
        isOpen={certDecisionModalOpen}
        onClose={() => setCertDecisionModalOpen(false)}
        title={certDecisionType === 'APROVADO' ? 'Homologar Atestado Médico' : 'Recusar Atestado Médico'}
      >
        <form onSubmit={handleDecideCert} className="space-y-3.5 text-sm">
          {selectedCertForDecision && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <div>Colaborador: <b>{selectedCertForDecision.employee?.fullName}</b></div>
              <div>
                Início: <b>{new Date(selectedCertForDecision.startDate).toLocaleDateString('pt-BR')}</b> ({selectedCertForDecision.daysOff} dias de repouso)
              </div>
              {selectedCertForDecision.doctorName && (
                <div>Médico: <b>{selectedCertForDecision.doctorName} {selectedCertForDecision.crmNumber ? `(CRM: ${selectedCertForDecision.crmNumber})` : ''}</b></div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Parecer do RH / Medicina do Trabalho
            </label>
            <textarea
              rows={2}
              value={certDecisionNotes}
              onChange={(e) => setCertDecisionNotes(e.target.value)}
              placeholder="Observações do parecer..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCertDecisionModalOpen(false)}>
              Voltar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmittingCertDecision}
              className={certDecisionType === 'APROVADO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {isSubmittingCertDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : certDecisionType === 'APROVADO' ? 'Confirmar Homologação' : 'Confirmar Recusa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: UPLOAD DE DOCUMENTO */}
      <Modal isOpen={uploadDocModalOpen} onClose={() => setUploadDocModalOpen(false)} title="Anexar Documento ao Prontuário">
        <form onSubmit={handleUploadDocument} className="space-y-3.5 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Colaborador *</label>
            <select
              value={docEmployeeId}
              onChange={(e) => setDocEmployeeId(e.target.value)}
              required
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            >
              <option value="">Selecione o colaborador...</option>
              {overviewEmployees.map((e) => (
                <option key={e.employee.id} value={e.employee.id}>
                  {e.employee.fullName} ({e.employee.cpf})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Categoria Documental *</label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            >
              <option value="DOCUMENTO_ADMISSIONAL">Documento Admissional (RG, CPF, Carteira de Trabalho)</option>
              <option value="DOCUMENTO_CONTRATUAL">Contrato de Trabalho / Aditivo</option>
              <option value="AVISO_FERIAS">Aviso Prévio de Férias (CLT Art. 135)</option>
              <option value="RECIBO_FERIAS">Recibo de Quitação de Férias (CLT Art. 145)</option>
              <option value="ATESTADO_MEDICO">Atestado Médico / Laudo</option>
              <option value="DECLARACAO_COMPARECIMENTO">Declaração de Comparecimento</option>
              <option value="OUTROS_ADMINISTRATIVOS">Outros Documentos Administrativos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Arquivo (PDF, PNG, JPG - máx 10MB) *</label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Descrição / Título do Documento</label>
            <input
              type="text"
              placeholder="Ex: Aviso de férias assinado referente ao período 2026/2027"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="docConfidential"
              checked={docIsConfidential}
              onChange={(e) => setDocIsConfidential(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-primary"
            />
            <label htmlFor="docConfidential" className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
              <Lock className="w-3 h-3 text-amber-500" />
              Documento confidencial (Acesso restrito ao RH e Admin)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadDocModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isUploadingDoc} className="bg-brand-primary">
              {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fazer Upload Seguro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
