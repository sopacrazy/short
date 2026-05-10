import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vtbqjgmszejuhufljzlk.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6rvsoS0ulgbLDgMFsQCCAQ_JS9QJ-Tp';

export const supabase = createClient(supabaseUrl, supabaseKey);
