-- Coluna necessária para o bot Telegram não enviar notificações duplicadas
ALTER TABLE youtube_schedules ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE;
ALTER TABLE scheduled_reels   ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE;
