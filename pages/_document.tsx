import Document, { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';
import theme from '../theme';

export default class MyDocument extends Document {
  render() {
    const gtagId = process.env.NEXT_PUBLIC_GTAG_ID;
    return (
      <Html lang="es">
        <Head>
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
          <meta name="theme-color" content="#ffffff" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
          <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
          <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
          <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
          <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
          <link rel="icon" href="/android-chrome-192x192.png" type="image/png" sizes="192x192" />
          <link rel="icon" href="/android-chrome-512x512.png" type="image/png" sizes="512x512" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
          <link rel="shortcut icon" href="/favicon.ico" />
          {gtagId && (
            <>
              <script async src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gtagId}', { anonymize_ip: true });
                  `,
                }}
              />
            </>
          )}
        </Head>
        <body>
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
