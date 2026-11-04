import { Router, Response } from 'express';
import { payrollService } from './payroll.service';
import { authGuard, rolesGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { featureGuard } from '../middlewares/feature.guard';
import { UserRole, PlanFeature } from '@pontuarh/shared';

export const payrollRouter = Router();

// Todas as rotas do módulo de folha requerem autenticação, perfil com alçada e feature no plano
payrollRouter.use(
  authGuard,
  rolesGuard([UserRole.SUPER_ADMIN, UserRole.ADMIN_EMPRESA, UserRole.RH, UserRole.CONTADOR]),
  featureGuard(PlanFeature.FOLHA_PAGAMENTO)
);

/**
 * Listar histórico de competências da empresa
 */
payrollRouter.get('/competences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await payrollService.listCompetences(req.user!);
    return res.status(200).json(list);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao listar competências.' });
  }
});

/**
 * Obter detalhes e demonstrativos consolidados de uma competência
 */
payrollRouter.get('/competences/:competence', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const details = await payrollService.getCompetenceDetails(req.user!, req.params.competence);
    if (!details) {
      return res.status(404).json({ error: 'Competência não encontrada ou ainda não calculada.' });
    }
    return res.status(200).json(details);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao consultar competência.' });
  }
});

/**
 * Gerar ou recalcular prévia da folha para a competência
 */
payrollRouter.post('/competences/:competence/calculate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const calculated = await payrollService.calculateOrRecalculateCompetence(req.user!, req.params.competence);
    return res.status(200).json(calculated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao calcular folha de pagamento.' });
  }
});

/**
 * Adicionar lançamento manual (provento ou desconto) para colaborador
 */
payrollRouter.post('/competences/:competence/items', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await payrollService.addManualItem(req.user!, req.params.competence, req.body);
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao adicionar lançamento manual.' });
  }
});

/**
 * Remover lançamento manual
 */
payrollRouter.delete('/competences/:competence/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await payrollService.deleteManualItem(req.user!, req.params.competence, req.params.itemId);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao excluir lançamento manual.' });
  }
});

/**
 * Fechar competência definitivamente (torna valores imutáveis)
 */
payrollRouter.post('/competences/:competence/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const closed = await payrollService.closeCompetence(req.user!, req.params.competence, req.body.notes);
    return res.status(200).json(closed);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao fechar competência.' });
  }
});

/**
 * Exportar demonstrativo da folha em formato CSV (Excel UTF-8)
 */
payrollRouter.get('/competences/:competence/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvData = await payrollService.exportCompetenceCSV(req.user!, req.params.competence);
    const fileName = `folha_${req.params.competence}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csvData);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao exportar folha em CSV.' });
  }
});
