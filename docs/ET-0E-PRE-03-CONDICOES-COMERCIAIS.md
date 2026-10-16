# ET-0E-PRE-03 — Condições comerciais do Ever.Precifica

**Status: decisões comerciais D1–D7 APROVADAS pelo proprietário em 16/10/2026; implementação, preço, dados oficiais, testes e revisão jurídica PENDENTES · NÃO PUBLICADA.**

Produto objeto desta etapa: **Ever.Precifica individual**, não o Kit Gestão Financeira avaliado por personas fictícias a R$ 89,90. O preço comercial desta ferramenta individual permanece pendente.

## 1. Oferta e política de acesso

Distinguir três conceitos: (a) **prazo de uso contratado**, (b) **validade técnica da sessão em um navegador** e (c) **simulações financeiras locais**. No backend atual, uma sessão nova é criada com validade técnica de 365 dias, mas não existe ainda um prazo contratual de acesso por pedido nem fluxo de renovação. Não anunciar 12 meses como direito contratual sem implementar e testar essas regras.

| Opção | Modelo | Benefício | Impacto / risco |
|---|---|---|---|
| **A — recomendada para decisão** | Pagamento único por **12 meses de acesso**, renovação voluntária, sem cobrança automática | Compromisso previsível e claro | Exige direito de acesso com data de expiração por pedido, comunicação e fluxo de renovação |
| B | Pagamento único, acesso enquanto o serviço se mantiver, sem vencimento predefinido | Fácil compreensão do comprador | Compromisso de duração indefinida, cuidados jurídicos no encerramento; **não confundir com vitalício** |
| C | Assinatura periódica | Receita previsível | Requer recorrência, inadimplência, cancelamento e mais suporte |

**DECISÃO D1 APROVADA:** opção A, 12 meses de acesso mediante pagamento único; renovação voluntária e sem cobrança automática. A duração contratual não se confunde com a sessão técnica de 365 dias.

## 2. Condições aprovadas — implementação ainda pendente

| Tema | Proposta | Pendências para cumprir |
|---|---|---|
| Pagamento | **Único**, sem renovação automática (se A ou B) | Definir preço da ferramenta individual e configurar produto específico no checkout |
| Duração | **12 meses a partir da confirmação da compra aprovada** (se A) | Expiração contratual, avisos e renovação testados |
| Dispositivos | Uso pessoal do comprador. Troca de navegador pode requerer nova ativação. **Sem sincronização de simulações** | Testar recuperação; não criar limite numérico de dispositivos que não seja tecnicamente validado |
| Atualizações | Correções e segurança enquanto o acesso estiver vigente; novas ferramentas e consultoria não incluídas | Capacidade de manutenção e obrigação de sanar falhas legais mesmo após fim do prazo |
| Suporte | Contato por e-mail para acesso, cobrança e erros; **meta de primeira resposta em até 2 dias úteis** | Definir e testar endereço oficial, responsável e substituto; não confundir primeira resposta com resolução final |
| Recuperação | Novo link de acesso para pedido válido, com suporte manual de contingência | Recuperação no staging integrado ainda desabilitada; concluir teste de envio, validação e troca de navegador |
| Reembolso | Exercício do direito legal de arrependimento em até **7 dias**, com devolução e revogação de acesso, sem exigir justificativa; observar outros direitos legais além desse período | Canal visível para solicitação, webhook real e revogação testados |
| Dados financeiros | Permanecem no navegador/dispositivo, sem sincronização de simulações; dados comerciais são tratados separadamente | Informar riscos de troca de dispositivo, navegação privada e limpeza de dados |
| Limites funcionais | O Ever.Precifica apoia a decisão de preço e **não recomenda alíquotas, não substitui contador nem garante lucro** | Revisar textos e exemplos da página de vendas |

## 3. Base legal e transparência

