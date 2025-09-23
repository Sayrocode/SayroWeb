export type GenerateMode = 'single' | 'carousel';
export type Locale = 'es' | 'en';
export type Model = 'gpt-4o-mini' | 'gpt-4.1-mini';

export type AdVariant = { title: string; description: string };
export type AdIdeasItem = { id: string; variants: AdVariant[] };

export type GenerateParams = {
  mode: GenerateMode;
  propertyIds: string[];
  locale?: Locale;
  model?: Model;
  temperature?: number;
  top_p?: number;
};

export type GenerateResponse = {
  ok: true;
  items: AdIdeasItem[];
  missing?: string[];
  latency_ms?: number;
  usage?: any;
  model: Model;
  locale: Locale;
  temperature: number;
  top_p: number;
} | { ok: false; error: string };

export async function generateAdIdeas(params: GenerateParams): Promise<GenerateResponse> {
  const r = await fetch('/api/admin/meta/generate-ad-ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const j = await r.json();
  if (!r.ok || !j?.ok) return { ok: false, error: j?.error || 'generation_failed' } as any;
  return j;
}

export default generateAdIdeas;

