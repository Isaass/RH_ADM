import { UserRole, ContractType, EmployeeStatus } from '../enums';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string | null;
  employeeId?: string | null;
}

export type AuthenticatedUser = UserPayload;

export interface AuthResponse {
  token: string;
  user: UserPayload;
}

export interface Company {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  createdAt: string;
}

export interface Position {
  id: string;
  companyId: string;
  title: string;
  cboCode?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  userId?: string | null;
  fullName: string;
  cpf: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  registrationNumber?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  positionId?: string | null;
  position?: Position | null;
  managerId?: string | null;
  manager?: { id: string; fullName: string } | null;
  admissionDate: string;
  contractType: ContractType;
  status: EmployeeStatus;
  baseSalary?: number | null; // Protegido por RBAC
  workScheduleId?: string | null;
  workSchedule?: WorkSchedule | null;
  timeBankPolicyId?: string | null;
  timeBankPolicy?: TimeBankPolicy | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSchedule {
  id: string;
  companyId: string;
  name: string;
  type: string;
  dailyHours: number;
  weeklyHours: number;
  expectedEntry: string;
  expectedExit: string;
  expectedBreak: string;
  daysOfWeek: string;
  toleranceMinutes: number;
  validFrom?: string | null;
  validUntil?: string | null;
  nightShift: boolean;
  breakFlexible: boolean;
  description?: string | null;
  active: boolean;
  createdAt: string;
  employeesCount?: number;
}

export interface TimeEntry {
  id: string;
  companyId: string;
  employeeId: string;
  timestamp: string;
  timezone: string;
  type: string;
  origin: string;
  location?: string | null;
  ipAddress?: string | null;
  originalRecord: boolean;
  isTreated: boolean;
  treatmentType?: string | null;
  adjustmentRequestId?: string | null;
  hashIntegrity?: string | null;
  createdAt: string;
  employee?: Partial<Employee>;
}

export interface TimeAdjustmentRequest {
  id: string;
  companyId: string;
  employeeId: string;
  date: string;
  type: string;
  entryType?: string | null;
  proposedTime?: string | null;
  justification: string;
  attachmentUrl?: string | null;
  status: string;
  reviewerId?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: Partial<Employee>;
}

export interface TimesheetDayPunch {
  id: string;
  time: string;
  type: string;
  timestamp: string;
  originalRecord: boolean;
  isTreated?: boolean;
}

export interface TimesheetDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isWorkday: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  expectedSchedule: {
    entry: string;
    exit: string;
    breakTime: string;
    dailyHours: number;
  } | null;
  originalPunches: TimesheetDayPunch[];
  treatedPunches: TimesheetDayPunch[];
  workedHours: number; // Horas apuradas
  workedHoursFormatted: string;
  expectedHours: number;
  expectedHoursFormatted: string;
  breakDuration: number;
  breakDurationFormatted: string;
  balanceHours: number;
  balanceHoursFormatted: string;
  delayMinutes: number; // Atrasos no início
  earlyExitMinutes?: number; // Saídas antecipadas
  extraMinutes: number; // Saldo excedente bruto
  potentialOvertimeMinutes?: number; // Horas extraordinárias potencialmente elegíveis
  timeBankMinutes?: number; // Destinadas ao Banco de Horas
  payableOvertimeMinutes?: number; // Destinadas ao pagamento em folha
  isIncomplete: boolean;
  occurrences: string[];
}

export interface TimesheetMonthSummary {
  competence: string; // YYYY-MM
  employee: Partial<Employee>;
  totalExpectedHours: number;
  totalWorkedHours: number; // Total de horas apuradas
  totalDelayMinutes: number; // Atrasos
  totalEarlyExitMinutes?: number; // Saídas antecipadas
  totalExtraMinutes: number; // Horas excedentes brutas
  potentialOvertimeHours?: number; // Horas extraordinárias potencialmente elegíveis
  timeBankHours?: number; // Saldo creditado em Banco de Horas
  payrollPayableHours?: number; // Horas extraordinárias destinadas ao pagamento
  netBalanceHours: number; // Saldo líquido total (+/-)
  days: TimesheetDay[];
  incompleteDaysCount: number;
  pendingAdjustmentsCount: number;
}

export interface TimeBankPolicy {
  id: string;
  companyId: string;
  name: string;
  compensationType: string;
  periodMonths: number;
  validFrom: string;
  validUntil?: string | null;
  maxDailyCreditMinutes: number;
  maxNegativeBalanceMinutes: number;
  allowNegativeBalance: boolean;
  creditRate: number;
  requireManagerApproval: boolean;
  expiryAction: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  employeesCount?: number;
}

