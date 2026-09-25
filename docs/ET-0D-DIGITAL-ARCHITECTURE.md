# ET-0D — Arquitetura Digital

Status: foundation implemented on `feat/et-0d-digital-foundation`.

## 1. Topology

- `soueverest.com.br`: public brand, content, acquisition and Ferramentas.
- `soueverest.com.br/ferramentas/`: public product family hub.
- `app.soueverest.com.br`: Ever.Finance authenticated product; remains isolated from the low-ticket MVP.
- Kiwify: checkout/payment/delivery layer for the MVP.
- Resend: transactional/lifecycle email layer when connected.
- Automation endpoint (future): `automation.soueverest.com.br`, provider-agnostic façade for Kiwify/Resend webhooks and AI workflows.

GitHub Pages remains the public-site host. It must not receive secrets or server-side webhooks.

## 2. Data flow

### Lead
1. Visitor reaches content/home/tools.
2. UTM attribution is captured in browser session.
3. User submits a lead/diagnostic form.
4. Lead gets an opaque internal `lead_id` in the automation layer.
5. Operational registry receives the lead.
6. Email/diagnostic automation starts when consent and trigger allow it.

### Purchase
1. Visitor clicks a checkout CTA.
2. Kiwify owns the checkout and payment.
3. Approved-purchase webhook reaches the automation endpoint.
4. Endpoint validates authenticity according to the provider's current specification.
5. Event is deduplicated by provider event/order identifier.
6. Order is stored in the operational registry.
7. Resend onboarding is triggered.
8. Purchase event is sent to analytics without exposing secrets.
9. Future product access/provisioning can be added without coupling to Ever.Finance.

### Refund
1. Refund event arrives from Kiwify.
2. Order becomes `refunded`.
3. Promotional follow-ups for that purchase stop.
4. Metrics are updated.
5. Access revocation, when required by the product, is handled by the product delivery layer.

### Email
1. Resend sends onboarding/lifecycle email.
2. Delivery/bounce/unsubscribe events return to the automation layer.
3. Contact state is updated.
4. Bounced or unsubscribed contacts are suppressed from non-essential marketing sends.

## 3. Event taxonomy

Browser-side events use `window.dataLayer`. The current implementation does not transmit them to an external analytics provider by itself.

| Event | Trigger | Core fields |
| --- | --- | --- |
| `everest_page_view` | page loaded | page_path, page_title, attribution |
| `tools_hub_click` | visitor opens Ferramentas | item_name, destination |
| `tool_interest_click` | visitor expresses interest in a tool | item_name, destination |
| `commercial_lead_submit` | institutional lead form submit | form_name |
| `commercial_lead_thank_you` | lead thank-you page | page_path |
| `checkout_click` | future checkout CTA | product_code, price, destination |
| `everfinance_click` | transition to Ever.Finance | item_name, destination |
| `diagnostic_start` | future Ever.Raio-X start | diagnostic_code |
| `diagnostic_complete` | future Ever.Raio-X completion | diagnostic_code, primary_pain |
| `tool_activation` | paid tool first use | product_code |
| `tool_result_view` | result is produced/viewed | product_code |
| `purchase_approved` | server-side Kiwify event | product_code, order_id, value |
| `purchase_refunded` | server-side Kiwify event | product_code, order_id, value |
| `cross_sell_click` | customer opens next offer | source_product, target_product |

Do not put CPF/CNPJ, full phone numbers, email addresses, passwords, raw financial inputs or other sensitive data in analytics events.

## 4. Attribution

The public site preserves, for the browser session only:
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `gclid`
- `fbclid`

These values are added to data-layer events. Persistent attribution belongs in the server-side lead/order registry after an explicit business event.

## 5. Product codes

Stable internal codes should not depend on display names:

- `ever_raio_x`
- `ever_precifica`
- `ever_meta`
- `ever_separa`
- `ever_caixa`
- `kit_gestao_financeira`
- `ever_finance`

Kiwify product IDs belong in environment/configuration, never hardcoded across multiple pages.

## 6. Minimal operational records

### Lead
- lead_id
- created_at
- name
- email
- phone (optional/consented)
- primary_pain
- source / medium / campaign
- consent_at
- lifecycle_status

### Order
- order_id
- provider
- provider_event_id
- product_code
- buyer reference
- gross_value
- status
- approved_at
- refunded_at
- attribution fields

### Product usage
- anonymous/internal customer reference
- product_code
- activated_at
- result_viewed_at
- last_activity_at

## 7. Security rules

- No API keys, checkout secrets or webhook signing material in this public repository.
- Public site only emits non-sensitive browser events.
- Webhooks terminate on HTTPS server-side infrastructure.
- Verify webhook authenticity before processing.
- Use idempotency/deduplication for purchase and refund events.
- Keep raw provider payloads only when necessary and under an explicit retention policy.
- Never log secrets or unnecessary customer personal data.
- Ever.Finance remains isolated until ET-0A security P0 is addressed.

## 8. Privacy / consent

The institutional form now requires acknowledgement of the privacy policy.
Marketing consent must remain distinguishable from service/transactional communication when email automations are implemented.
The privacy policy must be updated whenever analytics providers, new processors or new purposes are activated.

## 9. SEO

Implemented:
- home description/canonical/Open Graph basics;
- canonical/Open Graph basics for existing articles;
- `robots.txt`;
- `sitemap.xml`;
- canonical public Ferramentas hub;
- thank-you page set to `noindex`.

Next:
- Search Console registration;
- structured data where useful;
- image compression/WebP/AVIF;
- dedicated product landing pages;
- article index and internal-link strategy.

## 10. Analytics provider

The code intentionally creates the data layer before selecting a provider. Google Tag Manager/GA4 can consume it later without rewriting each CTA. Consent mode/tag governance must be configured before advertising/remarketing tags are enabled.

## 11. Launch dependencies

Before activating paid checkout:
1. Create/configure Kiwify account and Ever.Precifica product.
2. Replace future checkout placeholder with the actual Kiwify checkout URL.
3. Configure server-side automation endpoint.
4. Configure and test purchase/refund webhooks.
5. Connect/verify Resend domain and sender.
6. Build onboarding automation and suppression behavior.
7. Configure analytics container/provider and consent behavior.
8. End-to-end test: ad/content → page → checkout → purchase → email → first use → refund path.

## 12. Boundary with ET-0E

ET-0D owns channels, pages, event contracts and integrations.
ET-0E owns Ever.Precifica's calculation engine, UX, inputs, outputs and product-specific tests.
