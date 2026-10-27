# Requisitos do Sistema — Pontua RH

## 1. Requisitos Funcionais (RF) — Fase 1 (Fundação)

| ID | Nome | Descrição | Perfis Autorizados |
|---|---|---|---|
| **RF01** | Autenticação Segura | Login com e-mail e senha com geração de token JWT assinado e validação de hash seguro (bcrypt). | Todos |
| **RF02** | Recuperação de Sessão | Endpoint `/api/auth/me` para restauração do estado autenticado e validação de perfil ativo. | Usuário Autenticado |
| **RF03** | Controle de Acesso (RBAC) | Restrição de endpoints de acordo com a regra de papéis definida no sistema. | Backend Guard |
| **RF04** | Gestão de Empresas | Criação e consulta de dados da empresa contratante (Razão Social, Nome Fantasia, CNPJ, Inscrição). | SUPER_ADMIN, ADMIN_EMPRESA |
| **RF05** | Cadastro de Colaboradores | Formulário completo com validação de CPF (algoritmo oficial BR), e-mail, admissão, cargo e departamento. | ADMIN_EMPRESA, RH |
| **RF06** | Listagem e Filtros | Consulta paginada com busca textual por nome, filtro por departamento e status (Ativo/Inativo). | ADMIN_EMPRESA, RH, GESTOR |
| **RF07** | Detalhes e Edição | Visualização dos dados cadastrais e atualização de informações com histórico. | ADMIN_EMPRESA, RH |
| **RF08** | Sigilo Salarial | Bloqueio automático de visualização de salário para perfis não autorizados (colaborador comum e gestor sem alçada). | Backend Service |
| **RF09** | Portal Administrativo | Dashboard com cards indicadores, estatísticas de colaboradores ativos, departamentos e navegação contextual. | ADMIN_EMPRESA, RH |
| **RF10** | Portal do Colaborador | Ambiente de autoatendimento responsivo com saudação, dados contratuais e atalhos rápidos. | COLABORADOR |


## 2. Requisitos Funcionais (RF) — Fase 2 (Controle de Ponto Eletrônico)

| ID | Nome | Descrição | Perfis Autorizados |
|---|---|---|---|
| **RF11** | Gestão de Jornadas | Configuração de escalas (5x2, 6x1, 12x36), horários de entrada/saída, intervalos e tolerâncias CLT Art. 58 § 1º. | ADMIN_EMPRESA, RH |
| **RF12** | Registro de Ponto Inviolável | Marcação eletrônica com timestamp oficial do servidor, fuso horário, hash SHA-256 e sem permissão de alteração do registro bruto. | COLABORADOR |
| **RF13** | Idempotência e Concorrência de Ponto | Prevenção de duplicidade por chave de idempotência com chave única no banco e lock em nível de transação. | Backend Service |
| **RF14** | Motor de Apuração de Jornada | Cálculo desacoplado de horas trabalhadas, horas extras, atrasos, faltas e tolerâncias CLT. | Backend Service |
| **RF15** | Espelho de Ponto Mensal | Visualização mensal consolidada com totalizadores e geração de relatório para conferência. | COLABORADOR, GESTOR, RH |
| **RF16** | Solicitação de Ajuste de Ponto | Submissão de justificativa e anexo para inclusão ou correção de marcação com validação de tipos de arquivo seguros. | COLABORADOR |
| **RF17** | Deliberação de Ajuste pelo Gestor | Análise de solicitações de ajuste restrita aos subordinados diretos, com proibição de autoaprovação. | GESTOR, RH, ADMIN_EMPRESA |

---

## 3. Requisitos Funcionais (RF) — Fase 3 (Banco de Horas e Compensações)

