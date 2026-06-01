
-- 1. Add ownership to chat tables
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS user_id uuid;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Cualquiera puede crear conversaciones" ON public.chat_conversations;
DROP POLICY IF EXISTS "Cualquiera puede ver conversaciones" ON public.chat_conversations;
DROP POLICY IF EXISTS "Cualquiera puede crear mensajes" ON public.chat_messages;
DROP POLICY IF EXISTS "Cualquiera puede ver mensajes" ON public.chat_messages;

-- New scoped policies on chat_conversations
CREATE POLICY "Users view own conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations" ON public.chat_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.chat_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON public.chat_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- New scoped policies on chat_messages (via conversation ownership)
CREATE POLICY "Users view messages in own conversations" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_conversations c
            WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Users insert messages in own conversations" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_conversations c
            WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid())
  );

-- Revoke anon on chat tables
REVOKE ALL ON public.chat_conversations FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

-- 2. Profiles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.profiles FROM anon;

-- 3. Lock down SECURITY DEFINER trigger functions from API execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_updated_at() FROM anon, authenticated, public;
