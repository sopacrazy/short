import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function cleanup() {
  console.log('Limpando todas as chaves de todos os usuários...');
  const { data: settings } = await supabase.from('user_settings').select('*');
  
  if (!settings) return;

  const clean = (k: string | null) => k ? k.split(/\s|#/)[0].trim() : null;

  for (const s of settings) {
    console.log(`Limpando usuário: ${s.user_id}`);
    await supabase.from('user_settings').update({
      openai_key: clean(s.openai_key),
      replicate_token: clean(s.replicate_token),
      elevenlabs_key: clean(s.elevenlabs_key)
    }).eq('user_id', s.user_id);
  }
  
  console.log('Limpeza concluída.');
}

cleanup();
