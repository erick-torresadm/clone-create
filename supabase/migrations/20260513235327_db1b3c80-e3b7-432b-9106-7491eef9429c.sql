-- Move role helpers to a non-exposed schema and tighten public execution
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT app_private.has_role(_user_id, 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated;

-- Public helper functions are no longer callable from the API
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- user_roles policies
DROP POLICY IF EXISTS "Roles: admin manage" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: view own or admin" ON public.user_roles;
CREATE POLICY "Roles: view own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Roles: admin manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

-- profiles policies
DROP POLICY IF EXISTS "Profiles: view own or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: view own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
CREATE POLICY "Profiles: admin view"
ON public.profiles
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Profiles: update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- products policies
DROP POLICY IF EXISTS "Products admin write" ON public.products;
DROP POLICY IF EXISTS "Products public read" ON public.products;
CREATE POLICY "Products public read active"
ON public.products
FOR SELECT
TO anon, authenticated
USING (active = true);
CREATE POLICY "Products admin read all"
ON public.products
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Products admin write"
ON public.products
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

-- sections policies
DROP POLICY IF EXISTS "Sections admin write" ON public.sections;
DROP POLICY IF EXISTS "Sections public read" ON public.sections;
CREATE POLICY "Sections public read active"
ON public.sections
FOR SELECT
TO anon, authenticated
USING (active = true);
CREATE POLICY "Sections admin read all"
ON public.sections
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Sections admin write"
ON public.sections
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

-- site_settings policies
DROP POLICY IF EXISTS "Settings admin write" ON public.site_settings;
DROP POLICY IF EXISTS "Settings public read" ON public.site_settings;
CREATE POLICY "Settings public read"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "Settings admin write"
ON public.site_settings
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

-- coupons policies
DROP POLICY IF EXISTS "Coupons admin write" ON public.coupons;
DROP POLICY IF EXISTS "Coupons public read active" ON public.coupons;
CREATE POLICY "Coupons public read active"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (active = true);
CREATE POLICY "Coupons admin read all"
ON public.coupons
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Coupons admin write"
ON public.coupons
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

-- popups policies
DROP POLICY IF EXISTS "Popups admin write" ON public.popups;
DROP POLICY IF EXISTS "Popups public read active" ON public.popups;
CREATE POLICY "Popups public read active"
ON public.popups
FOR SELECT
TO anon, authenticated
USING ((active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now())));
CREATE POLICY "Popups admin read all"
ON public.popups
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Popups admin write"
ON public.popups
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

-- orders policies
DROP POLICY IF EXISTS "Orders: admin update" ON public.orders;
DROP POLICY IF EXISTS "Orders: insert own" ON public.orders;
DROP POLICY IF EXISTS "Orders: own or admin read" ON public.orders;
CREATE POLICY "Orders: read own"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Orders: admin read"
ON public.orders
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Orders: insert own"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id IS NULL) OR (user_id = auth.uid())));
CREATE POLICY "Orders: admin update"
ON public.orders
FOR UPDATE
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));