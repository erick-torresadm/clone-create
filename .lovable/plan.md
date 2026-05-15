
## 1. Trocar "FDM store" → "ativosfy"
- `src/routes/entrar.tsx`: substituir os 3 textos "FDM store" por "ativosfy".

## 2. Esqueci minha senha
- No `/entrar`, adicionar link "Esqueci minha senha" → abre form para inserir e‑mail e chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/redefinir-senha' })`.
- Criar nova rota `/redefinir-senha` (`src/routes/redefinir-senha.tsx`) com form de nova senha + `supabase.auth.updateUser({ password })`.
- Os e‑mails de signup e recuperação são enviados automaticamente pelo Supabase Auth (template padrão). Sem customização extra agora — se quiser branding com logo da ativosfy depois, é outra etapa.

## 3. Conectar cupons ao banco (corrige bug atual)
- Em `src/lib/checkout.functions.ts`: remover o objeto `COUPONS` hardcoded e passar a consultar a tabela `coupons`:
  - filtrar por `code = upper(input)`, `active = true`, `expires_at` no futuro (ou null), `min_order` respeitado, `used_count < max_uses` (se definido).
  - aplicar `discount_type` (`percent`/`fixed`) e `value`.
  - incrementar `used_count` quando o pedido for marcado como `paid` (em `checkout.server.ts`, no `fulfillPaidOrder`).
- Resultado: qualquer cupom criado no admin passa a funcionar de verdade no checkout.

## 4. Criar cupom `CARRINHO15`
- Migração de dados: inserir na tabela `coupons` o cupom `CARRINHO15`, `discount_type=percent`, `value=15`, `active=true`, sem expiração.

## 5. Carrinho abandonado → enviar cupom por e‑mail
**Definição de "abandonado":** pedido com `status='pending'` criado há mais de **30 minutos** e ainda sem pagamento.

- Migração:
  - adicionar coluna `abandoned_email_sent_at TIMESTAMPTZ` em `orders`.
  - habilitar `pg_cron` + `pg_net`.
  - criar job que roda a cada 10 minutos chamando `POST https://project--15e1ab37-295e-420d-956f-97ff29d001b0.lovable.app/api/public/send-abandoned-cart` com header `x-cron-secret`.
- Novo secret `ABANDONED_CART_CRON_SECRET`.
- Nova rota pública `src/routes/api/public/send-abandoned-cart.ts`:
  - valida o header.
  - busca orders `pending`, `created_at < now() - 30min`, `abandoned_email_sent_at is null`, com `email` preenchido.
  - para cada uma: envia e‑mail (template novo em `resend.server.ts`) com o cupom `CARRINHO15` (15% off) e link para `/produtos`.
  - marca `abandoned_email_sent_at = now()` para não enviar de novo.

## Detalhes técnicos
- Os e‑mails de signup/recuperação vão pelos servidores padrão do Supabase Auth (não pelo Resend). Quiser trocar pra Resend com domínio `ativosfy.store`, é uma etapa separada (configurar SMTP custom no Auth).
- O e‑mail de carrinho abandonado vai pelo Resend (`noreply@ativosfy.store`), reutilizando `sendResendEmail`.
- Cron a cada 10min é tempo razoável para detectar abandono em ~30–40min.

Confirma que posso seguir com tudo?
