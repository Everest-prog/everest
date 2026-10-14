# ET-0E-G — QA & E2E Runbook | Ever.Precifica

Status: preparado para execução  
Pré-requisito: ET-0E-F code-complete

## 1. Objetivo

Validar o Ever.Precifica como produto completo antes de release:

- jornada Produto;
- jornada Serviço;
- motor determinístico;
- persistência local;
- acesso pago;
- recuperação de acesso;
- revogação por refund/chargeback;
- responsividade;
- acessibilidade;
- consentimento/analytics;
- segurança de dados financeiros.

## 2. Pré-flight técnico

Antes do E2E real:

- [ ] CI Ever.Precifica Engine Tests verde;
- [ ] CI Ever.Tools Worker Tests verde;
- [ ] schema D1 atualizado no ambiente de staging;
- [ ] Worker de staging com as rotas /access/* implantadas;
- [ ] site/preview apontando para a versão ET-0E;
- [ ] Resend operacional;
- [ ] webhook Kiwify operacional;
- [ ] produto E2E interno disponível;
- [ ] GTM preparado para eventos específicos do Precifica, sem parâmetros financeiros.

### Aplicar schema D1 em staging

A partir do diretório `automation-worker`:

```bash
npx wrangler d1 execute ever_tools_staging --remote --file=./schema.sql
```

O schema usa `CREATE TABLE IF NOT EXISTS`, portanto a operação é aditiva para as tabelas de acesso.

## 3. Smoke test Worker

### Health

Esperado:

```json
{
  "ok": true,
  "environment": "staging",
  "database": "connected"
}
```

### Recuperação sem compra

Enviar e-mail sem entitlement.

Esperado:
- HTTP 200;
- mensagem genérica;
- nenhum indicador público de que o e-mail não possui compra;
- nenhum e-mail enviado.

Evidência em 06/10/2026:
- [x] endpoint respondeu `ok: true`;
- [x] mensagem pública genérica confirmada;
- [x] nenhum dado sobre existência de cadastro exposto.

### Recuperação com compra

Esperado:
- HTTP 200 com mesma mensagem genérica;
- e-mail de ativação enviado;
- link de uso único;
- nova solicitação dentro de 5 minutos não dispara novo e-mail.

Evidência em 06/10/2026:
- [x] recuperação com compra aprovada respondeu HTTP 200 e mensagem genérica;
- [x] recuperação com compra aprovada enviou novo e-mail de ativação;
- [x] novo token de recuperação criado no D1, ainda não usado e não revogado;
- [x] segunda recuperação dentro de 5 minutos manteve HTTP 200/mensagem genérica e não enviou novo e-mail;
- [x] novo link de recuperação ativado com sucesso em janela anônima, sem sessão prévia;
- [x] endpoint retornou HTTP 200, `ok = true`, `product_code = ever_precifica_e2e` e nova credencial opaca ao navegador;
- [x] sessão recuperada em janela anônima validada com HTTP 200, `valid = true` e `product_code = ever_precifica_e2e`.
- [x] confirmar novo token no D1;
- [x] confirmar cooldown de 5 minutos;
- [x] confirmar ativação do novo link em um navegador sem sessão.

## 4. E2E de compra e ativação

1. [x] concluir compra E2E interna;
2. [x] confirmar webhook `purchase_approved`;
3. [x] confirmar pedido `approved` no D1;
4. [x] confirmar criação de activation token hash;
5. [x] confirmar envio pelo Resend;
6. [ ] abrir link de ativação;
7. [x] confirmar que o token de ativação vira `used_at`;
8. [x] confirmar criação de sessão opaca;
9. [ ] confirmar carregamento da jornada Ever.Precifica;
10. [x] validar sessão persistida diretamente no Worker;
11. [x] confirmar acesso válido sem reutilizar link de ativação.

Evidência em 06/10/2026:
- novo pedido E2E registrado no D1 com `product_code = ever_precifica_e2e`;
- status confirmado como `approved`;
- `approved_at` preenchido;
- `refunded_at` nulo;
- activation token criado para o novo pedido, com `used_at` e `revoked_at` nulos;
- expiração configurada para 30 minutos após a criação;
- e-mail de ativação recebido na caixa do comprador.

Critério:
- token bruto de sessão fica somente no navegador;
- banco armazena apenas hash.

## 5. E2E de recuperação

1. apagar apenas a credencial local de acesso;
2. abrir a ferramenta;
3. usar "Recuperar meu acesso";
4. informar o e-mail da compra;
5. confirmar mensagem pública genérica;
6. confirmar e-mail;
7. ativar novo navegador;
8. validar sessão.

## 6. Refund e chargeback

### Refund

1. com sessão válida, executar refund do pedido;
2. receber webhook;
3. confirmar pedido `refunded`;
4. confirmar revogação dos activation tokens ainda ativos;
5. confirmar revogação das sessões;
6. recarregar ferramenta.

Esperado:
- acesso recusado;
- formulário de recuperação não reativa pedido reembolsado.

Evidência parcial em 06/10/2026:
- [x] pedido E2E existente confirmado no D1 como `refunded`;
- [x] tentativa de recuperação retornou somente a mensagem pública genérica;
- [x] nenhum e-mail de ativação foi recebido para o pedido reembolsado;
- [x] novo ciclo E2E: pedido aprovado posteriormente confirmado como `refunded` no D1, com `refunded_at` preenchido;
- [x] validar revogação de sessão/token no novo ciclo compra → ativação → recovery → refund.
- Evidência: `revoked_activation_tokens = 2`, `revoked_sessions = 2`, `active_sessions = 0` para o pedido reembolsado.
- [x] sessão previamente válida passou a retornar HTTP 401, `ok = false` e `valid = false` após o reembolso.

### Chargeback

Repetir com status `chargeback`.

## 7. Jornada Produto

Cenário base:

- Produto;
- custo por unidade;
- embalagem;
- entrega;
- tarifa fixa;
- custo mensal guiado por unidades;
- impostos;
- pagamento;
- comissão;
- margem desejada;
- margem mínima;
- preço atual.

Validar:
- [ ] 8 etapas;
- [ ] Voltar preserva dados;
- [x] recarregar restaura estado;
- [ ] resultado bate com engine;
- [ ] preço técnico nunca abaixo da margem-meta;
- [ ] sugestão comercial não arredonda para baixo;
- [ ] preço atual recebe diagnóstico correto;
- [ ] desconto atualiza sem reload;
- [x] nova simulação limpa números;
- [x] direito de acesso permanece.

**Evidência de persistência e limpeza — 09/10/2026**

- Após preencher e avançar na simulação, o usuário confirmou que a retomada funcionou ao atualizar a página.
- O comando **Nova simulação** apagou os dados financeiros da simulação anterior.
- O direito de acesso permaneceu válido após a limpeza dos dados, sem exigir nova compra ou ativação.
- A persistência dos dados após limpar e atualizar novamente ainda merece checagem isolada; o teste de cancelamento do modal não foi confirmado explicitamente nesta evidência.

### Regressão — seleção inicial não deve disparar retomada (09/10/2026)

Situação relatada: depois de apagar os dados, o navegador voltava corretamente à Etapa 1, mas ao selecionar Produto ou Serviço reaparecia **Continuar de onde você parou?**.

Correção de código: `ferramentas/precifica/app.mjs`, commit `040c655`. Uma seleção isolada de tipo deixa de ser suficiente para caracterizar simulação retomável, e uma escolha ativa descarta qualquer indicação de retomada pendente.

Revalidar no preview de staging:
- [ ] Nova simulação → confirmar exclusão → atualizar a página → Etapa 1 sem aviso de retomada;
- [x] selecionar Produto → permanecer na Etapa 1, com Produto selecionado → Continuar leva à Etapa 2;
- [ ] voltar e selecionar Serviço → permanecer na Etapa 1, com Serviço selecionado → Continuar leva à Etapa 2;
- [x] atualizar a página estando apenas com o tipo selecionado, sem avançar → não abrir aviso de retomada;
- [x] preencher custo na Etapa 2, atualizar a página → oferecer retomada e preservar valores;
- [ ] acesso adquirido deve permanecer em todas as operações.

Status: correção aplicada; **seleção de Produto, retomada da Etapa 2 e persistência da escolha Serviço sem aviso indevido revalidadas em 09/10/2026**. Demais cenários de regressão permanecem pendentes.

## 8. Jornada Serviço

Cenário base:

- Serviço;
- custo de mão de obra por hora × minutos;
- material;
- deslocamento;
- custo mensal guiado por horas vendáveis;
- taxas;
- margens;
- preço atual.

Validar:
- [ ] tempo informado é reaproveitado;
- [ ] custo de mão de obra calculado corretamente;
- [ ] custo mensal alocado por capacidade;
- [ ] linguagem não usa "horas faturáveis" como pergunta principal;
- [ ] resultado bate com engine.

## 9. Casos-limite

- [ ] custo principal zero;
- [ ] lote com 0 unidades;
- [ ] horas vendáveis zero;
- [ ] percentuais totalizando >=100%;
- [ ] margem mínima > margem desejada;
- [ ] taxas + margem desejada >=100%;
- [ ] preço atual abaixo do equilíbrio;
- [ ] desconto 0%;
- [ ] desconto 100%;
- [ ] sem custos mensais;
- [ ] todos percentuais 0%;
- [ ] vários gastos personalizados;
- [ ] troca Produto ↔ Serviço com dados específicos.

## 10. Mobile e responsividade

Testar ao menos:
- 360×800;
- 390×844;
- 768×1024;
- desktop >=1280px.

Validar:
- [x] sem overflow horizontal;
- [x] campos legíveis;
- [x] CTA alcançável;
- [x] progresso compreensível;
- [x] modal cabe na viewport;
- [x] cards empilham corretamente;
- [x] fundo não compromete contraste;
- [x] performance aceitável com blur reduzido.

Evidência: validação manual mobile realizada pelo proprietário em 07/10/2026 e considerada aprovada para o MVP.

## 11. Acessibilidade

- [x] navegação por Tab;
- [x] foco visível;
- [x] labels persistentes;
- [x] erro compreensível sem depender de cor;
- [x] botões >=44px quando aplicável;
- [x] reduced motion respeitado;
- [x] fallback sem backdrop-filter legível;
- [x] leitura de resultado em ordem lógica.

## 12. Analytics e privacidade

Eventos permitidos:
- `tool_activation`;
- `precifica_calculation_started`;
- `precifica_calculation_completed`;
- `tool_result_view`;
- `precifica_price_simulated`;
- `precifica_discount_simulated`.

Proibido enviar como parâmetro:
- preço;
- custo;
- lucro;
- margem;
- tributos;
- taxas;
- desconto;
- e-mail.

Validar:
- [ ] sem consentimento, GTM não carrega;
- [ ] após consentimento, eventos sem valores financeiros;
- [ ] revogação de consentimento mantém cálculo funcionando;
- [ ] localStorage financeiro é independente do consentimento analítico.

## 13. Critério de saída ET-0E-G

ET-0E-G só fecha quando:

- todos os testes bloqueantes passarem;
- acesso pago estiver operacional em staging;
- compra → ativação → uso → recovery → refund tiver evidência real;
- mobile não apresentar defeito bloqueante;
- analytics não transportar dados financeiros;
- nenhum erro crítico permanecer aberto.

Depois disso, seguir para ET-0E-H — Release.


### Evidência visual — Etapa 5

Validado em 06/10/2026:
- Percentuais de teste 6% + 3,2% + 12% + 1% = 22,2%;
- entrada com vírgula decimal (`3,2`) interpretada corretamente;
- resumo total atualizado em tempo real;
- distinção entre tarifa fixa em reais e cobrança percentual permaneceu clara.


### Evidência visual — Etapa 6

Validado em 06/10/2026:
- meta de R$ 25 por R$ 100 traduzida corretamente para 25%;
- tentativa de mínimo de R$ 30 com meta de R$ 25 foi bloqueada;
- mensagem exibida: "O mínimo não pode ser maior que sua meta.";
- erro apresentado de forma legível e sem apagar os valores informados.


### Evidência visual — Etapa 8

Validado em 06/10/2026:
- sugestão comercial exibida em destaque: R$ 154,00;
- menor preço para atingir a meta: R$ 153,56;
- alternativa comercial/psicológica: R$ 153,90;
- lucro por venda: R$ 46,41;
- margem resultante: 30,14%;
- menor preço sem prejuízo: R$ 94,34;
- composição do preço reconciliada entre custos, taxas/comissões e lucro;
- preço atual de R$ 79,90 diagnosticado como prejuízo;
- diferença para a meta exibida em reais;
- limites de desconto exibidos separadamente para preservação da meta e do mínimo.


### Evidência visual — Simulador de desconto

Validado em 06/10/2026:
- desconto de 10% aplicado sobre preço de referência de R$ 154,00;
- novo preço calculado: R$ 138,60;
- lucro por venda: R$ 34,42;
- margem resultante: 24,83%;
- status corretamente classificado como acima do mínimo de 15% e abaixo da meta de 25%;
- atualização ocorreu em tempo real sem reload.


### Evidência visual — Limite mínimo de desconto

Validado em 06/10/2026:
- desconto de 24,1% aplicado sobre preço de referência de R$ 154,00;
- preço resultante: R$ 116,89;
- lucro por venda: R$ 17,54;
- margem resultante: 15,01%;
- resultado ficou praticamente no limite mínimo definido de 15%;
- mensagem manteve classificação correta: acima do mínimo e abaixo da meta.


### Evidência visual — Desconto abaixo do mínimo

Validado em 06/10/2026:
- desconto de 30% aplicado sobre preço de referência de R$ 154,00;
- preço resultante: R$ 107,80;
- lucro por venda: R$ 10,46;
- margem resultante: 9,7%;
- sistema classificou corretamente como abaixo do mínimo definido de 15%;
- mensagem exibida: "Com esse desconto, sobra menos do que o mínimo que você definiu.";


### Evidência visual — Etapa 2 (Serviço)

Validado em 07/10/2026:
- fluxo de Serviço alterou corretamente a linguagem de custo por unidade para custo do trabalho;
- modo guiado exibiu custo por hora + duração do serviço;
- cenário de teste: R$ 5,00/hora por 78 minutos;
- custo direto calculado corretamente em R$ 6,50;
- texto de ajuda permaneceu em linguagem leiga e sem jargões.


### Evidência visual — Etapa 3 (Serviço)

Validado em 07/10/2026:
- linguagem adaptada corretamente para materiais usados no serviço e deslocamento;
- tarifa fixa por venda mantida como valor em reais;
- gasto personalizado adicional aceito e incluído no total;
- cenário de teste: R$ 10,00 materiais + R$ 0,50 deslocamento + R$ 1,10 tarifa fixa + R$ 5,00 estacionamento = R$ 16,60;
- alerta contra duplicidade de custos permaneceu visível.


### Evidência visual — Etapa 4 (Serviço)

Validado em 07/10/2026:
- rateio de custos mensais adaptado para horas realmente vendáveis;
- cenário de teste: R$ 4.200/mês, 200 horas vendáveis e serviço com duração de 78 minutos;
- parcela dos custos mensais calculada em R$ 27,30;
- duração do serviço foi reaproveitada da Etapa 2;
- linguagem manteve "horas que você consegue realmente vender" em vez de jargões como "horas faturáveis".


### Evidência visual — Resultado final (Serviço)

Validado em 07/10/2026:
- sugestão comercial exibida: R$ 82,00;
- menor preço calculado para atingir a meta: R$ 81,30;
- alternativa comercial: R$ 81,90;
- lucro por venda: R$ 25,04;
- margem resultante: 30,54%;
- menor preço sem prejuízo: R$ 54,79;
- custos informados consolidados em R$ 50,40;
- impostos, taxas e comissões consolidados em R$ 6,56;
- preço atual de R$ 78,00 permaneceu lucrativo, com R$ 21,36 de lucro e margem de 27,38%, porém abaixo da meta;
- limite de desconto preservando a meta: 0,85%;
- limite de desconto sem ficar abaixo do mínimo: 20,17%;
- motor combinou corretamente mão de obra, materiais, deslocamento, tarifa fixa e custos mensais alocados.


### Evidência de Analytics — Ever.Precifica

Validado em 09/10/2026:
- evento `precifica_calculation_started` apareceu no Tag Assistant;
- o acionador `Eventos Ever.Est — Analytics` reconheceu o evento;
- a tag `GA4 — Eventos Ever.Est` disparou com sucesso;
- validação de payload sem dados financeiros ainda pendente.


### Evidência de Analytics — Payload

Validado em 09/10/2026:
- payload de `precifica_calculation_started` confirmado na camada de dados;
- campos observados: `event`, metadados internos do GTM, `analytics_consent`, `event_source`, `page_path`, `page_title`, `occurred_at` e `stage`;
- nenhum preço, custo, lucro, margem, desconto, imposto, taxa ou e-mail foi enviado;
- `analytics_consent = granted` confirmado durante o teste.


### Evidência de Analytics — Eventos adicionais

Validado em 09/10/2026:
- `precifica_calculation_completed`, `precifica_price_simulated` e `precifica_discount_simulated` apareceram no Tag Assistant;
- os três payloads mantiveram apenas metadados técnicos/contextuais e o campo `stage`;
- `precifica_calculation_completed`: `stage = result`;
- `precifica_price_simulated`: `stage = current_price`;
- `precifica_discount_simulated`: `stage = result`;
- nenhum preço, custo, lucro, margem, desconto, imposto, taxa ou e-mail foi enviado na camada de dados.


### Publicação GTM — Ever.Precifica

Validado em 09/10/2026:
- GTM Version 3 publicada;
- nome: `ET-0E — Eventos Ever.Precifica`;
- acionador `Eventos Ever.Est — Analytics` atualizado;
- eventos específicos do Ever.Precifica liberados sem envio de dados financeiros.


### Evidência de acessibilidade — Navegação por teclado

Validado em 09/10/2026:
- navegação por `Tab` funcionou na Etapa 1;
- sequência de foco por teclado considerada lógica;
- destaque de foco permaneceu claramente visível durante todo o percurso;
- elementos principais alcançáveis sem mouse.


### Evidência de acessibilidade — Modal

Validado em 09/10/2026:
- modal de Ajuda abriu com `Enter` pelo teclado;
- modal fechou corretamente com `Esc`;
- interação principal do modal funcionou sem mouse.


### Revisão estática de acessibilidade

Validado em 09/10/2026:
- campos usam labels persistentes associados aos inputs;
- mensagens de erro exibem texto e ícone, não dependem apenas de cor;
- controles principais receberam alvo mínimo de 44px;
- botão de fechar dos dialogs ajustado de 38px para 44px;
- `prefers-reduced-motion` reduz animações e transições;
- existe fallback sólido para navegadores sem `backdrop-filter`;
- estrutura visual e ordem do DOM mantêm leitura lógica do resultado.

## 14. Auditoria de retomada — 14/10/2026

As evidências anteriores permanecem históricas. A auditoria abaixo não encerra a ET-0E-G e não confirma um novo deploy.

### Repositório e CI consultados

- Referência auditada: `feat/et-0e-ever-precifica`, commit `980716e349bf8e03157f49d9bd8e95ef4b007066`, [PR #5](https://github.com/Everest-prog/everest/pull/5).
- [Ever.Tools Worker Tests](https://github.com/Everest-prog/everest/actions/runs/37985475372): `completed / success` nesse commit.
- [Ever.Precifica Engine Tests](https://github.com/Everest-prog/everest/actions/runs/37985475558): `completed / success` nesse commit.
- As suítes existentes verificam sintaxe, motor financeiro e idempotência; esses resultados não demonstram consentimento, persistência e acesso juntos em navegador real.
- [Check Cloudflare](https://github.com/Everest-prog/everest/runs/114006565176): `completed / failure`, build `1305c50e-e247-41b8-b488-67624ff1ff0f`, em 09/10/2026 às 20:13:47 UTC.
- O [comentário de deploy do bot](https://github.com/Everest-prog/everest/pull/5#issuecomment-6017737006) registra sucesso para o mesmo commit, mas para outro build: `a7f35c4e-60d6-4fd9-9beb-f7757c5124d8`.
- O [comentário de previews do bot](https://github.com/Everest-prog/everest/pull/5#issuecomment-5959381882) registra falha do primeiro build, sem URL de preview por commit. Portanto, há registros de operações distintas; a causa da falha e a configuração atual dos builds ainda precisam ser conferidas na Cloudflare. Não classificar todo o CI/deploy como verde.

### Respostas públicas verificadas em 14/10/2026

| Endereço | Resultado observado |
| --- | --- |
| `https://soueverest.com.br/` | HTTP 200; servidor `GitHub.com`; HTML inclui `consent.js` e `analytics.js`. |
| `https://ever-tools-automation-staging.gabrielfelipegfrs.workers.dev/health` | HTTP 200; `{"ok":true,"environment":"staging","database":"connected"}`. |
| `https://ever-tools-automation-staging.gabrielfelipegfrs.workers.dev/preview/precifica/` | HTTP 200; HTML inclui somente `./app.mjs` como script externo; CSP limita scripts e conexões à própria origem. |
| `/preview/precifica/app.mjs` e `/preview/precifica/access.mjs`, na origem do Worker acima | HTTP 200; módulos servidos como JavaScript. |
| `/assets/js/consent.js` e `/ferramentas/precifica/`, na origem do Worker acima | HTTP 404. A integração na mesma origem ainda não existe nesse endereço. |

`/health` confirma disponibilidade e uma consulta simples ao D1. Não identifica a versão implantada, não comprova o schema completo nem confirma credenciais, entregas de e-mail ou webhooks.

### Condições encontradas na implementação

- O preview atual busca arquivos diretamente da branch em `raw.githubusercontent.com`, sem fixar commit. Alterar os arquivos compartilhados pode alterar o preview mesmo sem novo deploy do Worker.
- `app.mjs` ignora a validação de acesso apenas no hostname do Worker antigo e no caminho `/preview/precifica`. A disponibilidade desse preview não prova acesso pago.
- `consent.js` contém o container comercial `GTM-TH5483TJ`. Copiá-lo sem isolamento para o staging poderia enviar testes aos relatórios comerciais após consentimento.
- A configuração atual do backend mantém `SITE_URL=https://soueverest.com.br`; os e-mails de ativação e recuperação são montados com essa origem. Alterar essa variável no Worker existente afetaria o fluxo atual.
- Consentimento, simulação e credencial usam armazenamento local do navegador. O site institucional e o preview Worker têm origens diferentes; uma escolha no primeiro não valida a persistência no segundo.
- Não houve consulta autenticada às configurações/versões da Cloudflare nesta auditoria. Segredos e dados de compradores não foram consultados ou registrados.

## 15. Staging integrado isolado — preparação e roteiro

### Escopo desta etapa

A implementação deve criar um Worker separado em `staging/precifica`, com os arquivos estáticos da ferramenta, consentimento e acesso sob uma única origem. O build usa os arquivos compartilhados como entrada, sem modificar o site público ou o preview atual. O novo Worker não recebe domínio/rota de produção.

Neste primeiro estágio, o carregamento acionado pelo consentimento usa um **adaptador local de teste**. Ele permite verificar aceitar/recusar/revogar, ciclo de carregamento e eventos locais, sem carregar o GTM comercial e sem enviar dados ao Google. A política de conteúdo bloqueia conexões externas. Esse adaptador não é o GTM e não comprova entrega a uma propriedade GA4.

O acesso real deve usar uma ligação interna da Cloudflare ao Worker de staging existente, expondo somente ativação e validação na origem do novo frontend. A recuperação fica desabilitada até existir backend isolado com `SITE_URL` apontando para a origem correta. Não substituir o `SITE_URL`, os segredos, o D1 ou os webhooks do ambiente atual para viabilizar este teste.

**Status operacional:** nenhum deploy deste novo Worker nem URL pública de staging integrado foi confirmado nesta auditoria. Preparação e testes locais não devem ser apresentados como publicação concluída. A URL só pode ser registrada abaixo após confirmação na Cloudflare e verificação HTTP do conteúdo publicado.

### Implementação e evidências locais — 14/10/2026

- Implementação preparada em `staging/precifica/`, com instruções no README dessa pasta. O build gera 16 arquivos estáticos a partir de lista explícita; não publica a raiz do repositório.
- Arquivos compartilhados em `ferramentas/precifica/`, `assets/js/` e `automation-worker/` permaneceram intactos. As adaptações ocorrem somente nas cópias geradas.
- O código de ativação é removido da URL antes dos scripts de consentimento. Erros temporários do serviço de acesso preservam a credencial; uma resposta definitiva HTTP 401 remove somente o acesso local.
- **38 testes locais passaram:** 30 já existentes (motor e idempotência de webhook) e 8 de isolamento, proxy, payload e persistência de credencial.
- **10 cenários em navegador passaram**, Chrome `154.0.8037.98`, desktop 1360×1000 e viewport mobile 390×844. A suíte usa backend sintético e perfil temporário; não comprova compra, sessão real, Cloudflare ou dispositivo móvel físico.
- Verificado: recusa não carrega adaptador; aceite na página inicial vale para a ferramenta na mesma origem; custo Produto de R$ 75,50 é retomado após reload; revogação preserva números e credencial fictícia; cancelar reset mantém números; confirmar reset limpa números e mantém acesso; Serviço selecionado persiste sem falso aviso de retomada; URL de ativação é limpa antes da carga do adaptador; viewport mobile não tem overflow horizontal.
- Verificado: eventos locais aceitam somente `event`, `event_source`, `item_name` e `stage` enumerado. Testes com campos financeiros, e-mail, token e atribuição foram descartados. Tentativas deliberadas de carregar GTM e enviar ao GA4 foram bloqueadas pela CSP do navegador. As rotas externas também foram bloqueadas pelo harness como proteção adicional.
- Relatório e capturas locais: `staging/precifica/browser/artifacts/` (ignorados pelo Git). A CI adicionada publica evidências sintéticas como artefato de teste; não executa deploy.
- Wrangler `4.150.0`: `deploy --dry-run` concluído com `ASSETS`, `ACCESS_SERVICE → ever-tools-automation-staging` e `ENVIRONMENT=integrated-staging`. Isso comprova empacotamento, não publicação nem existência do binding remoto.
- `wrangler whoami` retornou não autenticado. A tentativa de login oficial expirou sem receber autorização. Nenhum segredo foi solicitado no chat ou gravado no repositório. Para publicar, será necessário concluir nova autenticação na conta correta.

Estes resultados validam o staging local com adaptador analítico e acesso sintético. Todos os testes manuais remotos, GTM/GA4 real e ciclo comercial abaixo continuam pendentes.

### Confirmação GitHub e preservação dos ambientes

Commit de implementação: `5bacf92976ad816d59207f32e0711d75bfe24e1c`. Em 14/10/2026, concluíram com sucesso nesse commit:

- [Integrated Staging Tests — PR](https://github.com/Everest-prog/everest/actions/runs/38602616697);
- [Integrated Staging Tests — push](https://github.com/Everest-prog/everest/actions/runs/38602609912);
- [Engine Tests](https://github.com/Everest-prog/everest/actions/runs/38602616661);
- [Worker Tests](https://github.com/Everest-prog/everest/actions/runs/38602616751).

O pacote também foi gerado a partir desse commit limpo (`source_dirty=false`) e passou no dry-run. Após salvar a branch, produção, health do backend e preview antigo responderam HTTP 200. A comparação Git confirma ausência de alterações nos arquivos compartilhados de ferramenta, analytics e Worker existente.

O check externo `Workers Builds: ever-tools-automation-staging` falhou novamente, build `ee8e781d-311f-48dd-815b-e34c3c273bb9`. O GitHub expõe apenas o link ao painel autenticado, sem mensagem da causa. Esse check é do Worker existente e não confirma implantação do novo `ever-precifica-integrated-staging`. Investigar na Cloudflare antes de encerrar QA; não anunciar deploy ou CI globalmente verde.

### Pré-condições para o teste manual remoto

- [ ] identificar commit e configuração efetivamente implantados no novo Worker;
- [ ] registrar URL pública confirmada e data/hora da verificação;
- [ ] confirmar nome do novo Worker e ausência de rotas/domínios de produção;
- [ ] confirmar ligação interna ao backend de staging esperado;
- [ ] confirmar que o preview antigo e o site público continuam respondendo como antes;
- [ ] ter uma sessão ou ativação E2E válida, sem divulgar token em evidências;
- [ ] usar valores financeiros fictícios e navegador/perfil dedicado ao teste;
- [ ] registrar versão do navegador e viewport.

### Roteiro de consentimento e persistência na mesma origem

1. Abra a URL confirmada em um perfil sem dados desse staging. Registre somente a origem e o caminho, sem query string de ativação. Confirme que o aviso de cookies aparece e que nenhum recurso do Google/GTM/GA4 é solicitado.
2. Recuse métricas. Ative o acesso com uma credencial E2E válida pelo fluxo previsto. Confirme que a credencial não aparece na URL após a ativação, no `dataLayer` ou nas evidências. A ferramenta deve abrir sem carregar o adaptador analítico.
3. Selecione Produto e avance até a Etapa 2. Preencha um custo fictício identificável, avance e recarregue. Confirme retomada e preservação do valor; o acesso deve continuar válido sem reutilizar o link de ativação.
4. Abra Preferências de cookies e aceite métricas. Confirme uma única carga do adaptador local, consentimento `granted` e ausência de requisições a `googletagmanager.com`, `google-analytics.com` ou destinos comerciais. Esse resultado significa carregamento do adaptador de QA, não do GTM real.
5. Termine uma simulação, teste preço atual e desconto. Inspecione os eventos locais permitidos. Confirme ausência de preços, custos, lucro, margens, impostos, taxas, desconto, e-mail, tokens e identificadores de pedido nos parâmetros, URLs e corpos de requisição analíticos.
6. Revogue o consentimento nas preferências. Aguarde o recarregamento previsto pelo fluxo. Confirme consentimento `denied`, nenhuma nova carga do adaptador, cálculo funcional, números recuperáveis e acesso ainda válido.
7. Recarregue novamente com métricas recusadas. Confirme que a recusa continua salva e que a simulação e o acesso permanecem independentes dela.
8. Execute Nova simulação → Cancelar e confirme que os números permanecem. Depois execute Nova simulação → Apagar e começar: os números devem ser limpos e a credencial de acesso preservada.
9. Recarregue, selecione Produto e confirme que não aparece retomada indevida. Repita com Serviço: apenas selecionar Serviço e recarregar deve manter a escolha sem pedir retomada; preencher a Etapa 2 e recarregar deve oferecer retomada com o valor preservado.
10. Feche e reabra a ferramenta pela mesma origem. Repita a checagem de acesso e da escolha de cookies. Trocar domínio, porta, perfil ou janela anônima constitui outro armazenamento e não comprova perda de dados.

Evidências aceitas: origem sem tokens, commit/versão, passos executados, resultado esperado/observado e capturas com dados fictícios. Não anexar HAR completo, credenciais, e-mails, links de ativação ou payloads de compradores ao repositório.

### Validação real GTM/GA4 ainda pendente

- [ ] criar ou identificar container GTM e propriedade GA4 exclusivos para QA;
- [ ] confirmar que nenhuma tag de QA aponta ao Measurement ID comercial;
- [ ] revisar captura automática de URLs, parâmetros de formulário e qualquer parâmetro que possa transportar dados financeiros ou credenciais;
- [ ] habilitar somente os destinos externos estritamente necessários nesse ambiente isolado, mantendo produção e preview existentes preservados;
- [ ] repetir recusa → aceite → eventos → revogação com o GTM real;
- [ ] verificar requisições reais, destino/Measurement ID e eventos no DebugView da propriedade de QA;
- [ ] verificar payloads de rede, além do `dataLayer`, sem dados financeiros ou pessoais;
- [ ] confirmar persistência da simulação e do acesso durante todo esse ciclo.

Não marcar os critérios de saída de Analytics como concluídos somente com o adaptador local. Até essa validação, o isolamento de coleta é uma proteção testável; a integração real com GTM/GA4 continua pendente.

## 16. Fechamento do E2E e preparação da ET-0E-H

Após concluir o staging integrado e o teste real de Analytics isolado:

1. **Preparar o ciclo completo:** confirmar backend/D1/segredos exclusivos de teste, origem correta de ativação/recuperação, produto E2E interno e remetente autorizado. Registrar versões e disponibilidade sem publicar credenciais. A recuperação desabilitada nesta primeira etapa é bloqueante para este ciclo.
2. **Compra → ativação:** executar uma compra controlada autorizada; confirmar webhook, pedido aprovado, hash do token e e-mail; abrir o link no staging integrado, observar uso único e carregamento da jornada com sessão válida.
3. **Uso → persistência:** concluir Produto e Serviço com valores fictícios, conferir resultado, recarregar, revogar Analytics e iniciar nova simulação. Confirmar preservação de acesso e independência dos dados financeiros.
4. **Recuperação:** apagar somente a credencial local no perfil de teste, solicitar recuperação, conferir resposta pública genérica e cooldown; ativar um segundo perfil sem sessão e confirmar acesso. Não exigir apagar simulação para recuperar acesso.
5. **Refund → revogação:** executar reembolso autorizado da compra de teste, confirmar webhook e estado do pedido; verificar revogação de tokens e sessões, acesso negado após reload e recuperação incapaz de reativar o pedido reembolsado. Registrar chargeback como teste separado pendente até sua execução.
6. **Consolidar ET-0E-G:** registrar evidência do mesmo ciclo ponta a ponta, atualizar os itens bloqueantes e investigar qualquer falha. Evidências parciais antigas não substituem a jornada integrada.
7. **Preparar ET-0E-H:** revisar checkout e preço comercial, configuração de produção, plano de rollback, smoke tests e monitoramento inicial. Manter PR em draft e `main` sem merge/publicação até o aceite de QA e autorização de release.

Nenhuma compra, envio de recuperação, reembolso, mudança de produção ou publicação comercial foi executada como parte desta auditoria de retomada.
