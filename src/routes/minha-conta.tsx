import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { checkPaymentStatus } from "@/lib/checkout.functions";
import { LogOut, Package, Eye, EyeOff, Copy, Loader2, Download, MessageCircle, Send, BadgeCheck, KeyRound, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { translateAuthError } from "@/lib/auth-errors";
import { getMyTelegramStatus, setTelegramSubscriptionActive } from "@/lib/telegram.functions";
import { useResellerStatus } from "@/lib/reseller";

const MANUAL_SUPPORT_WHATSAPP = "5511930070320";
import { toast } from "sonner";

const ENV = (import.meta.env.MODE === "production" ? "live" : "sandbox") as "sandbox" | "live";

export const Route = createFileRoute("/minha-conta")({
  component: MinhaConta,
});

function MinhaConta() {
  const { user, loading, signOut } = useAuth();
  const reseller = useResellerStatus();
  const navigate = useNavigate();
  const check = useServerFn(checkPaymentStatus);
  useEffect(() => { if (!loading && !user) navigate({ to: "/entrar" }); }, [loading, user, navigate]);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: (query) => ((query.state.data as any[] | undefined)?.some((o) => ["pending", "processing", "paid"].includes(o.status) && !o.delivered_data) ? 4000 : false),
  });

  // Em background, confirma com o Asaas eventuais pedidos pendentes
  const handled = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const pend = orders.filter((o) => o.asaas_payment_id && !o.delivered_data && ["pending", "paid"].includes(o.status) && !handled.current.has(o.asaas_payment_id));
    if (!pend.length) return;
    pend.forEach((o) => handled.current.add(o.asaas_payment_id));
    (async () => {
      for (const o of pend.slice(0, 3)) {
        await check({ data: { paymentId: o.asaas_payment_id, environment: ENV } }).catch(() => null);
      }
      refetch();
    })();
  }, [user, orders, check, refetch]);

  if (!user) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Minha conta</h1>
              {reseller.data.isReseller && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-gradient-to-r from-primary/20 to-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Revendedor
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Olá, {user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/minha-conta/indicacoes" className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20">
              💸 Indicações & Saldo
            </Link>
            <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
          </div>
        </div>

        {reseller.data.isReseller && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Conta Revendedor ativa</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Você tem <span className="font-semibold text-primary">{reseller.data.discountPct}% OFF</span> em todos os produtos. O desconto já é aplicado automaticamente no carrinho.
                  </p>
                </div>
              </div>
              <Link to="/produtos" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
                Comprar com desconto
              </Link>
            </div>
          </div>
        )}

        {!reseller.data.isReseller && reseller.data.status === "pending" && (
          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
            ⏳ Sua solicitação de revendedor está em análise. Avisaremos assim que for aprovada.
          </div>
        )}

        {!reseller.data.isReseller && reseller.data.status === "none" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="text-sm">
              <span className="font-semibold text-foreground">Quer revender?</span>{" "}
              <span className="text-muted-foreground">Compre com até 50% OFF e venda no seu preço.</span>
            </div>
            <Link to="/revendedor" className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20">
              <BadgeCheck className="h-4 w-4" /> Solicitar cadastro
            </Link>
          </div>
        )}

        <PasswordCard email={user.email ?? ""} />

        <TelegramSubscriptionCard />

        <h2 className="mt-10 flex items-center gap-2 text-xl font-bold text-foreground"><Package className="h-5 w-5 text-primary" />Meus pedidos</h2>
        <div className="mt-4 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && !orders.length && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              Você ainda não fez pedidos. <Link to="/produtos" className="text-primary hover:underline">Ver produtos →</Link>
            </div>
          )}
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      </div>
    </Layout>
  );
}

