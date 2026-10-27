# Pontua RH — Plataforma SaaS de Gestão de RH, DP e Ponto Eletrônico

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

O **Pontua RH** é uma solução corporativa SaaS desenvolvida especificamente para o mercado brasileiro de Recursos Humanos e Departamento Pessoal, em total alinhamento com a Consolidação das Leis do Trabalho (CLT) e os preceitos de segurança jurídica previstos pela Portaria MTP nº 671/2021.

---

## 🏛️ Visão Geral e Arquitetura

O sistema é construído como um **Monorepo Modular** com isolamento estrito de responsabilidades, tipagem compartilhada de ponta a ponta e arquitetura preparada para escalabilidade multiempresa (*Multitenancy*).

```
pontua-rh/
├── apps/
│   ├── frontend/             # Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, Lucide React
│   └── backend/              # NestJS / TypeScript, Prisma ORM, JWT, RBAC, Validações Zod
├── packages/
│   └── shared/               # Tipos TypeScript, Enums, DTOs, Validadores (CPF, CNPJ) e utilitários BR
├── docs/                     # Documentação de Arquitetura, Requisitos, Banco de Dados e Roadmap
│   ├── ARCHITECTURE.md
│   ├── REQUIREMENTS.md
│   ├── DATABASE.md
│   └── ROADMAP.md
├── docker-compose.yml        # Configuração de containers (PostgreSQL, PgAdmin, App)
└── package.json              # Configuração raiz do monorepo (npm workspaces)
```

---

## 🚀 Status do Projeto

### 🟢 FASE 1 — Fundação (Concluída)
- [x] **Monorepo & Estrutura**: Workspaces configurados com TypeScript e compartilhamento de tipos.
- [x] **Banco de Dados & ORM**: Prisma ORM modelado com suporte a Multitenancy, RBAC e rastreabilidade.
- [x] **Autenticação & RBAC**: Tokens JWT seguros, hashing de senha com bcrypt, isolamento por Tenant (`company_id`) e perfis de acesso.
- [x] **Gestão de Empresas e Colaboradores**: Cadastro completo, validação de CPF e unicidade, histórico contratual e proteção estrita de informações salariais.
- [x] **Layout & Design System**: Portais Administrativo e do Colaborador com tema claro/escuro.

### 🟢 FASE 2.1 — Estabilização, Segurança e Qualidade (Concluída)
- [x] **Padronização PostgreSQL Oficial**: PostgreSQL estabelecido como SGBD oficial para desenvolvimento, testes e produção com migrações versionadas (`prisma migrate dev/deploy`) e Docker Compose local.
- [x] **Integridade Criptográfica & Idempotência**: Substituição do bloqueio genérico de 60s por chave de idempotência (`Idempotency-Key`) no cabeçalho/corpo com tratamento atômico de corrida (`P2002`). Hash SHA-256 encadeado por colaborador documentado e diferenciado de assinatura digital ICP-Brasil.
- [x] **Motor de Apuração Robusto**: Cobertura completa de 16 cenários trabalhistas (escalas 5x2, 6x1, 12x36, travessia de meia-noite, múltiplos intervalos, tolerância CLT Art. 58 § 1º, marcações fora de ordem, feriados nacionais, segregação de horas trabalhadas, horas extras potenciais, banco de horas e horas para pagamento).
- [x] **Segurança e Isolamento RBAC**: Testes de integração comprovando isolamento multitenant entre empresas, segregação entre colaboradores, restrição de gestores apenas aos seus subordinados, sigilo salarial (`baseSalary`), bloqueio de autoaprovação, higienização de anexos (bloqueio de executáveis/scripts) e proteção contra elevação de privilégios.
- [x] **Classificação Documental e Portaria 671/2021**: Documentação em `docs/PORTARIA_671_COMPLIANCE.md` diferenciando prévia visual, comprovante de ponto, espelho eletrônico e arquivos fiscais (AFD/AEJ).

