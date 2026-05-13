import { supabase } from './supabase.service.js';

export interface CuriosityFolder {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  language: string;
  logo_data: string | null;
  created_at: string;
}

export async function listFolders(userId: string): Promise<CuriosityFolder[]> {
  const { data, error } = await supabase
    .from('curiosity_folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFolder(
  userId: string,
  name: string,
  emoji: string,
  language: string,
  logo_data: string | null,
): Promise<CuriosityFolder> {
  const { data, error } = await supabase
    .from('curiosity_folders')
    .insert({ user_id: userId, name, emoji, language, logo_data })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateFolder(
  userId: string,
  id: string,
  updates: Partial<Pick<CuriosityFolder, 'name' | 'emoji' | 'language' | 'logo_data'>>,
): Promise<CuriosityFolder> {
  const { data, error } = await supabase
    .from('curiosity_folders')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFolder(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('curiosity_folders')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
