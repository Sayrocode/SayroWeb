export function navStart() {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:nav-start'));
    }
  } catch {}
}

