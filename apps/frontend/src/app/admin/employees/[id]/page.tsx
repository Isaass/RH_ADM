'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Shield,
  Briefcase,
  Building,
  Calendar,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatCPF, formatCurrencyBRL, Employee, Department, Position, canManageEmployees } from '@pontuarh/shared';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [contractType, setContractType] = useState('CLT');
  const [status, setStatus] = useState('ATIVO');
  const [baseSalary, setBaseSalary] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Employee>(`/employees/${id}`),
      api.get<Department[]>('/departments').catch(() => []),
      api.get<Position[]>('/positions').catch(() => []),
      api.get<any[]>('/schedules').catch(() => []),
    ])
      .then(([emp, deps, pos, scheds]) => {
        setEmployee(emp);
        setDepartments(deps);
        setPositions(pos);
        setSchedules(scheds);

        setFullName(emp.fullName);
        setCpf(formatCPF(emp.cpf));
        setEmail(emp.email);
        setPhone(emp.phone || '');
        setRegistrationNumber(emp.registrationNumber || '');
        setDepartmentId(emp.departmentId || '');
        setPositionId(emp.positionId || '');
        setContractType(emp.contractType);
        setStatus(emp.status);
        if (emp.baseSalary !== null && emp.baseSalary !== undefined) {
          setBaseSalary(emp.baseSalary.toString());
        }
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.message || 'Erro ao carregar colaborador.' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const cleanCPF = cpf.replace(/\D/g, '');
      const updated = await api.put<Employee>(`/employees/${id}`, {
        fullName,
        cpf: cleanCPF,
        email,
        phone,
        registrationNumber,
        departmentId: departmentId || null,
        positionId: positionId || null,
        contractType,
        status,
        baseSalary: baseSalary ? parseFloat(baseSalary) : undefined,
      });

      setEmployee(updated);
      setMessage({ type: 'success', text: 'Dados cadastrais atualizados com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar dados.' });
    } finally {
      setSaving(false);
    }
  };

  const isManager = user ? canManageEmployees(user.role) : false;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-sm text-slate-500">Carregando ficha funcional...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Colaborador não localizado.</p>
        <Link href="/admin/employees">
          <Button variant="primary" className="mt-4">
            Voltar para lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/admin/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Voltar para Lista</span>
          </Button>
        </Link>
      </div>

      {/* Header do Perfil */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-primary to-blue-400 text-white font-bold text-2xl flex items-center justify-center shadow-md">
            {employee.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {employee.fullName}
              </h1>
              <Badge variant={employee.status === 'ATIVO' ? 'success' : 'danger'}>
                {employee.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Matrícula: {employee.registrationNumber || 'N/A'}</span>
              <span>•</span>
              <span>Admissão: {new Date(employee.admissionDate).toLocaleDateString('pt-BR')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {employee.contractType}
          </Badge>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação Civil</CardTitle>
            <CardDescription>Dados cadastrais do colaborador</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nome Completo"
                required
                disabled={!isManager}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <Input
              label="CPF"
              required
              disabled={!isManager}
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />

            <Input
              label="E-mail"
              type="email"
              required
              disabled={!isManager}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Telefone / Celular"
              disabled={!isManager}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Estrutura Organizacional */}
        <Card>
          <CardHeader>
            <CardTitle>Estrutura Organizacional</CardTitle>
            <CardDescription>Alocação de cargo, departamento e jornada</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Departamento"
              disabled={!isManager}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />

            <Select
              label="Cargo"
              disabled={!isManager}
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              options={positions.map((p) => ({ value: p.id, label: p.title }))}
            />

            <Select
              label="Situação Funcional"
              disabled={!isManager}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'INATIVO', label: 'Inativo' },
                { value: 'AFASTADO', label: 'Afastado' },
                { value: 'FERIAS', label: 'Férias' },
              ]}
            />

            <Select
              label="Tipo de Contrato"
              disabled={!isManager}
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              options={[
                { value: 'CLT', label: 'CLT' },
                { value: 'PJ', label: 'PJ' },
                { value: 'ESTAGIO', label: 'Estágio' },
                { value: 'TEMPORARIO', label: 'Temporário' },
                { value: 'APRENDIZ', label: 'Jovem Aprendiz' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Sigilo Salarial com Proteção RBAC */}
        <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-primary" />
              <div>
                <CardTitle>Remuneração & Sigilo Salarial (RBAC)</CardTitle>
                <CardDescription>Proteção de dados financeiros confidenciais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employee.baseSalary === null ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Acesso Confidencial Protegido
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Seu perfil ({user?.role}) não possui autorização financeira para consultar ou modificar o salário deste colaborador.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-xs space-y-2">
                <Input
                  label="Salário-Base Mensal (R$)"
                  type="number"
                  step="0.01"
                  disabled={!isManager}
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                />
                <p className="text-xs text-slate-500 font-mono">
                  Visualização autorizada: {formatCurrencyBRL(parseFloat(baseSalary) || 0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {isManager && (
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="submit" variant="primary" isLoading={saving}>
              <Save className="w-4 h-4 mr-2" />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
