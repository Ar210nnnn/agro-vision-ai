-- Crear tabla para conversaciones del chat
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para mensajes del chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para conversaciones (acceso público para demo)
CREATE POLICY "Cualquiera puede ver conversaciones" 
ON public.chat_conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Cualquiera puede crear conversaciones" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Cualquiera puede actualizar conversaciones" 
ON public.chat_conversations 
FOR UPDATE 
USING (true);

CREATE POLICY "Cualquiera puede eliminar conversaciones" 
ON public.chat_conversations 
FOR DELETE 
USING (true);

-- Políticas para mensajes (acceso público para demo)
CREATE POLICY "Cualquiera puede ver mensajes" 
ON public.chat_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Cualquiera puede crear mensajes" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Trigger para actualizar updated_at en conversaciones
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_updated_at();

-- Habilitar realtime para mensajes del chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;