export interface TimeBankTransaction {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  policyId?: string | null;
  policy?: Partial<TimeBankPolicy> | null;
  type: string;
  minutes: number;
  balanceAfter?: number | null;
  competence: string;
  origin: string;
  referenceId?: string | null;
  createdById?: string | null;
  status: string;
  idempotencyKey?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface TimeBankCompensationRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  type: string;
  date: string;
  durationMinutes: number;
  justification: string;
  status: string;
  reviewedById?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  idempotencyKey?: string | null;
  ledgerTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTimeBankSummary {
  employeeId: string;
  employee: Partial<Employee>;
  policy?: Partial<TimeBankPolicy> | null;
  currentBalanceMinutes: number;
  currentBalanceFormatted: string;
  reservedMinutes: number;
  reservedFormatted: string;
  availableBalanceMinutes: number;
  availableBalanceFormatted: string;
  accumulatedCreditMinutes: number;
  accumulatedDebitMinutes: number;
  compensatedMinutes: number;
  paidMinutes: number;
  validUntil?: string | null;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  daysUntilExpiry?: number | null;
  expiryNotice?: string | null;
}

// ----------------------------------------------------
// Tipos da Fase 4: Férias, Afastamentos, Atestados e Documentos
// ----------------------------------------------------

export interface VacationPeriod {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  startDate: string; // Início do período aquisitivo
  endDate: string; // Fim do período aquisitivo
  concessiveStartDate: string; // Início do período concessivo
  concessiveEndDate: string; // Fim do período concessivo (limite legal para gozo)
  daysAcquired: number; // Dias adquiridos (padrão 30, CLT Art. 130)
  daysUsed: number; // Dias já usufruídos
  daysSold: number; // Dias convertidos em abono pecuniário
  daysRemaining: number; // Saldo disponível para agendamento
  status: string; // ABERTO, ADQUIRIDO, PROGRAMADO, PARCIALMENTE_USUFRUIDO, TOTALMENTE_USUFRUIDO, VENCIDO, PERDIDO
  unjustifiedAbsences: number; // Faltas injustificadas no período aquisitivo
  lostDaysJustification?: string | null;
  vacationRequests?: VacationRequest[];
  isExpiringSoon?: boolean; // Vence em menos de 60 dias (alerta de dobra)
  isExpired?: boolean; // Ultrapassou o período concessivo (sujeito à dobra CLT Art. 137)
  daysUntilExpiry?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VacationRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  vacationPeriodId: string;
  vacationPeriod?: Partial<VacationPeriod>;
  startDate: string;
  endDate: string;
  daysCount: number;
  sellDays: number; // Dias de abono pecuniário (até 10 dias)
  fractionNumber: number; // 1, 2 ou 3 (fracionamento CLT Art. 134 § 1º)
  status: string; // PENDENTE, EM_ANALISE, APROVADA, PROGRAMADA, EM_GOZO, CONCLUIDA, RECUSADA, CANCELADA
  reviewedById?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  employeeNotes?: string | null;
  advance13th: boolean; // Adiantamento de 50% do 13º salário
  createdAt: string;
  updatedAt: string;
}

export interface VacationRemunerationPreview {
  baseSalary: number;
  dailyRate: number;
  vacationDays: number;
  vacationPay: number;
  constitutionalThird: number;
  sellDays: number;
  abonoPay: number;
  abonoThird: number;
  totalGrossPreview: number;
  legalNotice: string;
}

export interface EmployeeLeave {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  type: string; // DOENCA_ATE_15D, DOENCA_INSS, ACIDENTE_TRABALHO, MATERNIDADE, PATERNIDADE, CASAMENTO, LUTO, etc.
  startDate: string;
  endDate?: string | null;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  reason: string;
  cidCode?: string | null; // Dado sensível
  status: string; // PENDENTE, ATIVO, CONCLUIDO, CANCELADO, RECUSADO
  approvedById?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalCertificate {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  issueDate: string;
  startDate: string;
  daysOff: number;
  doctorName?: string | null;
  crmNumber?: string | null;
  crmState?: string | null;
  cidCode?: string | null; // Dado pessoal sensível - restrito
  justification?: string | null;
  documentUrl?: string | null;
  status: string; // PENDENTE, EM_ANALISE, APROVADO, RECUSADO
  reviewedById?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  employeeLeaveId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Partial<Employee>;
  category: string; // ADMISSIONAL, CONTRATUAL, ATESTADO, AVISO_FERIAS, RECIBO_FERIAS, DECLARACAO, OUTROS
  title: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  isConfidential: boolean;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VacationDashboardMetrics {
  employeesOnVacationCount: number;
  scheduledVacationsCount: number;
  expiringVacationsCount: number;
  pendingRequestsCount: number;
  activeLeavesCount: number;
  pendingCertificatesCount: number;
}

// ----------------------------------------------------
// Regras de Autorização / Permissões (RBAC)
// ----------------------------------------------------

export function canManageEmployees(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function canViewSalaries(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.CONTADOR].includes(role);
}

export function canApproveAdjustments(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR].includes(role);
}

export function canManageTimeBank(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function canApproveCompensations(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR].includes(role);
}

export function canManageVacations(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function canApproveVacations(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR].includes(role);
}

export function canManageLeaves(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function canManageMedicalCertificates(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function canViewSensitiveMedicalData(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function canManageDocuments(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH].includes(role);
}

export function isAdministrativeRole(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.GESTOR].includes(role);
}

