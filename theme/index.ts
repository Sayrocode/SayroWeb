import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    // next/font variables se definen en Layout: --font-cinzel y --font-montserrat
    heading: "'Binggo Wood', var(--font-cinzel), serif",
    body: "var(--font-montserrat), system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  colors: {
    brand: {
      50: "#e5f6f3",
      100: "#b2e1d8",
      500: "#1a8f72",
      700: "#146f58",
      900: "#0b3b2e",
    },
  },
  styles: {
    global: {
      html: {
        scrollBehavior: 'smooth',
        colorScheme: 'light',
      },
      body: {
        bg: "#fffcf1",
        color: "gray.800",
        colorScheme: 'light',
      },
      // Brillo blanco reutilizable
      ".text-shiny-white": {
        textShadow:
          "0 0 6px rgba(255,255,255,0.65), 0 0 14px rgba(255,255,255,0.45), 0 0 28px rgba(255,255,255,0.35)",
      },
    },
  },
});

export default theme;
