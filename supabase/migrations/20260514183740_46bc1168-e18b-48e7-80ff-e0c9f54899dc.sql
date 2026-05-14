INSERT INTO public.sections (title, emoji, sort_order, active)
SELECT 'Promoções', '🔥', -10, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.sections WHERE lower(title) LIKE '%promo%' OR lower(title) LIKE '%oferta%'
);