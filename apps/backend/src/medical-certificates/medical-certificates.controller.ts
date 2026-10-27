import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { medicalCertificatesService } from './medical-certificates.service';

export const medicalCertificatesRouter = Router();
medicalCertificatesRouter.use(authGuard);

/**
 * GET /api/medical-certificates
 * Listagem para RH / Gestor
 */
medicalCertificatesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeId, status } = req.query;
    const certs = await medicalCertificatesService.listCertificates(req.user!.companyId, req.user!, {
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? String(status) : undefined,
    });
    res.status(200).json(certs);
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao consultar atestados.' });
  }
});

/**
 * GET /api/medical-certificates/my-certificates
 * Colaborador consulta seus próprios atestados
 */
medicalCertificatesRouter.get('/my-certificates', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.employeeId) {
      return res.status(400).json({ error: 'Usuário não possui vínculo funcional de colaborador.' });
    }
    const certs = await medicalCertificatesService.listCertificates(req.user!.companyId, req.user!, {
      employeeId: req.user!.employeeId,
    });
    res.status(200).json(certs);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao consultar atestados do colaborador.' });
  }
});

/**
 * POST /api/medical-certificates
 * Envio de atestado médico pelo colaborador ou RH
 */
medicalCertificatesRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const cert = await medicalCertificatesService.createCertificate(req.user!, req.body);
    res.status(201).json({
      message: 'Atestado médico enviado com sucesso para análise do RH!',
      certificate: cert,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao submeter atestado médico.' });
  }
});

/**
 * POST /api/medical-certificates/:id/decide
 * Homologação ou recusa pelo RH
 */
medicalCertificatesRouter.post('/:id/decide', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const decided = await medicalCertificatesService.decideCertificate(req.user!, id, req.body);
    res.status(200).json({
      message: `Atestado médico ${decided.status === 'APROVADO' ? 'homologado' : 'recusado'} com sucesso!`,
      certificate: decided,
    });
  } catch (error: any) {
    const statusCode = error.message?.includes('Acesso negado') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Erro ao homologar atestado médico.' });
  }
});
