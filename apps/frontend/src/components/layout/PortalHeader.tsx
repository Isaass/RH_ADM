'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, LogOut, User, LayoutDashboard, FileText, CheckSquare, ChevronRight, Scale, Palmtree } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

import { Logo } from '@/components/ui/Logo';

export function PortalHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = [
    { label: 'Meu Painel', href: '/portal', icon: LayoutDashboard },
    { label: 'Espelho de Ponto', href: '/portal/timesheet', icon: FileText },
    { label: 'Solicitar Ajuste', href: '/portal/adjustments', icon: CheckSquare },
    { label: 'Banco de Horas', href: '/portal/time-bank', icon: Scale },
    { label: 'Férias & Afastamentos', href: '/portal/vacations', icon: Palmtree },
    { label: 'Meu Perfil', href: '/portal/profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="flex items-center">
            <Logo variant="auto" subtitle="Colaborador" size="sm" />
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-brand-primary dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.name || 'Colaborador'}
              </p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
