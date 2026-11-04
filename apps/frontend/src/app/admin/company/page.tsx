'use client';

import React, { useEffect, useState } from 'react';
import {
  Landmark,
  Shield,
  Building2,
  CheckCircle2,
  Loader2,
  Edit2,
  MapPin,
  Mail,
  Phone,
  Save,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCNPJ, formatPhoneBR, formatCEP, canManageEmployees } from '@pontuarh/shared';

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    tradeName: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/companies/current');
      setCompany(data);
      if (data) {
        setForm({
          tradeName: data.tradeName || '',
          email: data.email || '',
          phone: data.phone ? formatPhoneBR(data.phone) : '',
          street: data.street || '',
          number: data.number || '',
          complement: data.complement || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode ? formatCEP(data.zipCode) : '',
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const handleOpenEdit = () => {
    setFormError(null);
    if (company) {
      setForm({
        tradeName: company.tradeName || '',
        email: company.email || '',
        phone: company.phone ? formatPhoneBR(company.phone) : '',
        street: company.street || '',
        number: company.number || '',
        complement: company.complement || '',
        neighborhood: company.neighborhood || '',
        city: company.city || '',
        state: company.state || '',
        zipCode: company.zipCode ? formatCEP(company.zipCode) : '',
      });
    }
    setEditModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const cleanPhone = form.phone.replace(/\D/g, '');
      const cleanZip = form.zipCode.replace(/\D/g, '');

      await api.put('/companies/current', {
        tradeName: form.tradeName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: cleanPhone || undefined,
        street: form.street.trim() || undefined,
        number: form.number.trim() || undefined,
        complement: form.complement.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim().toUpperCase() || undefined,
        zipCode: cleanZip || undefined,
      });

      setFeedback({ type: 'success', message: 'Dados da organização atualizados com sucesso.' });
      setEditModalOpen(false);
      await loadCompanyData();
    } catch (err: any) {
      setFormError(err.message || 'Falha ao atualizar dados da empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuthorized = user?.role === 'ADMIN_EMPRESA' || user?.role === 'SUPER_ADMIN';

  if (loading) {
    return (
      <div className="flex justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Dados da Empresa (Tenant)"
        description="Parâmetros cadastrais, canais institucionais e endereço oficial da organização contratante."
        actions={
          isAuthorized && (
            <Button variant="primary" onClick={handleOpenEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              <span>Editar Informações</span>
            </Button>
          )
        }
      />

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {company && (
        <div className="space-y-6">
          {/* Card Principal: Razão Social e CNPJ */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{company.tradeName || company.name}</CardTitle>
                  <CardDescription>Razão Social: {company.name}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={company.status === 'ATIVA' ? 'success' : 'danger'}>
                    {company.status === 'ATIVA' ? 'Conta Ativa' : 'Suspensa'}
                  </Badge>
                  {company.onboardingCompleted ? (
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200">
                      Configurada
                    </Badge>
                  ) : (
                    <Badge variant="warning">Onboarding Pendente</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">CNPJ (Receita Federal)</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    {formatCNPJ(company.cnpj)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">E-mail Institucional</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {company.email || 'Não informado'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">Telefone de Contato</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {company.phone ? formatPhoneBR(company.phone) : 'Não informado'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">Identificador Único (Tenant ID)</p>
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                    {company.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Endereço Comercial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-primary" />
                <span>Endereço Comercial da Empresa</span>
              </CardTitle>
              <CardDescription>Sede oficial registrada no contrato de prestação de serviços</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 sm:col-span-2">
                  <p className="text-xs text-slate-400 font-medium">Logradouro / Rua</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {company.street || 'Não informado'}
                    {company.number ? `, nº ${company.number}` : ''}
                    {company.complement ? ` (${company.complement})` : ''}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-xs text-slate-400 font-medium">CEP</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    {company.zipCode ? formatCEP(company.zipCode) : 'Não informado'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-xs text-slate-400 font-medium">Bairro</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {company.neighborhood || 'Não informado'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-xs text-slate-400 font-medium">Cidade</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {company.city || 'Não informada'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-xs text-slate-400 font-medium">Estado (UF)</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {company.state || 'Não informado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Garantia Multitenancy */}
          <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 flex items-start gap-3">
            <Shield className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Garantia de Isolamento Multiempresa (Multitenancy)
              </p>
              <p className="mt-0.5">
                Todas as consultas e rotinas do sistema filtram estritamente pelo Tenant ID desta organização.
                Acesso aos módulos, colaboradores e dados confidenciais de folha são protegidos contra vazamentos interdepartamentais.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Dados */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Dados da Organização"
        description="Atualize as informações corporativas, canais de contato e endereço comercial."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="sm:col-span-2">
              <Input
                label="Nome Fantasia"
                placeholder="Ex.: TecnoRH Soluções"
                value={form.tradeName}
                onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
              />
            </div>

            <Input
              label="E-mail Institucional"
              type="email"
              placeholder="contato@empresa.com.br"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <Input
              label="Telefone / Contato"
              placeholder="(11) 98765-4321"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Endereço Comercial</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: formatCEP(e.target.value) })}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Logradouro / Rua"
                  placeholder="Av. Paulista, Rua das Flores..."
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="Número"
                  placeholder="1234"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="Complemento"
                  placeholder="Sala 501"
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="Bairro"
                  placeholder="Bela Vista"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="Cidade"
                  placeholder="São Paulo"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="UF"
                  maxLength={2}
                  placeholder="SP"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
