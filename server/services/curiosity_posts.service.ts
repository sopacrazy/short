import { supabase } from './supabase.service.js';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface CuriosityPostRecord {
  id: string;
  user_id: string;
  folder_id?: string | null;
  title_white: string;
  title_yellow: string;
  description: string;
  cta: string;
  caption: string;
  hashtags: string[];
  image_prompt?: string | null;
  image_url?: string | null;
  composed_image_path?: string | null;
  status: PostStatus;
  error_message?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  instagram_post_id?: string | null;
  instagram_post_url?: string | null;
  created_at: string;
  updated_at: string;
}

export async function createCuriosityPost(
  userId: string,
  data: Partial<CuriosityPostRecord>,
): Promise<CuriosityPostRecord> {
  const { data: post, error } = await supabase
    .from('curiosity_posts')
    .insert({ ...data, user_id: userId, status: data.status ?? 'draft' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return post;
}

export async function updateCuriosityPost(
  id: string,
  userId: string,
  data: Partial<CuriosityPostRecord>,
): Promise<CuriosityPostRecord> {
  const { data: post, error } = await supabase
    .from('curiosity_posts')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return post;
}

export async function listCuriosityPosts(
  userId: string,
  status?: PostStatus,
): Promise<CuriosityPostRecord[]> {
  let query = supabase
    .from('curiosity_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) query = (query as any).eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteCuriosityPost(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('curiosity_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// Busca posts agendados cujo horário já chegou
export async function getScheduledPostsDue(): Promise<CuriosityPostRecord[]> {
  const { data, error } = await supabase
    .from('curiosity_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getComposedImagePublicUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from('videos').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Não foi possível gerar URL da imagem agendada');
  return data.publicUrl;
}
