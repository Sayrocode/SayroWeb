import Document, { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';
import theme from '../theme';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="es">
        <Head>
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
          <meta name="theme-color" content="#ffffff" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
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
