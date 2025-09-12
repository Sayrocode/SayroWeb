import { ChakraProvider, Box, VStack, Spinner, Text } from "@chakra-ui/react";
import Head from "next/head";
import type { AppProps } from "next/app";
import theme from "../theme";
import "../styles/fonts.css";
import Script from "next/script";
import { FB_PIXEL_ID } from "../lib/fbpixel";
import type { NextWebVitalsMetric } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  // Global route-change loader overlay
  const router = useRouter();
  const [routeLoading, setRouteLoading] = useState(false);
  const customTimerRef = useRef<any>(null);
  useEffect(() => {
    const start = (url: string) => {
      if (url !== router.asPath) setRouteLoading(true);
    };
    const done = (url?: string) => {
      setRouteLoading(false);
      try {
        const h = typeof window !== 'undefined' ? (window.location.hash || '') : '';
        const id = h.startsWith('#') ? h.slice(1) : '';
        if (id) window.dispatchEvent(new CustomEvent('app:show-section', { detail: { id } } as any));
      } catch {}
    };
    const custom = () => {
      // Start loader even before Next.js route event, with a fallback auto-hide
      setRouteLoading(true);
      if (customTimerRef.current) clearTimeout(customTimerRef.current);
      customTimerRef.current = setTimeout(() => setRouteLoading(false), 1200);
    };
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    window.addEventListener('app:nav-start', custom as any);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
      window.removeEventListener('app:nav-start', custom as any);
    };
  }, [router]);
  useEffect(() => {
    try { document.body.style.overflow = routeLoading ? 'hidden' : ''; } catch {}
    try { if (!routeLoading) window.dispatchEvent(new CustomEvent('app:route-loading-done')); } catch {}
  }, [routeLoading]);
  return (
    <ChakraProvider theme={theme}>
      <Head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Cinzel (heading fallback) + Montserrat (body) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
        <>
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: 'none' }} src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
          </noscript>
        </>
      )}
      <Component {...pageProps} />
      {routeLoading && (
        <Box position="fixed" inset={0} bg="whiteAlpha.900" zIndex={3000} display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={3}>
            <Spinner thickness="4px" speed="0.7s" emptyColor="gray.200" color="green.600" size="xl" />
            <Text color="gray.700" fontWeight="medium">Cargando…</Text>
          </VStack>
        </Box>
      )}
    </ChakraProvider>
  );
}

export default MyApp;

// Web Vitals reporting for performance monitoring
export function reportWebVitals(metric: NextWebVitalsMetric) {
  try {
    const body = JSON.stringify(metric);
    // Prefer sendBeacon so it doesn't block the UI thread
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/web-vitals', body);
    } else {
      fetch('/api/web-vitals', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
    // Also log to console in development for quick inspection
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[WebVitals]', metric);
    }
  } catch {}
}
