// Cliente de API — todas as chamadas ao backend passam por aqui

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
}

export interface ApiFolder {
  id: string;
  name: string;
  emoji: string;
  color: string;
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

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
  }
  return data as T;
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
      fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' }),

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
      opts: { topic: string; niche?: string; voice_tone?: string; narration_speed?: string; previous_hook?: string; previous_title?: string }
    ) =>
      request<GenerateScriptResult>(`/projects/${projectId}/script`, {
        method: 'POST',
        body: JSON.stringify(opts),
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
      }),
    voices: () => request<Voice[]>('/voices'),
  },

  images: {
    // Streaming SSE via fetch — yields eventos por cena conforme geradas
    async *generateStream(projectId: string, visualStyle?: string): AsyncGenerator<ImageGenEvent> {
      const res = await fetch(`${API_BASE}/projects/${projectId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    streamStatus: (projectId: string): EventSource =>
      new EventSource(`${API_BASE}/projects/${projectId}/render/status`),
  },

  folders: {
    list: () => request<ApiFolder[]>('/folders'),
    create: (name: string, emoji: string, color: string) =>
      request<ApiFolder>('/folders', {
        method: 'POST',
        body: JSON.stringify({ name, emoji, color }),
      }),
    update: (id: string, updates: Partial<Pick<ApiFolder, 'name' | 'emoji' | 'color'>>) =>
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

  health: () => request<{ status: string; services: Record<string, boolean> }>('/health'),
};

export interface ThemeSuggestion {
  title: string;
  description: string;
  emoji: string;
  niche: string;
  hook: string;
}
