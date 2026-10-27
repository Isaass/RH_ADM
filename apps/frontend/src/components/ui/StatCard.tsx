import React from 'react';
import { Card, CardContent } from './Card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorScheme?: 'blue' | 'green' | 'amber' | 'slate';
}

export function StatCard({ title, value, description, icon, trend, colorScheme = 'blue' }: StatCardProps) {
  const iconBg = {
    blue: 'bg-blue-50 text-brand-primary dark:bg-blue-950/50 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <div className={cn('p-2.5 rounded-xl', iconBg[colorScheme])}>{icon}</div>
        </div>

        <div className="mt-4">
          <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</h4>
          {(description || trend) && (
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <span
                  className={cn(
                    'text-xs font-semibold px-1.5 py-0.5 rounded',
                    trend.isPositive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                  )}
                >
                  {trend.value}
                </span>
              )}
              {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
