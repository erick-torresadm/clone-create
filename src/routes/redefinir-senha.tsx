import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { BadgeCheck, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — ativosfy" },
      { name: "description", content: "Crie uma nova senha para sua conta ativosfy." },
    ],
    links: [{ rel: "canonical", href: "/redefinir-senha" }],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase coloca o token no hash da URL e dispara o evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(translateAuthError(err?.message, "Erro ao redefinir senha"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 sm:px-6 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-xl font-bold text-foreground">ativosfy</span>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-center text-2xl font-bold text-foreground">Criar nova senha</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {ready ? "Defina uma nova senha para acessar sua conta" : "Validando link de recuperação..."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Nova senha</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPwd ? "text" : "password"}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
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
            </div>

            <button
              disabled={loading || !ready || password.length < 6}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
