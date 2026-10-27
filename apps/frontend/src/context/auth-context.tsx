'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { UserRole } from '@pontuarh/shared';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
  companyName?: string | null;
  employeeId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, passwordPlain: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Restauração de sessão persistida no cliente
    const storedToken = localStorage.getItem('pontuarh_token');
    const storedUser = localStorage.getItem('pontuarh_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Validação silenciosa no servidor
        api.get<any>('/auth/me')
          .then((fresh) => {
            const updatedUser: AuthUser = {
              id: fresh.id,
              name: fresh.name,
              email: fresh.email,
              role: fresh.role,
              companyId: fresh.companyId,
              companyName: fresh.company?.tradeName || fresh.company?.name,
              employeeId: fresh.employeeId,
            };
            setUser(updatedUser);
            localStorage.setItem('pontuarh_user', JSON.stringify(updatedUser));
          })
          .catch(() => {
            // Se o token expirou no backend
            logout();
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch (e) {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, passwordPlain: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email,
        password: passwordPlain,
      });

      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('pontuarh_token', response.token);
      localStorage.setItem('pontuarh_user', JSON.stringify(response.user));

      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pontuarh_token');
    localStorage.removeItem('pontuarh_user');
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const fresh = await api.get<any>('/auth/me');
      const updatedUser: AuthUser = {
        id: fresh.id,
        name: fresh.name,
        email: fresh.email,
        role: fresh.role,
        companyId: fresh.companyId,
        companyName: fresh.company?.tradeName || fresh.company?.name,
        employeeId: fresh.employeeId,
      };
      setUser(updatedUser);
      localStorage.setItem('pontuarh_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.error('Erro ao atualizar usuário:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
