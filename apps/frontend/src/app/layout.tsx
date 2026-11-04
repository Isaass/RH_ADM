import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-context';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'Pontua RH — Plataforma SaaS de RH, DP e Ponto Eletrônico',
  description: 'Gestão moderna de colaboradores, jornada de trabalho e departamento pessoal em conformidade com a CLT.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={montserrat.variable}
      suppressHydrationWarning
    >
      <body className={`${montserrat.className} font-sans min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