- Código de Defesa do Consumidor, art. 49: arrependimento de compras feitas fora do estabelecimento comercial em 7 dias, conforme critérios legais. Fonte: https://www2.camara.leg.br/legin/fed/lei/1990/lei-8078-11-setembro-1990-365086-normaatualizada-pl.html
- Decreto 7.962/2013: apresentação clara de identificação do fornecedor, contato, características, condições e restrições do serviço, canais de atendimento e exercício do arrependimento. Fonte: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- Kiwify: prevê solicitações de reembolso dentro dos 7 dias, diretamente ao vendedor ou pela plataforma. Fonte: https://ajuda.kiwify.com.br/pt-br/article/como-faco-para-pedir-o-reembolso-de-um-produto-que-comprei-1kfom3h/

O prazo legal de 7 dias não elimina direitos relativos a vícios, falhas de entrega ou descumprimento da oferta. **Não redigir “não há reembolso após 7 dias”**. Submeter condições definitivas a revisão jurídica.

## 4. Lacunas técnicas atualmente conhecidas

1. **Prazo contratual**: sessão de 365 dias não é contrato; falta controle de expiração/renovação por pedido.
2. **Recuperação**: endpoint existe, mas integração isolada bloqueou envio por diferença de origem; falta validação real.
3. **Compra**: checkout Kiwify → webhook → Worker/D1 → e-mail Resend → ativação → uso ainda não foi testado de ponta a ponta com compra real controlada.
4. **Refund**: revogação sintética de teste não equivale a reembolso real; é preciso testar webhook/revogação e recuperação posterior.
5. **Atendimento/fornecedor**: endereço de suporte, pessoa responsável, identificação comercial, local de atendimento e valor cobrado ainda precisam de confirmação.
6. **Privacidade**: revisar política de dados comerciais, locais e direitos aplicáveis; não prometer backup ou sincronização.

## 5. Texto de oferta preliminar — NÃO PUBLICAR

> O Ever.Precifica é uma ferramenta on-line para estimar preços de produtos ou serviços a partir dos custos, taxas e margens informados pelo usuário. **Proposta**: 12 meses de acesso com pagamento único, sem renovação automática; acesso por ativação de e-mail; simulações salvas somente no navegador; atualizações corretivas durante o período; suporte por e-mail; direito de arrependimento de 7 dias na forma da lei. A ferramenta não substitui orientação contábil nem garante resultado financeiro.

Este texto é apenas um exemplo para discussão, não uma oferta vigente.

## 6. Registro das decisões comerciais — aprovado em 16/10/2026

O proprietário respondeu **"Sim"** à proposta para aprovação conjunta das seis condições D2–D7, somadas ao D1 anteriormente escolhido. **Aprovação da política não comprova entrega técnica, cumprimento operacional, revisão jurídica ou autorização de publicar.**

- **D1 — Prazo e pagamento [APROVADO]:** pagamento único por 12 meses de acesso desde a confirmação de compra aprovada; renovação voluntária, sem cobrança automática.
- **D2 — Suporte [APROVADO]:** atendimento por e-mail, confirmação automatizada de recebimento e meta de primeira resposta humana em até **2 dias úteis**; isso não equivale a promessa de solução integral no mesmo prazo. Definir endereço oficial, responsável, dias úteis, contingência e fluxo de exercício de direitos antes de anunciar.
- **D3 — Atualizações [APROVADO]:** correções de erros, estabilidade e segurança durante os 12 meses, sem cobrança extra; novos produtos/módulos ou consultorias não incluídos automaticamente, respeitando deveres e garantias legais.
- **D4 — Reembolso [APROVADO]:** direito de arrependimento de 7 dias nas hipóteses legais aplicáveis, sem justificativa e observando marco inicial legal; manter direitos por falhas, vícios e descumprimento de oferta além desse prazo. Nenhuma garantia voluntária adicional foi aprovada.
- **D5 — Dispositivos e dados [APROVADO]:** uso pessoal; reativação por e-mail para troca de navegador/dispositivo, sem prometer sincronização ou backup dos números de simulação. Não anunciar limite quantitativo de dispositivos não implementado.
- **D6 — Renovação [APROVADO]:** compra opcional de mais 12 meses, sem cobrança automática. Renovação antes do vencimento soma período ao prazo atual; renovação após o vencimento começa na nova aprovação. **Janela específica de venda (ex.: 30 dias antes), preço de renovação e cronograma de avisos ainda precisam ser operacionalizados/confirmados**.
- **D7 — Disponibilidade [APROVADO]:** manutenção e suporte operacional, sem promessa de uptime 100%, SLA contínuo ou suporte humano 24 horas; indisponibilidades devem ser tratadas de acordo com a oferta e a lei.
- **D8 — Preço, fornecedor e canais [PENDENTE]:** valor específico do Ever.Precifica individual, identificação legal do fornecedor, endereço/canal oficial de suporte, dados do checkout e políticas públicas. Não usar o preço de R$ 89,90 de outro kit sem decisão específica.

