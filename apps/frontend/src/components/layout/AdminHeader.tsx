'use client';

import React from 'react';
import { Menu, LogOut, ShieldCheck, Building } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Badge } from '@/components/ui/Badge';

export interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { user, logout } = useAuth();

  const roleLabelMap: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN_EMPRESA: 'Diretoria / Admin',
    RH: 'Gestão de RH',
    GESTOR: 'Gestor de Equipe',
    COLABORADOR: 'Colaborador',
    CONTADOR: 'Contabilidade',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {user?.companyName && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            <Building className="w-3.5 h-3.5 text-brand-primary" />
            <span>{user.companyName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.name || 'Administrador'}
            </p>
            <div className="mt-0.5">
              <Badge variant="info" className="text-[10px] py-0 px-2 font-mono">
                {user ? roleLabelMap[user.role] || user.role : 'Acesso Restrito'}
              </Badge>
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-primary to-blue-600 text-white font-semibold flex items-center justify-center text-sm shadow-sm ring-2 ring-white dark:ring-slate-900">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>

          <button
            onClick={logout}
            title="Sair do sistema"
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
