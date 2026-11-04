'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  FileText,
  CheckSquare,
  Scale,
  Palmtree,
  X,
  ShieldCheck,
  Clock,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/auth-context';

export interface PortalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortalSidebar({ isOpen, onClose }: PortalSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navGroups = [
    {
      group: 'PRINCIPAL',
      items: [
        { label: 'Meu Painel', href: '/portal', icon: LayoutDashboard },
        { label: 'Meu Perfil', href: '/portal/profile', icon: User },
      ],
    },
    {
      group: 'PONTO & JORNADA',
      items: [
        { label: 'Espelho de Ponto', href: '/portal/timesheet', icon: FileText },
        { label: 'Solicitar Ajuste', href: '/portal/adjustments', icon: CheckSquare },
        { label: 'Banco de Horas', href: '/portal/time-bank', icon: Scale },
        { label: 'Férias & Afastamentos', href: '/portal/vacations', icon: Palmtree },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 shadow-xl lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <Link href="/portal" className="flex items-center" onClick={onClose}>
            <Logo variant="dark" subtitle="Colaborador" size="md" />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {group.group}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all group',
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/20 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card / Info Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {user?.companyName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-[11px] text-slate-400 border border-slate-700/50">
              <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{user.companyName}</span>
            </div>
          )}

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Ponto Eletrônico</p>
              <p className="text-[11px] text-slate-400">REP-P / Portaria 671 MTP</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

