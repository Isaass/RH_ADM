'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  ShieldAlert,
  Globe,
  X,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';

export interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuperAdminSidebar({ isOpen, onClose }: SuperAdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      group: 'PLATAFORMA SAAS',
      items: [
        { label: 'Visão Geral', href: '/super-admin', icon: LayoutDashboard },
        { label: 'Gestão de Empresas', href: '/super-admin/companies', icon: Building2 },
        { label: 'Cadastrar Empresa', href: '/super-admin/companies/new', icon: PlusCircle },
        { label: 'Planos SaaS', href: '/super-admin/plans', icon: Layers },
        { label: 'Assinaturas', href: '/super-admin/subscriptions', icon: ShieldAlert },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Topo / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Logo variant="dark" size="sm" />
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badge de Ambiente Super Admin */}
        <div className="px-4 pt-4">
          <div className="p-3 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 rounded-xl flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-purple-300 tracking-wider uppercase">
                Super Admin
              </div>
              <div className="text-[10px] text-slate-400">
                Painel Global da Plataforma
              </div>
            </div>
          </div>
        </div>

        {/* Itens de Navegação */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/super-admin'
                    ? pathname === '/super-admin'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Rodapé Informativo */}
        <div className="p-4 border-t border-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Globe className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">Pontua RH • Fase 6.2</span>
          </div>
        </div>
      </aside>
    </>
  );
}
