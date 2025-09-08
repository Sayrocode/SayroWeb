// Lightweight Meta Pixel helper
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

export function fbq(...args: any[]) {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (typeof w.fbq === 'function') w.fbq.apply(window, args);
}

export function trackPageView() {
  if (!FB_PIXEL_ID) return;
  fbq('track', 'PageView');
}

export function trackViewContent(data?: Record<string, any>) {
  if (!FB_PIXEL_ID) return;
  fbq('track', 'ViewContent', data || {});
}

export function trackLead(data?: Record<string, any>) {
  if (!FB_PIXEL_ID) return;
  fbq('track', 'Lead', data || {});
}