| ID | Nome | Descrição | Perfis Autorizados |
|---|---|---|---|
| **RF18** | Políticas Parametrizáveis de Banco de Horas | Cadastro de regras por empresa/departamento com vigência, tipo de compensação, limite diário de crédito (ex: 120m), limite de saldo negativo e destino de saldo no vencimento. | ADMIN_EMPRESA, RH |
| **RF19** | Livro de Movimentações (Ledger Transacional) | Registro imutável de todas as movimentações (`CREDITO`, `DEBITO`, `AJUSTE_CREDITO`, `AJUSTE_DEBITO`, `COMPENSACAO`, `TRANSFERENCIA_PAGAMENTO`, `ESTORNO`). Proibição de exclusão física. | Backend Service |
| **RF20** | Cálculo Dinâmico de Saldos em Minutos | Apuração de saldo anterior, créditos, débitos, compensações, horas em folha, saldo atual e saldo sujeito a vencimento, calculados exclusivamente a partir das movimentações ativas do ledger. | Todos (conforme escopo) |
| **RF21** | Integração Atômica com Apuração e Ajuste | Sincronização automática das horas excedentes/devidas ao aprovar ajustes de ponto, gerando lançamentos de ajuste no ledger sem alterar marcações originais. | Backend Service |
| **RF22** | Solicitação e Reserva de Compensação | Solicitação de folga ou saída/entrada antecipada com reserva atômica de minutos (`status: RESERVADA`), reduzindo o saldo disponível e impedindo gasto duplo de horas. | COLABORADOR |
| **RF23** | Deliberação e Realização de Compensação | Separação entre aprovação (`APROVADA` — mantém a reserva até a data sem débito no ledger) e realização (`REALIZADA` — consolida o débito e liquida a reserva). Recusa (`RECUSADA`) exige justificativa obrigatória e desfaz a reserva. Bloqueio de autoaprovação e restrição à alçada de subordinação direta. | GESTOR, RH, ADMIN_EMPRESA |
| **RF24** | Cancelamento de Folga e Liberação de Reserva | Cancelamento permitido para solicitações em estado `RESERVADA` ou `APROVADA` (desistência de folga futura previamente aprovada), com liberação integral e automática dos minutos reservados. Transição a partir de `REALIZADA` bloqueada sem processo de estorno. | COLABORADOR, GESTOR, RH |
| **RF25** | Estorno Administrativo Auditável | Cancelamento de lançamentos consolidados no ledger exclusivamente através da operação de estorno com referência cruzada (`reversedById`), contrapartida e lock exclusivo de linha (`FOR UPDATE`) contra estornos duplicados. | ADMIN_EMPRESA, RH |
| **RF26** | Liquidação e Transferência para Folha | Encaminhamento de saldo positivo para pagamento na competência de folha de pagamento, abatendo as horas disponíveis (descontando reservas `RESERVADA` e `APROVADA`) com chave de idempotência e auditoria. | ADMIN_EMPRESA, RH |
| **RF27** | Dashboard Administrativo de Banco de Horas | Central de gestão com métricas consolidadas (horas creditadas, debitadas, pendentes), extrato com filtros avançados, central de aprovações e configuração de políticas. | ADMIN_EMPRESA, RH, GESTOR |
| **RF28** | Portal do Colaborador — Banco de Horas | Visualização de cards de saldo (disponível vs reservado), extrato analítico de lançamentos, modal de solicitação com validação prévia de saldo e acompanhamento de status. | COLABORADOR |
| **RF29** | Tratamento de Vencimentos sem Expurgo Automático | Identificação e sinalização de saldos expirados (`isExpired: true`, `expiryNotice`) ou em vencimento próximo (`daysUntilExpiry <= 30`), com bloqueio estrito de expurgo/baixa automática de saldos positivos sem regra administrativa ou convenção sindical homologada. | Backend Service, RH |
| **RF30** | Visibilidade e Alçada Estrita de Gestores | No módulo de banco de horas (saldos, transações, solicitações), colaboradores com perfil `GESTOR` visualizam e deliberam exclusivamente sobre seus subordinados diretos (`managerId == req.user.employeeId`), com validação no banco de dados contra vazamentos interdepartamentais ou cross-company. | Backend Guard, GESTOR |

---

## 4. Requisitos Funcionais (RF) — Fase 4 (Férias, Afastamentos, Atestados e Documentos)

