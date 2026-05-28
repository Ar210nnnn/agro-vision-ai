
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  location_name text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRACKED PLANTS ============
CREATE TABLE public.tracked_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  species text,
  notes text,
  cover_image text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_plants TO authenticated;
GRANT ALL ON public.tracked_plants TO service_role;

ALTER TABLE public.tracked_plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tracked plants"
  ON public.tracked_plants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tracked plants"
  ON public.tracked_plants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tracked plants"
  ON public.tracked_plants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tracked plants"
  ON public.tracked_plants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_tracked_plants_updated_at
  BEFORE UPDATE ON public.tracked_plants
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_updated_at();

-- ============ PLANT ANALYSES: add new columns ============
ALTER TABLE public.plant_analyses
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN latitude numeric,
  ADD COLUMN longitude numeric,
  ADD COLUMN plant_nickname text,
  ADD COLUMN tracked_plant_id uuid REFERENCES public.tracked_plants(id) ON DELETE SET NULL;

CREATE INDEX idx_plant_analyses_user_id ON public.plant_analyses(user_id);
CREATE INDEX idx_plant_analyses_tracked_plant ON public.plant_analyses(tracked_plant_id);

-- Replace previous policies with per-user policies + legacy anon access
DROP POLICY IF EXISTS "Los análisis son visibles para todos" ON public.plant_analyses;
DROP POLICY IF EXISTS "Permitir crear análisis" ON public.plant_analyses;

CREATE POLICY "Users view own or legacy analyses"
  ON public.plant_analyses FOR SELECT
  USING (
    user_id IS NULL  -- legacy/anonymous analyses remain visible
    OR auth.uid() = user_id
  );

CREATE POLICY "Anyone can insert analyses"
  ON public.plant_analyses FOR INSERT
  WITH CHECK (
    user_id IS NULL  -- guests can still create anonymous analyses
    OR auth.uid() = user_id
  );

CREATE POLICY "Users update own analyses"
  ON public.plant_analyses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own analyses"
  ON public.plant_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
