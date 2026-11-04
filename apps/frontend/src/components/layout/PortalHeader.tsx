'use client';

import React from 'react';
import { Menu, LogOut, Building, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Badge } from '@/components/ui/Badge';

export interface PortalHeaderProps {
  onToggleSidebar: () => void;
}

export function PortalHeader({ onToggleSidebar }: PortalHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Esquerda: Botão Menu Mobile & Identificação */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
            Portal do Colaborador
          </span>
          {user?.companyName && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Building className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-xs">{user.companyName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Tema, Perfil do Usuário e Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Card do Usuário */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.name || 'Colaborador'}
            </p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
          </div>

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-white dark:ring-slate-900">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
          </div>

          <button
            onClick={logout}
            title="Sair do portal"
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
