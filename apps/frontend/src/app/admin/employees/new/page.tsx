'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, Shield, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { isValidCPF, formatCPF, Department, Position } from '@pontuarh/shared';

export default function NewEmployeePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState('CLT');
  const [workScheduleId, setWorkScheduleId] = useState('');
  const [baseSalary, setBaseSalary] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Department[]>('/departments').catch(() => []),
      api.get<Position[]>('/positions').catch(() => []),
      api.get<any[]>('/schedules').catch(() => []),
      api.get<any[]>('/employees').catch(() => []),
    ]).then(([deps, pos, scheds, emps]) => {
      setDepartments(deps);
      setPositions(pos);
      setSchedules(scheds);
      setManagers(emps);
      if (scheds.length > 0) setWorkScheduleId(scheds[0].id);
    });
  }, []);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(formatCPF(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCPF = cpf.replace(/\D/g, '');
    if (!isValidCPF(cleanCPF)) {
      setError('O CPF informado é inválido de acordo com o algoritmo da Receita Federal.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/employees', {
        companyId: user?.companyId,
        fullName,
        cpf: cleanCPF,
        email,
        phone,
        birthDate: birthDate || null,
        registrationNumber,
        departmentId: departmentId || null,
        positionId: positionId || null,
        managerId: managerId || null,
        admissionDate,
        contractType,
        workScheduleId: workScheduleId || null,
        baseSalary: baseSalary ? parseFloat(baseSalary) : null,
      });

      router.push('/admin/employees');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar colaborador.');
    } finally {
      setLoading(false);
    }
  };

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

      <PageHeader
        title="Novo Colaborador"
        description="Cadastre um novo membro da equipe com validação oficial de documentos e parametrização contratual."
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Informações civis do colaborador</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nome Completo"
                required
                placeholder="Ex: Carlos Eduardo da Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <Input
              label="CPF (apenas dígitos ou formatado)"
              required
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
            />

            <Input
              label="E-mail Corporativo"
              type="email"
              required
              placeholder="carlos.silva@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Telefone / Celular"
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Data de Nascimento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Bloco 2: Dados Contratuais e Funcionais */}
        <Card>
          <CardHeader>
            <CardTitle>Vínculo Contratual e Estrutura</CardTitle>
            <CardDescription>Cargo, departamento, jornada e admissão</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Matrícula Funcional"
              required
              placeholder="Ex: MAT-0105"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />

            <Input
              label="Data de Admissão"
              type="date"
              required
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
            />

            <Select
              label="Departamento"
              placeholder="Selecione um departamento"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />

            <Select
              label="Cargo"
              placeholder="Selecione um cargo"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              options={positions.map((p) => ({ value: p.id, label: p.title }))}
            />

            <Select
              label="Gestor Imediato (Aprovador)"
              placeholder="Sem gestor (Reporte direto)"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              options={managers.map((m) => ({ value: m.id, label: m.fullName }))}
            />

            <Select
              label="Tipo de Contrato"
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              options={[
                { value: 'CLT', label: 'CLT — Tempo Indeterminado' },
                { value: 'PJ', label: 'Pessoa Jurídica (PJ)' },
                { value: 'ESTAGIO', label: 'Estágio (Lei 11.788)' },
                { value: 'TEMPORARIO', label: 'Temporário' },
                { value: 'APRENDIZ', label: 'Jovem Aprendiz' },
              ]}
            />

            <div className="sm:col-span-2">
              <Select
                label="Jornada Contratual de Trabalho"
                value={workScheduleId}
                onChange={(e) => setWorkScheduleId(e.target.value)}
                options={schedules.map((s) => ({ value: s.id, label: `${s.name} (${s.weeklyHours}h/semana)` }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloco 3: Remuneração e Sigilo Salarial */}
        <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-primary" />
              <div>
                <CardTitle>Remuneração & Sigilo Financeiro</CardTitle>
                <CardDescription>Dado confidencial protegido por políticas RBAC</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Input
                label="Salário-Base Mensal Bruto (R$)"
                type="number"
                step="0.01"
                placeholder="Ex: 5000.00"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                helperText="Apenas perfis com permissão financeira poderão visualizar este valor."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/admin/employees">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={loading}>
            <Save className="w-4 h-4 mr-2" />
            <span>Salvar Colaborador</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
