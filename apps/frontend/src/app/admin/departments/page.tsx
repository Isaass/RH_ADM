'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Briefcase, Plus, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Department, Position, canManageEmployees } from '@pontuarh/shared';

export default function DepartmentsAndPositionsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<(Department & { _count?: { employees: number } })[]>([]);
  const [positions, setPositions] = useState<(Position & { _count?: { employees: number } })[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [posModalOpen, setPosModalOpen] = useState(false);

  // Forms
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosCbo, setNewPosCbo] = useState('');
  const [newPosDesc, setNewPosDesc] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deps, pos] = await Promise.all([
        api.get<any[]>('/departments'),
        api.get<any[]>('/positions'),
      ]);
      setDepartments(deps);
      setPositions(pos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      await api.post('/departments', { name: newDeptName, code: newDeptCode });
      setNewDeptName('');
      setNewDeptCode('');
      setDeptModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar departamento.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      await api.post('/positions', {
        title: newPosTitle,
        cboCode: newPosCbo,
        description: newPosDesc,
      });
      setNewPosTitle('');
      setNewPosCbo('');
      setNewPosDesc('');
      setPosModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cargo.');
    } finally {
      setModalLoading(false);
    }
  };

  const isManager = user ? canManageEmployees(user.role) : false;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Departamentos e Cargos"
        description="Estrutura organizacional, divisões departamentais e catálogo de funções CBO."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Departamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Departamentos</CardTitle>
                <CardDescription>Áreas corporativas ativas</CardDescription>
              </div>
              {isManager && (
                <Button size="sm" variant="outline" onClick={() => setDeptModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Novo Departamento</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              </div>
            ) : departments.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Nenhum departamento cadastrado.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {departments.map((dept) => (
                  <div key={dept.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-brand-primary dark:text-blue-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {dept.name}
                        </p>
                        {dept.code && (
                          <p className="text-xs font-mono text-slate-400">Código: {dept.code}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="font-mono text-xs">
                      {dept._count?.employees || 0} membros
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2: Cargos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cargos & Funções</CardTitle>
                <CardDescription>Classificação de cargos e ocupações</CardDescription>
              </div>
              {isManager && (
                <Button size="sm" variant="outline" onClick={() => setPosModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Novo Cargo</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              </div>
            ) : positions.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Nenhum cargo cadastrado.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {positions.map((pos) => (
                  <div key={pos.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {pos.title}
                        </p>
                        {pos.cboCode && (
                          <p className="text-xs font-mono text-slate-400">CBO: {pos.cboCode}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="font-mono text-xs">
                      {pos._count?.employees || 0} alocações
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Criar Departamento */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Cadastrar Novo Departamento"
        description="Insira os dados da nova divisão corporativa."
      >
        <form onSubmit={handleCreateDept} className="space-y-4">
          <Input
            label="Nome do Departamento"
            required
            placeholder="Ex: Controladoria & Finanças"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
          <Input
            label="Código Interno (Opcional)"
            placeholder="Ex: FIN-04"
            value={newDeptCode}
            onChange={(e) => setNewDeptCode(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDeptModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={modalLoading}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar Cargo */}
      <Modal
        isOpen={posModalOpen}
        onClose={() => setPosModalOpen(false)}
        title="Cadastrar Novo Cargo"
        description="Defina o título e a classificação CBO."
      >
        <form onSubmit={handleCreatePosition} className="space-y-4">
          <Input
            label="Título do Cargo"
            required
            placeholder="Ex: Coordenador de DP"
            value={newPosTitle}
            onChange={(e) => setNewPosTitle(e.target.value)}
          />
          <Input
            label="Código CBO (Opcional)"
            placeholder="Ex: 2524-05"
            value={newPosCbo}
            onChange={(e) => setNewPosCbo(e.target.value)}
          />
          <Input
            label="Descrição Sumária"
            placeholder="Breve descrição das atribuições da função"
            value={newPosDesc}
            onChange={(e) => setNewPosDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setPosModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={modalLoading}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
