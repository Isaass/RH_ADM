'use client';

import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group font-sans"
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-slate-900 dark:group-[.toaster]:text-slate-50 dark:group-[.toaster]:border-slate-800 rounded-xl font-medium text-xs',
          description: 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400',
          actionButton:
            'group-[.toast]:bg-slate-900 group-[.toast]:text-slate-50 dark:group-[.toast]:bg-slate-50 dark:group-[.toast]:text-slate-900',
          cancelButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-400',
          error:
            'group-[.toaster]:!bg-rose-50 dark:group-[.toaster]:!bg-rose-950/90 group-[.toaster]:!text-rose-900 dark:group-[.toaster]:!text-rose-200 group-[.toaster]:!border-rose-200 dark:group-[.toaster]:!border-rose-800',
          success:
            'group-[.toaster]:!bg-emerald-50 dark:group-[.toaster]:!bg-emerald-950/90 group-[.toaster]:!text-emerald-900 dark:group-[.toaster]:!text-emerald-200 group-[.toaster]:!border-emerald-200 dark:group-[.toaster]:!border-emerald-800',
          warning:
            'group-[.toaster]:!bg-amber-50 dark:group-[.toaster]:!bg-amber-950/90 group-[.toaster]:!text-amber-900 dark:group-[.toaster]:!text-amber-200 group-[.toaster]:!border-amber-200 dark:group-[.toaster]:!border-amber-800',
          info:
            'group-[.toaster]:!bg-blue-50 dark:group-[.toaster]:!bg-blue-950/90 group-[.toaster]:!text-blue-900 dark:group-[.toaster]:!text-blue-200 group-[.toaster]:!border-blue-200 dark:group-[.toaster]:!border-blue-800',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

