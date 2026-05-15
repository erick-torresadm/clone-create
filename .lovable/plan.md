# Programa de Revendedores

Sistema de cadastro de revendedores que, após aprovação manual no painel admin, passam a ver preços reduzidos no site inteiro (50% de desconto sobre o preço de venda das contas em estoque, e margem de 50% sobre o custo real nos produtos sincronizados via API — sem revelar o custo).

## Fluxo do usuário

1. Nova página `/revendedor` com texto de venda + formulário "Quero ser revendedor".
2. Usuário cria conta normal (signup) marcado como "pedido de revenda" + preenche WhatsApp/Telegram + motivo.
3. Status inicia como `pending`. Vê banner "Cadastro em análise" no painel.
4. Admin aprova ou rejeita em `/admin/revendedores`.
5. Aprovado → todos os produtos do site passam a mostrar:
   - Preço cortado original (riscado)
   - Novo preço de revendedor (verde) com badge **"Preço Revendedor -50%"**
   - Carrinho/checkout aplica o preço reduzido automaticamente.

## Cálculo do preço (sem expor o custo da API)

- **Conta com estoque manual** (`source = 'manual'`): preço revendedor = `price * 0.50`.
- **Produto via API** (`source != 'manual'` e tem `external_price`): preço revendedor = `external_price * brl_per_usd * 1.50` (margem de 50% sobre o custo). Resultado parece "preço de revendedor", o custo real nunca aparece no front.
- Fallback: se não houver `external_price`, usa `price * 0.50`.

Toda a lógica de cálculo fica num helper único (`getResellerPrice`) e o checkout valida no servidor para impedir manipulação no client.

## Mudanças no banco

Nova tabela `reseller_accounts`:
- `user_id` (PK, FK profiles)
- `status`: `pending | approved | rejected`
- `whatsapp`, `telegram`, `reason`
- `approved_at`, `approved_by`, `admin_note`
- `discount_pct` (default 50) — permite ajustar individualmente no futuro

Função `is_approved_reseller(uuid)` (SECURITY DEFINER) usada em RLS e no checkout server-side.

RLS:
- Usuário lê/insere o próprio registro
- Admin lê/atualiza tudo

## Telas novas

1. **`/revendedor`** — landing + formulário (cria conta + insere em `reseller_accounts` com status pending).
2. **`/minha-conta/revendedor`** — status do pedido + dados.
3. **`/admin/revendedores`** — fila pendente, aprovar/rejeitar com nota, lista dos aprovados com busca.
4. Botão no painel admin index linkando para a fila.

## Mudanças nas telas existentes

- `useAuth` expõe `isReseller` (boolean cacheado).
- Componentes de preço (cards de produto, página de produto, drawer do carrinho, checkout) usam `getResellerPrice(product, isReseller)` e mostram badge quando aplicável.
- Server function de criação de pedido recalcula totais usando o preço de revendedor quando o usuário é aprovado — nunca confia no preço enviado pelo client.

## Segurança

- Custo real (`external_price`) nunca é selecionado em queries públicas — apenas o preço já transformado.
- Aprovação só via RPC `approve_reseller(user_id, approve, note)` com check de admin.
- RLS impede usuário comum de ler tabela `reseller_accounts` de outros.

## O que NÃO entra agora

- Pagamento diferenciado / split de comissão.
- Painel separado de revendedor (eles compram pela mesma loja, só com preços reduzidos).
- Limite de compras ou quotas mensais.

Posso confirmar e começar pela migration + páginas, ou ajusta algo antes?
