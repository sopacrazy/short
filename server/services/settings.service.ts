import { supabase } from './supabase.service.js';

export interface UserAIKeys {
  openai_key: string | null;
  replicate_token: string | null;
  elevenlabs_key: string | null;
}

/**
 * Retorna as chaves de IA. 
 * Agora configurado para usar apenas as chaves do .env (globais).
 */
export async function getUserAIKeys(userId: string): Promise<UserAIKeys> {
  return {
    openai_key: process.env.OPENAI_API_KEY || null,
    replicate_token: process.env.REPLICATE_API_TOKEN || null,
    elevenlabs_key: process.env.ELEVENLABS_API_KEY || null,
  };
}
