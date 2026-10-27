'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Shield, Briefcase, Building, Calendar, Phone, Mail, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCPF } from '@pontuarh/shared';

export default function PortalProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/auth/me')
      .then((data) => setProfile(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const emp = profile?.employee;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/portal">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Voltar ao Painel</span>
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Meu Perfil Profissional"
        description="Ficha cadastral funcional e dados contratuais registrados na empresa."
      />

      {emp ? (
        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-primary to-blue-500 text-white font-bold text-3xl flex items-center justify-center shadow-lg">
                {emp.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{emp.fullName}</h2>
                  <Badge variant={emp.status === 'ATIVO' ? 'success' : 'danger'}>{emp.status}</Badge>
                </div>
                <p className="text-sm text-slate-500">{emp.position?.title || 'Colaborador'}</p>
                <p className="text-xs text-slate-400 font-mono">Matrícula: {emp.registrationNumber || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Dados Civis */}
          <Card>
            <CardHeader>
              <CardTitle>Identificação Civil</CardTitle>
              <CardDescription>Informações registradas no cadastro de admissão</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">CPF</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {formatCPF(emp.cpf)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">E-mail Corporativo</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{emp.email}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Telefone de Contato</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {emp.phone || 'Não informado'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Data de Nascimento</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('pt-BR') : 'Não informada'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dados Funcionais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Funcionais e Contratuais</CardTitle>
              <CardDescription>Estrutura organizacional, jornada e liderança</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Departamento</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {emp.department?.name || 'Geral'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Data de Admissão</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {new Date(emp.admissionDate).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Tipo de Contrato</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{emp.contractType}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">Gestor Imediato</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {emp.manager?.fullName || 'Diretoria Executiva'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Aviso de Sigilo Financeiro */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
            <Shield className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Privacidade & Segurança de Dados (LGPD)
              </p>
              <p className="mt-0.5">
                Em respeito às políticas de segurança corporativa e confidencialidade, dados salariais e holerites serão disponibilizados exclusivamente no módulo de contracheques digitais criptografados.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            Nenhum vínculo de colaborador associado a este usuário.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
