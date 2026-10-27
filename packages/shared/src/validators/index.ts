import { z } from 'zod';
import { UserRole, ContractType, EmployeeStatus } from '../enums';

/**
 * Validação oficial do Cadastro de Pessoas Físicas (CPF) da Receita Federal do Brasil
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) return false;

  // Rejeita sequências conhecidas de dígitos repetidos
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10), 10)) return false;

  return true;
}

/**
 * Formata CPF para o padrão 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Validação oficial do Cadastro Nacional da Pessoa Jurídica (CNPJ)
 */
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

/**
 * Formata CNPJ para o padrão 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Formata valor monetário para o padrão Real Brasileiro (R$)
 */
export function formatCurrencyBRL(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata telefone brasileiro para (99) 99999-9999 ou (99) 9999-9999
 */
export function formatPhoneBR(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return clean.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

// ----------------------------------------------------
// Schemas Zod de Validação
// ----------------------------------------------------

export const LoginSchema = z.object({
  email: z.string().email('E-mail corporativo inválido'),
  password: z.string().min(6, 'A senha deve possuir no mínimo 6 caracteres'),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const EmployeeCreateSchema = z.object({
  companyId: z.string().min(1, 'Empresa é obrigatória'),
  fullName: z.string().min(3, 'Nome completo deve possuir no mínimo 3 caracteres'),
  cpf: z.string().refine(isValidCPF, { message: 'CPF brasileiro inválido' }),
  email: z.string().email('E-mail corporativo inválido'),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  registrationNumber: z.string().min(1, 'Matrícula é obrigatória'),
  departmentId: z.string().optional().nullable(),
  positionId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  admissionDate: z.string().min(1, 'Data de admissão é obrigatória'),
  contractType: z.nativeEnum(ContractType, { errorMap: () => ({ message: 'Tipo de contrato inválido' }) }),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ATIVO),
  baseSalary: z.number().min(0, 'Salário base deve ser positivo').optional().nullable(),
  workScheduleId: z.string().optional().nullable(),
});

export type EmployeeCreateDTO = z.infer<typeof EmployeeCreateSchema>;

export const EmployeeUpdateSchema = EmployeeCreateSchema.partial();
export type EmployeeUpdateDTO = z.infer<typeof EmployeeUpdateSchema>;
