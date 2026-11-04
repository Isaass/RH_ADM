'use client';

import React from 'react';
import { Menu, LogOut, Shield, Globe } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Badge } from '@/components/ui/Badge';

export interface SuperAdminHeaderProps {
  onToggleSidebar: () => void;
}

export function SuperAdminHeader({ onToggleSidebar }: SuperAdminHeaderProps) {
  const { user, logout } = useAuth();

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

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
          <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Controle Global Multiempresa</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.name || 'Super Administrador'}
            </p>
            <div className="mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                <Shield className="w-2.5 h-2.5" />
                SUPER ADMIN
              </span>
            </div>
          </div>

          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-purple-600/20">
            SA
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            title="Encerrar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
