export type SingleOut = { headline: string; description: string; primaryText: string };
export type CarouselOut = { id: number; options: Array<{ headline: string; description: string }> };

export class LLMClient {
  private static _inst: LLMClient | null = null;
  static instance() {
    if (!LLMClient._inst) LLMClient._inst = new LLMClient();
    return LLMClient._inst;
  }

  private worker: Worker | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;

  private ensureWorker() {
    if (this.worker) return;
    // Webpack/Next pattern to bundle the worker
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.worker = new Worker(new URL('../../workers/llmWorker.ts', import.meta.url), { type: 'module' });
  }

  async init(modelPath?: string) {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;
    this.ensureWorker();
    this.initPromise = new Promise<void>((resolve) => {
      const w = this.worker!;
      const onMsg = (ev: MessageEvent) => {
        const d = ev.data as { type: string; engine?: string };
        if (d?.type === 'ready') {
          this.ready = true;
          w.removeEventListener('message', onMsg as any);
          resolve();
        }
      };
      w.addEventListener('message', onMsg as any);
      w.postMessage({ type: 'init', modelPath });
    });
    return this.initPromise;
  }

  async generateSingle(params: { title?: string; description?: string; base?: string }): Promise<SingleOut[]> {
    await this.init();
    const w = this.worker!;
    return new Promise((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        const d = ev.data as any;
        if (d?.type === 'single-options') {
          w.removeEventListener('message', onMsg as any);
          resolve(d.options as SingleOut[]);
        } else if (d?.type === 'error') {
          w.removeEventListener('message', onMsg as any);
          reject(new Error(d.message));
        }
      };
      w.addEventListener('message', onMsg as any);
      w.postMessage({ type: 'generate-single', payload: params });
    });
  }

  async generateCarousel(params: { items: Array<{ id: number; title?: string; city?: string; priceText?: string }>; base?: string }): Promise<CarouselOut[]> {
    await this.init();
    const w = this.worker!;
    return new Promise((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        const d = ev.data as any;
        if (d?.type === 'carousel-options') {
          w.removeEventListener('message', onMsg as any);
          resolve(d.options as CarouselOut[]);
        } else if (d?.type === 'error') {
          w.removeEventListener('message', onMsg as any);
          reject(new Error(d.message));
        }
      };
      w.addEventListener('message', onMsg as any);
      w.postMessage({ type: 'generate-carousel', payload: params });
    });
  }
}

export default LLMClient;

