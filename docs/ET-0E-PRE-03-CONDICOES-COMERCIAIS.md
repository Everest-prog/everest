# ET-0E-PRE-03 — Condições comerciais do Ever.Precifica

**Status: proposta para deliberação · 16/10/2026 · NÃO APROVADA · NÃO PUBLICADA.**

Produto objeto desta etapa: **Ever.Precifica individual**, não o Kit Gestão Financeira avaliado por personas fictícias a R$ 89,90. O preço comercial desta ferramenta individual permanece pendente.

## 1. Oferta e política de acesso

Distinguir três conceitos: (a) **prazo de uso contratado**, (b) **validade técnica da sessão em um navegador** e (c) **simulações financeiras locais**. No backend atual, uma sessão nova é criada com validade técnica de 365 dias, mas não existe ainda um prazo contratual de acesso por pedido nem fluxo de renovação. Não anunciar 12 meses como direito contratual sem implementar e testar essas regras.

| Opção | Modelo | Benefício | Impacto / risco |
|---|---|---|---|
| **A — recomendada para decisão** | Pagamento único por **12 meses de acesso**, renovação voluntária, sem cobrança automática | Compromisso previsível e claro | Exige direito de acesso com data de expiração por pedido, comunicação e fluxo de renovação |
| B | Pagamento único, acesso enquanto o serviço se mantiver, sem vencimento predefinido | Fácil compreensão do comprador | Compromisso de duração indefinida, cuidados jurídicos no encerramento; **não confundir com vitalício** |
| C | Assinatura periódica | Receita previsível | Requer recorrência, inadimplência, cancelamento e mais suporte |

A **opção A é proposta, não aprovada**. A duração contratual não se confunde com a sessão técnica de 365 dias.

## 2. Condições propostas para aprovação

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

## 6. Decisões necessárias

- **D1 — Modelo de acesso:** A (12 meses, pagamento único) / B (acesso contínuo enquanto serviço mantido) / C (assinatura).
- **D2 — Suporte:** primeira resposta em até 2 dias úteis, sem promessa de solucionar definitivamente nesse prazo.
- **D3 — Atualizações:** correções/segurança durante período contratado; novos módulos e consultoria não incluídos.
- **D4 — Reembolso:** 7 dias conforme direitos aplicáveis, e atendimento de garantias legais posteriores quando necessário; eventual prazo voluntário adicional somente após análise financeira.
- **D5 — Informação pública:** definir preço específico, identidade do fornecedor, canal oficial, entrega e políticas antes da venda.

**Critérios de encerramento:** decisões aprovadas, regras implementadas e testadas, canal de suporte confirmado, integração de compra/recuperação/reembolso validada, revisão jurídica e posterior autorização específica de publicação comercial.

**Não modificar produção, staging comercial, checkout ou dados de compradores reais sem nova autorização.**