### 🟢 FASE 3 — Banco de Horas, Compensações e Gestão de Jornada (Concluída)
- [x] **Livro de Movimentações (Ledger Transacional)**: Registro imutável de todas as movimentações de horas (`CREDITO`, `DEBITO`, `AJUSTE_CREDITO`, `AJUSTE_DEBITO`, `COMPENSACAO`, `TRANSFERENCIA_PAGAMENTO`, `ESTORNO`) com proibição de exclusão física e correções via estorno auditável.
- [x] **Políticas Parametrizáveis de Banco de Horas**: Gestão flexível de regras por empresa/departamento com vigência, tipo de compensação, limite diário de crédito (CLT Art. 59), limites negativos e destinação no vencimento.
- [x] **Cálculo Dinâmico em Minutos Inteiros**: Totalização rigorosa de saldo anterior, créditos, débitos, compensações, transferências para folha e saldo expirável, sem aproximações decimais.
- [x] **Máquina de Estados & Prevenção de Gasto Duplo**: Reserva atômica de saldo (`status: RESERVADA`) na solicitação de compensação, impedindo que as mesmas horas sejam consumidas simultaneamente.
- [x] **Integração com Ponto & Retroatividade**: Recálculo automático do espelho e geração de contrapartidas no ledger quando ajustes de ponto são aprovados, sem alterar marcações brutas originais.
- [x] **Liquidação para Folha de Pagamento**: Mecanismo de exportação de saldo positivo para competência financeira com bloqueio concorrente e rastreabilidade total.
- [x] **Dashboard Administrativo Completo**: 5 abas em `/admin/time-bank` (Saldos por Colaborador, Extrato / Ledger com Estorno, Solicitações de Compensação, Políticas & Acordos, Transferência para Folha).
- [x] **Portal do Colaborador**: Interface em `/portal/time-bank` com saldo disponível vs. reservado, extrato de movimentações, modal de solicitação com validação instantânea e histórico de solicitações.
- [x] **Cobertura de Testes**: 70 testes unitários e de integração no PostgreSQL cobrindo 18 cenários de negócio da Fase 3 + 2 suítes Playwright E2E em navegadores reais.

### 🟢 FASE 3.1 — Revisão e Estabilização do Banco de Horas (Concluída)
- [x] **Ciclo de Vida das Compensações (5 Estados)**: Diferenciação estrita entre `RESERVADA`, `APROVADA`, `REALIZADA`, `RECUSADA` e `CANCELADA`. As horas de folgas futuras aprovadas permanecem retidas preventivamente sem débito contábil antecipado no ledger até a confirmação de realização.
- [x] **Cancelamento de Folga Aprovada**: Suporte a cancelamento de compensações previamente autorizadas (`APROVADA`), com liberação imediata da reserva de saldo e rastreabilidade total.
- [x] **Tratamento de Vencimentos sem Expurgo**: Identificação de saldos expirados (`isExpired`) ou próximos da expiração (`daysUntilExpiry <= 30`), com bloqueio rigoroso de expurgo ou exclusão automática de saldos positivos sem regra administrativa ou convenção coletiva validada.
- [x] **Permissões e Visibilidade Estrita de Gestores**: Auditoria e restrição de `GET /api/time-bank/balances`, `GET /api/time-bank/balances/:employeeId` e `GET /api/time-bank/transactions` exclusivamente aos subordinados diretos (`managerId == user.employeeId`), prevenindo vazamentos interdepartamentais ou entre empresas.
- [x] **Contabilização Idempotente e Recálculo Retroativo**: Sincronização retroativa segura (`syncDayAdjustment`) com estorno auditável de lançamentos retificados, sem duplicações e preservando saldos encaminhados para folha de pagamento.
- [x] **Concorrência e Locks Transacionais**: Bloqueio de linha PostgreSQL (`SELECT ... FOR UPDATE`) em operações de banco de horas e compensação, prevenindo duplo gasto concorrente e estorno duplicado.
- [x] **Qualidade e Testes Automatizados**: 70 testes unitários/integração no Vitest (18 cenários de estabilização da Fase 3.1) + 2 suítes Playwright E2E em navegadores reais aprovadas (100%).

