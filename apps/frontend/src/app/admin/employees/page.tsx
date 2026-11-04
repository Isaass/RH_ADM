'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Edit2,
  Power,
  Eye,
  Loader2,
  Building,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatCPF, canManageEmployees, Employee, Department } from '@pontuarh/shared';

export default function EmployeesListPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (selectedDept) queryParams.set('departmentId', selectedDept);
      if (selectedStatus) queryParams.set('status', selectedStatus);

      const data = await api.get<Employee[]>(`/employees?${queryParams.toString()}`);
      setEmployees(data);
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carrega departamentos para o filtro
    api.get<Department[]>('/departments').then(setDepartments).catch(console.error);
    fetchEmployees();
  }, [selectedDept, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleToggleClick = (emp: Employee) => {
    setConfirmTarget({ id: emp.id, name: emp.fullName, currentStatus: emp.status });
  };

  const executeToggleStatus = async () => {
    if (!confirmTarget) return;
    const { id, name, currentStatus } = confirmTarget;
    setActionLoadingId(id);

    try {
      await api.patch(`/employees/${id}/toggle-status`);
      const newStatus = currentStatus === 'ATIVO' ? ('INATIVO' as any) : ('ATIVO' as any);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, status: newStatus } : emp))
      );
      setFeedback({
        type: 'success',
        message: `Vínculo de ${name} foi ${newStatus === 'ATIVO' ? 'reativado' : 'inativado'} com sucesso.`,
      });
      setConfirmTarget(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao alterar status do colaborador.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const isManager = user ? canManageEmployees(user.role) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Colaboradores"
        description="Cadastro, consulta cadastral, vínculo contratual e histórico funcional da equipe."
        actions={
          isManager && (
            <Link href="/admin/employees/new">
              <Button variant="primary">
                <PlusCircle className="w-4 h-4 mr-2" />
                <span>Cadastrar Colaborador</span>
              </Button>
            </Link>
          )
        }
      />

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por nome, CPF ou matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="flex-1 sm:flex-initial max-w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="">Todos os Departamentos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 sm:flex-initial max-w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="">Todos os Status</option>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="AFASTADO">Afastado</option>
                <option value="FERIAS">Férias</option>
              </select>

              <Button type="submit" variant="secondary" size="md">
                <span>Filtrar</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela Profissional de Colaboradores */}
      <Card>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            <p className="text-sm text-slate-500">Consultando registros...</p>
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum colaborador encontrado"
            description="Não encontramos colaboradores correspondentes aos critérios de pesquisa informados."
            actionText={isManager ? 'Cadastrar Colaborador' : undefined}
            onAction={() => (window.location.href = '/admin/employees/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Colaborador</th>
                  <th className="py-3.5 px-6">Documento / Matrícula</th>
                  <th className="py-3.5 px-6">Cargo & Departamento</th>
                  <th className="py-3.5 px-6">Contrato</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Nome & Avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-xs shrink-0">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {emp.fullName}
                          </p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* CPF & Matrícula */}
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 dark:text-slate-400">
                      <div>{formatCPF(emp.cpf)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Mat: {emp.registrationNumber || 'N/A'}
                      </div>
                    </td>

                    {/* Cargo & Departamento */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 text-xs">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.position?.title || 'Sem cargo'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.department?.name || 'Sem departamento'}</span>
                      </div>
                    </td>

                    {/* Tipo Contratual */}
                    <td className="py-4 px-6">
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {emp.contractType}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <Badge
                        variant={
                          emp.status === 'ATIVO'
                            ? 'success'
                            : emp.status === 'FERIAS'
                            ? 'info'
                            : emp.status === 'AFASTADO'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {emp.status}
                      </Badge>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/employees/${emp.id}`}>
                          <button
                            title="Ver detalhes"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>

                        {isManager && (
                          <>
                            <Link href={`/admin/employees/${emp.id}`}>
                              <button
                                title="Editar colaborador"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-brand-primary hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </Link>

                            <button
                              title={emp.status === 'ATIVO' ? 'Desativar vínculo' : 'Reativar vínculo'}
                              disabled={actionLoadingId === emp.id}
                              onClick={() => handleToggleClick(emp)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                emp.status === 'ATIVO'
                                  ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {actionLoadingId === emp.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Confirmação de Status */}
      <Modal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Confirmar Alteração de Vínculo"
        description="Esta alteração impactará o acesso do colaborador ao portal e a apuração de ponto."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Deseja realmente{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {confirmTarget?.currentStatus === 'ATIVO' ? 'inativar' : 'reativar'}
            </strong>{' '}
            o vínculo do colaborador{' '}
            <strong className="text-slate-900 dark:text-slate-100">{confirmTarget?.name}</strong>?
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setConfirmTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmTarget?.currentStatus === 'ATIVO' ? 'danger' : 'primary'}
              onClick={executeToggleStatus}
              disabled={!!actionLoadingId}
            >
              {actionLoadingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>Confirmar</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
