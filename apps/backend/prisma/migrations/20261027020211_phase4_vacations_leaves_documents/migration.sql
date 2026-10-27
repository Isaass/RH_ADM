-- CreateTable
CREATE TABLE "VacationPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "concessiveStartDate" TIMESTAMP(3) NOT NULL,
    "concessiveEndDate" TIMESTAMP(3) NOT NULL,
    "daysAcquired" INTEGER NOT NULL DEFAULT 30,
    "daysUsed" INTEGER NOT NULL DEFAULT 0,
    "daysSold" INTEGER NOT NULL DEFAULT 0,
    "daysRemaining" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "unjustifiedAbsences" INTEGER NOT NULL DEFAULT 0,
    "lostDaysJustification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "vacationPeriodId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysCount" INTEGER NOT NULL,
    "sellDays" INTEGER NOT NULL DEFAULT 0,
    "fractionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "reviewedById" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "employeeNotes" TEXT,
    "advance13th" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLeave" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "cidCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCertificate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "daysOff" INTEGER NOT NULL,
    "doctorName" TEXT,
    "crmNumber" TEXT,
    "crmState" TEXT,
    "cidCode" TEXT,
    "justification" TEXT,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "reviewedById" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "employeeLeaveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VacationPeriod_companyId_employeeId_idx" ON "VacationPeriod"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "VacationPeriod_companyId_status_idx" ON "VacationPeriod"("companyId", "status");

-- CreateIndex
CREATE INDEX "VacationRequest_companyId_employeeId_idx" ON "VacationRequest"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "VacationRequest_vacationPeriodId_idx" ON "VacationRequest"("vacationPeriodId");

-- CreateIndex
CREATE INDEX "VacationRequest_companyId_status_idx" ON "VacationRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmployeeLeave_companyId_employeeId_idx" ON "EmployeeLeave"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeLeave_companyId_status_idx" ON "EmployeeLeave"("companyId", "status");

-- CreateIndex
CREATE INDEX "MedicalCertificate_companyId_employeeId_idx" ON "MedicalCertificate"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "MedicalCertificate_companyId_status_idx" ON "MedicalCertificate"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmployeeDocument_companyId_employeeId_idx" ON "EmployeeDocument"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_companyId_category_idx" ON "EmployeeDocument"("companyId", "category");

-- AddForeignKey
ALTER TABLE "VacationPeriod" ADD CONSTRAINT "VacationPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationPeriod" ADD CONSTRAINT "VacationPeriod_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationRequest" ADD CONSTRAINT "VacationRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationRequest" ADD CONSTRAINT "VacationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationRequest" ADD CONSTRAINT "VacationRequest_vacationPeriodId_fkey" FOREIGN KEY ("vacationPeriodId") REFERENCES "VacationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeave" ADD CONSTRAINT "EmployeeLeave_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeave" ADD CONSTRAINT "EmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_employeeLeaveId_fkey" FOREIGN KEY ("employeeLeaveId") REFERENCES "EmployeeLeave"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
