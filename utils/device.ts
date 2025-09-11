import { useEffect, useState } from 'react';

/**
 * Heurística para detectar iPad en navegadores modernos.
 * - iPadOS 13+ suele reportarse como MacIntel con pantalla táctil.
 */
export function useIsIpad(): boolean {
  const [isIpad, setIsIpad] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const platform = (navigator as any).platform || '';
      const maxTouchPoints = (navigator as any).maxTouchPoints || 0;

      const isiPadUA = /iPad/i.test(ua);
      const isMacLikeTouch = platform === 'MacIntel' && maxTouchPoints > 1; // iPadOS 13+
      setIsIpad(Boolean(isiPadUA || isMacLikeTouch));
    } catch {
      setIsIpad(false);
    }
  }, []);

  return isIpad;
}

