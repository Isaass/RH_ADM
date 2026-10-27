import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { documentsService } from './documents.service';

export const documentsRouter = Router();
documentsRouter.use(authGuard);

/**
 * GET /api/documents
 * Listagem para RH / Gestor
 */
documentsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeId, category } = req.query;
    const docs = await documentsService.listDocuments(req.user!.companyId, req.user!, {
      employeeId: employeeId ? String(employeeId) : undefined,
      category: category ? String(category) : undefined,
    });
    res.status(200).json(docs);
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao listar documentos.' });
  }
});

/**
 * GET /api/documents/my-documents
 * Colaborador consulta seus próprios documentos
 */
documentsRouter.get('/my-documents', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.employeeId) {
      return res.status(400).json({ error: 'Usuário não possui vínculo funcional de colaborador.' });
    }
    const docs = await documentsService.listDocuments(req.user!.companyId, req.user!, {
      employeeId: req.user!.employeeId,
    });
    res.status(200).json(docs);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao listar documentos do colaborador.' });
  }
});

/**
 * POST /api/documents/upload
 * Upload de arquivo pelo RH, Gestor ou Colaborador
 */
documentsRouter.post('/upload', async (req: AuthenticatedRequest, res) => {
  try {
    const doc = await documentsService.uploadDocument(req.user!, req.body);
    res.status(201).json({
      message: 'Documento enviado com sucesso para o repositório seguro!',
      document: doc,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro no upload de documento.' });
  }
});

/**
 * GET /api/documents/:id/download
 * Download autorizado de documento
 */
documentsRouter.get('/:id/download', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const fileData = await documentsService.getDocumentFile(req.user!.companyId, id, req.user!);

    res.setHeader('Content-Type', fileData.document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.document.fileName}"`);
    res.send(fileData.fileBuffer);
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao efetuar download do documento.' });
  }
});

/**
 * DELETE /api/documents/:id
 * Exclusão de documento pelo RH
 */
documentsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const result = await documentsService.deleteDocument(req.user!.companyId, id, req.user!);
    res.status(200).json(result);
  } catch (error: any) {
    const statusCode = error.message?.includes('Apenas o RH') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao remover documento.' });
  }
});
