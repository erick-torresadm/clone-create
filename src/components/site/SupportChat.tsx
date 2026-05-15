import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useLocation } from "@tanstack/react-router";
import { MessageCircle, X, Send, Loader2, CheckCircle2, Clock } from "lucide-react";
import { playMessage } from "@/lib/sound";
import { userAvatar, adminAvatar } from "@/lib/avatar";
import { parseChatMedia, ChatProductCard } from "@/components/site/ChatProductCard";

type Convo = {
  id: string;
  user_id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_user: number;
  unread_admin: number;
  client_email?: string | null;
  client_name?: string | null;
  client_ip?: string | null;
  client_user_agent?: string | null;
  created_at: string;
};
type Msg = {
  id: string;
  conversation_id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
};

async function getClientIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip ?? null;
  } catch { return null; }
}

const QUEUE_MS = 5 * 60 * 1000;

export function SupportChat() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  if (location.pathname.startsWith("/admin")) return null;
  if (!user) return null;

  return <SupportChatInner open={open} setOpen={setOpen} qc={qc} userId={user.id} userEmail={user.email ?? null} />;
}

function SupportChatInner({
  open,
  setOpen,
  qc,
  userId,
  userEmail,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  qc: ReturnType<typeof useQueryClient>;
  userId: string;
  userEmail: string | null;
}) {
  const convoQ = useQuery({
    queryKey: ["support-convo-mine"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as Convo | null) ?? null;
    },
  });
  const convo = convoQ.data;

  const msgsQ = useQuery({
    queryKey: ["support-msgs", convo?.id],
    enabled: !!convo?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", convo!.id)
        .order("created_at");
      if (error) throw error;
      return data as Msg[];
    },
  });
  const msgs = msgsQ.data ?? [];

  // Realtime — dedupe by id to avoid duplicate bubbles after own insert
  useEffect(() => {
    if (!convo?.id) return;
    const ch = supabase
      .channel(`support-user-${convo.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${convo.id}` },
        (payload) => {
          const m = payload.new as Msg;
          qc.setQueryData<Msg[]>(["support-msgs", convo.id], (cur) => {
            const list = cur ?? [];
            if (list.some((x) => x.id === m.id)) return list;
            return [...list, m];
          });
          if (m.sender === "admin") {
            playMessage();
            qc.invalidateQueries({ queryKey: ["support-convo-mine"] });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convo?.id, qc]);

  // Mark read
  useEffect(() => {
    if (open && convo?.id && (convo.unread_user ?? 0) > 0) {
      supabase.rpc("support_mark_read_user", { _convo: convo.id }).then(() => {
        qc.invalidateQueries({ queryKey: ["support-convo-mine"] });
      });
    }
  }, [open, convo?.id, convo?.unread_user, qc]);

  const [draft, setDraft] = useState("");
  const sending = useMutation({
    mutationFn: async (body: string) => {
      let id = convo?.id;
      if (!id) {
        const { data: u } = await supabase.auth.getUser();
        const meta = (u.user?.user_metadata ?? {}) as any;
        const name = meta.display_name || meta.full_name || meta.name || u.user?.email?.split("@")[0] || null;
        const ip = await getClientIp();
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
        const { data: created, error } = await supabase
          .from("support_conversations")
          .insert({
            user_id: userId,
            subject: "Suporte",
            client_email: u.user?.email ?? null,
            client_name: name,
            client_ip: ip,
            client_user_agent: ua,
          })
          .select()
          .single();
        if (error) throw error;
        id = (created as Convo).id;
      }
      const { data: inserted, error: e2 } = await supabase
        .from("support_messages")
        .insert({ conversation_id: id, sender: "user", sender_id: userId, body })
        .select()
        .single();
      if (e2) throw e2;
      return { id, msg: inserted as Msg };
    },
    onSuccess: ({ id, msg }) => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["support-convo-mine"] });
      qc.setQueryData<Msg[]>(["support-msgs", id], (cur) => {
        const list = cur ?? [];
        if (list.some((x) => x.id === msg.id)) return list;
        return [...list, msg];
      });
    },
  });

  // Close conversation
  const closing = useMutation({
    mutationFn: async () => {
      if (!convo?.id) return;
      const { error } = await supabase
        .from("support_conversations")
        .update({ status: "closed" })
        .eq("id", convo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-convo-mine"] }),
  });

  // Presence — admin online (only true if real admin in /admin panel)
  const [adminOnline, setAdminOnline] = useState(false);
  useEffect(() => {
    const ch = supabase.channel("admins-presence", { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ role?: string }>>;
      const online = Object.values(state).some((arr) => arr.some((p) => p.role === "admin"));
      setAdminOnline(online);
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Typing indicator (broadcast)
  const [adminTyping, setAdminTyping] = useState(false);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<number | null>(null);
  const lastSentTyping = useRef<number>(0);
  useEffect(() => {
    if (!convo?.id) return;
    const ch = supabase.channel(`support-typing-${convo.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, (msg: any) => {
      if (msg?.payload?.from === "admin") {
        setAdminTyping(true);
        if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
        typingTimeout.current = window.setTimeout(() => setAdminTyping(false), 2500);
      }
    });
    ch.subscribe();
    typingChRef.current = ch;
    return () => {
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      supabase.removeChannel(ch);
      typingChRef.current = null;
    };
  }, [convo?.id]);

  const broadcastTyping = () => {
    const ch = typingChRef.current;
    if (!ch) return;
    const now = Date.now();
    if (now - lastSentTyping.current < 1500) return;
    lastSentTyping.current = now;
    ch.send({ type: "broadcast", event: "typing", payload: { from: "user" } });
  };

  // Queue countdown — only while no admin message yet and within 5min
  const adminAnswered = useMemo(() => msgs.some((m) => m.sender === "admin"), [msgs]);
  const queueEndsAt = convo ? new Date(convo.created_at).getTime() + QUEUE_MS : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!convo || adminAnswered) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [convo?.id, adminAnswered]);
  const inQueue = !!convo && !adminAnswered && convo.status !== "closed" && now < queueEndsAt;
  const queueRemaining = Math.max(0, queueEndsAt - now);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, open, adminTyping]);

  const unread = convo?.unread_user ?? 0;
  const myAvatar = userAvatar(userEmail || userId);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir suporte"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_15px_40px_-10px_rgba(99,140,255,0.7)] transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-[1.5rem] place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[34rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/15 to-primary/5 px-4 py-3">
            <img src={adminAvatar()} alt="Atendente" className="h-9 w-9 rounded-full ring-2 ring-primary/40" />
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">Suporte ativosfy</div>
              {adminOnline ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Online · respondemos agora
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                  Offline · responderemos por email
                </div>
              )}
            </div>
            {convo && convo.status !== "closed" && (
              <button
                onClick={() => {
                  if (closing.isPending) return;
                  if (confirm("Encerrar esta conversa?")) closing.mutate();
                }}
                title="Encerrar conversa"
                className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              >
                Encerrar
              </button>
            )}
          </div>

          {/* Queue banner */}
          {inQueue && (
            <div className="flex items-center gap-2 border-b border-border bg-amber-500/10 px-4 py-2 text-[11px] text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Você está na fila de atendimento. Tempo estimado:{" "}
                <strong>{Math.ceil(queueRemaining / 60000)} min</strong>
              </span>
            </div>
          )}

          {convo?.status === "closed" && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conversa encerrada. Envie uma nova mensagem para reabrir.
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-background/40 p-4">
            {msgs.length === 0 && (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                👋 Olá! Como podemos ajudar você hoje?
              </div>
            )}
            {msgs.map((m) => (
              <Bubble key={m.id} m={m} myAvatar={myAvatar} />
            ))}
            {adminTyping && (
              <div className="flex items-end gap-2">
                <img src={adminAvatar()} alt="" className="h-6 w-6 rounded-full" />
                <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim();
              if (!v || sending.isPending) return;
              sending.mutate(v);
            }}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <input
              value={draft}
              onChange={(e) => { setDraft(e.target.value); broadcastTyping(); }}
              placeholder={convo?.status === "closed" ? "Reabrir com nova mensagem..." : "Escreva sua mensagem..."}
              className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending.isPending}
              className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-50"
            >
              {sending.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ m, myAvatar }: { m: Msg; myAvatar: string }) {
  const isUser = m.sender === "user";
  const media = parseChatMedia(m.body);
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <img src={isUser ? myAvatar : adminAvatar()} alt="" className="h-7 w-7 shrink-0 rounded-full" />
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border border-border bg-card text-foreground"
        }`}
      >
        {media?.kind === "image" ? (
          <a href={media.url} target="_blank" rel="noreferrer">
            <img src={media.url} alt="" className="max-h-56 rounded-lg" />
          </a>
        ) : media?.kind === "audio" ? (
          <audio controls src={media.url} className="max-w-[12rem]" />
        ) : media?.kind === "gif" ? (
          <img src={media.url} alt="gif" className="max-h-56 rounded-lg" />
        ) : media?.kind === "product" ? (
          <ChatProductCard id={media.id} dark={isUser} />
        ) : (
          <div className="whitespace-pre-wrap break-words">{m.body}</div>
        )}
        <div className={`mt-1 text-[10px] ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}
