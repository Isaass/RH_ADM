import * as crypto from 'crypto';
import { prisma } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../middlewares/auth.guard';
import { TimeEntryType, UserRole } from '@pontuarh/shared';

export interface PunchClockDTO {
  type?: TimeEntryType | string;
  origin?: string;
  location?: string;
  ipAddress?: string;
  idempotencyKey?: string;
}

export class TimeTrackingService {
  /**
   * Registra uma nova marcação de ponto eletrônico com validações estritas do REP-P:
   * - Horário inviolável determinado pelo servidor
   * - Fuso horário oficial registrado (America/Sao_Paulo)
   * - Prevenção de duplicidade por Idempotência segura
   * - Preservação do registro original imutável (REP-P)
   * - Cadeia de integridade criptográfica SHA-256 (NOTA: não confundir com assinatura digital ICP-Brasil)
   * - Transação atômica e trilha de auditoria
   */
  async registerPunch(user: AuthenticatedUser, dto: PunchClockDTO) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    // Identificar o colaborador vinculado
    let targetEmployeeId = user.employeeId;

    if (!targetEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: user.id, companyId: user.companyId },
      });
      if (emp) {
        targetEmployeeId = emp.id;
      }
    }

    if (!targetEmployeeId) {
      throw new Error('Usuário autenticado não possui vínculo de colaborador ativo para registrar ponto.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        company: true,
        workSchedule: true,
      },
    });

    if (!employee || employee.companyId !== user.companyId) {
      throw new Error('Colaborador não localizado ou empresa incompatível.');
    }

    if (employee.status !== 'ATIVO') {
      throw new Error(`Não é possível registrar ponto: o colaborador está com status ${employee.status}.`);
    }

    // 1. Verificação de Idempotência: se idempotencyKey foi fornecida, verificar se já foi processada
    if (dto.idempotencyKey) {
      const existingEntry = await prisma.timeEntry.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existingEntry) {
        // Retorna a marcação existente de forma idempotente e segura
        const existingTimestamp = new Date(existingEntry.timestamp);
        return {
          message: 'Marcação recuperada com sucesso (resposta idempotente).',
          isIdempotent: true,
          entry: {
            id: existingEntry.id,
            type: existingEntry.type,
            timestamp: existingEntry.timestamp.toISOString(),
            formattedTime: existingTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            formattedDate: existingTimestamp.toLocaleDateString('pt-BR'),
            timezone: existingEntry.timezone,
            hashIntegrity: existingEntry.hashIntegrity,
            origin: existingEntry.origin,
            originalRecord: existingEntry.originalRecord,
          },
          employee: {
            id: employee.id,
            fullName: employee.fullName,
            cpf: employee.cpf,
            registrationNumber: employee.registrationNumber,
          },
          company: {
            name: employee.company.tradeName || employee.company.name,
            cnpj: employee.company.cnpj,
          },
        };
      }
    }

    // Horário oficial determinado pelo SERVIDOR
    const serverTimestamp = new Date();
    const serverTimezone = 'America/Sao_Paulo';

    // Início e fim do dia atual no fuso de Brasília
    const startOfDay = new Date(serverTimestamp);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(serverTimestamp);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Proteção contra duplo clique físico imediato (< 2s com mesmo tipo) apenas para requisições sem idempotencyKey explícito
    if (!dto.idempotencyKey) {
      const recentEntry = await prisma.timeEntry.findFirst({
        where: {
          employeeId: targetEmployeeId,
          companyId: user.companyId,
          adjustmentRequestId: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentEntry) {
        const diffMs = serverTimestamp.getTime() - new Date(recentEntry.createdAt).getTime();
        if (diffMs >= 0 && diffMs < 2000 && (!dto.type || dto.type === recentEntry.type)) {
          throw new Error('Marcação duplicada detectada: Clique duplo acidental detectado. A sua marcação anterior já está sendo processada.');
        }
      }
    }

    // 3. Determinar o tipo da marcação se não fornecido explicitamente
    let punchType = dto.type;
    if (!punchType) {
      const todayCount = await prisma.timeEntry.count({
        where: {
          employeeId: targetEmployeeId,
          companyId: user.companyId,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (todayCount === 0) {
        punchType = TimeEntryType.ENTRADA;
      } else if (todayCount === 1) {
        punchType = TimeEntryType.INTERVALO_SAIDA;
      } else if (todayCount === 2) {
        punchType = TimeEntryType.INTERVALO_RETORNO;
      } else if (todayCount === 3) {
        punchType = TimeEntryType.SAIDA;
      } else {
        punchType = TimeEntryType.MARCACAO_ADICIONAL;
      }
    }

    // 4. Execução transacional para garantir integridade atômica da cadeia criptográfica e persistência
    let createdEntry: any;
    try {
      createdEntry = await prisma.$transaction(async (tx) => {
        // Buscar a última marcação do colaborador para compor o encadeamento do hash
        const lastGlobalEntry = await tx.timeEntry.findFirst({
          where: { employeeId: targetEmployeeId, companyId: user.companyId },
          orderBy: { timestamp: 'desc' },
          select: { hashIntegrity: true },
        });
        const previousHash = lastGlobalEntry?.hashIntegrity || 'ORIGIN_PORTARIA_671_PONTUA_RH';

        // Identificador único da marcação
        const preliminaryId = 'cl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 20);

        // CADEIA CRIPTOGRÁFICA DE INTEGRIDADE (SHA-256)
        // Nota: Este hash garante a inviolabilidade e sequenciamento histórico dos registros (não constitui assinatura digital ICP-Brasil)
        const hashString = `${preliminaryId}|${user.companyId}|${targetEmployeeId}|${serverTimestamp.toISOString()}|${punchType}|${previousHash}`;
        const hashIntegrity = crypto.createHash('sha256').update(hashString).digest('hex');

        // Persistência com originalRecord: true e idempotencyKey
        const entry = await tx.timeEntry.create({
          data: {
            id: preliminaryId,
            companyId: user.companyId,
            employeeId: targetEmployeeId,
            timestamp: serverTimestamp,
            timezone: serverTimezone,
            type: punchType,
            origin: dto.origin || 'WEB',
            location: dto.location || null,
            ipAddress: dto.ipAddress || null,
            originalRecord: true,
            isTreated: false,
            idempotencyKey: dto.idempotencyKey || null,
            hashIntegrity,
          },
        });

        // Trilha de auditoria
        let auditUserId: string | null = null;
        if (user.id) {
          const u = await tx.user.findUnique({ where: { id: user.id }, select: { id: true } });
          if (u) auditUserId = u.id;
        }

        await tx.auditLog.create({
          data: {
            companyId: user.companyId,
            userId: auditUserId,
            action: 'TIME_PUNCH',
            entity: 'TimeEntry',
            entityId: entry.id,
            details: `Registro de ponto: ${entry.type} às ${serverTimestamp.toLocaleTimeString('pt-BR')} (Hash integridade: ${hashIntegrity.substring(0, 16)}...).`,
            ipAddress: dto.ipAddress || null,
          },
        });

        return entry;
      });
    } catch (err: any) {
      // Se duas requisições concorrentes tentarem inserir a mesma idempotencyKey ao mesmo tempo,
      // a restrição UNIQUE do PostgreSQL (P2002) protege o banco. Recuperamos o registro existente de forma idempotente.
      if (dto.idempotencyKey && (err.code === 'P2002' || err.message?.includes('Unique constraint'))) {
        const existing = await prisma.timeEntry.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
          const existingTimestamp = new Date(existing.timestamp);
          return {
            message: 'Marcação recuperada com sucesso (resposta idempotente concorrente).',
            isIdempotent: true,
            entry: {
              id: existing.id,
              type: existing.type,
              timestamp: existing.timestamp.toISOString(),
              formattedTime: existingTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              formattedDate: existingTimestamp.toLocaleDateString('pt-BR'),
              timezone: existing.timezone,
              hashIntegrity: existing.hashIntegrity,
              origin: existing.origin,
              originalRecord: existing.originalRecord,
            },
            employee: {
              id: employee.id,
              fullName: employee.fullName,
              cpf: employee.cpf,
              registrationNumber: employee.registrationNumber,
            },
            company: {
              name: employee.company.tradeName || employee.company.name,
              cnpj: employee.company.cnpj,
            },
          };
        }
      }
      throw err;
    }

    return {
      message: 'Ponto registrado com sucesso!',
      isIdempotent: false,
      entry: {
        id: createdEntry.id,
        type: createdEntry.type,
        timestamp: createdEntry.timestamp.toISOString(),
        formattedTime: serverTimestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        formattedDate: serverTimestamp.toLocaleDateString('pt-BR'),
        timezone: createdEntry.timezone,
        hashIntegrity: createdEntry.hashIntegrity,
        origin: createdEntry.origin,
        originalRecord: createdEntry.originalRecord,
      },
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        cpf: employee.cpf,
        registrationNumber: employee.registrationNumber,
      },
      company: {
        name: employee.company.tradeName || employee.company.name,
        cnpj: employee.company.cnpj,
      },
    };
  }

  /**
   * Buscar marcações de hoje do colaborador logado
   */
  async getTodayEntries(user: AuthenticatedUser) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada ao usuário.');
    }

    let targetEmployeeId = user.employeeId;
    if (!targetEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: user.id, companyId: user.companyId },
      });
      targetEmployeeId = emp?.id || null;
    }

    if (!targetEmployeeId) {
      return { entries: [], count: 0 };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId: targetEmployeeId,
        companyId: user.companyId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      count: entries.length,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp.toISOString(),
        time: new Date(e.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timezone: e.timezone,
        origin: e.origin,
        originalRecord: e.originalRecord,
        isTreated: e.isTreated,
        hashIntegrity: e.hashIntegrity,
      })),
    };
  }

  /**
   * Listar histórico de marcações de um colaborador por período com RBAC
   */
  async getEmployeeEntries(user: AuthenticatedUser, employeeId: string, startDate?: string, endDate?: string) {
    if (!user.companyId) {
      throw new Error('Empresa não vinculada.');
    }

    // RBAC: Colaborador só pode consultar suas próprias marcações
    if (user.role === UserRole.COLABORADOR) {
      if (user.employeeId && user.employeeId !== employeeId) {
        throw new Error('Acesso negado: Você não possui autorização para consultar marcações de outro colaborador.');
      }
    }

    // GESTOR só pode consultar subordinados ou a si mesmo
    if (user.role === UserRole.GESTOR) {
      const target = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!target || (target.managerId !== user.employeeId && target.id !== user.employeeId)) {
        throw new Error('Acesso negado: Este colaborador não pertence à sua equipe de gestão.');
      }
    }

    const whereClause: any = {
      companyId: user.companyId,
      employeeId,
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.timestamp = { gte: start, lte: end };
    }

    const entries = await prisma.timeEntry.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
    });

    return entries;
  }
}

export const timeTrackingService = new TimeTrackingService();
