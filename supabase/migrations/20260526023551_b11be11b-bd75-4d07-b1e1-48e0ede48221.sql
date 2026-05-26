-- 1) Fix mutable search_path on existing function
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2) Remove overly-permissive UPDATE/DELETE on chat_conversations (app never updates or deletes them)
DROP POLICY IF EXISTS "Cualquiera puede actualizar conversaciones" ON public.chat_conversations;
DROP POLICY IF EXISTS "Cualquiera puede eliminar conversaciones" ON public.chat_conversations;
