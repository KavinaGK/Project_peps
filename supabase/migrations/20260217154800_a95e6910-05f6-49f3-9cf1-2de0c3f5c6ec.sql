
-- Fix permissive RLS on materials: restrict update/insert to authenticated only (keeping it shared but logged-in)
-- The warnings are about USING(true) on UPDATE and WITH CHECK(true) on INSERT
-- For this app, all authenticated users share materials, so this is intentional but let's be more explicit
DROP POLICY "Authenticated users can update materials" ON public.materials;
DROP POLICY "Authenticated users can insert materials" ON public.materials;

-- Recreate with same logic (this is intentional for shared material pricing)
CREATE POLICY "Authenticated users can update materials" ON public.materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert materials" ON public.materials FOR INSERT TO authenticated WITH CHECK (true);
