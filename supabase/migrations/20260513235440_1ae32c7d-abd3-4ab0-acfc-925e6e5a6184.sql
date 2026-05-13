DROP POLICY IF EXISTS "Admin product images write" ON storage.objects;
DROP POLICY IF EXISTS "Admin product images update" ON storage.objects;
DROP POLICY IF EXISTS "Admin product images delete" ON storage.objects;

CREATE POLICY "Admin product images write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND app_private.is_admin(auth.uid()));

CREATE POLICY "Admin product images update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND app_private.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'product-images' AND app_private.is_admin(auth.uid()));

CREATE POLICY "Admin product images delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND app_private.is_admin(auth.uid()));