'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Building,
  User,
  Shield,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { TimesheetMonthSummary } from '@pontuarh/shared';

export default function PortalTimesheetPage() {
  const now = new Date();
  const currentCompetenceDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [competence, setCompetence] = useState<string>(currentCompetenceDefault);
  const [data, setData] = useState<TimesheetMonthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimesheet = async (comp: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<TimesheetMonthSummary>(`/timesheet/my-summary?competence=${comp}`);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar espelho de ponto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheet(competence);
  }, [competence]);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Navegação e Impressão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 text-xs font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Módulo de Apuração — Fase 2</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Meu Espelho de Ponto
          </h1>
          <p className="text-xs text-slate-500">
            Consulta de marcações originais, tratamentos homologados e saldo de horas.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 capitalize min-w-[140px] text-center font-mono">
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
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <Printer className="w-4 h-4 text-brand-primary" />
            <span>Imprimir PDF</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center print:hidden">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto mb-3" />
          <p className="text-sm text-slate-500">Calculando apuração da jornada de {formatCompetenceLabel(competence)}...</p>
        </Card>
      ) : error ? (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 print:hidden">
          <p className="font-semibold text-sm">Erro ao carregar espelho</p>
          <p className="text-xs mt-1">{error}</p>
        </Card>
      ) : data ? (
        <>
          {/* Cabeçalho Oficial do Espelho de Ponto (Aparece na tela e na impressão) */}
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-primary font-mono">
                      Pontua RH — Espelho de Ponto Eletrônico
                    </span>
                    <Badge variant="outline" className="text-[10px] print:hidden">
                      Portaria MTP nº 671/2021
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {data.employee.fullName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    CPF: {data.employee.cpf} • Matrícula: {data.employee.registrationNumber || 'N/A'} • Admissão: {data.employee.admissionDate ? new Date(data.employee.admissionDate).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div className="text-left md:text-right text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  <p><span className="font-medium text-slate-500">Cargo:</span> {data.employee.position?.title || 'Não informado'}</p>
                  <p><span className="font-medium text-slate-500">Departamento:</span> {data.employee.department?.name || 'Geral'}</p>
                  <p><span className="font-medium text-slate-500">Jornada:</span> {data.employee.workSchedule?.name || 'Padrão CLT 44h'}</p>
                  <p><span className="font-medium text-slate-500">Competência:</span> <strong className="capitalize font-mono">{formatCompetenceLabel(competence)}</strong></p>
                </div>
              </div>

              {/* Cards de KPIs Mensais */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Previstas</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {data.totalExpectedHours}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Trabalhadas</p>
                  <p className="text-lg font-bold font-mono text-brand-primary mt-0.5">
                    {data.totalWorkedHours}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Saldo Líquido</p>
                  <p
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      data.netBalanceHours >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {data.netBalanceHours >= 0 ? `+${data.netBalanceHours}h` : `${data.netBalanceHours}h`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Atrasos</p>
                  <p className="text-lg font-bold font-mono text-red-600 mt-0.5">
                    {Math.round(data.totalDelayMinutes / 60 * 10) / 10}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Excedentes</p>
                  <p className="text-lg font-bold font-mono text-amber-600 mt-0.5">
                    {Math.round(data.totalExtraMinutes / 60 * 10) / 10}h
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Incompletas</p>
                  <p className="text-lg font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {data.incompleteDaysCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela Diária Detalhada */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-2">Dia</th>
                    <th className="py-3 px-3">Jornada Prevista</th>
                    <th className="py-3 px-4">Marcações Realizadas (Originais / Tratadas)</th>
                    <th className="py-3 px-3 text-right">Intervalo</th>
                    <th className="py-3 px-3 text-right">Trabalhado</th>
                    <th className="py-3 px-3 text-right">Saldo</th>
                    <th className="py-3 px-3">Ocorrências</th>
                    <th className="py-3 px-3 text-right print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {data.days.map((day) => {
                    const isWeekend = day.dayOfWeek === 'Sábado' || day.dayOfWeek === 'Domingo';
                    return (
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
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {day.breakDurationFormatted !== '00:00' ? day.breakDurationFormatted : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100">
                          {day.workedHoursFormatted}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span
                            className={`font-semibold ${
                              day.balanceHours > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : day.balanceHours < 0
                                ? 'text-red-600 dark:text-red-400'
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
                              day.occurrences.map((occ, oIdx) => {
                                const variant = occ.includes('Falta') || occ.includes('Incompleta')
                                  ? 'danger'
                                  : occ.includes('Atraso')
                                  ? 'warning'
                                  : occ.includes('Férias') || occ.includes('Afastamento')
                                  ? 'info'
                                  : 'default';
                                return (
                                  <Badge key={oIdx} variant={variant} className="text-[10px] py-0 px-1.5">
                                    {occ}
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans print:hidden">
                          <Link href={`/portal/adjustments?date=${day.date}`}>
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-brand-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              title="Solicitar Ajuste para este dia"
                            >
                              Ajustar
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé Informativo e Assinaturas (Em conformidade com Portaria 671) */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-6">
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>
                  <strong>Legenda:</strong> (*) Marcação tratada via deferimento de solicitação de ajuste legal (marcações originais permanecem invioláveis nos termos do Art. 74 da CLT).
                </p>
                <p>
                  Documento emitido eletronicamente pela plataforma <strong>Pontua RH</strong>, amparada pelas disposições do Programa de Registrador Eletrônico de Ponto (REP-P), Portaria MTP nº 671/2021.
                </p>
              </div>

              {/* Área de Assinatura para Impressão */}
              <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-700 dark:text-slate-300">
                    {data.employee.fullName}
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
        </>
      ) : null}
    </div>
  );
}
