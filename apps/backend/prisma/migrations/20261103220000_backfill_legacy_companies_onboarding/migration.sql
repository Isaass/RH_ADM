-- Backfill idempotente para marcar onboardingCompleted = true e onboardingStep = 5
-- apenas para empresas legadas que já possuam estrutura operacional completa configurada.
UPDATE "Company" c
SET "onboardingCompleted" = true,
    "onboardingStep" = 5
WHERE c."onboardingCompleted" = false
  AND EXISTS (SELECT 1 FROM "Department" d WHERE d."companyId" = c.id)
  AND EXISTS (SELECT 1 FROM "Position" p WHERE p."companyId" = c.id)
  AND EXISTS (SELECT 1 FROM "WorkSchedule" ws WHERE ws."companyId" = c.id)
  AND EXISTS (SELECT 1 FROM "Employee" e WHERE e."companyId" = c.id);

