import { PrismaClient } from '@prisma/client';
import {
  AuthenticatedUser,
  canManageMedicalCertificates,
  canViewSensitiveMedicalData,
  MedicalCertificateStatus,
  UserRole,
} from '@pontuarh/shared';
import { validateAttachment } from '../adjustments/adjustments.service';

const prisma = new PrismaClient();

export interface CreateCertificateDTO {
  employeeId?: string;
  issueDate: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  daysOff: number;
  doctorName?: string;
  crmNumber?: string;
  crmState?: string;
  cidCode?: string;
  justification?: string;
  documentUrl?: string;
}

export interface DecideCertificateDTO {
  status: 'APROVADO' | 'RECUSADO';
  decisionNotes?: string;
  createLeave?: boolean;
}

export class MedicalCertificatesService {
  /**
   * Listagem de atestados com proteção de dados clínicos confidenciais (LGPD)
   */
  async listCertificates(
    companyId: string,
    user: AuthenticatedUser,
    filters?: { employeeId?: string; status?: string }
  ) {
    const where: any = { companyId };

    if (user.role === UserRole.COLABORADOR) {
      where.employeeId = user.employeeId;
    } else if (user.role === UserRole.GESTOR) {
      where.employee = { managerId: user.employeeId };
    }

    if (filters?.employeeId) {
      if (user.role === UserRole.GESTOR) {
        const emp = await prisma.employee.findFirst({
          where: { id: filters.employeeId, companyId, managerId: user.employeeId },
        });
        if (!emp) {
          throw new Error('Acesso negado: colaborador não pertence à sua equipe.');
        }
      }
      where.employeeId = filters.employeeId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const certs = await prisma.medicalCertificate.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const canViewCid = canViewSensitiveMedicalData(user.role);

    return certs.map((c) => ({
      ...c,
      // Restringe exibição de CID / diagnósticos clínicos confidenciais a RH ou próprio titular
      cidCode: canViewCid || c.employeeId === user.employeeId ? c.cidCode : undefined,
    }));
  }

  /**
   * Colaborador ou RH envia atestado médico
   */
  async createCertificate(user: AuthenticatedUser, dto: CreateCertificateDTO) {
    const targetEmployeeId = dto.employeeId || user.employeeId;
    if (!targetEmployeeId) {
      throw new Error('Colaborador não informado.');
    }

    if (user.role === UserRole.COLABORADOR && user.employeeId !== targetEmployeeId) {
      throw new Error('Você só pode enviar atestados para o seu próprio perfil.');
    }

    if (user.role === UserRole.GESTOR) {
      const emp = await prisma.employee.findFirst({
        where: { id: targetEmployeeId, companyId: user.companyId, managerId: user.employeeId },
      });
      if (!emp) {
        throw new Error('Acesso negado: colaborador não pertence à sua equipe.');
      }
    }

    if (dto.daysOff <= 0) {
      throw new Error('A quantidade de dias de afastamento do atestado deve ser de pelo menos 1 dia.');
    }

    if (dto.documentUrl) {
      validateAttachment(dto.documentUrl);
    }

    const cert = await prisma.medicalCertificate.create({
      data: {
        companyId: user.companyId,
        employeeId: targetEmployeeId,
        issueDate: new Date(dto.issueDate),
        startDate: new Date(dto.startDate),
        daysOff: Number(dto.daysOff),
        doctorName: dto.doctorName?.trim() || null,
        crmNumber: dto.crmNumber?.trim() || null,
        crmState: dto.crmState?.trim() || null,
        cidCode: dto.cidCode?.trim() || null,
        justification: dto.justification?.trim() || null,
        documentUrl: dto.documentUrl || null,
        status: MedicalCertificateStatus.PENDENTE,
      },
    });

    return cert;
  }

  /**
   * Homologação do atestado médico pelo RH
   */
  async decideCertificate(user: AuthenticatedUser, certificateId: string, dto: DecideCertificateDTO) {
    if (!canManageMedicalCertificates(user.role)) {
      throw new Error('Acesso negado: apenas o RH ou Administrador podem homologar atestados médicos.');
    }

    const cert = await prisma.medicalCertificate.findFirst({
      where: { id: certificateId, companyId: user.companyId },
    });

    if (!cert) {
      throw new Error('Atestado médico não encontrado.');
    }

    if (cert.status !== MedicalCertificateStatus.PENDENTE) {
      throw new Error(`Este atestado já foi analisado anteriormente (status: ${cert.status}).`);
    }

    if (dto.status === 'RECUSADO' && (!dto.decisionNotes || !dto.decisionNotes.trim())) {
      throw new Error('É obrigatório justificar o motivo da recusa do atestado médico.');
    }

    const targetStatus = dto.status === 'APROVADO' ? MedicalCertificateStatus.APROVADO : MedicalCertificateStatus.RECUSADO;

    return await prisma.$transaction(async (tx) => {
      let createdLeaveId: string | null = null;

      // Se aprovado e tiver 1 ou mais dias, gera o registro de afastamento correspondente
      if (targetStatus === MedicalCertificateStatus.APROVADO) {
        const leaveEndDate = new Date(cert.startDate);
        leaveEndDate.setDate(leaveEndDate.getDate() + cert.daysOff - 1);

        const leaveType = cert.daysOff > 15 ? 'DOENCA_INSS' : 'DOENCA_ATE_15D';

        const leave = await tx.employeeLeave.create({
          data: {
            companyId: user.companyId,
            employeeId: cert.employeeId,
            type: leaveType,
            startDate: cert.startDate,
            endDate: leaveEndDate,
            expectedReturnDate: leaveEndDate,
            reason: `Atestado Médico Homologado: ${cert.justification || 'Repouso médico prescrito'} (${cert.daysOff} dias)`,
            cidCode: cert.cidCode,
            status: 'ATIVO',
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });

        createdLeaveId = leave.id;
      }

      const updatedCert = await tx.medicalCertificate.update({
        where: { id: certificateId },
        data: {
          status: targetStatus,
          decisionNotes: dto.decisionNotes?.trim() || null,
          reviewedById: user.id,
          decidedAt: new Date(),
          employeeLeaveId: createdLeaveId,
        },
      });

      return updatedCert;
    });
  }
}

export const medicalCertificatesService = new MedicalCertificatesService();
