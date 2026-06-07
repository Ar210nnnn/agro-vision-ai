
-- 1) Tighten plant_analyses: remove public/legacy access
DROP POLICY IF EXISTS "Anyone can insert analyses" ON public.plant_analyses;
DROP POLICY IF EXISTS "Users view own or legacy analyses" ON public.plant_analyses;

CREATE POLICY "Users insert own analyses"
ON public.plant_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own analyses"
ON public.plant_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) Lock down Realtime broadcast for chat: only owners of a conversation
--    can subscribe to its channel topic (chat-<conversation_id>).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat owners can subscribe to own conversation channels" ON realtime.messages;

CREATE POLICY "Chat owners can subscribe to own conversation channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'chat-%')
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id::text = substring(realtime.topic() from 6)
      AND c.user_id = auth.uid()
  )
);
