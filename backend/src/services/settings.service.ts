import { supabase } from './supabase.service.js';

export interface UserAIKeys {
  openai_key: string | null;
  replicate_token: string | null;
  elevenlabs_key: string | null;
}

export async function getUserAIKeys(userId: string): Promise<UserAIKeys> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('openai_key, replicate_token, elevenlabs_key')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { openai_key: null, replicate_token: null, elevenlabs_key: null };
    }

    const keys = {
      openai_key: data.openai_key || null,
      replicate_token: data.replicate_token || null,
      elevenlabs_key: data.elevenlabs_key || null,
    };

    return keys;
  } catch (err) {
    return { openai_key: null, replicate_token: null, elevenlabs_key: null };
  }
}