| ID | Nome | Descrição | Perfis Autorizados |
|---|---|---|---|
| **RF31** | Períodos Aquisitivos e Concessivos | Geração automática e acompanhamento de períodos de 12 meses (CLT Art. 130) e concessivos subsequentes (CLT Art. 134), com tabela de redução de direito por faltas injustificadas. | ADMIN_EMPRESA, RH, GESTOR |
| **RF32** | Alerta Preventivo de Vencimento e Dobra | Monitoramento de prazos legais com sinalização de períodos próximos do vencimento (`daysUntilExpiry <= 60`) e alerta de risco de pagamento em dobro (CLT Art. 137). | ADMIN_EMPRESA, RH |
| **RF33** | Motor de Cálculo e Simulação de Férias | Cálculo desacoplado de dias de gozo, adicional constitucional de 1/3 (CF/88 Art. 7º XVII) e abono pecuniário (CLT Art. 143: até 10 dias / 1/3), com simulação da remuneração bruta preliminar e aviso legal de apuração de médias/descontos na folha (Fase 5). | Todos |
| **RF34** | Validação Trabalhista de Fracionamento | Validação das regras da Reforma Trabalhista (CLT Art. 134 § 1º): até 3 frações, sendo uma de no mínimo 14 dias e nenhuma inferior a 5 dias. | Backend Service |
| **RF35** | Vedação de Início Pré-DSR | Bloqueio de agendamento de férias nos 2 dias antecedentes ao Descanso Semanal Remunerado (DSR) ou feriado (CLT Art. 134 § 3º). | Backend Service |
| **RF36** | Ciclo de Vida de Solicitação de Férias | Máquina de estados com 8 status (`PENDENTE`, `EM_ANALISE`, `APROVADA`, `PROGRAMADA`, `EM_GOZO`, `CONCLUIDA`, `RECUSADA`, `CANCELADA`) com dedução atômica no saldo remanescente e estorno na recusa/cancelamento. | COLABORADOR, GESTOR, RH |
| **RF37** | Fruição e Efetivação de Férias | Confirmação da fruição efetiva de férias (`confirm-take`) registrando a transição para `EM_GOZO` e `CONCLUIDA`, vinculando ao período aquisitivo sem duplicar baixa de saldo. | ADMIN_EMPRESA, RH |
| **RF38** | Integração Férias-Espelho de Ponto | Reconhecimento de férias aprovadas/programadas e licenças na apuração mensal da jornada (`calculateTimesheet`), exibindo ausência planejada justificada, suprimindo falsas ocorrências de `Falta Integral` e zerando débitos indevidos de banco de horas. | Backend Service |
| **RF39** | Prevenção de Conflitos de Agenda | Bloqueio de solicitações de compensação de horas sobrepostas a períodos de férias ou afastamentos, e impedimento de agendamentos concorrentes para o mesmo colaborador. | Backend Service |
| **RF40** | Gerenciamento de Afastamentos e Licenças | Cadastro e acompanhamento de licenças legais (doença até 15d, INSS, acidente de trabalho, maternidade, paternidade, casamento, luto, militar), com registro de previsão e data efetiva de retorno. | ADMIN_EMPRESA, RH |
| **RF41** | Homologação de Atestados Médicos | Submissão de atestados médicos com período, profissional, CRM e anexo comprobatório. A aprovação gera automaticamente o respectivo afastamento (`EmployeeLeave`). | COLABORADOR, RH |
| **RF42** | Sigilo Clínico e Proteção LGPD (CFM) | Omissão de dados diagnósticos sensíveis (código CID-10) em endpoints acessíveis por gestores ou usuários sem alçada médica/RH, conforme Resolução CFM nº 1.658/2002. | Backend Guard / Service |
| **RF43** | Prontuário Digital e Guarda Documental | Repositório protegido fora da raiz pública para upload e download autorizado de documentos admissionais, contratuais, atestados, recibos e avisos, com validação de extensão e limite de 15MB. | ADMIN_EMPRESA, RH, COLABORADOR |
| **RF44** | Dashboard de Férias e Ausências | Visão gerencial em 6 cards indicadores (em férias, programadas, a vencer, pendentes, afastamentos, atestados) e abas analíticas com filtros por período e status. | ADMIN_EMPRESA, RH, GESTOR |

---

## 5. Requisitos Não Funcionais (RNF)