### 🟢 FASE 4 — Gestão de Férias, Afastamentos, Atestados e Documentos (Concluída)
- [x] **Acompanhamento de Períodos Contratuais**: Rastreamento automatizado de Período Aquisitivo (CLT Art. 130) e Concessivo (CLT Art. 134), com tabela progressiva de desconto por faltas injustificadas.
- [x] **Prevenção de Dobra Trabalhista**: Alertas preventivos para períodos a vencer em até 60 dias e mitigação de risco de pagamento em dobro (CLT Art. 137).
- [x] **Motor de Cálculo de Férias & Simulação**: Serviço desacoplado testável para cálculo de dias de fruição, 1/3 constitucional (CF/88 Art. 7º XVII), abono pecuniário (CLT Art. 143: até 10 dias / 1/3) e prévia preliminar de remuneração bruta com ressalva legal explícita para apuração líquida na folha (Fase 5).
- [x] **Validação Trabalhista de Fracionamento**: Suporte às regras da Reforma Trabalhista (CLT Art. 134 § 1º: até 3 períodos, um >= 14 dias e nenhum < 5 dias).
- [x] **Vedação de Início Pré-DSR**: Bloqueio no agendamento de férias nos 2 dias que antecedem repouso remunerado ou feriados (CLT Art. 134 § 3º).
- [x] **Workflow Completo de Solicitações (8 Estados)**: `PENDENTE`, `EM_ANALISE`, `APROVADA`, `PROGRAMADA`, `EM_GOZO`, `CONCLUIDA`, `RECUSADA` e `CANCELADA`, com dedução e estorno atômicos de saldo de dias.
- [x] **Integração com Apuração de Ponto & Banco de Horas**: Reconhecimento de ausências planejadas (férias/licenças) no espelho mensal, suprimindo falsas ocorrências de `Falta Integral` e impedindo débitos indevidos de horas. Bloqueio automático de compensações sobrepostas a férias ou afastamentos.
- [x] **Afastamentos e Licenças Legais**: Gestão de auxílio-doença (empresa/INSS), acidente de trabalho, licença-maternidade (120d), paternidade, casamento, luto e militar com controle de previsão e retorno efetivo.
- [x] **Atestados Médicos com Sigilo Clínico (CFM nº 1.658/2002 & LGPD)**: Submissão e homologação de atestados com geração automática de licença vinculada e ocultação de CID-10 para gestores sem alçada.
- [x] **Prontuário Digital e Guarda Documental Segura**: Armazenamento protegido fora de diretórios públicos (`storage/documents`), download restrito por permissões RBAC e categorias documentais.
- [x] **Dashboards Administrativo e do Colaborador**: Visão gerencial em 6 cards e 5 abas operacionais (`/admin/vacations`) e portal de autoatendimento (`/portal/vacations`) com simulador em tempo real e envio de atestados.
- [x] **Cobertura de Testes**: 106 testes automatizados no vitest/PostgreSQL cobrindo os 20 cenários da Fase 4 + 3 suítes Playwright E2E aprovadas (100%).

---

## ⚙️ Pré-requisitos e Execução Local

### Requisitos:
- Node.js >= 18 (recomendado v20 ou v24)
- npm >= 9
- PostgreSQL 15+ (via Docker Compose ou serviço local na porta 5432)

### Execução com Docker Compose:
```bash
# Iniciar o banco de dados PostgreSQL
docker compose up -d postgres
```

### Instalação e Execução:

```bash
# 1. Instalar dependências de todos os workspaces
npm install

# 2. Executar migrações versionadas do Prisma e seed demonstrativo
npm --workspace=@pontuarh/backend run db:migrate:dev
npm run db:seed

# 3. Executar os testes unitários e de integração (106 testes no PostgreSQL)
npm run test

# 4. Executar os testes E2E reais no navegador (Playwright)
npx playwright test

# 5. Iniciar os servidores de desenvolvimento (Backend porta 3001, Frontend porta 3000)
npm run dev:backend
npm run dev:frontend
```

---

## 🔐 Credenciais Padrão para Testes (Seed Inicial)

O banco de dados de desenvolvimento vem pré-populado com os seguintes perfis demonstrativos:

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| **Admin Empresa** | `admin@pontuarh.com.br` | `Admin@123456` | Painel Administrativo Completo |
| **Gestor RH** | `rh@pontuarh.com.br` | `Rh@123456` | Gestão de Colaboradores e Jornadas |
| **Gestor de Equipe**| `gestor@pontuarh.com.br` | `Gestor@123456`| Visão de Equipe e Aprovações |
| **Colaborador** | `colaborador@pontuarh.com.br` | `Colab@123456` | Portal do Colaborador |

---

## 📜 Conformidade Legal e LGPD

- **Portaria MTP nº 671/2021**: A arquitetura do controle de ponto foi projetada com base nos princípios do REP-P (Registrador Eletrônico de Ponto via Programa), mantendo integridade dos dados e impossibilidade de sobrescrita de marcações originais.
- **LGPD (Lei 13.709/2018)**: Minimização de dados expostos, controle estrito de acesso a dados financeiros/salariais e trilha de auditoria para operações sensíveis.