**Critérios de encerramento:** decisões aprovadas, regras implementadas e testadas, canal de suporte confirmado, integração de compra/recuperação/reembolso validada, revisão jurídica e posterior autorização específica de publicação comercial.

**Não modificar produção, staging comercial, checkout ou dados de compradores reais sem nova autorização.**


## 7. Arquitetura detalhada para o Modelo A — proposta técnica (sem mudanças de código)

### 7.1. Contrato temporal a aprovar pela implementação

- O **direito comercial** começa quando o pagamento é aprovado pela Kiwify, não no primeiro clique no e-mail. A pessoa pode demorar a ativar; deixar essa regra visível no checkout.
- A duração é **12 meses de calendário**, e não aproximadamente 365 dias; a hora exata de término corresponde à hora de aprovação + 12 meses (em UTC), exibida também no horário de Brasília. Caso especial de 29/02: expiração em 28/02 do ano seguinte, no mesmo horário UTC, se não houver dia equivalente; explicitar e testar.
- A sessão do navegador é uma autorização técnica revogável. A API autoriza somente se existir **direito comercial válido, pedido não reembolsado, sessão não revogada e sessão dentro da validade técnica**. A sessão nunca estende o direito comercial.
- O início do prazo deve ser derivado de um carimbo de compra aprovado, normalizado, com proteção contra aprovações antigas/replays que possam mudar a data retroativamente.
- Link de ativação: uma única utilização, válido durante 30 minutos; nova recuperação gera outro link sem iniciar nem renovar os 12 meses. A recuperação é autorizada somente enquanto houver direito comercial válido.
- UI mostra **Acesso válido até DD/MM/AAAA** em local apropriado, com aviso de que simulações são locais. A data precisa ser entregue de fonte confiável do backend; não calcular a validade comercial no cliente.
- Encerrado o prazo, novas consultas de acesso são negadas. A ferramenta já aberta no navegador precisa repetir a validação no foco/retomada e antes de iniciar nova simulação; dado o motor client-side, não é possível garantir bloqueio técnico absoluto de código já baixado. Não apagar simulações financeiras ao expirar a licença.

### 7.2. Regra de renovação voluntária — proposta para decisão

- O comprador recebe lembretes transacionais por e-mail **30 dias e 7 dias antes** do vencimento e no vencimento, somente com base na compra/direito vigente e com controle de duplicidade e entregabilidade. Não há cobrança nem renovação automática.
- A renovação pode ser adquirida no período de **30 dias antes** do vencimento ou depois do vencimento; essas janelas são propostas operacionais, não uma limitação legal já aprovada.
- Renovou antes do vencimento: acrescentar 12 meses ao **vencimento atual**, evitando perder tempo já pago. Renovou depois de vencer: iniciar novos 12 meses a partir da nova aprovação, sem cobrança retroativa.
- Cada renovação é **outro pedido Kiwify com pagamento único**, vinculado ao mesmo titular por chave estável e regras de identificação/contato validadas, nunca apenas pelo número da sessão.
- O usuário mantém o mesmo histórico de direito comercial; a sessão local válida continua utilizável e será reconferida contra o novo vencimento. No navegador novo, gerar link de ativação.
- O reembolso de uma renovação deve retirar **somente o período concedido por essa renovação** e recalcular o vencimento efetivo com base nos pedidos aprovados e não reembolsados; não anular automaticamente outros períodos legitimamente comprados.
- Idempotência: o mesmo webhook nunca estende o prazo duas vezes. Aprovação atrasada após refund/chargeback não reabre período já revogado.
- No lançamento controlado, é aceitável não oferecer checkout de renovação ainda **se** os 12 meses estiverem implementados e a oferta deixar explícito que a renovação opcional será disponibilizada com antecedência; contudo, é obrigatório definir o responsável e plano de disponibilização antes de fazer essa promessa.

