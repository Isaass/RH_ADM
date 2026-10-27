import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  AuthenticatedUser,
  canManageDocuments,
  DocumentCategory,
  UserRole,
} from '@pontuarh/shared';
import { validateAttachment } from '../adjustments/adjustments.service';

const prisma = new PrismaClient();

// Diretório de armazenamento seguro fora da raiz pública
const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'documents');

export interface UploadDocumentDTO {
  employeeId?: string;
  category: string;
  title: string;
  fileName: string;
  fileBase64: string; // Conteúdo base64 do arquivo
  mimeType?: string;
  isConfidential?: boolean;
  referenceType?: string;
  referenceId?: string;
}

export class DocumentsService {
  constructor() {
    // Garante que o diretório de storage exista
    if (!fs.existsSync(STORAGE_ROOT)) {
      fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    }
  }

  /**
   * Listagem de documentos com filtro de permissões e sigilo
   */
  async listDocuments(
    companyId: string,
    user: AuthenticatedUser,
    filters?: { employeeId?: string; category?: string }
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

    if (filters?.category) {
      where.category = filters.category;
    }

    const docs = await prisma.employeeDocument.findMany({
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

    const isHrOrAdmin = canManageDocuments(user.role);

    // Gestores não podem visualizar metadados de documentos confidenciais
    return docs.filter((d) => {
      if (d.isConfidential && !isHrOrAdmin && d.employeeId !== user.employeeId) {
        return false;
      }
      return true;
    });
  }

  /**
   * Upload seguro de documento com validação de extensão e limite de tamanho
   */
  async uploadDocument(user: AuthenticatedUser, dto: UploadDocumentDTO) {
    const targetEmployeeId = dto.employeeId || user.employeeId;
    if (!targetEmployeeId) {
      throw new Error('Colaborador não identificado.');
    }

    if (user.role === UserRole.COLABORADOR && user.employeeId !== targetEmployeeId) {
      throw new Error('Você só pode fazer upload de documentos para o seu próprio perfil.');
    }

    if (user.role === UserRole.GESTOR) {
      const emp = await prisma.employee.findFirst({
        where: { id: targetEmployeeId, companyId: user.companyId, managerId: user.employeeId },
      });
      if (!emp) {
        throw new Error('Acesso negado: colaborador não pertence à sua equipe.');
      }
    }

    // Validação de extensão segura
    validateAttachment(dto.fileName);

    if (!dto.fileBase64 || !dto.fileBase64.trim()) {
      throw new Error('Conteúdo do arquivo não fornecido.');
    }

    // Trata e decodifica base64
    const base64Data = dto.fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSize = buffer.length;

    // Limite máximo de 10 MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      throw new Error('O arquivo excede o tamanho máximo permitido de 10 MB.');
    }

    // Estrutura de diretório protegida: storage/documents/<companyId>/<employeeId>/
    const companyDir = path.join(STORAGE_ROOT, user.companyId);
    const employeeDir = path.join(companyDir, targetEmployeeId);
    if (!fs.existsSync(employeeDir)) {
      fs.mkdirSync(employeeDir, { recursive: true });
    }

    const fileTimestamp = Date.now();
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeKey = `${fileTimestamp}_${sanitizedFileName}`;
    const destinationPath = path.join(employeeDir, safeKey);

    // Gravação segura no disco local
    fs.writeFileSync(destinationPath, buffer);

    const doc = await prisma.employeeDocument.create({
      data: {
        companyId: user.companyId,
        employeeId: targetEmployeeId,
        category: dto.category || DocumentCategory.OUTROS,
        title: dto.title.trim(),
        fileName: sanitizedFileName,
        fileKey: path.relative(STORAGE_ROOT, destinationPath).replace(/\\/g, '/'),
        fileSize,
        mimeType: dto.mimeType || 'application/octet-stream',
        uploadedById: user.id,
        isConfidential: Boolean(dto.isConfidential),
        referenceType: dto.referenceType || null,
        referenceId: dto.referenceId || null,
      },
    });

    return doc;
  }

  /**
   * Download autorizado de documento com verificação rigorosa de acesso e confidencialidade
   */
  async getDocumentFile(companyId: string, documentId: string, user: AuthenticatedUser) {
    const doc = await prisma.employeeDocument.findFirst({
      where: { id: documentId, companyId },
      include: { employee: true },
    });

    if (!doc) {
      throw new Error('Documento não encontrado.');
    }

    const isOwner = doc.employeeId === user.employeeId;
    const isHrOrAdmin = canManageDocuments(user.role);
    const isManager = user.role === UserRole.GESTOR && doc.employee.managerId === user.employeeId;

    if (!isOwner && !isHrOrAdmin && !isManager) {
      throw new Error('Acesso não autorizado ao documento.');
    }

    // Se o documento é confidencial, gestor não pode baixar
    if (doc.isConfidential && !isHrOrAdmin && !isOwner) {
      throw new Error('Acesso negado: este documento é classificado como confidencial pelo RH.');
    }

    const absolutePath = path.join(STORAGE_ROOT, doc.fileKey);
    if (!fs.existsSync(absolutePath)) {
      throw new Error('Arquivo não localizado no repositório seguro.');
    }

    const fileBuffer = fs.readFileSync(absolutePath);

    return {
      document: doc,
      fileBuffer,
      base64: fileBuffer.toString('base64'),
    };
  }

  /**
   * Exclusão de documento pelo RH
   */
  async deleteDocument(companyId: string, documentId: string, user: AuthenticatedUser) {
    if (!canManageDocuments(user.role)) {
      throw new Error('Apenas o RH ou Administrador podem remover documentos.');
    }

    const doc = await prisma.employeeDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!doc) {
      throw new Error('Documento não encontrado.');
    }

    const absolutePath = path.join(STORAGE_ROOT, doc.fileKey);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error('Aviso: falha ao remover arquivo físico do storage:', err);
      }
    }

    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    return { message: 'Documento excluído com sucesso.' };
  }
}

export const documentsService = new DocumentsService();
