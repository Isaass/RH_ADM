# Relatório Técnico de Conformidade e Classificação Documental — Portaria MTP nº 671/2021 (REP-P e PTRP)

Este documento estabelece a análise técnica, jurídica e funcional dos módulos de controle eletrônico de ponto do sistema **Pontua RH** frente às exigências da **CLT (Art. 74)** e da **Portaria MTP nº 671/2021** (e atualizações), detalhando o enquadramento do **Registrador Eletrônico de Ponto via Programa (REP-P)** e do **Programa de Tratamento de Registro de Ponto (PTRP)**.

---

## 📑 1. Diferenciação e Enquadramento dos Documentos do Sistema

Para total transparência e segurança jurídica, o sistema diferencia rigorosamente 4 categorias de artefatos:

```
+--------------------------------------------------------------------------------------------------+
|                            CLASSIFICAÇÃO DOCUMENTAL — PONTUA RH                                 |
+------------------------------------+-------------------------------------------------------------+
| 1. Prévia Visual                   | Interface web / tela do usuário (informativa, não oficial)  |
| 2. Comprovante de Marcação         | Recibo individual do trabalhador (Art. 79/80 Portaria 671)  |
| 3. Espelho de Ponto Eletrônico     | Relatório consolidado mensal da jornada (Art. 84 da Portaria 671) |
| 4. Arquivos Fiscais Padronizados   | AFD (bruto) e AEJ (tratado) para fiscalização do MTE        |
+------------------------------------+-------------------------------------------------------------+
```

### 1.1. Prévia Visual (Não Vinculante)
- **Definição**: Exibição em tela (dashboards, listagens, modal de confirmação) acessível via navegador web ou aplicativo móvel.
- **Finalidade**: Permitir que o colaborador e a liderança acompanhem o fluxo operacional e as batidas diárias em tempo real.
- **Validade Jurídica**: Estritamente informativa. Não constitui documento comprobatório perante a Inspeção do Trabalho nem em juízo trabalhista.

### 1.2. Comprovante de Registro de Ponto do Trabalhador
- **Definição**: Comprovante disponibilizado imediatamente após o registro do ponto (Art. 79 e Art. 80 da Portaria 671/2021).
- **Dados Obrigatórios Previstos**:
  - Cabeçalho com denominação: "Comprovante de Registro de Ponto do Trabalhador";
  - Dados do empregador (Razão Social e CNPJ/CPF);
  - Dados do empregado (Nome completo e CPF);
  - Data e horário da marcação (determinado exclusivamente pelo servidor com fuso horário UTC-3);
  - Identificador único do registro (NSR / CUID) e Hash de Integridade Criptográfica (SHA-256);
  - Formato eletrônico PDF ou arquivo impresso.
- **Status Atual**: A estrutura de dados e o layout de impressão estão implementados. A validade oficial como substituto de comprovante impresso depende da assinatura digital ICP-Brasil (ver Seção 3).

### 1.3. Relatório Espelho de Ponto Eletrônico
- **Definição**: Documento mensal consolidado previsto no Art. 84 da Portaria 671/2021 gerado pelo PTRP.
- **Conteúdo Obrigatório**:
  - Dados da empresa (Razão Social, CNPJ, Endereço);
  - Dados do empregado (Nome, CPF, Matrícula, Cargo, Departamento, Data de Admissão);
  - Identificação da jornada contratual e escala vigente;
  - Relação diária de horários previstos e marcações realizadas (com indicação expressa de marcações originais REP-P vs tratadas PTRP);
  - Apuração consolidada de horas normais trabalhadas, atrasos, saídas antecipadas, horas extras potenciais, banco de horas e horas para pagamento;
  - Campo para ciência/assinatura do empregado e empregador.
- **Status Atual**: Módulo de apuração funcional e exportação visual/PDF implementados. Homologação final pendente de assinatura digital qualificada.

### 1.4. Arquivos Fiscais Exigidos (AFD e AEJ)
- **AFD (Arquivo Fonte de Dados)**: Arquivo em texto puro contendo a totalidade dos registros brutos e a cadeia criptográfica contínua, sem qualquer tratamento ou filtro.
- **AEJ (Arquivo Eletrônico de Jornada)**: Arquivo gerado pelo PTRP conforme leiaute estipulado no Anexo VI da Portaria 671/2021, contendo marcações originais, marcações tratadas, ausências, compensações e banco de horas.
- **Status Atual**: A modelagem de dados no PostgreSQL armazena todos os metadados necessários. Os geradores e validadores de exportação AFD/AEJ no leiaute oficial do MTE estão planejados para a Fase 6.

---

## ⚖️ 2. Requisitos Técnicos Já Implementados e Validados (Fase 2.1)

