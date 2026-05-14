import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Full-screen animated background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bg-animated-mesh" />
        <div className="bg-animated-grid" />
        <div className="aurora-blob aurora-blob-1 left-[5%] top-[5%] h-[40vw] max-h-96 w-[40vw] max-w-96" />
        <div className="aurora-blob aurora-blob-2 right-[5%] top-[20%] h-[45vw] max-h-[28rem] w-[45vw] max-w-[28rem]" />
        <div className="aurora-blob aurora-blob-3 left-[35%] top-[55%] h-[35vw] max-h-80 w-[35vw] max-w-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,140,255,0.18)_0%,_transparent_60%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <PaymentTestModeBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
    </div>
  );
}
