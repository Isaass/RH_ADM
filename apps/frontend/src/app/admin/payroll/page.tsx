'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Briefcase,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import {
  PayrollCompetence,
  PayrollEmployeeSummary,
  PayrollItem,
  PayrollCompetenceStatus,
  PayrollItemType,
  PayrollItemCategory,
  CreatePayrollItemDTO,
} from '@pontuarh/shared';

export default function AdminPayrollPage() {
  const { user } = useAuth();

  // Competência selecionada (padrão mês atual YYYY-MM)
  const [selectedCompetence, setSelectedCompetence] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [competencesList, setCompetencesList] = useState<PayrollCompetence[]>([]);
  const [competenceData, setCompetenceData] = useState<PayrollCompetence | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('TODOS');

  // Modal de Detalhes do Colaborador
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<PayrollEmployeeSummary | null>(null);

  // Modal de Adicionar Rubrica Manual
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemType, setNewItemType] = useState<PayrollItemType>(PayrollItemType.PROVENTO);
  const [newItemCategory, setNewItemCategory] = useState<PayrollItemCategory>(PayrollItemCategory.ADICIONAL_MANUAL);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemReference, setNewItemReference] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Modal de Fechamento de Folha
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Feedback de Sucesso / Erro
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // Carregar lista de competências e dados da competência atual
  const loadPayrollData = async (compToLoad: string = selectedCompetence) => {
    try {
      setLoading(true);

      // Carregar histórico de competências da empresa
      const list = await api.get<PayrollCompetence[]>('/payroll/competences');
      setCompetencesList(list || []);

      // Carregar detalhes da competência selecionada
      try {
        const details = await api.get<PayrollCompetence>(`/payroll/competences/${compToLoad}`);
        setCompetenceData(details);
      } catch (err: any) {
        // Se 404, significa que a competência ainda não foi calculada
        setCompetenceData(null);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da folha:', err);
      showFeedback('error', err.message || 'Erro ao carregar dados da folha de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData(selectedCompetence);
  }, [selectedCompetence]);

  // Recalcular ou gerar prévia da folha
  const handleCalculatePreview = async () => {
    try {
      setCalculating(true);
      const res = await api.post<PayrollCompetence>(`/payroll/competences/${selectedCompetence}/calculate`);
      setCompetenceData(res);
      showFeedback('success', `Prévia da competência ${selectedCompetence} gerada/recalculada com sucesso!`);
      // Atualizar lista de competências
      const list = await api.get<PayrollCompetence[]>('/payroll/competences');
      setCompetencesList(list || []);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao calcular prévia da folha.');
    } finally {
      setCalculating(false);
    }
  };

  // Adicionar Lançamento Manual (Provento ou Desconto)
  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummary) return;

    const amountNum = parseFloat(newItemAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      showFeedback('error', 'Informe um valor numérico válido e maior que zero.');
      return;
    }

    if (!newItemName.trim()) {
      showFeedback('error', 'Informe a descrição da rubrica.');
      return;
    }

    try {
      setIsSubmittingItem(true);
      const payload: CreatePayrollItemDTO = {
        employeeId: selectedSummary.employeeId,
        name: newItemName.trim(),
        code: newItemCode.trim() || undefined,
        type: newItemType,
        category: newItemCategory,
        reference: newItemReference.trim() || undefined,
        amount: amountNum,
      };

      await api.post(`/payroll/competences/${selectedCompetence}/items`, payload);

      showFeedback('success', 'Lançamento manual adicionado com sucesso!');

      // Limpar formulário
      setNewItemName('');
      setNewItemCode('');
      setNewItemReference('');
      setNewItemAmount('');
      setIsAddingItem(false);

      // Recarregar dados da competência e atualizar o resumo selecionado
      const updatedComp = await api.get<PayrollCompetence>(`/payroll/competences/${selectedCompetence}`);
      setCompetenceData(updatedComp);

      const updatedSum = updatedComp.summaries?.find((s) => s.id === selectedSummary.id);
      if (updatedSum) {
        setSelectedSummary(updatedSum);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao adicionar lançamento manual.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Excluir Lançamento Manual
  const handleDeleteManualItem = async (itemId: string) => {
    if (!selectedSummary) return;

    if (!confirm('Tem certeza de que deseja remover este lançamento manual?')) {
      return;
    }

    try {
      await api.delete(`/payroll/competences/${selectedCompetence}/items/${itemId}`);
      showFeedback('success', 'Lançamento removido com sucesso!');

      // Atualizar competência e resumo
      const updatedComp = await api.get<PayrollCompetence>(`/payroll/competences/${selectedCompetence}`);
      setCompetenceData(updatedComp);

      const updatedSum = updatedComp.summaries?.find((s) => s.id === selectedSummary.id);
      if (updatedSum) {
        setSelectedSummary(updatedSum);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao remover lançamento manual.');
    }
  };

  // Fechar competência definitivamente
  const handleCloseCompetence = async () => {
    try {
      setIsSubmittingClose(true);
      const res = await api.post<PayrollCompetence>(`/payroll/competences/${selectedCompetence}/close`, {
        notes: closeNotes,
      });
      setCompetenceData(res);
      setCloseModalOpen(false);
      setCloseNotes('');
      showFeedback('success', `Competência ${selectedCompetence} fechada com sucesso! Todos os valores foram consolidados.`);
      const list = await api.get<PayrollCompetence[]>('/payroll/competences');
      setCompetencesList(list || []);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao fechar competência.');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Exportar CSV
  const handleExportCSV = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pontuarh_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/payroll/competences/${selectedCompetence}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar CSV da folha.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `folha_${selectedCompetence}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showFeedback('success', 'Arquivo CSV da folha gerado e baixado com sucesso!');
    } catch (err: any) {
      showFeedback('error', err.message || 'Erro ao exportar resumo em CSV.');
    }
  };

  // Navegação de mês anterior e próximo
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedCompetence.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedCompetence(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedCompetence.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedCompetence(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Departamentos disponíveis para filtro
  const departmentsList = useMemo(() => {
    if (!competenceData?.summaries) return [];
    const depts = new Set<string>();
    competenceData.summaries.forEach((s) => {
      const dName = s.employee?.department?.name;
      if (dName) depts.add(dName);
    });
    return Array.from(depts).sort();
  }, [competenceData]);

  // Colaboradores filtrados
  const filteredSummaries = useMemo(() => {
    if (!competenceData?.summaries) return [];
    return competenceData.summaries.filter((s) => {
      const matchesSearch =
        s.employee?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employee?.cpf?.includes(searchTerm) ||
        s.employee?.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        departmentFilter === 'TODOS' || s.employee?.department?.name === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [competenceData, searchTerm, departmentFilter]);

  // Formatação de Moeda
  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Formatação de Competência
  const formatCompetenceLabel = (comp: string) => {
    const [y, m] = comp.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${monthName} de ${y}`;
  };

  const isClosed = competenceData?.status === PayrollCompetenceStatus.FECHADA;

  const isAuthorized = user && ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RH', 'CONTADOR'].includes(user.role);

  if (user && !isAuthorized) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <ShieldAlert className="w-14 h-14 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Acesso Restrito ao Módulo Financeiro
        </h2>
        <p className="text-sm text-slate-500">
          O módulo de Prévia de Folha de Pagamento contém informações salariais sigilosas e está restrito a administradores, RH e contabilidade.
        </p>
        <Link href="/admin/dashboard" className="inline-block mt-2">
          <Button variant="primary">Voltar ao Painel</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <PageHeader
        title="Gestão Financeira & Folha de Pagamento"
        description="Composição salarial, apuração de horas extras, adicionais, benefícios e prévia de fechamento mensal."
      />

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Barra de Controle de Competência e Ações */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Seletor de Competência */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1 font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span>{formatCompetenceLabel(selectedCompetence)}</span>
                  <span className="text-xs text-slate-400">({selectedCompetence})</span>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Status da Competência */}
              {competenceData ? (
                <div className="flex items-center gap-2">
                  {isClosed ? (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 flex items-center gap-1.5 py-1 px-3">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fechada (Consolidada)</span>
                    </Badge>
                  ) : (
                    <Badge variant="success" className="flex items-center gap-1.5 py-1 px-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Aberta (Prévia em Andamento)</span>
                    </Badge>
                  )}
                </div>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1.5 py-1 px-3">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Não Inicializada</span>
                </Badge>
              )}
            </div>

            {/* Ações da Folha */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Recalcular / Gerar Prévia */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculatePreview}
                disabled={calculating || isClosed}
                className="flex items-center gap-1.5"
                title={isClosed ? 'Competência fechada não permite recálculo' : 'Recalcular proventos, horas extras e férias'}
              >
                <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
                <span>{competenceData ? 'Recalcular Prévia' : 'Gerar Prévia'}</span>
              </Button>

              {/* Exportar CSV */}
              {competenceData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Exportar CSV</span>
                </Button>
              )}

              {/* Fechar Folha */}
              {competenceData && !isClosed && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCloseModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-brand-primary dark:hover:bg-brand-primary/90"
                >
                  <Lock className="w-4 h-4" />
                  <span>Fechar Competência</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores / StatCards da Competência */}
      {competenceData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Bruto (Proventos)"
            value={formatMoney(competenceData.totalGross)}
            description="Salários, horas extras e adicionais"
            icon={<TrendingUp className="w-5 h-5" />}
            colorScheme="blue"
          />
          <StatCard
            title="Total de Descontos"
            value={formatMoney(competenceData.totalDeductions)}
            description="Benefícios e abatimentos lançados"
            icon={<TrendingDown className="w-5 h-5" />}
            colorScheme="amber"
          />
          <StatCard
            title="Total Líquido Estimado"
            value={formatMoney(competenceData.totalNet)}
            description="Valor consolidado a pagar"
            icon={<DollarSign className="w-5 h-5" />}
            colorScheme="green"
          />
          <StatCard
            title="Colaboradores na Folha"
            value={`${competenceData.totalEmployees} colaboradores`}
            description="Com demonstrativo calculado"
            icon={<Users className="w-5 h-5" />}
            colorScheme="slate"
          />
        </div>
      )}

      {/* Conteúdo Principal: Tabela de Colaboradores ou Estado Vazio */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <p className="text-sm text-slate-500 font-medium">Processando dados financeiros da competência...</p>
        </div>
      ) : !competenceData ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={`Nenhuma prévia gerada para ${formatCompetenceLabel(selectedCompetence)}`}
          description="Gere a prévia para apurar os salários-base, horas extras apuradas pelo ponto, banco de horas e férias dos colaboradores da empresa."
          actionText="Gerar Prévia de Folha Agora"
          onAction={handleCalculatePreview}
        />
      ) : (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-brand-primary" />
                  <span>Demonstrativo Individual dos Colaboradores</span>
                </CardTitle>
                <CardDescription>
                  {filteredSummaries.length} de {competenceData.summaries?.length || 0} colaborador(es) exibido(s).
                </CardDescription>
              </div>

              {/* Barra de Busca e Filtro de Departamento */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar nome ou CPF..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                {departmentsList.length > 0 && (
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="py-1.5 px-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 text-slate-800 dark:text-slate-200"
                  >
                    <option value="TODOS">Todos os Departamentos</option>
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Colaborador</th>
                    <th className="py-3.5 px-4">Salário Base</th>
                    <th className="py-3.5 px-4">Horas Extras</th>
                    <th className="py-3.5 px-4">Férias / BH</th>
                    <th className="py-3.5 px-4">Outros Prov.</th>
                    <th className="py-3.5 px-4">Total Descontos</th>
                    <th className="py-3.5 px-4">Salário Líquido</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nenhum colaborador encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((s) => {
                      const emp = s.employee;
                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">
                                {emp?.fullName?.slice(0, 2).toUpperCase() || 'RH'}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {emp?.fullName}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{emp?.position?.title || 'Sem cargo'}</span>
                                  {emp?.department?.name && (
                                    <>
                                      <span>•</span>
                                      <span>{emp.department.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {formatMoney(s.baseSalary)}
                          </td>

                          <td className="py-4 px-4">
                            {s.overtimeAmount > 0 ? (
                              <div>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatMoney(s.overtimeAmount)}
                                </span>
                                <div className="text-xs text-slate-400">
                                  {s.overtimeHours.toFixed(2)}h apuradas
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {s.vacationAmount > 0 || s.timeBankAmount > 0 ? (
                              <div className="text-xs font-medium space-y-0.5">
                                {s.vacationAmount > 0 && (
                                  <div className="text-blue-600 dark:text-blue-400">
                                    Férias: {formatMoney(s.vacationAmount)}
                                  </div>
                                )}
                                {s.timeBankAmount > 0 && (
                                  <div className="text-indigo-600 dark:text-indigo-400">
                                    BH: {formatMoney(s.timeBankAmount)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {s.otherEarnings > 0 ? (
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {formatMoney(s.otherEarnings)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {s.totalDeductions > 0 ? (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                -{formatMoney(s.totalDeductions)}
                              </span>
                            ) : (
                              <span className="text-slate-400">R$ 0,00</span>
                            )}
                          </td>

                          <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-base">
                            {formatMoney(s.netSalary)}
                          </td>

                          <td className="py-4 px-4 sm:px-6 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSummary(s);
                                setDetailModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Demonstrativo</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Detalhes do Demonstrativo & Rubricas */}
      {selectedSummary && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedSummary(null);
            setIsAddingItem(false);
          }}
          title={`Demonstrativo — ${selectedSummary.employee?.fullName}`}
          description={`Competência ${formatCompetenceLabel(selectedCompetence)} • Matrícula: ${selectedSummary.employee?.registrationNumber || 'N/A'}`}
          maxWidth="xl"
        >
          <div className="space-y-6">
            {/* Resumo Rápido em Cards Compactos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 font-medium">Salário Base</span>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatMoney(selectedSummary.baseSalary)}
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Proventos</span>
                <div className="text-base font-bold text-blue-800 dark:text-blue-200 mt-0.5">
                  {formatMoney(selectedSummary.totalEarnings)}
                </div>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">Total Descontos</span>
                <div className="text-base font-bold text-rose-800 dark:text-rose-200 mt-0.5">
                  -{formatMoney(selectedSummary.totalDeductions)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Salário Líquido</span>
                <div className="text-base font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
                  {formatMoney(selectedSummary.netSalary)}
                </div>
              </div>
            </div>

            {/* Lista de Rubricas e Lançamentos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-primary" />
                  <span>Composição de Rubricas</span>
                </h4>

                {!isClosed && !isAddingItem && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-1.5 text-xs py-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Novo Lançamento Manual</span>
                  </Button>
                )}
              </div>

              {/* Formulário para Adicionar Rubrica Manual */}
              {isAddingItem && (
                <form
                  onSubmit={handleAddManualItem}
                  className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Adicionar Lançamento Manual à Folha
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingItem(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
                      <select
                        value={newItemType}
                        onChange={(e) => setNewItemType(e.target.value as PayrollItemType)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value={PayrollItemType.PROVENTO}>Provento (+)</option>
                        <option value={PayrollItemType.DESCONTO}>Desconto (-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Categoria</label>
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as PayrollItemCategory)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value={PayrollItemCategory.ADICIONAL_MANUAL}>Adicional Manual</option>
                        <option value={PayrollItemCategory.DESCONTO_MANUAL}>Desconto Manual</option>
                        <option value={PayrollItemCategory.BENEFICIO}>Benefício (VT / VR / Saúde)</option>
                        <option value={PayrollItemCategory.ADIANTAMENTO}>Adiantamento Salarial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        placeholder="Ex: 250,00"
                        value={newItemAmount}
                        onChange={(e) => setNewItemAmount(e.target.value)}
                        required
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Descrição da Rubrica</label>
                      <input
                        type="text"
                        placeholder="Ex: Bônus de Produtividade, Coparticipação Unimed..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        required
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Referência (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Meta Q3, 10 dias"
                        value={newItemReference}
                        onChange={(e) => setNewItemReference(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSubmittingItem}
                      className="text-xs"
                    >
                      {isSubmittingItem ? 'Salvando...' : 'Confirmar Lançamento'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Tabela de Rubricas do Colaborador */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Cód.</th>
                      <th className="py-2.5 px-3">Rubrica</th>
                      <th className="py-2.5 px-3">Referência</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Origem</th>
                      {!isClosed && <th className="py-2.5 px-3 text-right">Excluir</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedSummary.items?.map((item) => {
                      const isEarning = item.type === PayrollItemType.PROVENTO;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={isEarning ? 'success' : 'danger'}
                              className="text-[10px] py-0.5 px-1.5"
                            >
                              {isEarning ? '+ Provento' : '- Desconto'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{item.code}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{item.reference || '—'}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold ${
                              isEarning
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isEarning ? '' : '-'}{formatMoney(item.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.isManual ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 border-amber-300 text-amber-700 dark:text-amber-400">
                                Manual
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-300 text-slate-500">
                                Sistema
                              </Badge>
                            )}
                          </td>
                          {!isClosed && (
                            <td className="py-2.5 px-3 text-right">
                              {item.isManual && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteManualItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  title="Remover lançamento manual"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aviso sobre encargos legais / tributos */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Nota sobre Encargos e Tributos Legais:</strong> Em conformidade com a Fase 5 do Roadmap, tributos oficiais (INSS, IRRF, FGTS) não utilizam cálculos fictícios presumidos. Rubricas manuais podem ser utilizadas para espelhar descontos exatos fornecidos pela sua contabilidade homologada.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Fechamento de Competência */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title={`Homologar Fechamento — ${formatCompetenceLabel(selectedCompetence)}`}
        description="O fechamento consolida definitivamente a folha de pagamento do mês."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-800 dark:text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Atenção: Ação de Homologação Irreversível</span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              Ao homologar o fechamento desta competência:
            </p>
            <ul className="text-xs space-y-1 list-disc list-inside text-rose-700 dark:text-rose-300">
              <li>Todos os valores brutos, líquidos e rubricas serão consolidados como <strong>imutáveis</strong>.</li>
              <li>Não será mais permitido adicionar, alterar ou remover lançamentos manuais.</li>
              <li>Novas marcações de ponto retroativas no mês não alterarão os valores desta competência.</li>
              <li>O evento de fechamento será registrado permanentemente para fins de auditoria e compliance.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações / Justificativa da Diretoria ou RH (Opcional)
            </label>
            <textarea
              rows={3}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Ex: Folha conferida e validada junto à contabilidade externa..."
              className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseModalOpen(false)}
              disabled={isSubmittingClose}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCloseCompetence}
              disabled={isSubmittingClose}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmittingClose ? 'Homologando...' : 'Confirmar Fechamento Definitivo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