| Requisito Normativo | Dispositivo / Norma | Status | Implementação no Pontua RH |
|---|---|:---:|---|
| **Horário Oficial Inviolável** | Art. 75, I | ✅ Concluído | Timestamp gerado pelo servidor (`new Date()` / UTC-3), impossibilitando adulteração de data/hora pelo cliente. |
| **Fuso Horário Auditado** | Art. 75, II | ✅ Concluído | Campo `timezone` obrigatório em todo registro (`America/Sao_Paulo`). |
| **Identificação Unívoca da Batida** | Art. 76 | ✅ Concluído | Identificador CUID único e sequencial indexado no banco de dados. |
| **Imutabilidade do Registro Original** | Art. 74 CLT / Art. 83 | ✅ Concluído | `originalRecord: true` inviolável. Endpoints administrativos não possuem autorização para alterar ou remover registros brutos. |
| **Cadeia de Integridade Criptográfica** | Art. 78 | ✅ Concluído | Hash SHA-256 encadeado por colaborador (`id + companyId + timestamp + type + previousHash`). |
| **Idempotência Robusta e Concorrência** | Boas Práticas REP-P | ✅ Concluído | Substituição do bloqueio arbitrário de 60s por mecanismo de `Idempotency-Key` (header/payload) com `unique constraint` no PostgreSQL e tratamento de concorrência atômica via transação (`P2002`). |
| **Registro Fiel dos Fatos** | Art. 74 CLT | ✅ Concluído | Sem bloqueios restritivos ou restrição cega de jornada. Registra fatos reais; divergências são tratadas na apuração. |
| **Tratamento Separado PTRP** | Art. 84 | ✅ Concluído | Ajustes aprovados geram novos registros de tratamento (`originalRecord: false`, `isTreated: true`) vinculados à solicitação, preservando marcações originais. |
| **Trilha de Auditoria Auditável** | Art. 82 | ✅ Concluído | Logs imutáveis em `AuditLog` para todas as ações operacionais e decisórias com IP e usuário. |
| **Apuração Multidimensional de Jornada** | CLT / Jurisprudência | ✅ Concluído | Motor de cálculo desacoplado abrangendo escalas 5x2, 6x1, 12x36, travessia de meia-noite, múltiplos intervalos, tolerância de 10 min (Art. 58 § 1º CLT), feriados nacionais e segregação entre horas apuradas, horas extras elegíveis, banco de horas e pagamento. |
| **Isolamento Multitenant e RBAC** | LGPD / Segurança | ✅ Concluído | Segregação estrita por `companyId`, restrição do perfil Gestor à sua equipe, proteção e sigilo de dados salariais (`baseSalary` restrito a Admin/RH). |

---

## ⏳ 3. Requisitos Pendentes para Homologação Formal REP-P / PTRP

A homologação como software oficial de controle de ponto perante o Ministério do Trabalho e Emprego requer:

1. **Assinatura Digital ICP-Brasil (Padrão PKI / Certificado A1 ou A3)**:
   - *Exigência*: O comprovante de marcação emitido em formato eletrônico (PDF) e os arquivos fiscais devem receber assinatura digital padrão ICP-Brasil em nome do desenvolvedor ou da empresa empregadora.
   - *Status*: **Pendente**. O sistema utiliza hash SHA-256 de integridade, que comprova cadeia de custódia técnica, mas **não substitui** o certificado digital qualificado ICP-Brasil. Integração prevista para a Fase 6.

2. **Módulo de Exportação Oficial AFD e AEJ**:
   - *Exigência*: Geração estrita nos leiautes texto do MTE especificados nos Anexos V e VI da Portaria 671/2021.
   - *Status*: **Pendente** (planejado para a Fase 6).

3. **Registro de Software no INPI e Atestado de Responsabilidade Técnica**:
   - *Exigência*: Depósito de pedido de registro do programa no Instituto Nacional da Propriedade Industrial (INPI) e elaboração do "Atestado Técnico e Termo de Responsabilidade" assinado pelo Responsável Técnico e Representante Legal.
   - *Status*: **Pendente** (fase jurídica/comercial posterior).

---

## 🛡️ 4. Declaração de Transparência Legal

> [!IMPORTANT]
> **Classificação dos Documentos Emitidos**:
> 1. Os comprovantes e espelhos atualmente gerados pelo **Pontua RH** são classificados tecnicamente como **Documentos Operacionais de Controle Interno com Cadeia de Integridade Criptográfica (SHA-256)**.
> 2. Eles atendem plenamente aos princípios materiais da CLT de veracidade, fidelidade aos fatos e imutabilidade das marcações.
> 3. No entanto, para dispensar a assinatura de próprio punho ou para fins de apresentação fiscal obrigatória ao auditor-fiscal do trabalho (AFD/AEJ assinados com ICP-Brasil), deve-se manter o procedimento tradicional com respaldo em acordo/convenção coletiva de trabalho (Art. 74 § 2º CLT) até a conclusão da Fase 6.
