-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "companyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ATIVA',
ADD COLUMN     "street" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedById" TEXT,
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollCompetence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollEmployeeSummary" (
    "id" TEXT NOT NULL,
    "payrollCompetenceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "overtimeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "timeBankAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "vacationAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "otherEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEmployeeSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollItem" (
    "id" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollCompetence_companyId_status_idx" ON "PayrollCompetence"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollCompetence_companyId_competence_key" ON "PayrollCompetence"("companyId", "competence");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollEmployeeSummary_companyId_employeeId_idx" ON "PayrollEmployeeSummary"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollEmployeeSummary_payrollCompetenceId_employeeId_key" ON "PayrollEmployeeSummary"("payrollCompetenceId", "employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollItem_summaryId_idx" ON "PayrollItem"("summaryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollItem_companyId_employeeId_idx" ON "PayrollItem"("companyId", "employeeId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollCompetence_companyId_fkey') THEN
    ALTER TABLE "PayrollCompetence" ADD CONSTRAINT "PayrollCompetence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollEmployeeSummary_payrollCompetenceId_fkey') THEN
    ALTER TABLE "PayrollEmployeeSummary" ADD CONSTRAINT "PayrollEmployeeSummary_payrollCompetenceId_fkey" FOREIGN KEY ("payrollCompetenceId") REFERENCES "PayrollCompetence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollEmployeeSummary_companyId_fkey') THEN
    ALTER TABLE "PayrollEmployeeSummary" ADD CONSTRAINT "PayrollEmployeeSummary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollEmployeeSummary_employeeId_fkey') THEN
    ALTER TABLE "PayrollEmployeeSummary" ADD CONSTRAINT "PayrollEmployeeSummary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItem_summaryId_fkey') THEN
    ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "PayrollEmployeeSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItem_companyId_fkey') THEN
    ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItem_employeeId_fkey') THEN
    ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
