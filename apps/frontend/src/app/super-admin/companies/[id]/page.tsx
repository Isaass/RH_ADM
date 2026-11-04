'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  Shield,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Edit,
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
  Lock,
  Save,
  X,
  ExternalLink,
  Sparkles,
  RefreshCw,
  History,
  XCircle,
  DollarSign,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import {
  Subscription,
  SubscriptionHistory,
  Plan,
  formatCurrencyBRL,
  formatPhoneBR,
  formatCEP,
} from '@pontuarh/shared';

interface CompanyDetail {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj: string;
  email: string;
  phone?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  active: boolean;
  status: 'ATIVA' | 'SUSPENSA';
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  createdAt: string;
  updatedAt: string;
  employeesCount: number;
  usersCount: number;
  administratorsCount: number;
}

interface Administrator {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  employeeId?: string | null;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params?.id as string;
  const router = useRouter();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'admins' | 'subscription'>('details');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit company state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    tradeName: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Suspension modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [submittingSuspend, setSubmittingSuspend] = useState(false);

  // Reactivate modal
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [submittingReactivate, setSubmittingReactivate] = useState(false);

  // New Admin modal
  const [newAdminModalOpen, setNewAdminModalOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '' });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // Reset Password modal
  const [resetModalAdmin, setResetModalAdmin] = useState<Administrator | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  // Toggle admin status
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);

  // Modais de Assinatura (Fase 6.2)
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planChangeReason, setPlanChangeReason] = useState('');
  const [submittingChangePlan, setSubmittingChangePlan] = useState(false);

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewMonths, setRenewMonths] = useState(1);
  const [submittingRenew, setSubmittingRenew] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSubReason, setCancelSubReason] = useState('');
  const [submittingCancelSub, setSubmittingCancelSub] = useState(false);

  useEffect(() => {
    if (changePlanModalOpen && !selectedPlanId && allPlans.length > 0) {
      const active = allPlans.find((p) => p.active) || allPlans[0];
      if (active) setSelectedPlanId(active.id);
    }
  }, [changePlanModalOpen, selectedPlanId, allPlans]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [compRes, adminsRes, subRes, plansRes] = await Promise.all([
        api.get<any>(`/platform/companies/${companyId}`),
        api.get<any>(`/platform/companies/${companyId}/administrators`),
        api.get<any>(`/platform/companies/${companyId}/subscription`),
        api.get<Plan[]>('/platform/plans'),
      ]);

      const companyData = compRes?.company || compRes;
      if (!companyData || !companyData.id) {
        throw new Error('Empresa não encontrada.');
      }

      const normalizedCompany: CompanyDetail = {
        ...companyData,
        employeesCount: companyData.employeesCount ?? companyData._count?.employees ?? 0,
        usersCount: companyData.usersCount ?? companyData._count?.users ?? 0,
        administratorsCount: companyData.administratorsCount ?? (adminsRes?.administrators || []).length,
      };

      setCompany(normalizedCompany);
      setAdministrators(adminsRes?.administrators || []);
      setSubscription(subRes?.subscription || null);
      setSubscriptionHistory(subRes?.history || []);
      setAllPlans(plansRes || []);

      const activePlans = (plansRes || []).filter((p: Plan) => p.active);
      if (subRes?.subscription) {
        setSelectedPlanId(subRes.subscription.planId);
      } else if (activePlans.length > 0) {
        setSelectedPlanId(activePlans[0].id);
      } else if (plansRes && plansRes.length > 0) {
        setSelectedPlanId(plansRes[0].id);
      }

      setEditForm({
        name: normalizedCompany.name || '',
        tradeName: normalizedCompany.tradeName || '',
        email: normalizedCompany.email || '',
        phone: normalizedCompany.phone || '',
        street: normalizedCompany.street || '',
        number: normalizedCompany.number || '',
        complement: normalizedCompany.complement || '',
        neighborhood: normalizedCompany.neighborhood || '',
        city: normalizedCompany.city || '',
        state: normalizedCompany.state || '',
        zipCode: normalizedCompany.zipCode || '',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao carregar dados da empresa.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    setFeedback(null);

    try {
      const res = await api.put<{ company: CompanyDetail }>(`/platform/companies/${companyId}`, editForm);
      setCompany(res.company);
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Dados cadastrais atualizados com sucesso.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao atualizar dados cadastrais.' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) {
      alert('Informe o motivo da suspensão.');
      return;
    }
    setSubmittingSuspend(true);
    setFeedback(null);

    try {
      const res = await api.patch<{ company: CompanyDetail }>(`/platform/companies/${companyId}/suspend`, {
        reason: suspensionReason,
      });
      setCompany(res.company);
      setSuspendModalOpen(false);
      setSuspensionReason('');
      setFeedback({
        type: 'success',
        message: 'Empresa suspensa com sucesso. Usuários desta empresa agora têm acesso operacional bloqueado.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao suspender empresa.' });
    } finally {
      setSubmittingSuspend(false);
    }
  };

  const handleReactivate = async () => {
    setSubmittingReactivate(true);
    setFeedback(null);

    try {
      const res = await api.patch<{ company: CompanyDetail }>(`/platform/companies/${companyId}/reactivate`);
      setCompany(res.company);
      setReactivateModalOpen(false);
      setFeedback({
        type: 'success',
        message: 'Empresa reativada com sucesso. O acesso operacional foi restabelecido.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao reativar empresa.' });
    } finally {
      setSubmittingReactivate(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdmin(true);
    setFeedback(null);

    try {
      const res = await api.post<{ administrator: Administrator }>(
        `/platform/companies/${companyId}/administrators`,
        newAdminForm
      );
      setAdministrators((prev) => [res.administrator, ...prev]);
      setNewAdminModalOpen(false);
      setNewAdminForm({ name: '', email: '', password: '' });
      setFeedback({
        type: 'success',
        message: `Administrador "${res.administrator.name}" criado com sucesso para esta empresa.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao criar administrador.' });
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (admin: Administrator) => {
    setTogglingAdminId(admin.id);
    setFeedback(null);

    try {
      const newStatus = !admin.active;
      const res = await api.patch<{ administrator: Administrator }>(
        `/platform/companies/${companyId}/administrators/${admin.id}/status`,
        { active: newStatus }
      );
      setAdministrators((prev) =>
        prev.map((a) => (a.id === admin.id ? res.administrator : a))
      );
      setFeedback({
        type: 'success',
        message: `Administrador ${admin.name} foi ${newStatus ? 'ativado' : 'desativado'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao alterar status do administrador.' });
    } finally {
      setTogglingAdminId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalAdmin) return;
    setSubmittingReset(true);
    setFeedback(null);

    try {
      await api.post(`/platform/companies/${companyId}/administrators/${resetModalAdmin.id}/reset-password`, {
        newPassword,
      });
      setResetModalAdmin(null);
      setNewPassword('');
      setFeedback({
        type: 'success',
        message: `Senha do administrador ${resetModalAdmin.name} redefinida com sucesso.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao redefinir senha.' });
    } finally {
      setSubmittingReset(false);
    }
  };

  // Funções de Gestão de Assinatura (Fase 6.2)
  const handleOpenChangePlanModal = () => {
    const activePlans = allPlans.filter((p) => p.active);
    if (subscription) {
      setSelectedPlanId(subscription.planId);
    } else if (activePlans.length > 0) {
      setSelectedPlanId(activePlans[0].id);
    } else if (allPlans.length > 0) {
      setSelectedPlanId(allPlans[0].id);
    }
    setPlanChangeReason('');
    setChangePlanModalOpen(true);
  };

  const handleChangeSubscriptionPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePlanId = selectedPlanId || allPlans.find((p) => p.active)?.id || allPlans[0]?.id;
    if (!effectivePlanId) {
      setFeedback({ type: 'error', message: 'Nenhum plano disponível para seleção.' });
      return;
    }
    setSubmittingChangePlan(true);

    try {
      if (subscription) {
        await api.put(`/platform/companies/${companyId}/subscription`, {
          newPlanId: effectivePlanId,
          reason: planChangeReason,
        });
      } else {
        await api.post(`/platform/companies/${companyId}/subscription`, {
          planId: effectivePlanId,
          periodicity: 'MENSAL',
          status: 'ATIVA',
          notes: planChangeReason,
        });
      }
      setFeedback({ type: 'success', message: 'Plano da empresa configurado com sucesso!' });
      setChangePlanModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao atualizar plano da empresa.' });
    } finally {
      setSubmittingChangePlan(false);
    }
  };

  const handleRenewSubscription = async () => {
    setSubmittingRenew(true);

    try {
      await api.post(`/platform/companies/${companyId}/subscription/renew`, {
        monthsToAdd: renewMonths,
      });
      setFeedback({ type: 'success', message: `Assinatura renovada por mais ${renewMonths} mês(es)!` });
      setRenewModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao renovar assinatura.' });
    } finally {
      setSubmittingRenew(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelSubReason.trim()) {
      alert('Informe a justificativa do cancelamento.');
      return;
    }
    setSubmittingCancelSub(true);

    try {
      await api.post(`/platform/companies/${companyId}/subscription/cancel`, {
        reason: cancelSubReason,
      });
      setFeedback({ type: 'success', message: 'Assinatura cancelada com sucesso.' });
      setCancelModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao cancelar assinatura.' });
    } finally {
      setSubmittingCancelSub(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Empresa não encontrada.</p>
        <Link href="/super-admin/companies" className="text-indigo-600 font-semibold mt-4 inline-block">
          Voltar para lista de empresas
        </Link>
      </div>
    );
  }

  const isSuspended = company.status === 'SUSPENSA';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/super-admin/companies"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Empresas
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {company.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isSuspended
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {isSuspended ? (
                <>
                  <PauseCircle className="w-3.5 h-3.5" />
                  Suspensa
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativa
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
            CNPJ: {company.cnpj} {company.tradeName && `• Fantasia: ${company.tradeName}`}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {isSuspended ? (
            <Button
              type="button"
              variant="outline"
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold"
              onClick={() => setReactivateModalOpen(true)}
            >
              <PlayCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
              Reativar Empresa
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold"
              onClick={() => setSuspendModalOpen(true)}
            >
              <PauseCircle className="w-4 h-4 mr-1.5 text-rose-600" />
              Suspender Empresa
            </Button>
          )}

          {!isEditing && activeTab === 'details' && (
            <Button
              type="button"
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Editar Dados
            </Button>
          )}
        </div>
      </div>

      {/* Alert Banner for Suspended Company */}
      {isSuspended && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 dark:text-rose-300">
            <span className="font-bold">Empresa Suspensa:</span>{' '}
            {company.suspensionReason || 'Motivo não especificado.'}
            {company.suspendedAt && (
              <span className="block mt-0.5 text-rose-700/80 dark:text-rose-400 font-mono">
                Suspensa em: {new Date(company.suspendedAt).toLocaleString('pt-BR')}
              </span>
            )}
            <p className="mt-1 font-medium text-rose-700 dark:text-rose-400">
              Todos os colaboradores e administradores desta empresa têm o acesso operacional aos módulos de ponto, folhas e portal bloqueados em tempo real.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
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

      {/* Key Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Colaboradores</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{company.employeesCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Administradores</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{administrators.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Plano Contratado</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {subscription?.plan?.name || 'Sem Plano'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Cadastrada em</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {new Date(company.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Dados Cadastrais & Endereço
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            Administradores ({administrators.length})
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'subscription'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Plano & Assinatura SaaS (Fase 6.2)
          </button>
        </nav>
      </div>

      {/* Tab 1: Details */}
      {activeTab === 'details' && (
        <div>
          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleUpdateCompany} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Editar Informações Cadastrais
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados Principais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Razão Social *"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <Input
                    label="Nome Fantasia"
                    value={editForm.tradeName}
                    onChange={(e) => setEditForm({ ...editForm, tradeName: e.target.value })}
                  />
                  <Input
                    label="E-mail Corporativo *"
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <Input
                    label="Telefone / Contato"
                    value={editForm.phone}
                    placeholder="(11) 98765-4321"
                    onChange={(e) => setEditForm({ ...editForm, phone: formatPhoneBR(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Endereço</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="CEP"
                    value={editForm.zipCode}
                    placeholder="00000-000"
                    onChange={(e) => setEditForm({ ...editForm, zipCode: formatCEP(e.target.value) })}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Logradouro / Rua"
                      value={editForm.street}
                      onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Número"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                  />
                  <Input
                    label="Complemento"
                    value={editForm.complement}
                    onChange={(e) => setEditForm({ ...editForm, complement: e.target.value })}
                  />
                  <Input
                    label="Bairro"
                    value={editForm.neighborhood}
                    onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Cidade"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </div>
                  <Input
                    label="UF (Estado)"
                    maxLength={2}
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={submittingEdit}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  isLoading={submittingEdit}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Salvar Alterações
                </Button>
              </div>
            </form>
          ) : (
            /* Readonly View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Informações da Empresa
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Razão Social:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {company.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Nome Fantasia:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {company.tradeName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">CNPJ:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {company.cnpj}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Configuração Inicial:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {company.onboardingCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Concluída</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          ⏳ Pendente (Etapa {company.onboardingStep || 1} de 5)
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Status Operacional:</span>
                    <span className={`font-semibold ${isSuspended ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {company.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">E-mail de Contato:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {company.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Telefone:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {company.phone || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Endereço Corporativo
                  </h2>
                </div>

                {company.street || company.city ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Logradouro:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {company.street}
                        {company.number && `, ${company.number}`}
                        {company.complement && ` (${company.complement})`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block font-medium">Bairro:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {company.neighborhood || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">CEP:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {company.zipCode || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Cidade:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {company.city || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Estado (UF):</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {company.state || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Nenhum endereço cadastrado para esta empresa.
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-indigo-600 font-semibold block mt-1 hover:underline"
                    >
                      Cadastrar endereço agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Administrators */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Administradores da Empresa
              </h2>
              <p className="text-xs text-slate-500">
                Usuários com papel ADMIN_EMPRESA responsáveis pela gestão operacional da empresa.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              onClick={() => setNewAdminModalOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Novo Administrador
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {administrators.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhum administrador vinculado
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Esta empresa ainda não possui um administrador configurado para gerenciar seus colaboradores e jornadas.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-4 bg-indigo-600 text-xs"
                  onClick={() => setNewAdminModalOpen(true)}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Cadastrar Primeiro Administrador
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Administrador</th>
                      <th className="px-4 py-3">E-mail Corporativo</th>
                      <th className="px-4 py-3">Papel</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {administrators.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {admin.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">
                          {admin.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            ADMIN_EMPRESA
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              admin.active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {admin.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(admin.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-[11px] ${
                                admin.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              onClick={() => handleToggleAdminStatus(admin)}
                              isLoading={togglingAdminId === admin.id}
                            >
                              {admin.active ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 mr-1" /> Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 mr-1" /> Ativar
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                              onClick={() => {
                                setResetModalAdmin(admin);
                                setNewPassword('');
                              }}
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1 text-slate-500" /> Senha
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Plano & Assinatura (Fase 6.2) */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Plano & Assinatura SaaS da Empresa
              </h2>
              <p className="text-xs text-slate-500">
                Controle comercial de pacotes, vigência contratual e limites de capacidade.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={handleOpenChangePlanModal}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {subscription ? 'Alterar Plano' : 'Atribuir Plano'}
              </Button>

              {subscription && subscription.status !== 'CANCELADA' && (
                <Button
                  variant="outline"
                  className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setRenewModalOpen(true)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Renovar
                </Button>
              )}
            </div>
          </div>

          {/* Card da Assinatura Atual */}
          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 rounded">
                      Contrato Vigente
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {subscription.plan?.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Código: {subscription.plan?.code}
                    </p>
                  </div>
                  <Badge
                    variant={
                      subscription.status === 'ATIVA'
                        ? 'success'
                        : subscription.status === 'EM_TESTE'
                        ? 'warning'
                        : subscription.status === 'EXPIRADA'
                        ? 'danger'
                        : 'default'
                    }
                  >
                    {subscription.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block font-medium">Valor:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatCurrencyBRL(subscription.price)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Ciclo:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {subscription.periodicity === 'ANUAL' ? 'Anual' : 'Mensal'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Início:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(subscription.startDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Vencimento:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('pt-BR') : 'Indeterminado'}
                    </span>
                  </div>
                </div>

                {/* Limites do Plano */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Limites Contratados
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Colaboradores</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {company.employeesCount} / {subscription.plan?.maxEmployees}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Usuários</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {company.usersCount} / {subscription.plan?.maxUsers}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Administradores</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {administrators.length} / {subscription.plan?.maxAdmins}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações de Perigo */}
                {subscription.status !== 'CANCELADA' && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => setCancelModalOpen(true)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Cancelar Assinatura
                    </Button>
                  </div>
                )}
              </div>

              {/* Histórico Resumido */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <History className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Histórico Contratual
                  </h3>
                </div>

                {subscriptionHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum evento registrado.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {subscriptionHistory.map((h) => (
                      <div key={h.id} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                            {h.action.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400">
                            {new Date(h.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                          {h.planName} • {formatCurrencyBRL(h.price)}
                        </p>
                        {h.reason && <p className="text-[10px] text-slate-400 italic mt-0.5">&ldquo;{h.reason}&rdquo;</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed rounded-2xl border-slate-300 dark:border-slate-800">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhum plano contratado
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Esta empresa ainda não possui uma assinatura SaaS atribuída. Selecione um plano para liberar os módulos operacionais.
              </p>
              <Button
                variant="primary"
                className="mt-4 bg-purple-600 text-xs"
                onClick={handleOpenChangePlanModal}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Atribuir Plano Agora
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Suspender Empresa */}
      {suspendModalOpen && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          title="Suspender Empresa"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ao suspender <strong>{company.name}</strong>, todos os colaboradores e administradores desta empresa terão seu acesso operacional imediatamente bloqueado nas próximas requisições.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Justificativa da Suspensão *
              </label>
              <textarea
                rows={3}
                required
                className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ex.: Inadimplência contratual, solicitação judicial ou encerramento temporário..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSuspendModalOpen(false)} disabled={submittingSuspend}>
                Cancelar
              </Button>
              <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" onClick={handleSuspend} isLoading={submittingSuspend}>
                Confirmar Suspensão
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Reativar Empresa */}
      {reactivateModalOpen && (
        <Modal
          isOpen={reactivateModalOpen}
          onClose={() => setReactivateModalOpen(false)}
          title="Reativar Empresa"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Deseja restabelecer o acesso operacional para <strong>{company.name}</strong>?
              Os administradores e colaboradores ativos poderão autenticar-se e utilizar os módulos da empresa normalmente.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReactivateModalOpen(false)} disabled={submittingReactivate}>
                Cancelar
              </Button>
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleReactivate} isLoading={submittingReactivate}>
                Confirmar Reativação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Novo Administrador */}
      {newAdminModalOpen && (
        <Modal
          isOpen={newAdminModalOpen}
          onClose={() => setNewAdminModalOpen(false)}
          title="Novo Administrador"
        >
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <Input
              label="Nome Completo *"
              required
              placeholder="Ex.: Carlos Mendes"
              value={newAdminForm.name}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
            />

            <Input
              label="E-mail de Login *"
              type="email"
              required
              placeholder="carlos@empresa.com.br"
              value={newAdminForm.email}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
            />

            <Input
              label="Senha Inicial *"
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              value={newAdminForm.password}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setNewAdminModalOpen(false)} disabled={submittingAdmin}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" isLoading={submittingAdmin}>
                Criar Administrador
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Redefinir Senha */}
      {resetModalAdmin && (
        <Modal
          isOpen={Boolean(resetModalAdmin)}
          onClose={() => setResetModalAdmin(null)}
          title="Redefinir Senha do Administrador"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-slate-500">
              Redefina a senha de acesso para o administrador{' '}
              <strong className="text-slate-800 dark:text-slate-200">{resetModalAdmin.name}</strong> ({resetModalAdmin.email}).
            </p>

            <Input
              label="Nova Senha *"
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetModalAdmin(null)} disabled={submittingReset}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" isLoading={submittingReset}>
                Redefinir Senha
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Atribuir / Alterar Plano (Fase 6.2) */}
      {changePlanModalOpen && (
        <Modal
          isOpen={changePlanModalOpen}
          onClose={() => setChangePlanModalOpen(false)}
          title="Atribuir ou Alterar Plano SaaS"
        >
          <form onSubmit={handleChangeSubscriptionPlan} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Selecione o Plano *
              </label>
              <select
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={selectedPlanId || allPlans.find((p) => p.active)?.id || ''}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {allPlans
                  .filter((p) => p.active || p.id === subscription?.planId)
                  .map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.active && p.id !== subscription?.planId}>
                      {p.name} ({p.code}) {!p.active ? '• [DESATIVADO]' : ''} — {formatCurrencyBRL(p.monthlyPrice)}/mês • Até {p.maxEmployees} colabs
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Justificativa / Observações
              </label>
              <textarea
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex.: Mudança para o plano corporativo a pedido do cliente..."
                value={planChangeReason}
                onChange={(e) => setPlanChangeReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setChangePlanModalOpen(false)} disabled={submittingChangePlan}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold" isLoading={submittingChangePlan}>
                Confirmar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Renovar Assinatura (Fase 6.2) */}
      {renewModalOpen && (
        <Modal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          title="Renovar Assinatura da Empresa"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              A renovação estenderá o acesso operacional desta empresa a partir da data de vencimento atual.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Período a Adicionar (Meses)
              </label>
              <select
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={renewMonths}
                onChange={(e) => setRenewMonths(parseInt(e.target.value))}
              >
                <option value={1}>+ 1 Mês (Mensal)</option>
                <option value={3}>+ 3 Meses (Trimestral)</option>
                <option value={6}>+ 6 Meses (Semestral)</option>
                <option value={12}>+ 12 Meses (Anual)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRenewModalOpen(false)} disabled={submittingRenew}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleRenewSubscription} isLoading={submittingRenew}>
                Confirmar Renovação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cancelar Assinatura (Fase 6.2) */}
      {cancelModalOpen && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancelar Assinatura"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Deseja cancelar a assinatura desta empresa? Usuários e colaboradores perderão o acesso aos módulos operacionais do sistema.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Justificativa do Cancelamento *
              </label>
              <textarea
                rows={3}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ex.: Solicitação de cancelamento pelo cliente, encerramento de contrato..."
                value={cancelSubReason}
                onChange={(e) => setCancelSubReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCancelModalOpen(false)} disabled={submittingCancelSub}>
                Voltar
              </Button>
              <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" onClick={handleCancelSubscription} isLoading={submittingCancelSub}>
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
