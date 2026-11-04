-- AlterTable
ALTER TABLE "Company" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1;

