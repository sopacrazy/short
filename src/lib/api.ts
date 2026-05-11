// Cliente de API — todas as chamadas ao backend passam por aqui
import { supabase } from './supabase';

export interface ImageGenEvent {
  type: 'started' | 'generating' | 'scene_done' | 'scene_error' | 'completed';
  total?: number;
  completed?: number;
  scene_number?: number;
  scene_id?: string;
  image_url?: string;
  error?: string;
  message?: string;
  results?: Array<{ scene_number: number; image_url: string | null; error?: string }>;
  success?: boolean;
}

export interface ApiScript {
  id: string;
  project_id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  duration_seconds: number;
  voice_tone: string;
  narration_speed: string;
}

export interface ApiScene {
  id: string;
  project_id: string;
  scene_number: number;
  description: string;
  image_prompt: string;
  image_url: string | null;
  duration_seconds: number;
}

export interface ApiMetadata {
  video_title: string;
  description: string;
  hashtags: string[];
  video_url?: string | null;
  thumbnail_url?: string | null;
  end_card_url?: string | null;
  soundtrack_url?: string | null;
  music_volume?: number;
  youtube_url?: string | null;
}

export interface ApiProject {
  id: string;
  title: string | null;
  topic: string;
  niche: string | null;
  status: string;
  created_at: string;
  thumbnail_url?: string | null;
  folder_id?: string | null;
  youtube_url?: string | null;
}

export interface ApiFolder {
  id: string;
  name: string;
  emoji: string;
  color: string;
  default_voice_id: string | null;
  default_language: string | null;
  default_youtube_tags: string[];
  created_at: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
}

export interface GenerateScriptResult {
  script: ApiScript;
  scenes: ApiScene[];
  metadata: ApiMetadata;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  const authHeader = await getAuthHeader();
  const timeout = options?.timeout ?? 60000; // Padrão de 60 segundos

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options?.headers,
      },
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
    }
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('A requisição demorou muito e foi interrompida (Timeout)');
    }
    throw err;
  }
}

