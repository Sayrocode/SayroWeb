/*
  Minimal WebWorker scaffold to host a WASM LLM. For now, it falls back to a
  lightweight JS template generator but keeps the init/generate protocol so you
  can drop a real model.wasm under /public/llm and wire it in later.
*/

export type LlmInitMsg = { type: 'init'; modelPath?: string };
export type LlmGenerateSingleMsg = {
  type: 'generate-single';
  payload: { title?: string; description?: string; base?: string };
};
export type LlmGenerateCarouselMsg = {
  type: 'generate-carousel';
  payload: { items: Array<{ id: number; title?: string; city?: string; priceText?: string }>; base?: string };
};
export type LlmReq = LlmInitMsg | LlmGenerateSingleMsg | LlmGenerateCarouselMsg;

export type LlmResp =
  | { type: 'ready'; engine: 'wasm' | 'js-fallback' }
  | { type: 'single-options'; options: Array<{ headline: string; description: string; primaryText: string }> }
  | { type: 'carousel-options'; options: Array<{ id: number; options: Array<{ headline: string; description: string }> }> }
  | { type: 'error'; message: string };

declare const self: DedicatedWorkerGlobalScope;

let engine: 'wasm' | 'js-fallback' = 'js-fallback';

async function tryLoadWasm(modelPath: string): Promise<boolean> {
  try {
    // Placeholder: Attempt to fetch model; if present, mark engine as wasm.
    const res = await fetch(modelPath, { method: 'GET' });
    if (!res.ok) return false;
    // Here you would instantiate your wasm and keep an instance for generation.
    // const bytes = await res.arrayBuffer();
    // const wasm = await WebAssembly.instantiate(bytes, imports);
    // store wasm.instance in module scope and use it in generate.
    return true;
  } catch {
    return false;
  }
}

function pick<T>(arr: T[], n = 1): T[] {
  const a = [...arr];
  const out: T[] = [];
  while (out.length < n && a.length) {
    out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  }
  return out;
}

function formatPrice(p?: string) {
  return p ? `Desde ${p}` : '';
}

function genSingleFallback(base?: string, ctx?: { title?: string; city?: string; priceText?: string }) {
  const hooks = [
    '¡Descubre tu próximo hogar!',
    'Vive donde siempre soñaste ✨',
    'Ubicación privilegiada y gran plusvalía',
    'Conecta con tu nueva etapa 🏡',
    'Diseño, confort y estilo',
  ];
  const emojis = ['🏡', '✨', '✅', '📍', '🔑', '🌿', '💫'];
  const city = ctx?.city ? ` en ${ctx.city}` : '';
  const price = formatPrice(ctx?.priceText);
  const baseText = base?.trim() || `Opción destacada${city}`;
  const [h] = pick(hooks, 1);
  const [e1, e2] = pick(emojis, 2);
  const headline = `${e1} ${ctx?.title || 'Gran oportunidad'} ${e2}`.slice(0, 60);
  const description = `${h}. ${price}`.trim().slice(0, 90);
  const primaryText = `${baseText}. ${h}. ${price}`.trim().slice(0, 125);
  return { headline, description, primaryText };
}

function genCarouselItemFallback(base?: string, ctx?: { title?: string; city?: string; priceText?: string }) {
  const starts = ['Moderna', 'Amplia', 'Elegante', 'Cálida', 'Lumínica'];
  const features = ['ubicación', 'amenidades', 'conectividad', 'plusvalía', 'vista'];
  const [s] = pick(starts, 1);
  const [f] = pick(features, 1);
  const city = ctx?.city ? ` en ${ctx.city}` : '';
  const title = `${s} propiedad${city}`.slice(0, 60);
  const desc = `${base || 'Conoce esta opción'}: gran ${f}. ${formatPrice(ctx?.priceText)}`.slice(0, 90);
  return { headline: title, description: desc };
}

self.onmessage = async (ev: MessageEvent<LlmReq>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'init') {
      const ok = await tryLoadWasm(msg.modelPath || '/llm/model.wasm');
      engine = ok ? 'wasm' : 'js-fallback';
      const resp: LlmResp = { type: 'ready', engine };
      self.postMessage(resp);
      return;
    }
    if (msg.type === 'generate-single') {
      // TODO: route to wasm when integrated
      const out = Array.from({ length: 5 }).map(() => genSingleFallback(msg.payload.base));
      const resp: LlmResp = { type: 'single-options', options: out };
      self.postMessage(resp);
      return;
    }
    if (msg.type === 'generate-carousel') {
      const items = (msg.payload.items || []).map((it) => ({
        id: it.id,
        options: Array.from({ length: 5 }).map(() => genCarouselItemFallback(msg.payload.base, { title: it.title, city: it.city, priceText: it.priceText })),
      }));
      const resp: LlmResp = { type: 'carousel-options', options: items };
      self.postMessage(resp);
      return;
    }
  } catch (e: any) {
    const resp: LlmResp = { type: 'error', message: e?.message || String(e) };
    self.postMessage(resp);
  }
};

