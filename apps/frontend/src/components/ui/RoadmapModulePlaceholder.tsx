import React from 'react';
import Link from 'next/link';
import { LucideIcon, Sparkles, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export interface RoadmapModulePlaceholderProps {
  title: string;
  subtitle: string;
  phase: string;
  icon: LucideIcon;
  plannedFeatures: string[];
  legalBasis?: string;
}

export function RoadmapModulePlaceholder({
  title,
  subtitle,
  phase,
  icon: Icon,
  plannedFeatures,
  legalBasis,
}: RoadmapModulePlaceholderProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          <Badge variant="info" className="py-1 px-3 text-xs font-mono">
            {phase}
          </Badge>
        }
      />

      <Card className="border-dashed border-2 border-slate-300 dark:border-slate-800">
        <CardContent className="p-8 sm:p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-brand-primary flex items-center justify-center mb-5">
            <Icon className="w-8 h-8" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary mb-1">
            Planejamento Arquitetural Conforme ROADMAP.md
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 max-w-md">
            Módulo em Desenvolvimento Programado
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-2 leading-relaxed">
            A infraestrutura relacional, tipos compartilhados e permissões deste módulo já estão estruturados no banco de dados. A lógica de negócio e interfaces serão disponibilizadas na respectiva fase para garantir máxima conformidade jurídica e segurança.
          </p>

          <div className="mt-8 text-left w-full max-w-md bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span>Funcionalidades Previstas para esta Fase:</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {plannedFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {legalBasis && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Base Legal: {legalBasis}</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm">
                Voltar ao Dashboard
              </Button>
            </Link>
            <Link href="/admin/employees">
              <Button variant="primary" size="sm">
                <span>Ver Colaboradores</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
