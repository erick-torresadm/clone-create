import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, MessageCircle, Search, CheckCircle2, RotateCcw, Inbox, Mail, Globe, Monitor, Image as ImageIcon, Mic, Square, BellOff, Bell } from "lucide-react";
import { playMessage, startPhoneRing } from "@/lib/sound";
import { toast } from "sonner";
import { userAvatar, adminAvatar } from "@/lib/avatar";

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
  created_at: string;
};
type Msg = { id: string; conversation_id: string; sender: "user" | "admin"; body: string; created_at: string };

type Filter = "all" | "unread" | "open" | "closed";

function AdminSupport() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);

  // Broadcast admin presence so users see "Online"
  useEffect(() => {
    if (!user || !isAdmin) return;
    const ch = supabase.channel("admins-presence", { config: { presence: { key: user.id } } });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ role: "admin", at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, isAdmin]);

  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  // Last message preview for each conversation
  const previewsQ = useQuery({
    queryKey: ["admin-convo-previews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("conversation_id, sender, body, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map: Record<string, { sender: string; body: string; created_at: string }> = {};
      for (const m of data as any[]) {
        if (!map[m.conversation_id]) map[m.conversation_id] = m;
      }
      return map;
    },
    refetchInterval: 15000,
  });

  // Realtime: refresh on any new message (dedupe by id)
  useEffect(() => {
    const ch = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (p) => {
        const m = p.new as Msg;
        qc.invalidateQueries({ queryKey: ["admin-convos"] });
        qc.invalidateQueries({ queryKey: ["admin-convo-previews"] });
        qc.setQueryData<Msg[]>(["admin-msgs", m.conversation_id], (cur) => {
          if (!cur) return cur;
          if (cur.some((x) => x.id === m.id)) return cur;
          return [...cur, m];
        });
        if (m.sender === "user") playMessage();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const allConvos = convosQ.data ?? [];
  const previews = previewsQ.data ?? {};

  const stats = useMemo(() => ({
    total: allConvos.length,
    unread: allConvos.filter((c) => c.unread_admin > 0).length,
    open: allConvos.filter((c) => c.status === "open").length,
    closed: allConvos.filter((c) => c.status === "closed").length,
  }), [allConvos]);

  const filtered = useMemo(() => {
    let list = allConvos;
    if (filter === "unread") list = list.filter((c) => c.unread_admin > 0);
    else if (filter === "open") list = list.filter((c) => c.status === "open");
    else if (filter === "closed") list = list.filter((c) => c.status === "closed");
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        (c.client_name ?? "").toLowerCase().includes(q) ||
        (c.client_email ?? "").toLowerCase().includes(q) ||
        (c.client_ip ?? "").toLowerCase().includes(q) ||
        (previews[c.id]?.body ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allConvos, filter, search, previews]);

  const active = allConvos.find((c) => c.id === activeId) ?? null;

  if (!user || !isAdmin) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Suporte aos clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Leia e responda todas as conversas em tempo real.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <StatChip label="Total" value={stats.total} />
            <StatChip label="Não lidas" value={stats.unread} tone="destructive" />
            <StatChip label="Abertas" value={stats.open} tone="primary" />
            <StatChip label="Fechadas" value={stats.closed} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[22rem_1fr]">
          {/* List */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nome, e-mail, IP, mensagem..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {([
                  { id: "all", label: "Todas" },
                  { id: "unread", label: "Não lidas" },
                  { id: "open", label: "Abertas" },
                  { id: "closed", label: "Fechadas" },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-background/60 text-muted-foreground hover:text-foreground"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-50" />
                  Nenhuma conversa encontrada.
                </div>
              )}
              {filtered.map((c) => {
                const preview = previews[c.id];
                const isActive = activeId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-background/40 ${isActive ? "bg-background/60" : ""}`}
                  >
                    <img
                      src={userAvatar(c.client_email || c.client_name || c.user_id)}
                      alt=""
                      className={`h-9 w-9 shrink-0 rounded-full ring-2 ${c.status === "closed" ? "ring-muted" : "ring-primary/30"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.client_name || c.client_email || `${c.user_id.slice(0, 8)}…`}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatRelative(c.last_message_at)}
                        </span>
                      </div>
                      {c.client_email && c.client_name && (
                        <div className="truncate text-[11px] text-muted-foreground">{c.client_email}</div>
                      )}
                      {preview && (
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold ${preview.sender === "admin" ? "text-primary" : "text-foreground/70"}`}>
                            {preview.sender === "admin" ? "Você:" : ""}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">{preview.body}</span>
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        {c.unread_admin > 0 && (
                          <span className="grid h-4 min-w-[1rem] place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {c.unread_admin}
                          </span>
                        )}
                        {c.status === "closed" && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">Fechada</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {!active ? (
              <div className="grid h-[70vh] place-items-center px-6 text-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <MessageCircle className="h-10 w-10 opacity-40" />
                  Selecione uma conversa para ler e responder.
                </div>
              </div>
            ) : (
              <Thread convo={active} qc={qc} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone?: "primary" | "destructive" }) {
  const toneCls = tone === "destructive" ? "border-destructive/30 bg-destructive/10 text-destructive" : tone === "primary" ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-full border px-3 py-1 ${toneCls}`}>
      <span className="font-bold">{value}</span> <span className="opacity-70">{label}</span>
    </div>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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

  // Typing broadcast (admin <-> user)
  const [userTyping, setUserTyping] = useState(false);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<number | null>(null);
  const lastSent = useRef<number>(0);
  useEffect(() => {
    const ch = supabase.channel(`support-typing-${convo.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, (msg: any) => {
      if (msg?.payload?.from === "user") {
        setUserTyping(true);
        if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
        typingTimeout.current = window.setTimeout(() => setUserTyping(false), 2500);
      }
    });
    ch.subscribe();
    typingChRef.current = ch;
    return () => {
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      supabase.removeChannel(ch);
      typingChRef.current = null;
    };
  }, [convo.id]);
  const broadcastTyping = () => {
    const ch = typingChRef.current;
    if (!ch) return;
    const now = Date.now();
    if (now - lastSent.current < 1500) return;
    lastSent.current = now;
    ch.send({ type: "broadcast", event: "typing", payload: { from: "admin" } });
  };

  const [draft, setDraft] = useState("");
  const sending = useMutation({
    mutationFn: async (body: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from("support_messages")
        .insert({ conversation_id: convo.id, sender: "admin", sender_id: u.user?.id, body })
        .select()
        .single();
      if (error) throw error;
      return inserted as Msg;
    },
    onSuccess: (msg) => {
      setDraft("");
      qc.setQueryData<Msg[]>(["admin-msgs", convo.id], (cur) => {
        const list = cur ?? [];
        if (list.some((x) => x.id === msg.id)) return list;
        return [...list, msg];
      });
      qc.invalidateQueries({ queryKey: ["admin-convos"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao enviar"),
  });

  // Upload image / audio (admin only)
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  async function uploadAndSend(file: File, kind: "image" | "audio") {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (kind === "image" ? "jpg" : "webm");
      const path = `${convo.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("support-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("support-media").getPublicUrl(path);
      const url = pub.publicUrl;
      const body = `[${kind === "image" ? "img" : "audio"}]${url}`;
      sending.mutate(body);
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  // Audio recording
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  async function toggleRecord() {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        setRecording(false);
        await uploadAndSend(file, "audio");
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast.error("Permissão de microfone negada");
    }
  }

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const next = convo.status === "closed" ? "open" : "closed";
      const { error } = await supabase.from("support_conversations").update({ status: next }).eq("id", convo.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next === "closed" ? "Conversa marcada como resolvida" : "Conversa reaberta");
      qc.invalidateQueries({ queryKey: ["admin-convos"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar status"),
  });

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [msgs.length, userTyping]);

  const grouped = useMemo(() => {
    const out: { day: string; items: Msg[] }[] = [];
    for (const m of msgs) {
      const day = new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [msgs]);

  const clientAvatar = userAvatar(convo.client_email || convo.client_name || convo.user_id);

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <img src={clientAvatar} alt="" className="h-10 w-10 shrink-0 rounded-full ring-2 ring-primary/30" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                {convo.client_name || convo.client_email || `Cliente ${convo.user_id.slice(0, 8)}…`}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${convo.status === "closed" ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-500"}`}>
                  {convo.status === "closed" ? "Fechada" : "Aberta"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {convo.client_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{convo.client_email}</span>}
                {convo.client_ip && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{convo.client_ip}</span>}
                <span>Total: {msgs.length} {msgs.length === 1 ? "mensagem" : "mensagens"}</span>
              </div>
              {convo.client_user_agent && (
                <div className="mt-0.5 inline-flex items-center gap-1 truncate text-[10px] text-muted-foreground/70" title={convo.client_user_agent}>
                  <Monitor className="h-3 w-3" />{convo.client_user_agent}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => toggleStatus.mutate()}
            disabled={toggleStatus.isPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background/60 disabled:opacity-50"
          >
            {convo.status === "closed" ? <><RotateCcw className="h-3.5 w-3.5" /> Reabrir</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Encerrar</>}
          </button>
        </div>
      </div>
      <div ref={ref} className="flex-1 space-y-4 overflow-y-auto bg-background/40 p-5">
        {msgsQ.isLoading && <div className="grid place-items-center py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>}
        {grouped.map((g) => (
          <div key={g.day} className="space-y-2.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {g.day}
              <div className="h-px flex-1 bg-border" />
            </div>
            {g.items.map((m) => <AdminBubble key={m.id} m={m} clientAvatar={clientAvatar} />)}
          </div>
        ))}
        {userTyping && (
          <div className="flex items-end gap-2">
            <img src={clientAvatar} alt="" className="h-6 w-6 rounded-full" />
            <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); const v = draft.trim(); if (v && !sending.isPending) sending.mutate(v); }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAndSend(f, "image");
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending.isPending}
          title="Enviar imagem"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleRecord}
          disabled={uploading || sending.isPending}
          title={recording ? "Parar gravação" : "Gravar áudio"}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition disabled:opacity-50 ${recording ? "border-destructive bg-destructive/10 text-destructive animate-pulse" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"}`}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); broadcastTyping(); }}
          placeholder="Resposta para o cliente..."
          className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button type="submit" disabled={!draft.trim() || sending.isPending || uploading} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
          {sending.isPending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function AdminBubble({ m, clientAvatar }: { m: Msg; clientAvatar: string }) {
  const isAdmin = m.sender === "admin";
  const media = parseMedia(m.body);
  return (
    <div className={`flex items-end gap-2 ${isAdmin ? "flex-row-reverse" : ""}`}>
      <img src={isAdmin ? adminAvatar() : clientAvatar} alt="" className="h-7 w-7 shrink-0 rounded-full" />
      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${isAdmin ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground"}`}>
        {media?.kind === "image" ? (
          <a href={media.url} target="_blank" rel="noreferrer">
            <img src={media.url} alt="" className="max-h-56 rounded-lg" />
          </a>
        ) : media?.kind === "audio" ? (
          <audio controls src={media.url} className="max-w-[12rem]" />
        ) : (
          <div className="whitespace-pre-wrap break-words">{m.body}</div>
        )}
        <div className={`mt-1 text-[10px] ${isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function parseMedia(body: string): { kind: "image" | "audio"; url: string } | null {
  const img = body.match(/^\[img\](https?:\/\/\S+)$/);
  if (img) return { kind: "image", url: img[1] };
  const aud = body.match(/^\[audio\](https?:\/\/\S+)$/);
  if (aud) return { kind: "audio", url: aud[1] };
  return null;
}
