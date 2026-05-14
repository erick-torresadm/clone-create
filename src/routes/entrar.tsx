import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { BadgeCheck, Eye, EyeOff, Check, X, Info, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — FDM store" },
      { name: "description", content: "Acesse sua conta na FDM store." },
    ],
    links: [{ rel: "canonical", href: "/entrar" }],
  }),
  component: Entrar,
});

function checkPassword(p: string) {
  return {
    length: p.length >= 8,
    letter: /[a-zA-Z]/.test(p),
    number: /\d/.test(p),
  };
}

function strengthScore(c: ReturnType<typeof checkPassword>) {
  return Number(c.length) + Number(c.letter) + Number(c.number);
}

function Entrar() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const checks = useMemo(() => checkPassword(password), [password]);
  const score = strengthScore(checks);
  const canSubmit = mode === "login" ? password.length > 0 : score === 3;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && score < 3) {
      toast.error("Sua senha precisa atender aos requisitos abaixo.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail (se exigido) e entre.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: (redirect as any) || "/admin" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  const strengthLabel = ["Muito fraca", "Fraca", "Boa", "Forte"][score] ?? "";
  const strengthColor =
    score <= 1 ? "bg-red-500" : score === 2 ? "bg-yellow-500" : "bg-emerald-500";

  return (
    <Layout>
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-8">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-xl font-bold text-foreground">FDM store</span>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-center text-2xl font-bold text-foreground">
            {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Acesse sua conta para continuar" : "Leva menos de 1 minuto"}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm text-muted-foreground">Senha</label>
                {mode === "signup" && password && (
                  <span className={`text-[11px] font-medium ${score === 3 ? "text-emerald-600" : score === 2 ? "text-yellow-600" : "text-red-600"}`}>
                    {strengthLabel}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPwd ? "text" : "password"}
                  minLength={mode === "signup" ? 8 : 1}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={mode === "signup" ? "Crie uma senha forte" : "Sua senha"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-11 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {mode === "signup" && (
                <>
                  {password && (
                    <div className="mt-2 flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition ${i < score ? strengthColor : "bg-muted"}`} />
                      ))}
                    </div>
                  )}
                  <ul className="mt-3 space-y-1 rounded-lg bg-muted/40 p-3 text-xs">
                    <Req ok={checks.length} label="Pelo menos 8 caracteres" />
                    <Req ok={checks.letter} label="Pelo menos 1 letra (a-z)" />
                    <Req ok={checks.number} label="Pelo menos 1 número (0-9)" />
                    <li className="mt-2 flex items-start gap-1.5 text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>Dica: use uma frase fácil de lembrar, ex: <code className="rounded bg-background px-1">cafe-com-leite-2026</code></span>
                    </li>
                  </ul>
                </>
              )}
            </div>

            <button
              disabled={loading || !canSubmit}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPassword(""); }}
              className="font-medium text-primary hover:underline">
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 transition ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
      <span>{label}</span>
    </li>
  );
}

