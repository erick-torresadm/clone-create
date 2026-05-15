import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, MessageCircle } from "lucide-react";
import { playMessage } from "@/lib/sound";

export const Route = createFileRoute("/admin/suporte")({ component: AdminSupport });

type Convo = {
  id: string;
  user_id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_admin: number;
  unread_user: number;
  client_email: string | null;
  client_name: string | null;
  client_ip: string | null;
  client_user_agent: string | null;
};
type Msg = { id: string; conversation_id: string; sender: "user" | "admin"; body: string; created_at: string };

function AdminSupport() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);

  // Broadcast admin presence so users see "Online"
  useEffect(() => {
    if (!user || !isAdmin) return;
    const ch = supabase.channel("admins-presence", { config: { presence: { key: user.id } } });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ role: "admin", at: Date.now() });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, isAdmin]);

  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const convosQ = useQuery({
    queryKey: ["admin-convos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Convo[];
    },
    refetchInterval: 15000,
  });

  // Realtime: refresh list on any new message
  useEffect(() => {
    const ch = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (p) => {
        const m = p.new as Msg;
        qc.invalidateQueries({ queryKey: ["admin-convos"] });
        qc.setQueryData<Msg[]>(["admin-msgs", m.conversation_id], (cur) => (cur ? [...cur, m] : cur));
        if (m.sender === "user") playMessage();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  if (!user || !isAdmin) return null;

  const convos = convosQ.data ?? [];
  const active = convos.find((c) => c.id === activeId) ?? null;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Suporte aos clientes</h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* List */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Conversas ({convos.length})
            </div>
            <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {convos.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</div>
              )}
              {convos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-background/40 ${activeId === c.id ? "bg-background/60" : ""}`}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {c.client_name || c.client_email || `${c.user_id.slice(0, 8)}…`}
                      </span>
                      {c.unread_admin > 0 && (
                        <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {c.unread_admin}
                        </span>
                      )}
                    </div>
                    {c.client_email && c.client_name && (
                      <div className="truncate text-[11px] text-muted-foreground">{c.client_email}</div>
                    )}
                    <div className="truncate text-[11px] text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {!active ? (
              <div className="grid h-[70vh] place-items-center text-sm text-muted-foreground">Selecione uma conversa para responder.</div>
            ) : (
              <Thread convo={active} qc={qc} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Thread({ convo, qc }: { convo: Convo; qc: ReturnType<typeof useQueryClient> }) {
  const msgsQ = useQuery({
    queryKey: ["admin-msgs", convo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", convo.id)
        .order("created_at");
      if (error) throw error;
      return data as Msg[];
    },
  });
  const msgs = msgsQ.data ?? [];

  // Mark read on open
  useEffect(() => {
    if (convo.unread_admin > 0) {
      supabase.rpc("support_mark_read_admin", { _convo: convo.id }).then(() => {
        qc.invalidateQueries({ queryKey: ["admin-convos"] });
      });
    }
  }, [convo.id, convo.unread_admin, qc]);

  const [draft, setDraft] = useState("");
  const sending = useMutation({
    mutationFn: async (body: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: convo.id, sender: "admin", sender_id: u.user?.id, body,
      });
      if (error) throw error;
    },
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["admin-msgs", convo.id] }); },
  });

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [msgs.length]);

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="border-b border-border px-5 py-3">
        <div className="text-sm font-bold text-foreground">
          {convo.client_name || convo.client_email || `Cliente ${convo.user_id.slice(0, 8)}…`}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {convo.client_email && <span>📧 {convo.client_email}</span>}
          {convo.client_ip && <span>🌐 {convo.client_ip}</span>}
          <span>Status: {convo.status}</span>
        </div>
        {convo.client_user_agent && (
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground/70" title={convo.client_user_agent}>
            {convo.client_user_agent}
          </div>
        )}
      </div>
      <div ref={ref} className="flex-1 space-y-2.5 overflow-y-auto bg-background/40 p-5">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${m.sender === "admin" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground"}`}>
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`mt-1 text-[10px] ${m.sender === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); const v = draft.trim(); if (v && !sending.isPending) sending.mutate(v); }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Resposta para o cliente..." className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary" />
        <button type="submit" disabled={!draft.trim() || sending.isPending} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
          {sending.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
