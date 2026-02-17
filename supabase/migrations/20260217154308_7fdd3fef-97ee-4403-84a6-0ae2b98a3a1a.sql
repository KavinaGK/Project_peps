
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Materials table
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  material text NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view materials" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update materials" ON public.materials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert materials" ON public.materials FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default materials
INSERT INTO public.materials (category, material, unit, rate) VALUES
  ('Spring', 'Bonnell', 'per unit', 18),
  ('Spring', 'Pocketed', 'per unit', 22),
  ('Steel', 'Steel Wire', 'per kg', 85),
  ('Foam', 'PU Foam', 'per kg', 220),
  ('Foam', 'HR Foam', 'per kg', 260),
  ('Coir', 'Rubberized Coir', 'per kg', 180),
  ('Fabric', 'Jacquard Fabric', 'per meter', 160),
  ('Glue', 'Synthetic Glue', 'per liter', 120);

-- Costing configurations table
CREATE TABLE public.costing_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mattress_type text NOT NULL DEFAULT 'Single',
  costing_type text NOT NULL DEFAULT 'Standard',
  type text NOT NULL DEFAULT 'Standard',
  category text NOT NULL DEFAULT 'Spring Mattress',
  size text NOT NULL DEFAULT '8 inch',
  custom_dimensions boolean NOT NULL DEFAULT true,
  length_in numeric NOT NULL DEFAULT 78,
  width_in numeric NOT NULL DEFAULT 60,
  foam_type text NOT NULL DEFAULT 'HR Foam',
  foam_density numeric NOT NULL DEFAULT 40,
  spring_type text NOT NULL DEFAULT 'Pocketed',
  spring_density numeric NOT NULL DEFAULT 40,
  coir_type text NOT NULL DEFAULT 'Rubberized Coir',
  fabric_type text NOT NULL DEFAULT 'Jacquard Fabric',
  glue_type text NOT NULL DEFAULT 'Synthetic Glue',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.costing_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own configs" ON public.costing_configs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Costing results table
CREATE TABLE public.costing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  config_id uuid REFERENCES public.costing_configs(id) ON DELETE CASCADE NOT NULL,
  cost_items jsonb NOT NULL DEFAULT '[]',
  total_material_cost numeric NOT NULL DEFAULT 0,
  labour_overhead numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  profit_percent numeric NOT NULL DEFAULT 20,
  profit numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.costing_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own results" ON public.costing_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
