import { useEffect, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { TrustBar } from "./TrustBar";

import { Starfield } from "./Starfield";
import { SupportChat } from "./SupportChat";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { useSettings } from "@/lib/site-data";
import { setSoundsEnabled } from "@/lib/sound";

export function Layout({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings();
  useEffect(() => {
    if (settings) setSoundsEnabled(!!settings.sounds_enabled);
  }, [settings]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <Starfield />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18)_0%,_transparent_65%)]"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        
        <Header />
        <TrustBar />
        <main key={typeof window !== "undefined" ? window.location.pathname : "ssr"} className="route-fade-in flex-1">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
      <SupportChat />
      <WhatsAppFloat />
    </div>
  );
}
