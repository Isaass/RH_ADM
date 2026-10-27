'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Clock,
  CheckSquare,
  Scale,
  Palmtree,
  Wallet,
  Landmark,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';

export interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      group: 'PRINCIPAL',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'GESTÃO DE PESSOAS',
      items: [
        { label: 'Colaboradores', href: '/admin/employees', icon: Users },
        { label: 'Departamentos e Cargos', href: '/admin/departments', icon: Building2 },
      ],
    },
    {
      group: 'PONTO & JORNADA',
      items: [
        { label: 'Jornadas de Trabalho', href: '/admin/schedules', icon: CalendarClock },
        { label: 'Espelho & Marcações', href: '/admin/time-tracking', icon: Clock },
        { label: 'Ajustes e Solicitações', href: '/admin/adjustments', icon: CheckSquare },
        { label: 'Banco de Horas', href: '/admin/time-bank', icon: Scale },
        { label: 'Férias & Afastamentos', href: '/admin/vacations', icon: Palmtree },
      ],
    },
    {
      group: 'EXPANSÃO FUTURA',
      items: [
        { label: 'Prévia de Folha', href: '/admin/payroll', icon: Wallet, badge: 'Fase 5' },
      ],
    },
    {
      group: 'CONFIGURAÇÕES',
      items: [
        { label: 'Dados da Empresa', href: '/admin/company', icon: Landmark },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <Link href="/admin/dashboard" className="flex items-center">
            <Logo variant="dark" subtitle="SaaS Corporativo" size="md" />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navItems.map((group, idx) => (
            <div key={idx}>
              <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {group.group}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => onClose()}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group',
                        isActive
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'w-4 h-4 transition-colors',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Fase 2: Ponto Ativo</p>
              <p className="text-[11px] text-slate-400">REP-P / Portaria 671</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
