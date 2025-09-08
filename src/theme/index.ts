import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "'Binggo Wood','Cinzel', serif",
    body: "'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
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
      body: {
        bg: "gray.50",
        color: "gray.800",
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
