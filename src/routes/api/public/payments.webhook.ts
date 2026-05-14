import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fulfillBySessionId } from "@/lib/checkout.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env: StripeEnv = url.searchParams.get("env") === "live" ? "live" : "sandbox";
        const secret =
          env === "live"
            ? process.env.PAYMENTS_LIVE_WEBHOOK_SECRET
            : process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
        if (!secret) {
          console.error(`[webhook] missing webhook secret for env=${env}`);
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const stripe = createStripeClient(env);

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, secret);
        } catch (err: any) {
          console.error(`[webhook] signature verification failed: ${err?.message}`);
          return new Response(`Invalid signature: ${err?.message}`, { status: 400 });
        }

        try {
          const handled = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
          if (handled.includes(event.type)) {
            const session: any = event.data.object;
            const sessionId: string | undefined = session?.id;
            if (sessionId) {
              console.log(`[webhook] ${event.type} session=${sessionId} env=${env}`);
              // Mark order paid first so polling clients see progress immediately
              await supabaseAdmin
                .from("orders")
                .update({ status: "paid" })
                .eq("stripe_session_id", sessionId)
                .eq("status", "pending");
              // Then fulfill (claim stock or buy from MaxVia)
              await fulfillBySessionId(sessionId, env).catch((e) =>
                console.error(`[webhook] fulfill error: ${e?.message}`),
              );
            }
          } else if (event.type === "checkout.session.async_payment_failed") {
            const session: any = event.data.object;
            await supabaseAdmin
              .from("orders")
              .update({ status: "canceled" })
              .eq("stripe_session_id", session?.id);
          }
        } catch (e: any) {
          console.error(`[webhook] handler error: ${e?.message}`);
        }

        return Response.json({ received: true });
      },
    },
  },
});
