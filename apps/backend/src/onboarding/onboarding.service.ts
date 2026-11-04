import { prisma } from '../prisma/prisma.service';
import { OnboardingStatus } from '@pontuarh/shared';

export class OnboardingService {
  /**
   * Obtém o status detalhado do processo de onboarding da empresa
   */
  async getStatus(companyId: string): Promise<OnboardingStatus> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            departments: true,
            positions: true,
            workSchedules: true,
            employees: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    const sub = company.subscription;
    const isExpired = sub ? (sub.status === 'EXPIRADA' || Boolean(sub.endDate && new Date() > sub.endDate)) : false;
    const isTrial = sub ? sub.status === 'EM_TESTE' : false;

    const canComplete =
      company._count.departments > 0 &&
      company._count.positions > 0 &&
      company._count.workSchedules > 0 &&
      company._count.employees > 0;

    return {
      companyId: company.id,
      onboardingCompleted: company.onboardingCompleted,
      onboardingStep: company.onboardingStep,
      company: {
        name: company.name,
        tradeName: company.tradeName,
        cnpj: company.cnpj,
        email: company.email,
        phone: company.phone,
        street: company.street,
        number: company.number,
        complement: company.complement,
        neighborhood: company.neighborhood,
        city: company.city,
        state: company.state,
        zipCode: company.zipCode,
      },
      counts: {
        departments: company._count.departments,
        positions: company._count.positions,
        workSchedules: company._count.workSchedules,
        employees: company._count.employees,
      },
      subscription: sub
        ? {
            planName: sub.plan.name,
            planCode: sub.plan.code,
            status: sub.status,
            maxEmployees: sub.plan.maxEmployees,
            maxUsers: sub.plan.maxUsers,
            maxAdmins: sub.plan.maxAdmins,
            isExpired,
            isTrial,
          }
        : null,
      canComplete,
    };
  }

  /**
   * Atualiza a etapa atual do onboarding da empresa
   */
  async updateStep(companyId: string, step: number) {
    if (step < 1 || step > 5) {
      throw new Error('Etapa de onboarding inválida. Deve estar entre 1 e 5.');
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { onboardingStep: step },
      select: {
        id: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    return updated;
  }

  /**
   * Finaliza o onboarding da empresa
   */
  async completeOnboarding(companyId: string, userId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            departments: true,
            positions: true,
            workSchedules: true,
            employees: true,
          },
        },
      },
    });

    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    // Validação de requisitos mínimos operacionais
    if (company._count.departments === 0) {
      throw new Error('Cadastre pelo menos um departamento antes de concluir a configuração inicial.');
    }
    if (company._count.positions === 0) {
      throw new Error('Cadastre pelo menos um cargo antes de concluir a configuração inicial.');
    }
    if (company._count.workSchedules === 0) {
      throw new Error('Cadastre pelo menos uma jornada de trabalho antes de concluir a configuração inicial.');
    }
    if (company._count.employees === 0) {
      throw new Error('Cadastre pelo menos um colaborador antes de concluir a configuração inicial.');
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5,
      },
      select: {
        id: true,
        name: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        action: 'ONBOARDING_COMPLETED',
        entity: 'Company',
        entityId: companyId,
        details: `Configuração inicial (onboarding) da empresa "${updated.name}" finalizada com sucesso.`,
      },
    });

    return {
      success: true,
      onboardingCompleted: true,
      company: updated,
    };
  }
}

export const onboardingService = new OnboardingService();

