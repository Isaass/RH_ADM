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
  status: 'ATIVA' | 'SUSPENSA';
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  suspendedById?: string | null;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees?: number;
    users?: number;
    departments?: number;
    positions?: number;
  };
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

export function canManagePayroll(role: UserRole): boolean {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.CONTADOR].includes(role);
}

// ----------------------------------------------------
// FASE 5: Gestão Financeira e Prévia de Folha
// ----------------------------------------------------

export interface PayrollItem {
  id: string;
  summaryId: string;
  companyId: string;
  employeeId: string;
  type: 'PROVENTO' | 'DESCONTO';
  category: string;
  code: string;
  name: string;
  reference?: string | null;
  amount: number;
  isManual: boolean;
  createdAt: string;
}

export interface PayrollEmployeeSummary {
  id: string;
  payrollCompetenceId: string;
  companyId: string;
  employeeId: string;
  employee?: {
    id: string;
    fullName: string;
    cpf: string;
    registrationNumber?: string | null;
    department?: { id: string; name: string } | null;
    position?: { id: string; title: string } | null;
  };
  baseSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  timeBankAmount: number;
  vacationAmount: number;
  otherEarnings: number;
  otherDeductions: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PayrollItem[];
}

export interface PayrollCompetence {
  id: string;
  companyId: string;
  competence: string; // Formato 'YYYY-MM'
  status: 'ABERTA' | 'FECHADA';
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  closedAt?: string | null;
  closedById?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  summaries?: PayrollEmployeeSummary[];
}

export interface CreatePayrollItemDTO {
  employeeId: string;
  type: 'PROVENTO' | 'DESCONTO';
  category?: string;
  code?: string;
  name: string;
  reference?: string;
  amount: number;
}

// ----------------------------------------------------
// FASE 6.1: Super Admin e Gestão de Empresas
// ----------------------------------------------------

export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

export interface PlatformMetrics {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalEmployees: number;
  totalUsers: number;
}

export interface CreateCompanyDTO {
  name: string;
  tradeName?: string;
  cnpj: string;
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  initialAdmin?: {
    name: string;
    email: string;
    password: string;
  };
}

export interface UpdateCompanyDTO {
  name?: string;
  tradeName?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface SuspendCompanyDTO {
  reason: string;
}

export interface CreateCompanyAdminDTO {
  name: string;
  email: string;
  password: string;
}

export interface CompanyListResponse {
  data: Company[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ----------------------------------------------------
// FASE 6.2 — Gestão de Planos e Assinaturas
// ----------------------------------------------------

export interface Plan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  monthlyPrice: number;
  annualPrice?: number | null;
  maxEmployees: number;
  maxUsers: number;
  maxAdmins: number;
  features: string[]; // PlanFeature[]
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    subscriptions?: number;
  };
}

export interface Subscription {
  id: string;
  companyId: string;
  company?: Partial<Company>;
  planId: string;
  plan?: Plan;
  periodicity: string; // MENSAL, ANUAL
  startDate: string | Date;
  endDate?: string | Date | null;
  status: string; // EM_TESTE, ATIVA, EXPIRADA, CANCELADA
  price: number;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SubscriptionHistory {
  id: string;
  subscriptionId?: string | null;
  companyId: string;
  planId: string;
  planName: string;
  planCode: string;
  action: string;
  previousStatus?: string | null;
  newStatus: string;
  price: number;
  periodicity: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  performedById?: string | null;
  performedByName?: string | null;
  reason?: string | null;
  createdAt: string | Date;
}

export interface CommercialMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  estimatedMRR: number; // Receita Mensal Recorrente estimada em R$
  companiesPerPlan: Array<{
    planId: string;
    planName: string;
    planCode: string;
    count: number;
  }>;
}

export interface CompanyUsage {
  plan: Plan;
  subscription: Subscription;
  currentUsage: {
    employees: number;
    maxEmployees: number;
    employeesPercentage: number;
    users: number;
    maxUsers: number;
    usersPercentage: number;
    admins: number;
    maxAdmins: number;
    adminsPercentage: number;
  };
  features: Record<string, boolean>;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining?: number | null;
}

export interface CreatePlanDTO {
  name: string;
  code: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  maxEmployees: number;
  maxUsers: number;
  maxAdmins: number;
  features: string[];
  active?: boolean;
}

export interface UpdatePlanDTO {
  name?: string;
  code?: string;
  description?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  maxEmployees?: number;
  maxUsers?: number;
  maxAdmins?: number;
  features?: string[];
  active?: boolean;
}

export interface AssignSubscriptionDTO {
  planId: string;
  periodicity: string; // MENSAL, ANUAL
  status?: string; // EM_TESTE, ATIVA
  price?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  trialDays?: number;
}

export interface ChangeSubscriptionPlanDTO {
  newPlanId: string;
  periodicity?: string;
  price?: number;
  reason?: string;
}

export interface RenewSubscriptionDTO {
  monthsToAdd?: number;
  notes?: string;
}

export interface CancelSubscriptionDTO {
  reason: string;
}

// ----------------------------------------------------
// FASE 6.3: Onboarding e Configuração Inicial de Empresas
// ----------------------------------------------------

export interface OnboardingStatus {
  companyId: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  company: {
    name: string;
    tradeName?: string | null;
    cnpj: string;
    email?: string | null;
    phone?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };
  counts: {
    departments: number;
    positions: number;
    workSchedules: number;
    employees: number;
  };
  subscription?: {
    planName: string;
    planCode: string;
    status: string;
    maxEmployees: number;
    maxUsers: number;
    maxAdmins: number;
    isExpired: boolean;
    isTrial: boolean;
  } | null;
  canComplete: boolean;
}

export interface UpdateOnboardingCompanyDTO {
  tradeName?: string;
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface UpdateOnboardingStepDTO {
  step: number;
}


