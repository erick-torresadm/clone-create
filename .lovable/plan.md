## Observação importante antes de começar

Verifiquei o projeto e ainda **não vejo o Lovable Cloud (Supabase) nem o Stripe conectados** — só existe `LOVABLE_API_KEY`. Para construir o admin com persistência, login e checkout transparente, preciso ativar:

1. **Lovable Cloud** (banco + auth + storage) — eu mesmo ativo no primeiro passo.
2. **Stripe** — você precisa fornecer a `STRIPE_SECRET_KEY` quando eu pedir (vou abrir o formulário seguro). A publishable key fica no código.

Se você já conectou em outro projeto, ainda assim precisa reconectar aqui.

---

## O que vou construir

### 1. Backend (Lovable Cloud)
Tabelas:
- `profiles` (id, role: 'admin' | 'user', created_at) + trigger no signup
- `user_roles` (separada, com `has_role()` SECURITY DEFINER — padrão seguro)
- `products` (id, name, slug, price, old_price, image_url, badge, section, sold, rating, reviews, description, active, sort_order)
- `sections` (id, title, emoji, sort_order)
- `coupons` (code, discount_type: 'percent'|'fixed', value, min_order, max_uses, used_count, expires_at, active)
- `popups` (id, title, body, image_url, cta_label, cta_url, active, starts_at, ends_at, audience: 'all'|'first_visit')
- `site_settings` (singleton: store_name, primary_color, accent_color, hero_title, hero_subtitle, logo_url, announcement_bar)
- `orders` (id, user_id, items jsonb, subtotal, discount, total, coupon_code, stripe_session_id, status, created_at)

Storage bucket `product-images` (público para leitura).
RLS em tudo: leitura pública para products/sections/popups/site_settings ativos; escrita só `has_role('admin')`. Orders só dono ou admin.

### 2. Auth
- Página `/entrar` com email+senha + Google
- Primeiro usuário criado vira admin automaticamente (trigger), os próximos viram `user`
- Layout `_authenticated/_admin` protegido por `beforeLoad` + `has_role`

### 3. Painel Admin (`/admin`)
Sidebar shadcn com seções:
- **Dashboard** — vendas, pedidos recentes, produtos mais vendidos
- **Produtos** — CRUD com upload de imagem, drag-to-reorder, ativar/desativar, badges, seção
- **Seções** — CRUD + ordenação
- **Cupons** — CRUD com preview do desconto e contador de uso
- **Popups/Notícias** — editor com preview ao vivo, agendamento (de/até), público alvo
- **Aparência** — nome da loja, cor primária/destaque (gera CSS vars em runtime), barra de aviso, hero title
- **Pedidos** — listar, filtrar, ver detalhes, status

Tudo com formulários `react-hook-form + zod`, toasts, otimismo via `@tanstack/react-query`.

### 4. Frontend público (lendo do Cloud)
- Index e `/produtos` passam a buscar do Supabase (server functions com cache)
- Aplica `site_settings` (cores, hero, anúncio) dinamicamente
- Renderiza popups ativos com `<Dialog>` controlado por localStorage (não repete na mesma sessão)

### 5. Index melhorada
- Grid responsivo com **colunas mais largas** e mais respiro: `sm:2 lg:3 xl:4` mas com `gap-6` e cards maiores
- Cada seção vira um bloco com header, badge contador e CTA "Ver tudo"
- Hero com stats animados (clientes, produtos vendidos)
- Carrossel de "Mais vendidos" com auto-scroll
- Faixa de logos / formas de pagamento
- FAQ accordion
- Animação de entrada por seção (framer-motion já presente?)

### 6. Checkout Stripe transparente
- Server function `createCheckoutSession` que monta line_items a partir do carrinho + aplica cupom
- Checkout redireciona para Stripe Checkout hospedado (mais seguro e PCI-compliant que "transparente puro"), com tema customizado e `payment_method_types: ['card', 'pix' se BR]`
- Webhook `/api/public/stripe-webhook` valida assinatura e marca `orders.status = 'paid'`
- Se você quer **realmente transparente** (form de cartão dentro do site usando Stripe Elements), confirme — exige PCI compliance básico e mais código.

---

## Sugestões de melhorias

1. **Histórico de pedidos do cliente** (`/minha-conta`) — leva confiança
2. **Avaliações reais** com moderação no admin (em vez de mock)
3. **Programa de indicação** (cada user tem código próprio que vira cupom de 5%)
4. **Estoque limitado por SKU** (atual é "ilimitado") — útil para BM/perfis aquecidos
5. **Webhook de Telegram/Discord** notificando cada venda paga
6. **Modo manutenção** togglável no admin
7. **SEO dinâmico** — sitemap.xml gerado dos produtos do banco
8. **Analytics** — UTM tracking + dashboard simples no admin (top fontes)
9. **Testes A/B** simples no popup (variant A vs B)

---

## Como vou entregar
Por ser grande, vou dividir em 3 entregas dentro desta mesma resposta:
1. Cloud + tabelas + auth + admin shell
2. CRUD de produtos, seções, cupons, popups, settings + leitura pública
3. Stripe + carrinho + cupom no checkout + webhook + index renovada

---

## Preciso confirmar

1. Posso ativar Lovable Cloud agora?
2. Confirma que vou pedir `STRIPE_SECRET_KEY` (modo test ou live?) e o `STRIPE_WEBHOOK_SECRET` (gero depois de criar o webhook)?
3. Stripe Checkout hospedado (recomendo) ou Elements transparente dentro do site?
4. Quer Pix junto com cartão? (precisa Stripe BR habilitado na sua conta)
5. Login social Google ativado?
6. Das sugestões acima, alguma que **não** quer agora?