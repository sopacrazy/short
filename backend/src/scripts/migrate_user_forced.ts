import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name: string): string | null {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!match) return null;
  return match[1].split(/\s|#/)[0].trim();
}

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const email = 'adrinoborges.ti@gmail.com';
const password = 'sopa1988';

async function main() {
  console.log('--- Iniciando Migração SaaS (Forced .env Read) ---');

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  let userId: string;

  if (userError) {
    console.log('Buscando usuário existente...');
    const { data: users } = await supabase.auth.admin.listUsers();
    userId = users?.users.find(u => u.email === email)?.id!;
  } else {
    userId = userData.user!.id;
  }

  console.log('ID do Usuário:', userId);

  const openai_key = getEnvVar('OPENAI_API_KEY');
  const replicate_token = getEnvVar('REPLICATE_API_TOKEN');
  const elevenlabs_key = getEnvVar('ELEVENLABS_API_KEY');

  console.log('OpenAI Key detected:', openai_key?.substring(0, 15) + '...');

  await supabase.from('projects').update({ user_id: userId }).is('user_id', null);
  await supabase.from('folders').update({ user_id: userId }).is('user_id', null);

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      openai_key,
      replicate_token,
      elevenlabs_key,
      updated_at: new Date().toISOString()
    });

  if (error) console.error('Erro:', error.message);
  else console.log('Migração concluída com sucesso!');
}

main();