export const api = {
  projects: {
    list: (folderId?: string | 'none') =>
      request<ApiProject[]>(`/projects${folderId ? `?folder_id=${folderId}` : ''}`),

    moveToFolder: (id: string, folderId: string | null) =>
      request<ApiProject>(`/projects/${id}/folder`, {
        method: 'PATCH',
        body: JSON.stringify({ folder_id: folderId }),
      }),

    create: (topic: string, niche?: string) =>
      request<ApiProject>('/projects', {
        method: 'POST',
        body: JSON.stringify({ topic, niche }),
      }),

    get: (id: string) =>
      request<{
        project: ApiProject;
        script: ApiScript | null;
        scenes: ApiScene[];
        narration: unknown | null;
        metadata: ApiMetadata | null;
      }>(`/projects/${id}`),

    delete: (id: string) =>
      request(`/projects/${id}`, { method: 'DELETE' }),

    uploadEndCard: (id: string, imageBase64: string, mimeType: string) =>
      request<{ url: string }>(`/projects/${id}/endcard`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mimeType }),
      }),

    generateThumbnail: (id: string) =>
      request<{ thumbnail_url: string }>(`/projects/${id}/thumbnail`, { method: 'POST' }),
  },

  scripts: {
    generate: (
      projectId: string,
      opts: { topic: string; niche?: string; voice_tone?: string; narration_speed?: string; previous_hook?: string; previous_title?: string; language?: string }
    ) =>
      request<GenerateScriptResult>(`/projects/${projectId}/script`, {
        method: 'POST',
        body: JSON.stringify(opts),
        timeout: 120000,
      }),

    update: (
      projectId: string,
      updates: Partial<Pick<ApiScript, 'title' | 'hook' | 'body' | 'cta'>>
    ) =>
      request<ApiScript>(`/projects/${projectId}/script`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
  },

  narration: {
    generate: (projectId: string, voiceId?: string, speed?: number) =>
      request(`/projects/${projectId}/narration`, {
        method: 'POST',
        body: JSON.stringify({ voice_id: voiceId, speed }),
        timeout: 120000,
      }),
    voices: () => request<Voice[]>('/voices'),
  },

  images: {
    // Streaming SSE via fetch — yields eventos por cena conforme geradas
    async *generateStream(projectId: string, visualStyle?: string): AsyncGenerator<ImageGenEvent> {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};

      const res = await fetch(`${API_BASE}/projects/${projectId}/images`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ visual_style: visualStyle }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((err as { error?: string }).error ?? `Erro ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { yield JSON.parse(line.slice(6)) as ImageGenEvent; } catch { /* ignore */ }
          }
        }
      }
    },

    regenerate: (projectId: string, sceneId: string, visualStyle?: string) =>
      request<ApiScene>(`/projects/${projectId}/images/${sceneId}`, {
        method: 'POST',
        body: JSON.stringify({ visual_style: visualStyle }),
      }),

    upload: (projectId: string, sceneId: string, imageBase64: string, mimeType: string) =>
      request<ApiScene>(`/projects/${projectId}/images/${sceneId}/upload`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mimeType }),
      }),

    // Alias para retrocompatibilidade — usa o stream internamente e retorna ao final
    generateAll: async (projectId: string, visualStyle?: string) => {
      const gen = api.images.generateStream(projectId, visualStyle);
      let last: ImageGenEvent = { type: 'completed' };
      for await (const evt of gen) { last = evt; }
      return last as { results: Array<{ scene_number: number; image_url: string | null }>; success: boolean };
    },
  },

  render: {
    start: (projectId: string) =>
      request<{ message: string; videoUrl?: string; queue?: object }>(
        `/projects/${projectId}/render`,
        { method: 'POST' }
      ),

    // Abre SSE stream — retorna EventSource já conectado
    streamStatus: (projectId: string): EventSource => {
      const { data: { session } } = (supabase.auth as any).internal?._getSession() || { data: { session: null } };
      // Fallback: busca síncrona do cache do SDK se possível, ou apenas tenta sem token (falhará se protegido)
      // O Supabase SDK mantém a sessão no localStorage.
      const token = (supabase.auth as any).session?.()?.access_token; 
      
      // Tentativa mais segura:
      const currentSession = JSON.parse(localStorage.getItem(`sb-${import.meta.env.VITE_SUPABASE_ID || 'vtbqjgmszejuhufljzlk'}-auth-token`) || 'null');
      const accessToken = currentSession?.access_token;

      return new EventSource(`${API_BASE}/projects/${projectId}/render/status${accessToken ? `?token=${accessToken}` : ''}`);
    },
  },

  folders: {
    list: () => request<ApiFolder[]>('/folders'),
    get: (id: string) => request<ApiFolder>(`/folders/${id}`),
    create: (name: string, emoji: string, color: string, defaultVoiceId?: string, defaultLanguage?: string, defaultYoutubeTags?: string[]) =>
      request<ApiFolder>('/folders', {
        method: 'POST',
        body: JSON.stringify({ name, emoji, color, default_voice_id: defaultVoiceId ?? null, default_language: defaultLanguage ?? 'pt', default_youtube_tags: defaultYoutubeTags ?? [] }),
      }),
    update: (id: string, updates: Partial<Pick<ApiFolder, 'name' | 'emoji' | 'color' | 'default_voice_id' | 'default_language' | 'default_youtube_tags'>>) =>
      request<ApiFolder>(`/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetch(`${API_BASE}/folders/${id}`, { method: 'DELETE' }),
  },

  topics: {
    suggestions: (query: string, count = 5) =>
      request<ThemeSuggestion[]>('/topics/suggestions', {
        method: 'POST',
        body: JSON.stringify({ query, count }),
      }),
  },

  music: {
    search: async (query: string) => {
      const CLIENT_ID = '56d3047d'; 
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=15&order=popularity_total&search=${encodeURIComponent(query)}`;
      
      const wrap = (u: string) => `/api/proxy/audio?url=${encodeURIComponent(u)}`;

      const FALLBACK_TRACKS = [
        { id: 'f1', title: 'Inspiring Cinematic', url: wrap('https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3'), duration: 145, preview: wrap('https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3') },
        { id: 'f2', title: 'Epic Adventure', url: wrap('https://cdn.pixabay.com/download/audio/2022/03/23/audio_0739989635.mp3'), duration: 180, preview: wrap('https://cdn.pixabay.com/download/audio/2022/03/23/audio_0739989635.mp3') },
        { id: 'f3', title: 'Lofi Chill Beats', url: wrap('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808f3030e.mp3'), duration: 120, preview: wrap('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808f3030e.mp3') },
        { id: 'f4', title: 'Suspense Dark Ambient', url: wrap('https://cdn.pixabay.com/download/audio/2022/02/15/audio_273111f625.mp3'), duration: 210, preview: wrap('https://cdn.pixabay.com/download/audio/2022/02/15/audio_273111f625.mp3') },
        { id: 'f5', title: 'Modern Corporate', url: wrap('https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e017d.mp3'), duration: 155, preview: wrap('https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e017d.mp3') }
      ];

      try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.results || data.results.length === 0) {
          return FALLBACK_TRACKS.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || query.length < 3);
        }

        return data.results.map((track: any) => ({
          id: track.id,
          title: track.name,
          url: wrap(track.audio),
          duration: track.duration,
          preview: wrap(track.audio)
        }));
      } catch (err) {
        console.error('Erro no Jamendo, usando backup:', err);
        return FALLBACK_TRACKS;
      }
    },
    
    save: (projectId: string, soundtrackUrl: string, volume: number = 0.15) =>
      request(`/projects/${projectId}/soundtrack`, {
        method: 'POST',
        body: JSON.stringify({ soundtrack_url: soundtrackUrl, music_volume: volume })
      })
  },

  youtube: {
    status: () => request<{ connected: boolean }>('/youtube/status'),
    getAuthUrl: () => request<{ url: string }>('/youtube/auth'),
    upload: (projectId: string, scheduledAt?: string) =>
      request<{ youtube_url: string }>('/youtube/upload', {
        method: 'POST',
        body: JSON.stringify({ projectId, scheduledAt }),
      }),
  },

  health: () => request<{ status: string; services: Record<string, boolean> }>('/health'),
  getBaseUrl: () => API_BASE.replace(/\/api$/, ''),
};

export interface ThemeSuggestion {
  title: string;
  description: string;
  emoji: string;
  niche: string;
  hook: string;
}
