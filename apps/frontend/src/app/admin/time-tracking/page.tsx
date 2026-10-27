'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { TimesheetMonthSummary } from '@pontuarh/shared';

export default function AdminTimeTrackingPage() {
  const now = new Date();
  const defaultComp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [competence, setCompetence] = useState<string>(defaultComp);
  const [timesheet, setTimesheet] = useState<TimesheetMonthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Carregar lista de colaboradores
  useEffect(() => {
    api.get<any[]>('/employees')
      .then((res) => {
        setEmployees(res || []);
        if (res && res.length > 0) {
          setSelectedEmployeeId(res[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingEmployees(false));
  }, []);

  // Carregar espelho do colaborador selecionado
  useEffect(() => {
    if (!selectedEmployeeId) return;

    setLoading(true);
    api.get<TimesheetMonthSummary>(`/timesheet/summary?employeeId=${selectedEmployeeId}&competence=${competence}`)
      .then(setTimesheet)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedEmployeeId, competence]);

  const changeMonth = (offset: number) => {
    const [y, m] = competence.split('-').map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    const newComp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCompetence(newComp);
  };

  const formatCompetenceLabel = (comp: string) => {
    const [y, m] = comp.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Espelho & Monitoramento de Ponto"
          description="Auditoria de marcações diárias, comparativo entre horários previstos e realizados e apuração mensal de jornada."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Competência */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeMonth(-1)}
              className="p-1 h-8 w-8 text-slate-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 capitalize min-w-[130px] text-center font-mono">
              {formatCompetenceLabel(competence)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeMonth(1)}
              className="p-1 h-8 w-8 text-slate-500"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <Printer className="w-4 h-4 text-brand-primary" />
            <span>Imprimir Espelho Oficial</span>
          </Button>
        </div>
      </div>

      {/* Seletor de Colaborador */}
      <Card className="print:hidden border border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              Colaborador:
            </label>
            {loadingEmployees ? (
              <span className="text-xs text-slate-400">Carregando lista...</span>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full sm:w-80 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.cpf}) — {emp.department?.name || 'Geral'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Imutabilidade Garantida (Portaria 671/2021)</span>
          </div>
        </CardContent>
      </Card>

      {/* Exibição do Espelho de Ponto */}
      {loading ? (
        <Card className="p-12 text-center print:hidden">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto mb-3" />
          <p className="text-sm text-slate-500">Calculando apuração de jornada...</p>
        </Card>
      ) : timesheet ? (
        <div className="space-y-6">
          {/* Cabeçalho do Relatório */}
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-primary font-mono">
                      Pontua RH — Espelho de Ponto Eletrônico
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Conforme Portaria MTP nº 671/2021
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {timesheet.employee.fullName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    CPF: {timesheet.employee.cpf} • Matrícula: {timesheet.employee.registrationNumber || 'N/A'} • Admissão: {timesheet.employee.admissionDate ? new Date(timesheet.employee.admissionDate).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div className="text-left md:text-right text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  <p><span className="font-medium text-slate-500">Cargo:</span> {timesheet.employee.position?.title || 'Não informado'}</p>
                  <p><span className="font-medium text-slate-500">Departamento:</span> {timesheet.employee.department?.name || 'Geral'}</p>
                  <p><span className="font-medium text-slate-500">Jornada:</span> {timesheet.employee.workSchedule?.name || 'Padrão CLT 44h'}</p>
                  <p><span className="font-medium text-slate-500">Competência:</span> <strong className="capitalize font-mono">{formatCompetenceLabel(competence)}</strong></p>
                </div>
              </div>

              {/* KPIs Mensais */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Previstas</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {timesheet.totalExpectedHours}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Trabalhadas</p>
                  <p className="text-lg font-bold font-mono text-brand-primary mt-0.5">
                    {timesheet.totalWorkedHours}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Saldo Líquido</p>
                  <p
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      timesheet.netBalanceHours >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {timesheet.netBalanceHours >= 0 ? `+${timesheet.netBalanceHours}h` : `${timesheet.netBalanceHours}h`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Atrasos</p>
                  <p className="text-lg font-bold font-mono text-red-600 mt-0.5">
                    {Math.round(timesheet.totalDelayMinutes / 60 * 10) / 10}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Excedentes</p>
                  <p className="text-lg font-bold font-mono text-amber-600 mt-0.5">
                    {Math.round(timesheet.totalExtraMinutes / 60 * 10) / 10}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Incompletas</p>
                  <p className="text-lg font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {timesheet.incompleteDaysCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela do Mês */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-2">Dia</th>
                    <th className="py-3 px-3">Previsto</th>
                    <th className="py-3 px-4">Marcações Realizadas (Originais / Tratadas)</th>
                    <th className="py-3 px-2 text-center">Intervalo</th>
                    <th className="py-3 px-2 text-center">Trabalhado</th>
                    <th className="py-3 px-2 text-center">Saldo</th>
                    <th className="py-3 px-3">Ocorrências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {timesheet.days.map((day) => (
                    <tr
                      key={day.date}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        !day.isWorkday ? 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-400' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {day.date.split('-')[2]}
                      </td>
                      <td className="py-2.5 px-2 font-sans text-slate-600 dark:text-slate-400 text-[11px]">
                        {day.dayOfWeek.substring(0, 3)}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[11px] text-slate-500">
                        {day.expectedSchedule ? (
                          <span>
                            {day.expectedSchedule.entry} - {day.expectedSchedule.exit}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">DSR / Folga</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {day.treatedPunches.length === 0 ? (
                            <span className="text-slate-400 text-[11px] italic font-sans">—</span>
                          ) : (
                            day.treatedPunches.map((punch, idx) => (
                              <span
                                key={idx}
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  punch.isTreated
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-blue-50 text-brand-primary border border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                                title={punch.isTreated ? 'Marcação incluída via Ajuste Aprovado' : 'Marcação Original'}
                              >
                                {punch.time}
                                {punch.isTreated && <span className="ml-1 text-[9px] font-sans">*</span>}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400">
                        {day.breakDurationFormatted !== '00:00' ? day.breakDurationFormatted : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-slate-100">
                        {day.workedHoursFormatted}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`font-semibold ${
                            day.balanceHours > 0
                              ? 'text-emerald-600'
                              : day.balanceHours < 0
                              ? 'text-red-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {day.balanceHoursFormatted}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {day.occurrences.length === 0 ? (
                            <span className="text-slate-400 text-[10px]">—</span>
                          ) : (
                            day.occurrences.map((occ, oIdx) => (
                              <span
                                key={oIdx}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  occ.includes('Incompleta') || occ.includes('Falta')
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : occ.includes('Atraso')
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                }`}
                              >
                                {occ}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé e Assinaturas */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-6">
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>
                  <strong>Legenda:</strong> (*) Marcação tratada via deferimento de solicitação de ajuste legal (marcações originais permanecem invioláveis nos termos do Art. 74 da CLT).
                </p>
                <p>
                  Documento emitido eletronicamente pela plataforma <strong>Pontua RH</strong>, amparada pelas disposições do Programa de Registrador Eletrônico de Ponto (REP-P), Portaria MTP nº 671/2021.
                </p>
              </div>

              <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-700 dark:text-slate-300">
                    {timesheet.employee.fullName}
                  </div>
                  <p className="text-[10px] text-slate-400">Assinatura do Empregado / Colaborador</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-700 dark:text-slate-300">
                    Empregador / Responsável de RH
                  </div>
                  <p className="text-[10px] text-slate-400">Assinatura do Representante Legal</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
