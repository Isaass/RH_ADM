import React from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'auto';
  subtitle?: string;
}

export function Logo({
  className,
  size = 'md',
  variant = 'auto',
  subtitle,
}: LogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm rounded-lg',
    md: 'w-8 h-8 text-base rounded-lg',
    lg: 'w-10 h-10 text-lg rounded-xl',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const textColorClass =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Ícone Quadrado Arredondado com P em Branco Bold */}
      <div
        className={cn(
          'bg-brand-primary text-white font-display font-extrabold flex items-center justify-center shrink-0 shadow-xs select-none',
          iconSizes[size]
        )}
      >
        P
      </div>

      <div className="flex flex-col">
        <span
          className={cn(
            'font-display font-extrabold tracking-tight leading-none flex items-center',
            textSizes[size],
            textColorClass
          )}
        >
          Pontua<span className="text-brand-primary ml-0.5">RH</span>
        </span>
        {subtitle && (
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
