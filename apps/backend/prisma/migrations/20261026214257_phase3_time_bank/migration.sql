-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "timeBankPolicyId" TEXT;

-- CreateTable
CREATE TABLE "TimeBankPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "compensationType" TEXT NOT NULL DEFAULT 'BANCO_HORAS_PADRAO',
    "periodMonths" INTEGER NOT NULL DEFAULT 6,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxDailyCreditMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxNegativeBalanceMinutes" INTEGER NOT NULL DEFAULT 2400,
    "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT true,
    "creditRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT true,
    "expiryAction" TEXT NOT NULL DEFAULT 'PAGAR_FOLHA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBankPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBankTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "policyId" TEXT,
    "type" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "balanceAfter" INTEGER,
    "competence" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONSOLIDADO',
    "idempotencyKey" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBankCompensationRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVADA',
    "reviewedById" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "ledgerTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBankCompensationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeBankTransaction_idempotencyKey_key" ON "TimeBankTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TimeBankTransaction_companyId_employeeId_idx" ON "TimeBankTransaction"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "TimeBankTransaction_companyId_competence_idx" ON "TimeBankTransaction"("companyId", "competence");

-- CreateIndex
CREATE INDEX "TimeBankTransaction_referenceId_idx" ON "TimeBankTransaction"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeBankCompensationRequest_idempotencyKey_key" ON "TimeBankCompensationRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TimeBankCompensationRequest_companyId_employeeId_idx" ON "TimeBankCompensationRequest"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "TimeBankCompensationRequest_companyId_status_idx" ON "TimeBankCompensationRequest"("companyId", "status");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_timeBankPolicyId_fkey" FOREIGN KEY ("timeBankPolicyId") REFERENCES "TimeBankPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBankPolicy" ADD CONSTRAINT "TimeBankPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBankTransaction" ADD CONSTRAINT "TimeBankTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBankTransaction" ADD CONSTRAINT "TimeBankTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBankTransaction" ADD CONSTRAINT "TimeBankTransaction_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "TimeBankPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBankCompensationRequest" ADD CONSTRAINT "TimeBankCompensationRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBankCompensationRequest" ADD CONSTRAINT "TimeBankCompensationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
