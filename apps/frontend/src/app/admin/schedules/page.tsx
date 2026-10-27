'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Clock,
  Shield,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Power,
  UserPlus,
  Loader2,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { WorkSchedule, ScheduleType } from '@pontuarh/shared';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>(ScheduleType.FIXA);
  const [formDailyHours, setFormDailyHours] = useState(8.0);
  const [formWeeklyHours, setFormWeeklyHours] = useState(44.0);
  const [formExpectedEntry, setFormExpectedEntry] = useState('08:00');
  const [formExpectedExit, setFormExpectedExit] = useState('17:00');
  const [formExpectedBreak, setFormExpectedBreak] = useState('01:00');
  const [formDaysOfWeek, setFormDaysOfWeek] = useState('MON,TUE,WED,THU,FRI');
  const [formTolerance, setFormTolerance] = useState(10);
  const [formNightShift, setFormNightShift] = useState(false);
  const [formBreakFlexible, setFormBreakFlexible] = useState(false);
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get<WorkSchedule[]>('/schedules');
      setSchedules(res || []);
    } catch (err: any) {
      console.error('Erro ao listar jornadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get<any[]>('/employees');
      setEmployeesList(res || []);
    } catch (err: any) {
      console.error('Erro ao listar colaboradores:', err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchEmployees();
  }, []);

  const openCreateModal = () => {
    setFormId(null);
    setFormName('');
    setFormType(ScheduleType.FIXA);
    setFormDailyHours(8.0);
    setFormWeeklyHours(44.0);
    setFormExpectedEntry('08:00');
    setFormExpectedExit('17:00');
    setFormExpectedBreak('01:00');
    setFormDaysOfWeek('MON,TUE,WED,THU,FRI');
    setFormTolerance(10);
    setFormNightShift(false);
    setFormBreakFlexible(false);
    setFormValidFrom('');
    setFormValidUntil('');
    setFormDescription('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (s: WorkSchedule) => {
    setFormId(s.id);
    setFormName(s.name);
    setFormType(s.type || ScheduleType.FIXA);
    setFormDailyHours(s.dailyHours);
    setFormWeeklyHours(s.weeklyHours);
    setFormExpectedEntry(s.expectedEntry);
    setFormExpectedExit(s.expectedExit);
    setFormExpectedBreak(s.expectedBreak);
    setFormDaysOfWeek(s.daysOfWeek);
    setFormTolerance(s.toleranceMinutes || 10);
    setFormNightShift(s.nightShift);
    setFormBreakFlexible(s.breakFlexible);
    setFormValidFrom(s.validFrom ? s.validFrom.split('T')[0] : '');
    setFormValidUntil(s.validUntil ? s.validUntil.split('T')[0] : '');
    setFormDescription(s.description || '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openAssignModal = (s: WorkSchedule) => {
    setSelectedSchedule(s);
    // Pré-selecionar colaboradores vinculados a essa jornada
    const assigned = employeesList
      .filter((emp) => emp.workScheduleId === s.id)
      .map((emp) => emp.id);
    setSelectedEmployeeIds(assigned);
    setAssignModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: formName,
      type: formType,
      dailyHours: Number(formDailyHours),
      weeklyHours: Number(formWeeklyHours),
      expectedEntry: formExpectedEntry,
      expectedExit: formExpectedExit,
      expectedBreak: formExpectedBreak,
      daysOfWeek: formDaysOfWeek,
      toleranceMinutes: Number(formTolerance),
      nightShift: formNightShift,
      breakFlexible: formBreakFlexible,
      validFrom: formValidFrom || undefined,
      validUntil: formValidUntil || undefined,
      description: formDescription || undefined,
    };

    try {
      if (formId) {
        await api.put(`/schedules/${formId}`, payload);
      } else {
        await api.post('/schedules', payload);
      }
      setModalOpen(false);
      await fetchSchedules();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar jornada de trabalho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/schedules/${id}/status`);
      await fetchSchedules();
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar status da jornada.');
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedSchedule) return;
    setIsSubmitting(true);
    try {
      await api.post(`/schedules/${selectedSchedule.id}/assign`, {
        employeeIds: selectedEmployeeIds,
      });
      setAssignModalOpen(false);
      await fetchSchedules();
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Erro ao associar colaboradores.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Gestão de Jornadas de Trabalho"
          description="Parametrização de cargas horárias, escalas fixas/flexíveis, tolerâncias e vigência para apuração do ponto."
        />
        <Button onClick={openCreateModal} variant="primary" className="flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span>Criar Nova Jornada</span>
        </Button>
      </div>

      {/* Alerta de Conformidade Legal */}
      <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex items-start gap-3">
        <Shield className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Regras Contratuais e Limites Constitucionais da Jornada (CLT Art. 58 e CF/88 Art. 7º)
          </p>
          <p className="mt-0.5">
            As jornadas configuradas definem os horários previstos e tolerâncias de atraso (Art. 58 § 1º: até 10 minutos diários não computáveis). A apuração de ponto utiliza esses parâmetros para cálculo de horas normais e excedentes.
          </p>
        </div>
      </div>

      {/* Grade de Jornadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-brand-primary" />
            Carregando jornadas de trabalho...
          </div>
        ) : schedules.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            <CalendarClock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p>Nenhuma jornada de trabalho cadastrada.</p>
          </div>
        ) : (
          schedules.map((sched) => (
            <Card key={sched.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{sched.name}</CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {sched.weeklyHours}h/sem • {sched.dailyHours}h/dia ({sched.type || 'FIXA'})
                    </CardDescription>
                  </div>
                  <Badge variant={sched.active ? 'success' : 'default'}>
                    {sched.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Entrada</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      {sched.expectedEntry}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Intervalo</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      {sched.expectedBreak}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Saída</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      {sched.expectedExit}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Dias de Trabalho:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {sched.daysOfWeek}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tolerância Diária:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {sched.toleranceMinutes || 10} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Colaboradores Vinculados:</span>
                    <span className="font-bold text-brand-primary">
                      {sched.employeesCount || 0}
                    </span>
                  </div>
                </div>

                {/* Ações da Jornada */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAssignModal(sched)}
                    className="text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                    <span>Vincular</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(sched)}
                      className="p-1 h-8 w-8 text-slate-500 hover:text-brand-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(sched.id)}
                      className={`p-1 h-8 w-8 ${
                        sched.active ? 'text-emerald-500 hover:text-red-500' : 'text-slate-400 hover:text-emerald-500'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Criar/Editar Jornada */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={formId ? 'Editar Jornada de Trabalho' : 'Criar Nova Jornada de Trabalho'}
        description="Parametrização de horários contratuais e tolerâncias"
      >
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Jornada *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Comercial Padrão 44h (Seg-Sex)"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo da Escala
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value={ScheduleType.FIXA}>Fixa</option>
                <option value={ScheduleType.FLEXIVEL}>Flexível</option>
                <option value={ScheduleType.ESCALA_12X36}>Escala 12x36</option>
                <option value={ScheduleType.ESCALA_6X1}>Escala 6x1</option>
                <option value={ScheduleType.ESCALA_5X2}>Escala 5x2</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Carga Diária (h)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formDailyHours}
                onChange={(e) => setFormDailyHours(parseFloat(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Carga Semanal (h)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={formWeeklyHours}
                onChange={(e) => setFormWeeklyHours(parseFloat(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Entrada Prevista *
              </label>
              <input
                type="time"
                required
                value={formExpectedEntry}
                onChange={(e) => setFormExpectedEntry(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Intervalo Previsto *
              </label>
              <input
                type="time"
                required
                value={formExpectedBreak}
                onChange={(e) => setFormExpectedBreak(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Saída Prevista *
              </label>
              <input
                type="time"
                required
                value={formExpectedExit}
                onChange={(e) => setFormExpectedExit(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dias de Trabalho (separados por vírgula)
              </label>
              <input
                type="text"
                value={formDaysOfWeek}
                onChange={(e) => setFormDaysOfWeek(e.target.value)}
                placeholder="MON,TUE,WED,THU,FRI"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tolerância Diária (minutos)
              </label>
              <input
                type="number"
                value={formTolerance}
                onChange={(e) => setFormTolerance(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={formNightShift}
                onChange={(e) => setFormNightShift(e.target.checked)}
                className="rounded text-brand-primary"
              />
              <span>Jornada Noturna (atravessa meia-noite)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={formBreakFlexible}
                onChange={(e) => setFormBreakFlexible(e.target.checked)}
                className="rounded text-brand-primary"
              />
              <span>Intervalo Flexível</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="w-1/2"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-1/2"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Jornada'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Associação de Colaboradores */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Vincular Colaboradores à Jornada`}
        description={selectedSchedule?.name || ''}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Selecione os colaboradores que deverão cumprir esta escala de trabalho:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            {employeesList.map((emp) => {
              const isChecked = selectedEmployeeIds.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEmployeeSelection(emp.id)}
                      className="rounded text-brand-primary"
                    />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{emp.fullName}</p>
                      <p className="text-[11px] text-slate-400">CPF: {emp.cpf} • {emp.department?.name || 'Geral'}</p>
                    </div>
                  </div>
                  {emp.workScheduleId === selectedSchedule?.id && (
                    <Badge variant="outline" className="text-[10px]">Vinculado</Badge>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              className="w-1/2"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting}
              onClick={handleSaveAssignment}
              className="w-1/2"
            >
              {isSubmitting ? 'Salvando...' : `Salvar (${selectedEmployeeIds.length} selecionados)`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