function OrderCard({ order }: { order: any }) {
  const [show, setShow] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];
  const delivered = order.delivered_data;
  const isPaid = ["paid", "processing", "delivered"].includes(order.status);
  const manualItems = items.filter((it: any) => !it.provider);
  const showManualSupport = isPaid && manualItems.length > 0;
  const waMessage = encodeURIComponent(
    `Olá! Acabei de comprar e preciso da entrega manual.\n\nPedido: #${String(order.id).slice(0, 8)}\nProdutos:\n${manualItems.map((it: any) => `• ${it.name} × ${it.quantity ?? 1}`).join("\n")}`,
  );
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-600",
    paid: "bg-blue-500/15 text-blue-600",
    processing: "bg-blue-500/15 text-blue-600",
    delivered: "bg-emerald-500/15 text-emerald-600",
    canceled: "bg-red-500/15 text-red-600",
    refunded: "bg-red-500/15 text-red-600",
  };
  const statusLabel: Record<string, string> = {
    pending: "Aguardando Pix",
    paid: "Pago · processando",
    processing: "Processando",
    delivered: "Entregue",
    canceled: "Cancelado",
    refunded: "Estornado",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{String(order.id).slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[order.status] ?? "bg-muted text-foreground"}`}>
          {statusLabel[order.status] ?? order.status}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-foreground">
        {items.map((it: any, i: number) => (
          <li key={i} className="flex justify-between">
            <span>{it.name} × {it.quantity ?? 1}</span>
            <span>R$ {Number(it.unitPriceBrl ?? it.price ?? 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold text-foreground">R$ {Number(order.total).toFixed(2)}</span>
      </div>

      {showManualSupport && (
        <a
          href={`https://wa.me/${MANUAL_SUPPORT_WHATSAPP}?text=${waMessage}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-500 transition hover:bg-emerald-500/20"
        >
          <MessageCircle className="h-4 w-4" />
          Falar no WhatsApp para receber a entrega
        </a>
      )}

      {isPaid && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 p-4">
          <p className="text-sm font-semibold text-foreground">🎉 Bem-vindo à comunidade!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Entre nos nossos grupos exclusivos para clientes: novidades, promoções, dicas e suporte direto.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a
              href="https://chat.whatsapp.com/CAQzvoaGFQUDLAGdxqWy1o"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <MessageCircle className="h-4 w-4" />
              Entrar no WhatsApp
            </a>
            <a
              href="https://discord.gg/nPhugmw2bq"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              <MessageCircle className="h-4 w-4" />
              Entrar no Discord
            </a>
          </div>
        </div>
      )}

      {order.status === "pending" && order.pix_payload && (
        <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Aguardando pagamento Pix
          </p>
          {order.pix_qr_base64 && (
            <div className="mt-3 flex justify-center">
              <img src={`data:image/png;base64,${order.pix_qr_base64}`} alt="Pix QR" className="h-40 w-40 rounded-lg bg-white p-2" />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 rounded bg-background p-2">
            <code className="flex-1 truncate font-mono text-xs">{order.pix_payload}</code>
            <button onClick={() => { navigator.clipboard.writeText(order.pix_payload); toast.success("Copiado"); }} className="text-primary hover:underline">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {Array.isArray(delivered) && delivered.length > 0 && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">🔓 Dados entregues</p>
            <Button size="sm" variant="ghost" onClick={() => setShow(!show)}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="ml-1">{show ? "Ocultar" : "Mostrar"}</span>
            </Button>
          </div>
          {show && (
            <div className="mt-3 space-y-3">
              {delivered.map((d: any, i: number) => {
                const accountsRaw: any[] = Array.isArray(d.accounts) ? d.accounts : [];
                const lines = accountsRaw
                  .map((a) => (typeof a === "string" ? a : a?.full_info ?? a?.uid ?? ""))
                  .filter((s) => s && String(s).trim().length > 0);
                const downloadTxt = () => {
                  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(d.name || "contas").replace(/[^\w-]+/g, "_")}-${String(order.id).slice(0, 8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                };
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {d.name} · {lines.length}/{d.quantity ?? lines.length} {d.error ? "· ⚠ " + d.error : ""}
                      </p>
                      {lines.length > 0 && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={downloadTxt}>
                            <Download className="mr-1 h-3 w-3" /> .txt
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(lines.join("\n")); toast.success("Tudo copiado"); }}>
                            <Copy className="mr-1 h-3 w-3" /> Copiar tudo
                          </Button>
                        </div>
                      )}
                    </div>
                    {lines.length === 0 ? (
                      <div className="rounded bg-background p-2 text-xs text-muted-foreground">Sem dados.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {lines.map((text, j) => (
                          <div key={j} className="flex items-start gap-2 rounded bg-background p-2 font-mono text-xs text-foreground">
                            <pre className="flex-1 whitespace-pre-wrap break-all font-mono">{text}</pre>
                            <button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copiado"); }} className="text-primary hover:underline">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TelegramSubscriptionCard() {
  const statusFn = useServerFn(getMyTelegramStatus);
  const toggleFn = useServerFn(setTelegramSubscriptionActive);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-telegram-status"],
    queryFn: () => statusFn(),
    refetchInterval: (q) => ((q.state.data as any)?.subscriber ? false : 5000),
  });
  const sub = (data as any)?.subscriber;
  const deepLink = (data as any)?.deepLink;
  const botUsername = (data as any)?.botUsername;

  async function toggle(active: boolean) {
    if (!sub) return;
    try {
      await toggleFn({ data: { active } });
      toast.success(active ? "Notificações reativadas" : "Notificações pausadas");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2 text-primary">
          <Send className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground">Notificações de promoções no Telegram</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Receba avisos instantâneos quando lançarmos novos cupons ou produtos em promoção.
          </p>

          {isLoading && <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>}

          {!isLoading && !sub && deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b8bc0] transition-colors"
            >
              <Send className="h-4 w-4" />
              Ativar no Telegram
            </a>
          )}

          {!isLoading && !sub && !deepLink && botUsername === null && (
            <p className="mt-3 text-xs text-amber-600">Bot do Telegram ainda não configurado.</p>
          )}

          {!isLoading && sub && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${sub.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                {sub.active ? "🔔 Ativo" : "🔕 Pausado"}
                {sub.firstName ? ` · ${sub.firstName}` : ""}
              </span>
              <Button size="sm" variant="outline" onClick={() => toggle(!sub.active)}>
                {sub.active ? "Pausar avisos" : "Reativar avisos"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function save() {
    if (pwd.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres");
    if (pwd !== pwd2) return toast.error("As senhas não conferem");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) return toast.error(translateAuthError(error.message, "Não foi possível salvar a senha"));
    setDone(true);
    setPwd(""); setPwd2("");
    toast.success("Senha atualizada com sucesso");
    setTimeout(() => { setDone(false); setOpen(false); }, 1500);
  }

  async function sendReset() {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setSending(false);
    if (error) return toast.error(translateAuthError(error.message, "Falha ao enviar e-mail"));
    toast.success("Enviamos um link de redefinição para " + email);
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Senha de acesso</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Acabou de comprar e sua conta foi criada automaticamente? Defina uma senha sua agora.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={sendReset} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar link por e-mail
          </Button>
          <Button size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Cancelar" : "Trocar senha agora"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            type={show ? "text" : "password"}
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="Confirme a nova senha"
            autoComplete="new-password"
          />
          <div className="sm:col-span-2">
            <Button className="w-full" onClick={save} disabled={saving || done}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : done ? <Check className="mr-2 h-4 w-4" /> : null}
              {done ? "Senha salva!" : "Salvar nova senha"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
