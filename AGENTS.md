# Architecture rules

- Keep TanStack Start file routing in `src/routes`; every layout renders Outlet and generated route trees stay untouched, because the framework owns routing.
- Use `src/styles.css` as the semantic token source and `src/components/ui` for shared controls, because visual changes must propagate consistently.
- Keep server secrets inside server-function or server-route handlers, because route modules also enter the browser graph and run during SSR.
- Use caller-scoped database access and preserve RLS and admin checks, because knowing an identifier is not authorization.
- Keep production payment paths separate from admin-only sandbox tutorial paths, because customer campaigns must never create test charges.
- Read `docs/SYSTEM.md`, `docs/DESIGN_SYSTEM.md` and `docs/OPERATIONS.md` before changing relevant flows, because the handover distinguishes implementation from unverified hosted settings.
- Treat `supabase/functions` as legacy deployment artifacts; implement new internal server work through TanStack Start, because deployed legacy functions require separate lifecycle management.