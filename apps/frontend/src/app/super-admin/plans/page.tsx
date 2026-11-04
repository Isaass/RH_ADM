'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  Shield,
  Clock,
  Sparkles,
  Check,
  X,
  Building2,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { Plan, CreatePlanDTO, UpdatePlanDTO, PlanFeature, formatCurrencyBRL } from '@pontuarh/shared';

const AVAILABLE_FEATURES: Array<{ key: PlanFeature; label: string; desc: string }> = [
  { key: PlanFeature.DASHBOARD, label: 'Dashboard', desc: 'Indicadores e resumos gerais da empresa' },
  { key: PlanFeature.COLABORADORES, label: 'Colaboradores', desc: 'Gestão cadastral de equipes e funcionários' },
  { key: PlanFeature.PONTO_ELETRONICO, label: 'Ponto Eletrônico', desc: 'Registro web e marcações diárias' },
  { key: PlanFeature.ESPELHO_PONTO, label: 'Espelho de Ponto', desc: 'Apuração e espelho mensal CLT' },
  { key: PlanFeature.AJUSTES, label: 'Ajustes & Justificativas', desc: 'Tratamento de faltas, atrasos e esquecimentos' },
  { key: PlanFeature.BANCO_HORAS, label: 'Banco de Horas', desc: 'Acordos, saldos de créditos e compensações' },
  { key: PlanFeature.FERIAS, label: 'Férias & Afastamentos', desc: 'Gestão de períodos aquisitivos e licenças' },
  { key: PlanFeature.DOCUMENTOS, label: 'Gestão de Documentos', desc: 'Repositório de arquivos e recibos assinados' },
  { key: PlanFeature.FOLHA_PAGAMENTO, label: 'Prévia de Folha', desc: 'Demonstrativo e apuração de rubricas e proventos' },
  { key: PlanFeature.RELATORIOS, label: 'Relatórios Analíticos', desc: 'Exportações e relatórios gerenciais' },
];

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<CreatePlanDTO>({
    name: '',
    code: '',
    description: '',
    monthlyPrice: 99.9,
    annualPrice: 999.0,
    maxEmployees: 10,
    maxUsers: 2,
    maxAdmins: 1,
    features: [PlanFeature.DASHBOARD, PlanFeature.COLABORADORES, PlanFeature.PONTO_ELETRONICO, PlanFeature.ESPELHO_PONTO, PlanFeature.AJUSTES],
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Plan[]>('/platform/plans');
      setPlans(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar planos:', err);
      setError(err.message || 'Erro ao carregar planos cadastrados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      monthlyPrice: 99.9,
      annualPrice: 999.0,
      maxEmployees: 10,
      maxUsers: 2,
      maxAdmins: 1,
      features: [PlanFeature.DASHBOARD, PlanFeature.COLABORADORES, PlanFeature.PONTO_ELETRONICO, PlanFeature.ESPELHO_PONTO, PlanFeature.AJUSTES],
      active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice || undefined,
      maxEmployees: plan.maxEmployees,
      maxUsers: plan.maxUsers,
      maxAdmins: plan.maxAdmins,
      features: plan.features || [],
      active: plan.active,
    });
    setModalOpen(true);
  };

  const handleToggleFeature = (featKey: PlanFeature) => {
    setFormData((prev) => {
      const exists = prev.features.includes(featKey);
      if (exists) {
        return { ...prev, features: prev.features.filter((f) => f !== featKey) };
      } else {
        return { ...prev, features: [...prev.features, featKey] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingPlan) {
        await api.put(`/platform/plans/${editingPlan.id}`, formData);
        showFeedback('success', `Plano "${formData.name}" atualizado com sucesso!`);
      } else {
        await api.post('/platform/plans', formData);
        showFeedback('success', `Plano "${formData.name}" cadastrado com sucesso!`);
      }
      setModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao salvar informações do plano.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    try {
      const newStatus = !plan.active;
      await api.patch(`/platform/plans/${plan.id}/status`, { active: newStatus });
      showFeedback('success', `Plano "${plan.name}" foi ${newStatus ? 'ativado' : 'desativado'}.`);
      loadPlans();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao alterar status do plano.');
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setDeleting(true);

    try {
      await api.delete(`/platform/plans/${planToDelete.id}`);
      showFeedback('success', `Plano "${planToDelete.name}" excluído.`);
      setDeleteModalOpen(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao excluir plano.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Gestão de Planos SaaS"
        description="Defina os pacotes comerciais da plataforma, limites de utilização e módulos disponíveis para contratação."
        actions={
          <Button
            variant="primary"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            onClick={handleOpenCreateModal}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Grid de Planos */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-2xl border-slate-300 dark:border-slate-800">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhum plano cadastrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crie o primeiro plano comercial da plataforma para liberar a contratação de assinaturas por empresas.
          </p>
          <Button variant="primary" className="mt-4 bg-purple-600" onClick={handleOpenCreateModal}>
            <PlusCircle className="w-4 h-4 mr-2" /> Cadastrar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`border transition-all flex flex-col justify-between ${
                plan.active
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 opacity-75'
              }`}
            >
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {plan.name}
                      </CardTitle>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-block mt-1">
                        {plan.code}
                      </span>
                    </div>
                    <Badge variant={plan.active ? 'success' : 'default'}>
                      {plan.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {plan.description && (
                    <CardDescription className="text-xs mt-2 line-clamp-2">
                      {plan.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Preços */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 font-medium">Mensalidade:</span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrencyBRL(plan.monthlyPrice)}
                        <span className="text-xs font-normal text-slate-400">/mês</span>
                      </span>
                    </div>
                    {plan.annualPrice && (
                      <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-400">
                        <span>Anual:</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {formatCurrencyBRL(plan.annualPrice)}/ano
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Limites */}
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                      Limites Contratuais
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60">
                        <Users className="w-3.5 h-3.5 text-purple-600 mx-auto mb-0.5" />
                        <span className="font-bold block text-sm">{plan.maxEmployees}</span>
                        <span className="text-[10px] text-slate-400">colabs</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60">
                        <Shield className="w-3.5 h-3.5 text-blue-600 mx-auto mb-0.5" />
                        <span className="font-bold block text-sm">{plan.maxUsers}</span>
                        <span className="text-[10px] text-slate-400">usuários</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60">
                        <Lock className="w-3.5 h-3.5 text-indigo-600 mx-auto mb-0.5" />
                        <span className="font-bold block text-sm">{plan.maxAdmins}</span>
                        <span className="text-[10px] text-slate-400">admins</span>
                      </div>
                    </div>
                  </div>

                  {/* Módulos Inclusos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Módulos Habilitados</span>
                      <span>{plan.features?.length || 0} de {AVAILABLE_FEATURES.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_FEATURES.map((feat) => {
                        const included = plan.features?.includes(feat.key);
                        return (
                          <span
                            key={feat.key}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
                              included
                                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                                : 'bg-slate-100/50 dark:bg-slate-800/30 border-transparent text-slate-400 line-through'
                            }`}
                          >
                            {included && <Check className="w-2.5 h-2.5 text-purple-600" />}
                            {feat.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Empresas vinculadas */}
                  <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Empresas ativas:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {plan._count?.subscriptions || 0}
                    </span>
                  </div>
                </CardContent>
              </div>

              {/* Ações */}
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => handleToggleStatus(plan)}
                >
                  {plan.active ? 'Desativar' : 'Ativar'}
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    onClick={() => handleOpenEditModal(plan)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    onClick={() => {
                      setPlanToDelete(plan);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Cadastro / Edição de Plano */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingPlan ? `Editar Plano: ${editingPlan.name}` : 'Cadastrar Novo Plano SaaS'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nome do Plano *"
                required
                placeholder="Ex.: Plano Corporativo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="Código Único *"
                required
                placeholder="Ex.: ENTERPRISE"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().trim() })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Descrição do Plano
              </label>
              <textarea
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Resumo dos benefícios e público-alvo deste plano..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Valor Mensal (R$) *"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.monthlyPrice}
                onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })}
              />

              <Input
                label="Valor Anual (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional com desconto"
                value={formData.annualPrice || ''}
                onChange={(e) => setFormData({ ...formData, annualPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            {/* Limites */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Limites Contratuais
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Máx. Colaboradores *"
                  type="number"
                  min="1"
                  required
                  value={formData.maxEmployees}
                  onChange={(e) => setFormData({ ...formData, maxEmployees: parseInt(e.target.value) || 1 })}
                />

                <Input
                  label="Máx. Usuários *"
                  type="number"
                  min="1"
                  required
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })}
                />

                <Input
                  label="Máx. Administradores *"
                  type="number"
                  min="1"
                  required
                  value={formData.maxAdmins}
                  onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Feature Flags */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Módulos Habilitados no Plano
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_FEATURES.map((feat) => {
                  const isChecked = formData.features.includes(feat.key);
                  return (
                    <button
                      type="button"
                      key={feat.key}
                      onClick={() => handleToggleFeature(feat.key)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                        isChecked
                          ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                        isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-400'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{feat.label}</p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{feat.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white" isLoading={submitting}>
                {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Exclusão de Plano */}
      {deleteModalOpen && planToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Excluir Plano SaaS"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir o plano <strong>{planToDelete.name}</strong> ({planToDelete.code})?
            </p>
            <p className="text-[11px] text-slate-500 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <strong>Atenção:</strong> Planos que já possuam empresas ou histórico de assinaturas vinculadas não podem ser excluídos fisicamente para garantir a integridade dos contratos. Nesses casos, o plano deve ser desativado.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" onClick={handleDeletePlan} isLoading={deleting}>
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
