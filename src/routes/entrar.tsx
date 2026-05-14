import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";
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

function Entrar() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
            {mode === "login" ? "Acesse sua conta para continuar" : "O primeiro cadastro vira admin"}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">E-mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Senha</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" minLength={6}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110 disabled:opacity-60">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-medium text-primary hover:underline">
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}
