'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  UserPlus,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Shield,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { isValidCNPJ, formatCNPJ, formatPhoneBR, formatCEP, CreateCompanyDTO } from '@pontuarh/shared';

export default function SuperAdminNewCompanyPage() {
  const router = useRouter();

  // Dados Cadastrais
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Endereço
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Primeiro Administrador
  const [includeAdmin, setIncludeAdmin] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('A Razão Social é obrigatória.');
      return;
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (!cleanCnpj || !isValidCNPJ(cleanCnpj)) {
      setError('CNPJ inválido. Digite um número de CNPJ válido.');
      return;
    }

    if (includeAdmin) {
      if (!adminName.trim()) {
        setError('O nome do primeiro administrador é obrigatório.');
        return;
      }
      if (!adminEmail.trim() || !adminEmail.includes('@')) {
        setError('O e-mail do primeiro administrador é inválido.');
        return;
      }
      if (!adminPassword || adminPassword.length < 8) {
        setError('A senha do primeiro administrador deve ter no mínimo 8 caracteres.');
        return;
      }
    }

    try {
      setLoading(true);

      const payload: CreateCompanyDTO = {
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        cnpj: cleanCnpj,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        street: street.trim() || undefined,
        number: number.trim() || undefined,
        complement: complement.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        initialAdmin: includeAdmin
          ? {
              name: adminName.trim(),
              email: adminEmail.trim(),
              password: adminPassword,
            }
          : undefined,
      };

      const res = await api.post<any>('/platform/companies', payload);
      router.push(`/super-admin/companies/${res.id}?created=true`);
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar empresa na plataforma.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header com Voltar */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin/companies">
          <Button variant="outline" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title="Cadastrar Nova Empresa"
          description="Provisionamento multitenant de nova organização e primeiro administrador."
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Dados Corporativos */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>Dados Cadastrais da Organização</span>
            </CardTitle>
            <CardDescription>Informações jurídicas essenciais da empresa.</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Alfa Soluções Empresariais Ltda"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: Alfa Tech"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2: Endereço */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <span>Endereço Comercial</span>
            </CardTitle>
            <CardDescription>Localização da matriz ou filial.</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(formatCEP(e.target.value))}
                  placeholder="00000-000"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Logradouro / Rua
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Paulista, Rua das Flores..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="100, S/N..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Sala 12, Bloco B..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Centro, Jardins..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo, Rio de Janeiro..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  UF / Estado
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100 font-mono text-center uppercase"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 3: Primeiro Administrador */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                <span>Primeiro Administrador da Empresa</span>
              </CardTitle>
              <CardDescription>
                Criação transacional do gestor inicial que receberá acesso à conta.
              </CardDescription>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
              <input
                type="checkbox"
                checked={includeAdmin}
                onChange={(e) => setIncludeAdmin(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Criar Administrador</span>
            </label>
          </CardHeader>

          {includeAdmin && (
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={includeAdmin}
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required={includeAdmin}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@empresa.com.br"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Senha Inicial (mín. 8 caracteres) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required={includeAdmin}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-xl text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  O administrador terá permissão de <strong>ADMIN_EMPRESA</strong> e acessará exclusivamente o ambiente e colaboradores desta organização.
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/super-admin/companies">
            <Button variant="outline" size="sm" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar e Provisionar Empresa</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