### 7.3. Modelo de dados proposto

Atualmente o banco possui orders, access_activation_tokens e access_sessions. O pedido tem approved_at/refunded_at e status, mas não possui período contratual ou titular lógico independente.

**Proposta:** tabelas ou abstrações adicionais, em migração incremental, sem alterar registros históricos:
- **access_accounts**: identificador pseudônimo estável do titular + produto, sem guardar custos e margens; e-mail de contato tratado por serviço de comunicação apropriado, minimizando exposição. A simples hash de e-mail, sem proteção extra, pode permitir ataques por dicionário se a base vazar: considerar HMAC com chave secreta rotacionável ou modelo controlado e plano de migração.
- **access_grants**: id, account_id, order_id único, product_code, approved_at, starts_at, ends_at, grant_status, grant_kind (initial/renewal), created_at/updated_at. Chave única em (provider, provider_order_id, product_code) via join/constraints pertinentes; grants podem ser recalculados a partir de pedidos válidos.
- **access_sessions**: passar a referenciar account_id (ou um entitlement canônico) além de order_id para não perder acesso quando o titular renova. Guardar revogação, vencimento técnico e última validação.
- **order_events / access_audit**: histórico mínimo de decisões de concessão, extensão, vencimento e revogação, sem e-mail aberto, token de acesso ou dados financeiros.
- **outbox transacional**: notificações/ativação/expiração com chave idempotente, retentativas e registro de entrega/falha. Não tratar webhook como concluído comercialmente se o e-mail/transação obrigatória falhou silenciosamente.

Usar transações D1/batches na concessão e revogação; verificar atomicidade real, sequenciamento e consistência no ambiente adotado. Manter estado comercial derivável dos pedidos aceitos: corrigir reversões de renew/refund com reprocessamento determinístico. Não sobrescrever histórico de refunds ou ressuscitar direito revogado.

### 7.4. Contratos de API propostos

- POST /access/activate: autentica o código temporário de uso único, vincula sessão ao titular com direito vigente, devolve validade do direito comercial e validade técnica se apropriado; nunca inclui custos de simulação.
- POST /access/validate: verifica direito comercial + estado de pedido/grants + sessão válida a cada chamada; retorna status seguro e expiração do acesso. Não revela e-mail/compras de terceiros.
- POST /access/recover: resposta pública indistinguível para comprador inexistente, compra expirada ou existente; rate-limit, cooldown e auditoria. Links devem sempre apontar para a origem correta do ambiente. Testar falha de e-mail e plano de recuperação manual.
- Webhooks purchase_approved/refund/chargeback: verificação de autenticidade, idempotência, ordem temporal e deduplicação; grants não são reabertos por aprovação tardia de pedido reembolsado.
- Status e mensagens de UI propostos: active, expiring_soon, expired, refunded/chargeback, pending_access_delivery, temporary_service_error. Um erro transitório do backend deve ser distinguível de expiração definitiva para não apagar credenciais à toa.

### 7.5. Políticas comerciais complementares recomendadas — ainda não aprovadas

- **Suporte:** e-mail oficial e horário comercial em dias úteis (Brasília), confirmação automática imediata de recebimento com protocolo; **meta de primeira resposta humana até 2 dias úteis**. Não prometer resolução em 2 dias; respeitar o Decreto 7.962/2013 e prazo legal aplicável à manifestação em demandas. Definir quem monitora, contingência e tratamento de cobrança, falha de acesso e erros financeiros prioritários.
- **Atualizações:** correções de erros, estabilidade e segurança incluídas durante a licença; melhorias menores podem ocorrer sem preço adicional, mas novos produtos, módulos e consultoria não estão automaticamente incluídos. Preservar compatibilidade razoável e informar mudanças relevantes.
- **Reembolsos:** exercício do direito de arrependimento em 7 dias, com canal facilitado, confirmação imediata de solicitação e devolução nos termos da lei; preservar direitos legais por vícios e descumprimento fora desses 7 dias. Refund aprovado revoga apenas direitos derivados daquele pedido. Se compra/renovação coexistirem, preservar outros grants elegíveis. Usar webhook confiável e reconciliação com plataforma como plano de contingência.
- **Dispositivos:** permitir reinstalação/troca de dispositivo com reativação por e-mail e sem obrigação de suporte humano ordinário. Não prometer sincronização, backup ou limite numérico de aparelhos ainda não implementado.
- **Disponibilidade:** não prometer SLA 24/7 nem 100%; monitorar indisponibilidades e manter canal de suporte. Em falha relevante, informar estimativa apenas quando fundamentada e avaliar direitos/remediações; jamais usar indisponibilidade como motivo para reduzir direito contratual arbitrariamente.
- **Preço, fornecedor e tributos:** definir separadamente preço exato do Ever.Precifica individual, nome empresarial, inscrição legal aplicável, endereço físico/eletrônico, suporte e identificação no checkout. A taxa e o preço de outro kit não são automaticamente aplicáveis.

