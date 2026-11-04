-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "annualPrice" DECIMAL(10,2),
    "maxEmployees" INTEGER NOT NULL DEFAULT 10,
    "maxUsers" INTEGER NOT NULL DEFAULT 2,
    "maxAdmins" INTEGER NOT NULL DEFAULT 1,
    "features" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "periodicity" TEXT NOT NULL DEFAULT 'MENSAL',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "periodicity" TEXT NOT NULL DEFAULT 'MENSAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "performedById" TEXT,
    "performedByName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Plan_code_idx" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Plan_active_idx" ON "Plan"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE INDEX "Subscription_companyId_status_idx" ON "Subscription"("companyId", "status");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_companyId_createdAt_idx" ON "SubscriptionHistory"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_subscriptionId_idx" ON "SubscriptionHistory"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_planId_idx" ON "SubscriptionHistory"("planId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
