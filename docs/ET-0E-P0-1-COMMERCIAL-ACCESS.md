# ET-0E P0-1 — Implementação do direito de acesso de 12 meses

**Status: código inicial para revisão em branch isolada, SEM DEPLOY, SEM MIGRAÇÃO APLICADA, SEM MERGE.**

Base: ET-0E-PRE-03 D1–D7 aprovadas em 16/10/2026.
Branch: feat/et-0e-p0-1-commercial-access, derivada de feat/et-0e-pre-03-terms.

## Contrato implementado (backend)

1. Uma compra Kiwify aprovada e identificada pelo e-mail normalizado gera direito comercial de **12 meses de calendário UTC desde a aprovação**.
2. Uma nova compra aprovada do **mesmo código de produto e do mesmo e-mail hash** soma 12 meses ao prazo vigente se anterior ao vencimento. Se a compra ocorrer depois do vencimento, começa novo prazo na nova aprovação. **Nunca há cobrança automática** no código.
3. Concessões são registros por pedido na tabela access_grants, vinculados a access_accounts; a combinação única evita duplicação por repetição do webhook.
4. A ativação de um link só cria sessão se existir direito comercial válido. A validação exige conta, sessão técnica válida e concessão comercial vigente. A sessão técnica de 365 dias nunca estende o direito contratado. Respostas incluem commercial_expires_at (UTC).
5. O reembolso/chargeback de um pedido retira apenas seu grant, recalcula prazos dos demais pedidos legítimos da conta e impede ativação do pedido estornado. A revogação de sessões da conta ocorre somente quando não resta nenhum direito comercial ativo.
6. O cliente vê a data/hora de vencimento no fuso de Brasília. Ao voltar à aba, o frontend reconfirma o acesso, mas **não remove as simulações locais**.
7. A recuperação mantém resposta genérica para não revelar compras; a seleção de pedido só ocorre com grants ativos. O endpoint isolado e a entrega de e-mail ainda exigem QA.

## Migração: NÃO EXECUTAR EM PRODUÇÃO NESTE MARCO

Arquivo de nova instalação: automation-worker/schema.sql.
Migração de banco existente: automation-worker/migrations/0002_commercial_entitlements.sql.

- Bancos novos inicializados por schema.sql **já têm** a coluna account_id em access_sessions; não executar o ALTER TABLE da migração sobre eles.
- Bancos existentes precisam de backup, migração verificada, auditoria de compras legadas aprovadas, plano de backfill autorizado e plano de rollback antes de alternar o Worker.
- Tokens/sessões antigos vinculados somente a pedido (account_id nulo) são rejeitados pelo novo validador até migração de contas/sessões ou emissão de novos links. **É uma incompatibilidade deliberada de segurança; publicar sem plano cortaria acessos existentes.**
- A migração SQL apenas cria tabelas/coluna/índices; não altera clientes e não concede automaticamente direitos legados.
- Aplicação de migração, novo Worker, SITE_URL, checkout, segredos, Kiwify, Resend e D1 de produção **fora do escopo desta entrega inicial**.

## Lacunas a resolver antes de liberar comercialmente

- Fluxo de compra de **renovação voluntária** e preço de renovação. Neste momento, o backend reconhece um segundo pedido aprovado com mesmo product_code e e-mail, mas **não existe botão/checkout de renovar nem comunicação comercial final**.
- Garantir que o endpoint de reembolso/evento da Kiwify receba todos os campos exigidos, testar atrasos, duplicações, refunds parciais, chargebacks e indisponibilidade do Resend. O processamento de pedido sem e-mail pode não criar grant; requer monitoramento e atendimento.
- Auditoria de eventuais pedidos legados com email_hash e approved_at ausentes/ambíguos. Os cálculos ignoram pedidos sem status approved. A identidade comercial hoje usa hash determinístico do e-mail; endurecer gestão de identidade e dados conforme LGPD/revisão de segurança.
- Estudar riscos de concorrência quando múltiplos webhooks do mesmo comprador chegam simultaneamente: conciliação de grants deve ser transacional e resiliente a entrega fora de ordem; os testes locais usam execução sequencial.
- Se a sessão técnica expirar antes do direito comercial (ex.: por 365 dias em um ano bissexto ou após renovação), será necessária nova ativação; a recuperação deve estar disponível.
- Dados financeiros são locais e o motor JS é executado no dispositivo. Revalidação em retorno ao navegador melhora o controle, mas **não garante impossibilidade absoluta de executar código já entregue/offline**.
- Ainda falta teste integrado com Worker, banco D1 isolado e navegador real; QA de e-mails, renovação, recuperação, compra e estorno real.
- Nenhum SLA, termo ou direito comercial foi efetivamente publicado; preço individual, fornecedor, suporte oficial e revisão jurídica continuam pendentes.

## QA automatizado de desenvolvimento

- automation-worker/test/commercial-entitlements.test.mjs: calendário, fuso, mês bissexto, renovação antes/depois do vencimento, limites exatos, reembolso e duplicação de pedidos.
- automation-worker/test/commercial-access-db.test.mjs: tabelas e queries SQLite reais simulando o comportamento do D1, incluindo revogação de sessão e direitos sobreviventes a refunds.
- .github/workflows/et0e-p0-1-commercial-access.yml: sintaxe JS + Node 24 com node:sqlite.

**A aprovação do pull request para testes não autoriza merge comercial nem migração remota.**
