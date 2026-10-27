'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import { UserRole } from '@pontuarh/shared';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === UserRole.COLABORADOR) {
        router.push('/portal');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Coluna Esquerda: Apresentação da Marca SaaS */}
      <div className="lg:w-1/2 bg-slate-900 text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topo / Marca */}
        <div className="relative z-10 flex items-center justify-between">
          <Logo variant="dark" subtitle="SaaS Corporativo" size="lg" />
          <ThemeToggle />
        </div>

        {/* Mensagem de valor */}
        <div className="relative z-10 my-12 lg:my-0 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-6 border border-blue-500/20">
            <Shield className="w-3.5 h-3.5" />
            <span>Fase 1: Fundação & Multitenancy CLT</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Gestão Estratégica de RH e Controle Eletrônico de Ponto.
          </h1>

          <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            Plataforma corporativa moderna para controle de colaboradores, jornadas, sigilo financeiro e adequação legal aos preceitos da Portaria MTP nº 671/2021.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Isolamento estrito por Empresa</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Controle de Acesso RBAC Nativo</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Proteção e Sigilo Salarial</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Validação Oficial de CPF</span>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="relative z-10 text-xs text-slate-400">
          <p>© 2026 Pontua RH. Todos os direitos reservados. Preparado para expansão SaaS e PWA.</p>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Autenticação */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Acesse sua conta
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Informe suas credenciais corporativas para entrar na plataforma.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail Corporativo"
              type="email"
              required
              placeholder="seu.email@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Senha de Acesso"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-slate-400">
                Acesso seguro criptografado (SHA-256 / bcrypt)
              </span>
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5 text-base" isLoading={loading}>
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Seletor de Perfis para Demonstração / Avaliação Rápida */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Acesso Rápido para Avaliação (Demonstração)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@pontuarh.com.br', 'Admin@123456')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary bg-white dark:bg-slate-900 text-left transition-all group"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-primary">
                  Admin Empresa
                </p>
                <p className="text-[11px] text-slate-500 font-mono">admin@pontuarh.com.br</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('rh@pontuarh.com.br', 'Rh@123456')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary bg-white dark:bg-slate-900 text-left transition-all group"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-primary">
                  Gestor de RH
                </p>
                <p className="text-[11px] text-slate-500 font-mono">rh@pontuarh.com.br</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('gestor@pontuarh.com.br', 'Gestor@123456')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary bg-white dark:bg-slate-900 text-left transition-all group"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-primary">
                  Gestor de Equipe
                </p>
                <p className="text-[11px] text-slate-500 font-mono">gestor@pontuarh.com.br</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('colaborador@pontuarh.com.br', 'Colab@123456')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary bg-white dark:bg-slate-900 text-left transition-all group"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-primary">
                  Colaborador
                </p>
                <p className="text-[11px] text-slate-500 font-mono">colaborador@pontuarh.com.br</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
