import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
let _client = null;
export function getSupabase() {
    if (_client)
        return _client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
        throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórios no .env');
    }
    _client = createClient(url, key, {
        realtime: {
            transport: ws,
        },
    });
    return _client;
}
// Atalho conveniente — exporta proxy que delega ao client lazy
export const supabase = new Proxy({}, {
    get(_target, prop) {
        return getSupabase()[prop];
    },
});
