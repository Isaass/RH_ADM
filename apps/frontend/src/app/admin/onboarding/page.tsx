'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  Clock,
  UserPlus,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  PlusCircle,
  Briefcase,
  Layers,
  MapPin,
  Calendar,
  DollarSign,
  HelpCircle,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import {
  formatCNPJ,
  isValidCPF,
  formatCPF,
  formatPhoneBR,
  formatCEP,
  formatCurrencyBRL,
  OnboardingStatus,
  Department,
  Position,
  WorkSchedule,
  Employee,
} from '@pontuarh/shared';

const STEPS = [
  { step: 1, title: 'Dados da Empresa', icon: Building2, desc: 'Informações cadastrais e endereço operacional' },
  { step: 2, title: 'Estrutura Organizacional', icon: Layers, desc: 'Departamentos e cargos da empresa' },
  { step: 3, title: 'Jornada de Trabalho', icon: Clock, desc: 'Horários e escalas contratuais' },
  { step: 4, title: 'Primeiro Colaborador', icon: UserPlus, desc: 'Cadastro do primeiro vínculo' },
  { step: 5, title: 'Resumo & Conclusão', icon: ShieldCheck, desc: 'Ativação e prontidão operacional' },
];

export default function AdminOnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Etapa 1: Dados da Empresa
  const [companyForm, setCompanyForm] = useState({
    name: '',
    tradeName: '',
    cnpj: '',
    email: '',
    phone: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // Etapa 2: Estrutura Organizacional
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosCbo, setNewPosCbo] = useState('');
  const [newPosDesc, setNewPosDesc] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [addingPos, setAddingPos] = useState(false);

  // Etapa 3: Jornada de Trabalho
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Padrão Comercial 44h (Seg-Sex)',
    type: 'FIXA',
    expectedEntry: '08:00',
    expectedBreak: '01:00',
    expectedExit: '17:48',
    weeklyHours: 44,
    toleranceMinutes: 10,
    daysOfWeek: 'MON,TUE,WED,THU,FRI',
  });
  const [addingSchedule, setAddingSchedule] = useState(false);

  // Etapa 4: Primeiro Colaborador
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeForm, setEmployeeForm] = useState({
    fullName: '',
    cpf: '',
    email: '',
    phone: '',
    birthDate: '',
    registrationNumber: '',
    departmentId: '',
    positionId: '',
    workScheduleId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    contractType: 'CLT',
    baseSalary: '',
  });

  // Carregar status e dados iniciais
  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const [onbStatus, deptsRes, posRes, schedRes, empRes] = await Promise.all([
        api.get<OnboardingStatus>('/onboarding/status'),
        api.get<Department[]>('/departments').catch(() => []),
        api.get<Position[]>('/positions').catch(() => []),
        api.get<WorkSchedule[]>('/schedules').catch(() => []),
        api.get<Employee[]>('/employees').catch(() => []),
      ]);

      setStatus(onbStatus);
      if (onbStatus.onboardingStep && onbStatus.onboardingStep >= 1 && onbStatus.onboardingStep <= 5) {
        // Se a empresa ainda não concluiu, posiciona na etapa salva
        if (!onbStatus.onboardingCompleted) {
          setCurrentStep(onbStatus.onboardingStep);
        }
      }

      setCompanyForm({
        name: onbStatus.company.name || '',
        tradeName: onbStatus.company.tradeName || '',
        cnpj: onbStatus.company.cnpj || '',
        email: onbStatus.company.email || '',
        phone: onbStatus.company.phone || '',
        zipCode: onbStatus.company.zipCode || '',
        street: onbStatus.company.street || '',
        number: onbStatus.company.number || '',
        complement: onbStatus.company.complement || '',
        neighborhood: onbStatus.company.neighborhood || '',
        city: onbStatus.company.city || '',
        state: onbStatus.company.state || '',
      });

      setDepartments(deptsRes || []);
      setPositions(posRes || []);
      setSchedules(schedRes || []);
      setEmployees(empRes || []);

      // Se houver opções, pré-selecionar nas etapas seguintes
      if (deptsRes && deptsRes.length > 0 && !employeeForm.departmentId) {
        setEmployeeForm((prev) => ({ ...prev, departmentId: deptsRes[0].id }));
      }
      if (posRes && posRes.length > 0 && !employeeForm.positionId) {
        setEmployeeForm((prev) => ({ ...prev, positionId: posRes[0].id }));
      }
      if (schedRes && schedRes.length > 0 && !employeeForm.workScheduleId) {
        setEmployeeForm((prev) => ({ ...prev, workScheduleId: schedRes[0].id }));
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do onboarding:', err);
      setFeedback({ type: 'error', message: err.message || 'Falha ao sincronizar dados de onboarding.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const changeStep = async (newStep: number) => {
    setFeedback(null);
    setCurrentStep(newStep);
    try {
      await api.put('/onboarding/step', { step: newStep });
    } catch (e) {
      // Falha não-bloqueante de persistência de passo
      console.warn('Erro ao salvar passo do onboarding:', e);
    }
  };

  const handleContinueLater = async () => {
    try {
      await api.put('/onboarding/step', { step: currentStep });
      router.push('/admin/dashboard');
    } catch {
      router.push('/admin/dashboard');
    }
  };

  // ----------------------------------------------------
  // SUBMITS DE CADA ETAPA
  // ----------------------------------------------------

  // Etapa 1: Salvar Dados da Empresa
  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await api.put('/companies/current', {
        name: companyForm.name,
        tradeName: companyForm.tradeName,
        email: companyForm.email,
        phone: companyForm.phone,
        street: companyForm.street,
        number: companyForm.number,
        complement: companyForm.complement,
        neighborhood: companyForm.neighborhood,
        city: companyForm.city,
        state: companyForm.state,
        zipCode: companyForm.zipCode,
      });

      setFeedback({ type: 'success', message: 'Dados da empresa atualizados com sucesso!' });
      await changeStep(2);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao salvar informações da empresa.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Etapa 2: Adicionar Departamento
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    setFeedback(null);

    try {
      const created = await api.post<Department>('/departments', {
        name: newDeptName.trim(),
        code: newDeptCode.trim() || undefined,
      });
      setDepartments((prev) => [...prev, created]);
      setNewDeptName('');
      setNewDeptCode('');
      setFeedback({ type: 'success', message: `Departamento "${created.name}" cadastrado!` });

      if (!employeeForm.departmentId) {
        setEmployeeForm((prev) => ({ ...prev, departmentId: created.id }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao cadastrar departamento.' });
    } finally {
      setAddingDept(false);
    }
  };

  // Etapa 2: Adicionar Cargo
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosTitle.trim()) return;
    setAddingPos(true);
    setFeedback(null);

    try {
      const created = await api.post<Position>('/positions', {
        title: newPosTitle.trim(),
        cboCode: newPosCbo.trim() || undefined,
        description: newPosDesc.trim() || undefined,
      });
      setPositions((prev) => [...prev, created]);
      setNewPosTitle('');
      setNewPosCbo('');
      setNewPosDesc('');
      setFeedback({ type: 'success', message: `Cargo "${created.title}" cadastrado!` });

      if (!employeeForm.positionId) {
        setEmployeeForm((prev) => ({ ...prev, positionId: created.id }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao cadastrar cargo.' });
    } finally {
      setAddingPos(false);
    }
  };

  // Etapa 2: Presets Rápidos
  const handleAddCommonPresets = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      // Departamentos sugeridos
      const defaultDepts = ['Administrativo & Financeiro', 'Operações & Logística', 'Recursos Humanos', 'Tecnologia'];
      const newDepts: Department[] = [];
      for (const name of defaultDepts) {
        const already = departments.some((d) => d.name.toLowerCase() === name.toLowerCase());
        if (!already) {
          try {
            const d = await api.post<Department>('/departments', { name });
            newDepts.push(d);
          } catch {}
        }
      }

      // Cargos sugeridos
      const defaultPositions = ['Analista Administrativo', 'Assistente Operacional', 'Especialista em RH', 'Gerente de Setor'];
      const newPos: Position[] = [];
      for (const title of defaultPositions) {
        const already = positions.some((p) => p.title.toLowerCase() === title.toLowerCase());
        if (!already) {
          try {
            const p = await api.post<Position>('/positions', { title });
            newPos.push(p);
          } catch {}
        }
      }

      if (newDepts.length > 0) setDepartments((prev) => [...prev, ...newDepts]);
      if (newPos.length > 0) setPositions((prev) => [...prev, ...newPos]);

      setFeedback({ type: 'success', message: 'Estrutura padrão de departamentos e cargos adicionada!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao adicionar presets.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Etapa 3: Criar Jornada de Trabalho
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSchedule(true);
    setFeedback(null);

    try {
      const created = await api.post<WorkSchedule>('/schedules', scheduleForm);
      setSchedules((prev) => [...prev, created]);
      setFeedback({ type: 'success', message: `Jornada "${created.name}" configurada com sucesso!` });
      if (!employeeForm.workScheduleId) {
        setEmployeeForm((prev) => ({ ...prev, workScheduleId: created.id }));
      }
      await changeStep(4);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao cadastrar jornada de trabalho.' });
    } finally {
      setAddingSchedule(false);
    }
  };

  // Etapa 4: Cadastrar Primeiro Colaborador
  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const cleanCpf = employeeForm.cpf.replace(/\D/g, '');
    if (!isValidCPF(cleanCpf)) {
      setFeedback({ type: 'error', message: 'O CPF informado é inválido de acordo com a Receita Federal.' });
      setSubmitting(false);
      return;
    }

    try {
      const created = await api.post<Employee>('/employees', {
        fullName: employeeForm.fullName.trim(),
        cpf: cleanCpf,
        email: employeeForm.email.toLowerCase().trim(),
        phone: employeeForm.phone.trim() || undefined,
        birthDate: employeeForm.birthDate || undefined,
        registrationNumber: employeeForm.registrationNumber.trim() || undefined,
        departmentId: employeeForm.departmentId || undefined,
        positionId: employeeForm.positionId || undefined,
        workScheduleId: employeeForm.workScheduleId || undefined,
        admissionDate: employeeForm.admissionDate,
        contractType: employeeForm.contractType,
        baseSalary: employeeForm.baseSalary ? parseFloat(employeeForm.baseSalary) : undefined,
      });

      setEmployees((prev) => [...prev, created]);
      setFeedback({ type: 'success', message: `Colaborador "${created.fullName}" cadastrado com sucesso!` });
      await changeStep(5);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao cadastrar primeiro colaborador.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Etapa 5: Concluir Onboarding
  const handleCompleteOnboarding = async () => {
    setSubmitting(true);
    setFeedback(null);

    try {
      await api.post('/onboarding/complete', {});
      setFeedback({ type: 'success', message: 'Parabéns! Sua empresa está configurada e pronta para operar.' });
      setTimeout(() => {
        router.push('/admin/dashboard?onboarding=complete');
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao concluir onboarding.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-xs text-slate-500">Carregando guia de configuração inicial...</p>
      </div>
    );
  }

  const progressPercentage = (currentStep / 5) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Continuar Depois */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary px-2 py-0.5 bg-brand-primary/10 rounded">
              Configuração Inicial da Empresa
            </span>
            <span className="text-xs text-slate-400">• Etapa {currentStep} de 5</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Onboarding Pontua RH
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Prepare seu ambiente corporativo em 5 passos práticos antes de iniciar o controle de jornada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-300 dark:border-slate-700"
            onClick={handleContinueLater}
          >
            Continuar Depois
          </Button>
          {status?.onboardingCompleted && (
            <Link href="/admin/dashboard">
              <Button size="sm" variant="primary" className="text-xs bg-brand-primary">
                Ir ao Painel <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Barra de Progresso Global */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-brand-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stepper Visual */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isDone = currentStep > s.step;
          const isCurrent = currentStep === s.step;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => changeStep(s.step)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isCurrent
                  ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                  : isDone
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-slate-700 dark:text-slate-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold">PASSO {s.step}</span>
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-brand-primary' : 'text-slate-400'}`} />
                )}
              </div>
              <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                {s.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Toast de Feedback */}
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
            ×
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* ETAPA 1 — DADOS DA EMPRESA */}
      {/* ==================================================== */}
      {currentStep === 1 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-primary" />
              <div>
                <CardTitle className="text-lg">Etapa 1: Dados Cadastrais e Operacionais</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Confira as informações provisionadas pelo administrador e complemente com endereço e contatos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSaveCompanyData} className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  CNPJ Registrado na Plataforma
                </span>
                <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatCNPJ(companyForm.cnpj)}
                </span>
              </div>
              <Badge variant="default" className="text-[10px]">
                Validado via Receita Federal
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Razão Social *"
                required
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              />
              <Input
                label="Nome Fantasia"
                placeholder="Ex.: TecnoRH Matriz"
                value={companyForm.tradeName}
                onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
              />
              <Input
                label="E-mail de Notificações / RH *"
                type="email"
                required
                placeholder="rh@empresa.com.br"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
              />
              <Input
                label="Telefone Corporativo"
                placeholder="(11) 4002-8922"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: formatPhoneBR(e.target.value) })}
              />
            </div>

            {/* Endereço */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Endereço Operacional da Empresa
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="CEP"
                  placeholder="01310-100"
                  value={companyForm.zipCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, zipCode: formatCEP(e.target.value) })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Logradouro / Avenida / Rua"
                    placeholder="Ex.: Av. Paulista"
                    value={companyForm.street}
                    onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
                  />
                </div>
                <Input
                  label="Número"
                  placeholder="1000"
                  value={companyForm.number}
                  onChange={(e) => setCompanyForm({ ...companyForm, number: e.target.value })}
                />
                <Input
                  label="Complemento"
                  placeholder="Conjunto 401"
                  value={companyForm.complement}
                  onChange={(e) => setCompanyForm({ ...companyForm, complement: e.target.value })}
                />
                <Input
                  label="Bairro"
                  placeholder="Bela Vista"
                  value={companyForm.neighborhood}
                  onChange={(e) => setCompanyForm({ ...companyForm, neighborhood: e.target.value })}
                />
                <Input
                  label="Cidade"
                  placeholder="São Paulo"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                />
                <Input
                  label="Estado (UF)"
                  placeholder="SP"
                  maxLength={2}
                  value={companyForm.state}
                  onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary" className="bg-brand-primary" isLoading={submitting}>
                Salvar & Avançar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ==================================================== */}
      {/* ETAPA 2 — ESTRUTURA ORGANIZACIONAL */}
      {/* ==================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-primary" />
                  <div>
                    <CardTitle className="text-lg">Etapa 2: Estrutura Organizacional</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Defina os departamentos e cargos para organizar a alocação dos colaboradores.
                    </CardDescription>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleAddCommonPresets}
                  disabled={submitting}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-primary" />
                  Adicionar Estrutura Padrão
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Departamentos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Departamentos Cadastrados ({departments.length})
                    </h3>
                  </div>

                  <form onSubmit={handleAddDepartment} className="flex gap-2">
                    <Input
                      placeholder="Novo departamento (ex: Operações)"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                    />
                    <Button type="submit" variant="primary" className="bg-brand-primary text-xs shrink-0" isLoading={addingDept}>
                      <PlusCircle className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </form>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {departments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Nenhum departamento cadastrado ainda.</p>
                    ) : (
                      departments.map((d) => (
                        <div
                          key={d.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{d.name}</span>
                          {d.code && <span className="font-mono text-[10px] text-slate-400">({d.code})</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cargos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Cargos & Funções ({positions.length})
                    </h3>
                  </div>

                  <form onSubmit={handleAddPosition} className="flex gap-2">
                    <Input
                      placeholder="Novo cargo (ex: Analista de RH)"
                      value={newPosTitle}
                      onChange={(e) => setNewPosTitle(e.target.value)}
                    />
                    <Button type="submit" variant="primary" className="bg-brand-primary text-xs shrink-0" isLoading={addingPos}>
                      <PlusCircle className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </form>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {positions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Nenhum cargo cadastrado ainda.</p>
                    ) : (
                      positions.map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{p.title}</span>
                          {p.cboCode && <span className="font-mono text-[10px] text-slate-400">CBO {p.cboCode}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => changeStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  className="bg-brand-primary"
                  disabled={departments.length === 0 || positions.length === 0}
                  onClick={() => changeStep(3)}
                >
                  Avançar para Jornadas <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================== */}
      {/* ETAPA 3 — JORNADA DE TRABALHO */}
      {/* ==================================================== */}
      {currentStep === 3 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-primary" />
              <div>
                <CardTitle className="text-lg">Etapa 3: Jornada & Horários de Trabalho</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Configure a escala padrão para apuração eletrônica de ponto e controle de intervalos CLT.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Listagem de Jornadas Já Existentes */}
            {schedules.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Jornadas já Configuradas ({schedules.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-start justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {s.expectedEntry} às {s.expectedExit} • Intervalo: {s.expectedBreak}
                        </p>
                        <p className="text-[10px] text-brand-primary font-mono mt-0.5">
                          {s.weeklyHours}h semanais • Tipo: {s.type}
                        </p>
                      </div>
                      <Badge variant="success" className="text-[10px]">Ativa</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário para Cadastrar Nova Jornada */}
            <form onSubmit={handleCreateSchedule} className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {schedules.length > 0 ? 'Cadastrar Outra Jornada' : 'Cadastrar Jornada Padrão'}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Modelos CLT:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm({
                        name: 'Padrão Comercial 44h (Seg-Sex)',
                        type: 'FIXA',
                        expectedEntry: '08:00',
                        expectedBreak: '01:00',
                        expectedExit: '17:48',
                        weeklyHours: 44,
                        toleranceMinutes: 10,
                        daysOfWeek: 'MON,TUE,WED,THU,FRI',
                      })
                    }
                    className="text-[10px] px-2 py-0.5 rounded border border-brand-primary/40 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 font-medium"
                  >
                    44h (08:00 às 17:48)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm({
                        name: 'Comercial Padrão 40h (Seg-Sex)',
                        type: 'FIXA',
                        expectedEntry: '08:00',
                        expectedBreak: '01:00',
                        expectedExit: '17:00',
                        weeklyHours: 40,
                        toleranceMinutes: 10,
                        daysOfWeek: 'MON,TUE,WED,THU,FRI',
                      })
                    }
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                  >
                    40h (08:00 às 17:00)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleForm({
                        name: 'Escala 12x36 Operacional',
                        type: '12X36',
                        expectedEntry: '07:00',
                        expectedBreak: '01:00',
                        expectedExit: '19:00',
                        weeklyHours: 36,
                        toleranceMinutes: 10,
                        daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN',
                      })
                    }
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                  >
                    12x36 (07:00 às 19:00)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome da Jornada *"
                  required
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                />

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Escala
                  </label>
                  <select
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                  >
                    <option value="FIXA">Horário Fixo Comercial (CLT Padrão)</option>
                    <option value="FLEXIVEL">Horário Flexível</option>
                    <option value="12X36">Escala 12x36</option>
                  </select>
                </div>

                <Input
                  label="Horário de Entrada *"
                  type="time"
                  required
                  value={scheduleForm.expectedEntry}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, expectedEntry: e.target.value })}
                />

                <Input
                  label="Intervalo de Refeição *"
                  type="time"
                  required
                  value={scheduleForm.expectedBreak}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, expectedBreak: e.target.value })}
                />

                <Input
                  label="Horário de Saída *"
                  type="time"
                  required
                  value={scheduleForm.expectedExit}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, expectedExit: e.target.value })}
                />

                <Input
                  label="Carga Horária Semanal (Horas) *"
                  type="number"
                  required
                  value={scheduleForm.weeklyHours}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, weeklyHours: parseInt(e.target.value) || 44 })}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => changeStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>

                <div className="flex items-center gap-2">
                  {schedules.length > 0 && (
                    <Button type="button" variant="outline" onClick={() => changeStep(4)}>
                      Pular & Avançar <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="bg-brand-primary" isLoading={addingSchedule}>
                    Salvar Jornada & Avançar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ==================================================== */}
      {/* ETAPA 4 — PRIMEIRO COLABORADOR */}
      {/* ==================================================== */}
      {currentStep === 4 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-primary" />
              <div>
                <CardTitle className="text-lg">Etapa 4: Cadastro do Primeiro Colaborador</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Associe seu primeiro colaborador aos cargos, departamentos e jornadas configuradas.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Colaboradores Já Cadastrados */}
            {employees.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Colaboradores Registrados ({employees.length})
                </h3>
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{emp.fullName}</p>
                        <p className="text-[11px] text-slate-500">
                          CPF: {formatCPF(emp.cpf)} • {emp.email}
                        </p>
                      </div>
                      <Badge variant="success" className="text-[10px]">Ativo</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário do Primeiro Colaborador */}
            <form onSubmit={handleRegisterEmployee} className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {employees.length > 0 ? 'Cadastrar Mais um Colaborador' : 'Informações do Colaborador'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo *"
                  required
                  placeholder="Ex.: Lucas Gabriel Silva"
                  value={employeeForm.fullName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                />

                <Input
                  label="CPF Oficial (Receita Federal) *"
                  required
                  placeholder="000.000.000-00"
                  value={employeeForm.cpf}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, cpf: formatCPF(e.target.value) })}
                />

                <Input
                  label="E-mail *"
                  type="email"
                  required
                  placeholder="lucas.silva@empresa.com.br"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                />

                <Input
                  label="Telefone / Celular"
                  placeholder="(11) 98765-4321"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: formatPhoneBR(e.target.value) })}
                />

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Departamento *
                  </label>
                  <select
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    value={employeeForm.departmentId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}
                  >
                    <option value="">Selecione o Departamento</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Cargo / Função *
                  </label>
                  <select
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    value={employeeForm.positionId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, positionId: e.target.value })}
                  >
                    <option value="">Selecione o Cargo</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Jornada de Trabalho *
                  </label>
                  <select
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    value={employeeForm.workScheduleId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, workScheduleId: e.target.value })}
                  >
                    <option value="">Selecione a Jornada</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.expectedEntry} - {s.expectedExit})
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Data de Admissão *"
                  type="date"
                  required
                  value={employeeForm.admissionDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, admissionDate: e.target.value })}
                />

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Contrato
                  </label>
                  <select
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    value={employeeForm.contractType}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, contractType: e.target.value })}
                  >
                    <option value="CLT">CLT (Consolidação das Leis do Trabalho)</option>
                    <option value="PJ">PJ (Prestador de Serviço)</option>
                    <option value="ESTAGIO">Estágio</option>
                  </select>
                </div>

                <Input
                  label="Salário Base Mensal (R$)"
                  type="number"
                  step="0.01"
                  placeholder="Ex.: 3500.00"
                  value={employeeForm.baseSalary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => changeStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>

                <div className="flex items-center gap-2">
                  {employees.length > 0 && (
                    <Button type="button" variant="outline" onClick={() => changeStep(5)}>
                      Avançar para Resumo <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="bg-brand-primary" isLoading={submitting}>
                    Cadastrar & Avançar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ==================================================== */}
      {/* ETAPA 5 — RESUMO & FINALIZAÇÃO */}
      {/* ==================================================== */}
      {currentStep === 5 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <div>
                <CardTitle className="text-lg">Etapa 5: Resumo e Ativação Operacional</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Revise a configuração do ambiente corporativo e conclua o onboarding.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Empresa */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Dados da Empresa
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{companyForm.name}</p>
                <p className="text-xs text-slate-500 font-mono">CNPJ: {formatCNPJ(companyForm.cnpj)}</p>
                {companyForm.email && <p className="text-xs text-slate-500">{companyForm.email}</p>}
                {companyForm.city && (
                  <p className="text-xs text-slate-400">
                    {companyForm.city} - {companyForm.state}
                  </p>
                )}
              </div>

              {/* Card Estrutura */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Estrutura Organizacional
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block font-medium">Departamentos:</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {departments.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Cargos:</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {positions.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Jornada */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Jornadas & Escalas
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {schedules.length > 0 ? schedules[0].name : 'Nenhuma jornada'}
                </p>
                {schedules.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {schedules[0].expectedEntry} às {schedules[0].expectedExit} • {schedules[0].weeklyHours}h semanais
                  </p>
                )}
              </div>

              {/* Card Colaboradores */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Colaboradores
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {employees.length > 0 ? employees[0].fullName : 'Nenhum cadastrado'}
                </p>
                {employees.length > 0 && (
                  <p className="text-xs text-slate-500 font-mono">
                    CPF: {formatCPF(employees[0].cpf)}
                  </p>
                )}
              </div>
            </div>

            {/* Checklist de Prontidão */}
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
              <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Checklist de Prontidão Operacional:
              </p>
              <ul className="space-y-1 text-emerald-700 dark:text-emerald-400 pl-6 list-disc">
                <li>Dados cadastrais e endereço salvos</li>
                <li>Pelo menos um departamento e um cargo criados</li>
                <li>Escala de trabalho e intervalos parametrizados</li>
                <li>Primeiro colaborador cadastrado e vinculado</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => changeStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>

              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                isLoading={submitting}
                onClick={handleCompleteOnboarding}
              >
                Concluir Onboarding & Ir para o Painel <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

