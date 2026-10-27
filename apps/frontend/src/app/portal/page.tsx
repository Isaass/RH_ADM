'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  Shield,
  Printer,
  Sparkles,
  Calendar,
  Layers,
  CheckSquare,
  Loader2,
  Scale,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { TimeEntryType } from '@pontuarh/shared';

export default function PortalHomePage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [loadingPunches, setLoadingPunches] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);
  const [selectedPunchType, setSelectedPunchType] = useState<string>('');

  // Atualizar relógio a cada segundo
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Carregar batidas de hoje
  const fetchTodayPunches = async () => {
    try {
      setLoadingPunches(true);
      const res = await api.get<{ count: number; entries: any[] }>('/time-tracking/today');
      setTodayPunches(res.entries || []);
    } catch (err: any) {
      console.error('Erro ao carregar marcações de hoje:', err);
    } finally {
      setLoadingPunches(false);
    }
  };

  useEffect(() => {
    fetchTodayPunches();
  }, []);

  const getGreeting = () => {
    if (!currentTime) return 'Olá';
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handlePunchClock = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const payload: any = { origin: 'WEB' };
      if (selectedPunchType) {
        payload.type = selectedPunchType;
      }
      const response = await api.post<any>('/time-tracking/punch', payload);
      setSuccessReceipt(response);
      setSelectedPunchType('');
      // Atualizar lista de marcações de hoje
      await fetchTodayPunches();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao registrar ponto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = currentTime
    ? currentTime.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  const getTypeBadge = (type: string) => {
    switch (type) {
      case TimeEntryType.ENTRADA:
        return <Badge variant="info">1ª Entrada</Badge>;
      case TimeEntryType.INTERVALO_SAIDA:
        return <Badge variant="warning">Saída Intervalo</Badge>;
      case TimeEntryType.INTERVALO_RETORNO:
        return <Badge variant="info">Retorno Intervalo</Badge>;
      case TimeEntryType.SAIDA:
        return <Badge variant="success">Saída Expediente</Badge>;
      default:
        return <Badge variant="default">Adicional</Badge>;
    }
  };

  const predictedPunch = (() => {
    const count = todayPunches.length;
    switch (count) {
      case 0:
        return { label: '1ª Entrada', type: TimeEntryType.ENTRADA, action: 'Registrar Entrada' };
      case 1:
        return { label: 'Saída Almoço', type: TimeEntryType.INTERVALO_SAIDA, action: 'Registrar Saída Almoço' };
      case 2:
        return { label: 'Retorno Almoço', type: TimeEntryType.INTERVALO_RETORNO, action: 'Registrar Retorno Almoço' };
      case 3:
        return { label: 'Saída Expediente', type: TimeEntryType.SAIDA, action: 'Registrar Saída' };
      default:
        return { label: 'Marcação Adicional', type: '', action: 'Registrar Ponto' };
    }
  })();

  return (
    <div className="space-y-6">
      {/* Topo: Saudação e Identificação */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-primary dark:text-blue-400 text-xs font-semibold mb-2 border border-blue-200 dark:border-blue-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Portal do Colaborador • Autoatendimento</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Colaborador'}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 capitalize">
            {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/portal/timesheet">
            <Button variant="outline" size="sm" className="text-xs">
              <FileText className="w-4 h-4 mr-1.5 text-slate-500" />
              <span>Ver Espelho de Ponto</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta de Erro se houver */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-3 text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="text-sm">
            <p className="font-semibold">Atenção no registro</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Card Principal de Batida de Ponto (Conforme UI/UX Skill) */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Barra superior de status e sincronização */}
        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Controle Eletrônico de Ponto (REP-P)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">Fuso: UTC-3 (Brasília)</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Conexão Segura</span>
            </span>
          </div>
        </div>

        <CardContent className="p-6 sm:p-10 flex flex-col items-center text-center">
          {/* Data por extenso */}
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider capitalize">
            {formattedDate}
          </p>

          {/* Relógio Digital Ativo Grande em Fonte Mono */}
          <div className="my-3 font-mono text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums select-none">
            {formattedTime}
          </div>

          <p className="text-[11px] font-mono text-slate-400 mb-6">
            Timestamp Inviolável do Servidor • Portaria MTP nº 671/2021
          </p>

          {/* Botão Principal de Registro com Próximo Passo Previsto */}
          <div className="w-full max-w-md space-y-3">
            <Button
              onClick={handlePunchClock}
              disabled={isSubmitting}
              size="lg"
              className="w-full py-4 text-base font-bold bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] transition-all text-white rounded-xl shadow-subtle flex items-center justify-center gap-2.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gravando Registro Oficial...</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  <span>Bater Ponto Agora</span>
                  <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-md font-medium ml-1">
                    {selectedPunchType
                      ? selectedPunchType === TimeEntryType.ENTRADA
                        ? 'Entrada'
                        : selectedPunchType === TimeEntryType.INTERVALO_SAIDA
                        ? 'Saída Almoço'
                        : selectedPunchType === TimeEntryType.INTERVALO_RETORNO
                        ? 'Retorno Almoço'
                        : 'Saída'
                      : `Previsto: ${predictedPunch.label}`}
                  </span>
                </>
              )}
            </Button>

            {/* Alternância rápida de etapa caso necessário */}
            <div className="pt-2">
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
                Alternar etapa (se diferente da previsão automática):
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {[
                  { label: 'Automático', value: '' },
                  { label: 'Entrada', value: TimeEntryType.ENTRADA },
                  { label: 'Saída Almoço', value: TimeEntryType.INTERVALO_SAIDA },
                  { label: 'Retorno Almoço', value: TimeEntryType.INTERVALO_RETORNO },
                  { label: 'Saída', value: TimeEntryType.SAIDA },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedPunchType(opt.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      selectedPunchType === opt.value
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-medium'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico do Dia: Marcações Realizadas Hoje */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-primary" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Minhas Marcações de Hoje ({formattedDate})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {todayPunches.length} marcação(ões) registrada(s)
            </span>
          </div>

          {loadingPunches ? (
            <div className="py-6 flex justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-primary" />
              Carregando histórico do dia...
            </div>
          ) : todayPunches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p>Nenhuma marcação realizada hoje até o momento.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique no botão acima para registrar o início da sua jornada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {todayPunches.map((punch, idx) => (
                <div
                  key={punch.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-medium">
                      #{idx + 1} • {punch.origin}
                    </p>
                    <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {punch.time}
                    </p>
                    {getTypeBadge(punch.type)}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade de Atalhos dos Módulos das Fases 2 e 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/portal/profile">
          <Card className="hover:border-brand-primary hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-brand-primary w-fit mb-3">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Meus Dados Cadastrais
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Consulte suas informações contratuais, cargo, departamento e escala.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-brand-primary">
                <span>Acessar perfil</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/timesheet">
          <Card className="hover:border-brand-primary hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 w-fit">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant="success" className="text-[10px]">Ativo • Fase 2</Badge>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Espelho de Ponto
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Consulta diária e mensal de marcações, totalização de horas e espelho.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-brand-primary">
                <span>Ver espelho mensal</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/adjustments">
          <Card className="hover:border-brand-primary hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 w-fit">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <Badge variant="info" className="text-[10px]">Ativo • Fase 2</Badge>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Solicitar Ajuste
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Inclusão de marcações esquecidas e envio de justificativas de atrasos.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-brand-primary">
                <span>Minhas solicitações</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/time-bank">
          <Card className="hover:border-brand-primary hover:shadow-md transition-all cursor-pointer h-full border-blue-200 dark:border-blue-900/50 bg-gradient-to-b from-white to-blue-50/20 dark:from-slate-900 dark:to-blue-950/20">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-brand-primary w-fit">
                    <Scale className="w-5 h-5" />
                  </div>
                  <Badge variant="success" className="text-[10px]">Ativo • Fase 3</Badge>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Banco de Horas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Saldo acumulado, extrato de créditos/débitos e solicitação de folgas.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-brand-primary">
                <span>Consultar saldo</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Modal de Comprovante de Registro de Ponto Eletrônico (REP-P) */}
      <Modal
        isOpen={Boolean(successReceipt)}
        onClose={() => setSuccessReceipt(null)}
        title="Comprovante de Registro de Ponto"
        description="Registrador Eletrônico de Ponto via Programa (Portaria MTP nº 671/2021)"
      >
        {successReceipt && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Ponto Registrado com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {successReceipt.entry?.formattedDate} às {successReceipt.entry?.formattedTime}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-2.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Empregador:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{successReceipt.company?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CNPJ:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{successReceipt.company?.cnpj}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Colaborador:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{successReceipt.employee?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CPF:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{successReceipt.employee?.cpf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo de Evento:</span>
                <span className="font-semibold text-brand-primary">{successReceipt.entry?.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NSR / ID Registro:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">{successReceipt.entry?.id}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  Hash de Integridade Criptográfica (SHA-256):
                </p>
                <p className="font-mono text-[10px] text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 mt-1">
                  {successReceipt.entry?.hashIntegrity}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="w-1/2 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setSuccessReceipt(null)}
                className="w-1/2"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
