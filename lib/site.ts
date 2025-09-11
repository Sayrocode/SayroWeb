export const WA_PHONE = process.env.NEXT_PUBLIC_WA_PHONE || '521234567890';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hola@tu-dominio.com';
// Preferred phone call scheme for desktop handlers: 'tel' | 'sip' | 'callto'
export const PHONE_CALL_SCHEME = (process.env.NEXT_PUBLIC_PHONE_SCHEME || 'tel').toLowerCase();

export function waHref(message?: string) {
  const base = `https://wa.me/${WA_PHONE}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