| ID | Categoria | Descrição |
|---|---|---|
| **RNF01** | **Segurança** | As senhas devem ser armazenadas com hash saltado (bcryptjs, mínimo 10 rounds). Tokens JWT com expiração configurável. |
| **RNF02** | **Isolamento de Dados** | Nenhuma requisição pode retornar dados de empresas distintas (`company_id` obrigatório nas queries e constraints multitenant). |
| **RNF03** | **Responsividade** | A interface deve se adaptar perfeitamente a dispositivos móveis a partir de 320px de largura até telas ultrawide. |
| **RNF04** | **Legislação Trabalhista** | A estrutura de dados de ponto, banco de horas e férias respeita a Portaria MTP 671/2021 e os preceitos da CLT (Art. 58, 59, 130, 134, 137, 143). |
| **RNF05** | **LGPD & Sigilo Sensível** | Minimização de dados expostos no frontend; separação de dados sensíveis de saúde (CID-10) e registro imutável de auditoria. |
| **RNF06** | **Performance & Tipagem** | Código 100% tipado com TypeScript, validações no frontend e backend utilizando Zod schemas compartilhados. |
| **RNF07** | **Acessibilidade & UI** | Paleta visual corporativa B2B (#0F172A, #2563EB, #16A34A), tipografia Inter/Sans, suporte a Dark Mode. |
| **RNF08** | **Integridade Transacional (ACID)** | Todas as operações de movimentação de banco de horas, reserva de saldo e dedução de dias de férias utilizam transações PostgreSQL com locks de linha (`SELECT ... FOR UPDATE`). |
| **RNF09** | **Idempotência Operacional** | Operações financeiras, de liquidação, marcação e compensação possuem identificador de idempotência único (`idempotencyKey`). |
| **RNF10** | **Sigilo Médico (CFM nº 1.658/2002)** | Atestados médicos e diagnósticos são tratados como dados de alta sensibilidade; visualização de CID restrita exclusivamente ao RH e medicina ocupacional. |
| **RNF11** | **Armazenamento Seguro de Documentos** | Arquivos corporativos e atestados são armazenados fora de diretórios públicos do servidor (`storage/documents`), acessíveis apenas mediante validação de token e autorização por tenant/usuário. |

---

## 6. Matriz de Validação Trabalhista (Implementado vs. Pendente de Homologação)

| Regra de Negócio | Status Técnico | Enquadramento Legal (CLT / CCT) | Observação / Pendência |
|---|---|---|---|
| **Cálculo em minutos inteiros** | ✅ Implementado | CLT Art. 58 § 1º | Elimina divergências por arredondamento de ponto e saldo. |
| **Imutabilidade de marcações brutas** | ✅ Implementado | Portaria MTP 671/2021 (REP-P) | Ajustes geram lançamentos de compensação sem alterar o ponto original. |
| **Acordo Individual (até 6 meses)** | ✅ Parametrizável | CLT Art. 59 § 5º | Válido se pactuado por acordo individual escrito entre empregador e empregado. |
| **Acordo/Convenção Coletiva (1 ano)** | ✅ Parametrizável | CLT Art. 59 § 2º | Exige chancela sindical do sindicato laboral da categoria correspondente. |
| **Compensação no mesmo mês** | ✅ Parametrizável | CLT Art. 59 § 6º | Pode ser acordado tácita ou formalmente para quitação no mês da ocorrência. |
| **Limite diário de 2h extras** | ✅ Parametrizável | CLT Art. 59 *caput* | Limite parametrizável (`maxDailyCreditMinutes`); padrão 120 minutos. |
| **Preservação de saldo positivo vencido** | ✅ Implementado | Jurisprudência TST / CLT Art. 59 § 3º | **Impedimento de expurgo automático**. Saldos positivos expirados são sinalizados para intervenção do RH, nunca deletados. |
| **Diferenciação Aprovação vs. Fruição** | ✅ Implementado | Princípio da Competência e Boa-fé | Horas aprovadas para folga futura ficam retidas preventivamente e só são debitadas contabilmente após a confirmação da realização. |
| **Tabela progressiva de faltas (Férias)** | ✅ Implementado | CLT Art. 130 | Redução automática de dias de direito (30d para 0 a 5 faltas, 24d para 6 a 14, 18d para 15 a 23, 12d para 24 a 32, 0d para > 32). |
| **Fracionamento de férias em até 3 vezes**| ✅ Implementado | CLT Art. 134 § 1º | Pelo menos um período >= 14 dias e nenhum menor que 5 dias. |
| **Vedação de início 2 dias antes de DSR** | ✅ Implementado | CLT Art. 134 § 3º | Férias não podem iniciar na sexta-feira ou sábado quando o DSR recai no domingo. |
| **Alerta preventivo de dobra de férias** | ✅ Implementado | CLT Art. 137 | Sinalização preventiva quando concessivo expira em <= 60 dias para evitar passivo de dobra de remuneração. |
| **Conversão em abono pecuniário (1/3)** | ✅ Implementado | CLT Art. 143 | Conversão de até 10 dias de férias em remuneração indenizada. |
| **Adicional Constitucional de 1/3** | ✅ Implementado | CF/88 Art. 7º XVII | Incidência automática sobre remuneração de gozo e abono na prévia financeira. |
| **Multiplicadores especiais (1.5x / 2.0x)** | ⚠️ Campo base criado | Dependente de CCT/ACT | O sistema armazena `creditRate`, mas regras de percentuais escalonados por domingo/feriado dependem de validação sindical específica. |
| **Rescisão contratual com saldo positivo** | ⚠️ Mecanismo de folha pronto | CLT Art. 59 § 3º | Transferência para folha implementada; o cálculo de verbas rescisórias completas depende da Fase 5 (Financeiro/Folha). |
| **Médias de horas extras sobre férias** | ⚠️ Integrável na Fase 5 | CLT Art. 142 § 5º | Prévia preliminar calcula valor base; cálculo com médias ponderadas de comissões/adicionais noturnos pertence à folha da Fase 5. |
