# ET-0E-PRE-01 — Demonstrações guiadas do Ever.Precifica

**Status:** protótipo em branch separada; **aguardando aprovação do proprietário**. Não há publicação da demonstração, ativação de checkout nem alteração ao staging/produção.

## Conteúdo

- Produto: óleo finalizador capilar de revenda em salão.
- Serviço: escova com hidratação.
- Introdução + as mesmas oito etapas conceituais do Ever.Precifica.
- Dados de ambos os exemplos **fixos e fictícios**, apresentados somente para leitura; escolha do exemplo, avançar/voltar e alternância ilustrativa entre sem desconto e 10% são as únicas interações.
- Preços, custos, margens, status e limites calculados por importação direta de `ferramentas/precifica/engine.mjs`, o motor real do produto, sem duplicar fórmulas.
- Sem acesso pago, cookies, analytics, fetches, e-mails, login, coleta ou tráfego externo de aplicação.
- Visual inspirado no Ever.Glass; HTML sem dependências externas; CSS responsivo e suporte a navegação por teclado.

## Conferência dos dois exemplos

| Dado | Óleo finalizador | Escova com hidratação |
|---|---:|---:|
| Custo principal | R$ 35,00 | R$ 35,00 (1h de trabalho) |
| Outros gastos | R$ 5,00 | R$ 12,00 |
| Custos fixos por venda | R$ 6,00 (R$ 600/100 un.) | R$ 20,00 (R$ 2.400/120h × 1h) |
| Impostos + taxa | 6% + 3% | 6% + 3% |
| Margem desejada / mínima | 25% / 15% | 30% / 20% |
| Preço atual fictício | R$ 59,90 | R$ 95,00 |
| Menor preço técnico do motor | R$ 69,70 | R$ 109,83 |
| Sugestão comercial do motor | R$ 70,00 | R$ 110,00 |
| Lucro estimado no preço sugerido | R$ 17,70 | R$ 33,10 |
| Margem no preço atual | 14,21% | 20,47% |
| Preço após 10% de desconto | R$ 63,00 | R$ 99,00 |
| Margem após 10% de desconto | 17,98% | 23,32% |

Os percentuais tributários são **apenas ficção didática**; não configuram recomendação tributária. O motor trabalha com arredondamento por componente em centavos, de forma que seus resultados mínimos podem diferir em centavos de uma fórmula simplificada. Os valores acima foram escolhidos e os casos codificados para utilizar o próprio motor.

## Como testar localmente, sem publicar

A partir da raiz do repositório na branch `feat/et-0e-pre-01-demos`:

```bash
node --test tests/precifica-demos.test.mjs
python3 -m http.server 8765 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8765/demos/precifica/` no navegador. Teste navegação e seletores em desktop/mobile; ao alternar entre casos, a jornada recomeça. Não abra como `file://`, pois a demonstração usa módulos ES e imports relativos ao repositório.

## Critérios para aprovação

1. Os dois exemplos contam uma história compreensível e os oito passos podem ser navegados.
2. Todos os resultados são calculados pelo motor de produção e conferidos nos testes de regressão.
3. Não existem campos financeiros editáveis, necessidade de compra ou liberação de acesso.
4. O protótipo não introduz promessas de receita, alíquotas sugeridas ou vinculações à infraestrutura comercial.
5. Não houve deploy, modificação de `main`, merge do PR #5 ou alteração aos arquivos usados pelo staging.

**Próximo passo após aprovação:** ajustes solicitados pelo usuário; depois discutir integração à página de vendas como uma etapa separada. O protótipo por si só não concede autorização de publicação.