### 7.6. Critérios de aceite e cenários de teste antes do lançamento

1. Nova compra real controlada: recebe 12 meses e a data correta **antes** da primeira ativação; e-mail de entrega usa domínio de produção verificado.
2. Mesmo link de ativação consumido duas vezes: a segunda tentativa falha; novo pedido válido pode ser recuperado em outro navegador sem criar outro período.
3. Compra em ano bissexto, horário de verão histórico, fronteira de dia UTC/Brasília: data e horário apresentados corretamente; 12 meses calendários não são tratados como 365 dias.
4. Expiração: negar recuperação/validação de acesso expirado, preservar os dados de simulação locais; diferenciar de falha temporária de rede.
5. Renovação 20 dias antes de expirar: soma 12 meses ao vencimento anterior; 20 dias depois: conta da nova aprovação.
6. Repetir o mesmo evento purchase_approved e enviar eventos em ordem trocada: nunca conceder direitos extras, nunca reativar pedido refunded/chargeback.
7. Refund do primeiro pedido, do segundo pedido, ou ambos: reprocessar grants e revogar apenas o que não tiver respaldo em compra válida; em caso de titular com outra compra válida, manter eventual direito remanescente.
8. Reembolso após ativação: negar acesso ao direito revogado; a ferramenta aberta deve revalidar em pontos de uso e ao receber foco, sem afirmar blindagem antipirataria absoluta de JS já entregue.
9. Falha no Resend, reenvio e recuperação: retry seguro, sem e-mails ou links duplicados desnecessários; relatório sanitizado e alerta operacional.
10. Suporte: mensagem de recebimento ao cliente, protocolo, resposta humana dentro da meta voluntária e disponibilidade de canal para arrependimento.
11. Nenhuma taxa, custo, preço, simulação, e-mail pessoal ou token de ativação em analytics, logs públicos, commits ou evidência de testes.
12. Testar em D1/Worker **isolados**; não alterar staging com compradores E2E anteriores nem produção até aprovações, plano de rollback e autorização de release.

## 8. Ordem mínima de implementação após aprovação

**P0 — obrigatórios para vender o Modelo A anunciado**
1. Migrar concessão e validação de direito comercial por 12 meses; cobrir expiração real e reembolso.
2. Revisar recuperação e entrega de e-mail em ambiente isolado, com canal de suporte de contingência.
3. Garantir a política explícita de renovação opcional, evitando cobrança automática e promessas não operacionalizáveis.
4. Definir preço e dados do fornecedor, página/checkout e textos jurídicos; garantir arrependimento e canal de suporte.
5. Teste controlado Kiwify → webhook → outbox/e-mail → ativação → uso → reembolso → revogação.

**P1 — podem ser concluídos com cronograma definido, sem prometer que já estão ativos**
- lembretes automáticos de vencimento; checkout de renovação, desde que haja compromisso e viabilidade de disponibilizá-lo antes do primeiro vencimento; métricas avançadas e melhorias de conveniência.
- analytics real de QA separado continua sendo QA de mensuração, sem alterar a proteção de dados.

**Ressalva jurídica:** este é documento de produto e engenharia, não parecer jurídico. Revisar juridicamente antes de publicar termos ou processar vendas reais.
