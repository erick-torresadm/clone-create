import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { ArrowLeft, Send, Users, History, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { broadcastManual, getBroadcastStats } from "@/lib/telegram.functions";

export const Route = createFileRoute("/admin/telegram")({ component: AdminTelegram });

function AdminTelegram() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  const statsFn = useServerFn(getBroadcastStats);
  const broadcastFn = useServerFn(broadcastManual);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-broadcast-stats"],
    queryFn: () => statsFn(),
  });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const botUsername = (data as any)?.botUsername;
  const subs = (data as any)?.subscribers ?? 0;
  const recent = (data as any)?.recent ?? [];

  async function send() {
    if (!text.trim() || text.trim().length < 3) { toast.error("Mensagem muito curta"); return; }
    if (!confirm(`Enviar para ${subs} inscrito(s)?`)) return;
    setSending(true);
    try {
      const r: any = await broadcastFn({ data: { text } });
      toast.success(`Enviado: ${r.sent} ok, ${r.failed} falhou`);
      setText("");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  const webhookUrl = "https://project--15e1ab37-295e-420d-956f-97ff29d001b0-dev.lovable.app/api/public/telegram/webhook";

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Newsletter Telegram</h1>
        <p className="mt-1 text-sm text-muted-foreground">Envie promoções diretamente para os clientes inscritos no bot.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Mensagem manual</h2>
              <p className="mt-1 text-xs text-muted-foreground">Aceita HTML básico: &lt;b&gt;, &lt;i&gt;, &lt;a href&gt;, &lt;code&gt;.</p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder={`🔥 <b>Promoção da semana!</b>\n\nUse o cupom <b>SEMANAL10</b> e ganhe 10% OFF.\n\nhttps://ativosfy.store/produtos`}
                className="mt-3 font-mono text-sm"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={send} disabled={sending || !subs}>
                  <Send className="mr-2 h-4 w-4" />Enviar para {subs} inscrito(s)
                </Button>
                <span className="text-xs text-muted-foreground">{text.length}/3000</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2"><History className="h-4 w-4 text-primary" />Últimos envios</h2>
              <div className="mt-3 space-y-2">
                {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
                {!isLoading && !recent.length && <p className="text-sm text-muted-foreground">Nenhum envio ainda.</p>}
                {recent.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{r.title || r.kind}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")} · {r.kind}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{r.recipients_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-foreground"><Users className="h-4 w-4 text-primary" />Inscritos ativos</h2>
              <p className="mt-2 text-4xl font-extrabold text-primary">{subs}</p>
              {botUsername && (
                <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  @{botUsername}
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <h3 className="font-semibold text-foreground text-sm">Configurar webhook</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                No BotFather/Telegram, registre este webhook para receber inscrições:
              </p>
              <div className="mt-2 flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                <code className="flex-1 truncate font-mono">{webhookUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copiado"); }}>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                O webhook é registrado automaticamente pela equipe Lovable na primeira execução.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
