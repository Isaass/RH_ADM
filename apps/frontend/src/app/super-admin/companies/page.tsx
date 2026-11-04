'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  Eye,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit,
  Power,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { Company, CompanyListResponse, formatCNPJ } from '@pontuarh/shared';

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ATIVA' | 'SUSPENSA'>('TODAS');
  const [loading, setLoading] = useState(true);

  // Modais de Suspensão e Reativação
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [companyToSuspend, setCompanyToSuspend] = useState<Company | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [companyToReactivate, setCompanyToReactivate] = useState<Company | null>(null);
  const [isSubmittingReactivate, setIsSubmittingReactivate] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchTerm.trim()) {
        queryParams.set('search', searchTerm.trim());
      }

      if (statusFilter !== 'TODAS') {
        queryParams.set('status', statusFilter);
      }

      const res = await api.get<CompanyListResponse>(`/platform/companies?${queryParams.toString()}`);
      setCompanies(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao carregar lista de empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [page, statusFilter]);

  // Busca disparada pelo formulário ou Enter
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCompanies();
  };

  // Confirmar Suspensão
  const handleConfirmSuspend = async () => {
    if (!companyToSuspend) return;
    if (!suspensionReason.trim()) {
      showFeedback('error', 'O motivo da suspensão é obrigatório.');
      return;
    }

    try {
      setIsSubmittingSuspend(true);
      await api.patch(`/platform/companies/${companyToSuspend.id}/status`, {
        active: false,
        status: 'SUSPENSA',
        reason: suspensionReason.trim(),
      });

      showFeedback('success', `Empresa "${companyToSuspend.name}" foi suspensa com sucesso.`);
      setSuspendModalOpen(false);
      setCompanyToSuspend(null);
      setSuspensionReason('');
      loadCompanies();
    } catch (err: any) {
      showFeedback('error', err.message || 'Falha ao suspender empresa.');
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  // Confirmar Reativação
  const handleConfirmReactivate = async () => {
    if (!companyToReactivate) return;

    try {
      setIsSubmittingReactivate(true);
      await api.patch(`/platform/companies/${companyToReactivate.id}/status`, {
        active: true,
        status: 'ATIVA',
      });

      showFeedback('success', `Empresa "${companyToReactivate.name}" foi reativada com sucesso!`);
      setReactivateModalOpen(false);
      setCompanyToReactivate(null);
      loadCompanies();
    } catch (err: any) {
      showFeedback('error', err.message || 'Falha ao reativar empresa.');
    } finally {
      setIsSubmittingReactivate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestão de Empresas"
        description="Administração centralizada de todas as contas, instâncias, filiais e status operacional do SaaS."
        actions={
          <Link href="/super-admin/companies/new">
            <Button
              variant="primary"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Empresa</span>
            </Button>
          </Link>
        }
      />

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Razão Social, Fantasia ou CNPJ..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="TODAS">Todos os Status</option>
                <option value="ATIVA">Apenas Ativas</option>
                <option value="SUSPENSA">Apenas Suspensas</option>
              </select>

              <Button type="submit" variant="outline" size="sm" className="h-9">
                Buscar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Empresas */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>Lista de Empresas Registradas</span>
            </CardTitle>
            <CardDescription>
              {total} empresa(s) encontrada(s) no sistema.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-sm text-slate-500">Carregando empresas...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Nenhuma empresa encontrada com os parâmetros pesquisados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Empresa / Razão Social</th>
                    <th className="py-3 px-4">CNPJ</th>
                    <th className="py-3 px-4">Localização</th>
                    <th className="py-3 px-4">Vínculos</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {companies.map((company) => {
                    const isSuspended = !company.active || company.status === 'SUSPENSA';
                    return (
                      <tr
                        key={company.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {company.name}
                          </div>
                          {company.tradeName && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {company.tradeName}
                            </div>
                          )}
                          {company.email && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {company.email}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatCNPJ(company.cnpj)}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {company.city && company.state ? (
                            <span>{company.city} - {company.state}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {company._count?.employees || 0} colab.
                            </span>
                            <span>•</span>
                            <span>{company._count?.users || 0} users</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 space-y-1">
                          <div>
                            {isSuspended ? (
                              <Badge variant="danger" className="text-[10px] py-0.5 px-2 font-semibold">
                                Suspensa
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] py-0.5 px-2 font-semibold">
                                Ativa
                              </Badge>
                            )}
                          </div>
                          <div>
                            {company.onboardingCompleted ? (
                              <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                ✓ Configurada
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                ⏳ Onboarding Pendente
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/super-admin/companies/${company.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-2.5 inline-flex items-center gap-1"
                                title="Ver Detalhes e Administradores"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-600" />
                                <span className="hidden sm:inline">Detalhes</span>
                              </Button>
                            </Link>

                            {isSuspended ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCompanyToReactivate(company);
                                  setReactivateModalOpen(true);
                                }}
                                className="text-xs py-1 px-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                                title="Reativar Acesso da Empresa"
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reativar</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCompanyToSuspend(company);
                                  setSuspendModalOpen(true);
                                }}
                                className="text-xs py-1 px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                                title="Suspender Acesso Operacional"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Suspender</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {!loading && totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages} ({total} empresas)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE SUSPENSÃO */}
      {companyToSuspend && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => {
            setSuspendModalOpen(false);
            setCompanyToSuspend(null);
            setSuspensionReason('');
          }}
          title="Suspender Empresa na Plataforma"
          description={`Empresa: ${companyToSuspend.name} • CNPJ: ${formatCNPJ(companyToSuspend.cnpj)}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Atenção: Bloqueio Imediato de Acesso</span>
              </div>
              <p>
                Ao suspender esta empresa, <strong>todos os seus usuários e colaboradores</strong> perderão imediatamente o acesso operacional aos módulos da plataforma, mesmo se possuírem sessões ativas no momento.
              </p>
              <p>
                Os dados históricos (pontos, banco de horas, férias, folha) permanecerão <strong>preservados de forma íntegra</strong> para auditoria.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo / Justificativa da Suspensão <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Ex: Inadimplência contratual, solicitação judicial ou cancelamento solicitado pelo cliente..."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspendModalOpen(false)}
                disabled={isSubmittingSuspend}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSuspend}
                disabled={isSubmittingSuspend || !suspensionReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmittingSuspend ? 'Suspendendo...' : 'Confirmar Suspensão'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE REATIVAÇÃO */}
      {companyToReactivate && (
        <Modal
          isOpen={reactivateModalOpen}
          onClose={() => {
            setReactivateModalOpen(false);
            setCompanyToReactivate(null);
          }}
          title="Reativar Empresa na Plataforma"
          description={`Empresa: ${companyToReactivate.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                A reativação restabelece imediatamente o acesso operacional de todos os administradores e colaboradores vinculados a esta empresa.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReactivateModalOpen(false)}
                disabled={isSubmittingReactivate}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReactivate}
                disabled={isSubmittingReactivate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingReactivate ? 'Reativando...' : 'Confirmar Reativação'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
