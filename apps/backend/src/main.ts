import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './auth/auth.controller';
import { employeesRouter } from './employees/employees.controller';
import { departmentsRouter } from './departments/departments.controller';
import { positionsRouter } from './positions/positions.controller';
import { schedulesRouter } from './schedules/schedules.controller';
import { companiesRouter } from './companies/companies.controller';
import { dashboardRouter } from './dashboard/dashboard.controller';
import { timeTrackingRouter } from './time-tracking/time-tracking.controller';
import { timesheetRouter } from './timesheet/timesheet.controller';
import { adjustmentsRouter } from './adjustments/adjustments.controller';
import { timeBankRouter } from './time-bank/time-bank.controller';
import { vacationsRouter } from './vacations/vacations.controller';
import { leavesRouter } from './leaves/leaves.controller';
import { medicalCertificatesRouter } from './medical-certificates/medical-certificates.controller';
import { documentsRouter } from './documents/documents.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '15mb' }));

// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Pontua RH API',
    timestamp: new Date().toISOString(),
    version: '4.0.0-fase4',
  });
});

// Registro de Módulos da API
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/time-tracking', timeTrackingRouter);
app.use('/api/timesheet', timesheetRouter);
app.use('/api/adjustments', adjustmentsRouter);
app.use('/api/time-bank', timeBankRouter);
app.use('/api/vacations', vacationsRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/medical-certificates', medicalCertificatesRouter);
app.use('/api/documents', documentsRouter);

// Tratamento de rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado', path: req.originalUrl });
});

export const server = app.listen(PORT, () => {
  console.log(`🚀 Pontua RH Backend rodando com sucesso na porta ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});

export default app;
