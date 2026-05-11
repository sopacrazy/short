import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
const email = 'adrinoborges.ti@gmail.com';
const password = 'sopa1988';
async function main() {
    console.log('--- Iniciando Migração SaaS ---');
    // 1. Criar ou Obter Usuário
    console.log(`Criando usuário: ${email}...`);
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    let userId;
    if (userError) {
        console.log('Tentando buscar usuário existente...');
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        const targetUser = users?.users.find(u => u.email === email);
        if (listError || !targetUser) {
            console.error('Erro crítico: Não foi possível criar nem encontrar o usuário:', userError.message);
            return;
        }
        userId = targetUser.id;
        console.log('Usuário encontrado! ID:', userId);
    }
    else {
        userId = userData.user.id;
        console.log('Usuário criado com sucesso! ID:', userId);
    }
    // 2. Migrar dados existentes (onde user_id é NULL)
    console.log('Migrando projetos e pastas órfãos para o novo usuário...');
    const { error: projectError } = await supabase
        .from('projects')
        .update({ user_id: userId })
        .is('user_id', null);
    if (projectError)
        console.error('Erro ao migrar projetos:', projectError.message);
    else
        console.log('Projetos migrados.');
    const { error: folderError } = await supabase
        .from('folders')
        .update({ user_id: userId })
        .is('user_id', null);
    if (folderError)
        console.error('Erro ao migrar pastas:', folderError.message);
    else
        console.log('Pastas migradas.');
    // 3. Cadastrar Chaves de IA
    console.log('Cadastrando chaves de IA iniciais...');
    const cleanKey = (k) => k?.split(/\s|#/)[0] || null;
    const oKey = cleanKey(process.env.OPENAI_API_KEY);
    console.log('OpenAI Key to save:', oKey ? (oKey.substring(0, 15) + '...') : 'null');
    const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
        user_id: userId,
        openai_key: oKey,
        replicate_token: cleanKey(process.env.REPLICATE_API_TOKEN),
        elevenlabs_key: cleanKey(process.env.ELEVENLABS_API_KEY),
        updated_at: new Date().toISOString()
    });
    if (settingsError)
        console.error('Erro ao salvar chaves:', settingsError.message);
    else
        console.log('Chaves cadastradas com sucesso.');
    console.log('\n--- Migração Concluída ---');
    console.log('Usuário:', email);
    console.log('Senha:', password);
}
main();
