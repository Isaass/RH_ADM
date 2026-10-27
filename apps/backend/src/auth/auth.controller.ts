import { Router, Response } from 'express';
import { authService } from './auth.service';
import { authGuard, AuthenticatedRequest } from '../middlewares/auth.guard';
import { LoginSchema } from '@pontuarh/shared';

export const authRouter = Router();

authRouter.post('/login', async (req, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Dados de login inválidos',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { email, password } = parseResult.data;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    const authResult = await authService.login(email, password, ip);
    return res.status(200).json(authResult);
  } catch (error: any) {
    return res.status(401).json({
      error: 'Falha na autenticação',
      message: error.message || 'Erro ao realizar login.',
    });
  }
});

authRouter.get('/me', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userData = await authService.getMe(userId);
    return res.status(200).json(userData);
  } catch (error: any) {
    return res.status(404).json({
      error: 'Erro de sessão',
      message: error.message || 'Dados do usuário não encontrados.',
    });
  }
});
