import { supabase } from './supabase.service.js';
export async function listFolders(userId) {
    const { data, error } = await supabase
        .from('curiosity_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data ?? [];
}
export async function createFolder(userId, name, emoji, language, logo_data) {
    const { data, error } = await supabase
        .from('curiosity_folders')
        .insert({ user_id: userId, name, emoji, language, logo_data })
        .select()
        .single();
    if (error)
        throw new Error(error.message);
    return data;
}
export async function updateFolder(userId, id, updates) {
    const { data, error } = await supabase
        .from('curiosity_folders')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error)
        throw new Error(error.message);
    return data;
}
export async function deleteFolder(userId, id) {
    const { error } = await supabase
        .from('curiosity_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error)
        throw new Error(error.message);
}
