import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  roleLoading: true,
  signOut: async () => {},
});

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.error("[useAuth] role fetch error", error);
    return false;
  }
  return !!data?.some((r) => r.role === "admin");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const resolveRole = (s: Session | null) => {
      if (!s?.user) {
        setIsAdmin(false);
        setRoleLoading(false);
        return;
      }
      setRoleLoading(true);
      // defer to avoid Supabase deadlock inside auth callback
      setTimeout(async () => {
        const admin = await fetchIsAdmin(s.user.id);
        setIsAdmin(admin);
        setRoleLoading(false);
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      resolveRole(s);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      resolveRole(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      session,
      user: session?.user ?? null,
      isAdmin,
      loading,
      roleLoading,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
