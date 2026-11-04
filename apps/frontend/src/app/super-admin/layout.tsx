'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/layout/SuperAdminHeader';
import { UserRole } from '@pontuarh/shared';
import { Loader2 } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== UserRole.SUPER_ADMIN) {
        // Redireciona usuários não-superadmin para seus respectivos ambientes
        if (user.role === UserRole.COLABORADOR) {
          router.replace('/portal');
        } else {
          router.replace('/admin/dashboard');
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm text-slate-400 font-medium">
            Validando privilégios de Super Administrador...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Super Admin */}
      <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <SuperAdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
