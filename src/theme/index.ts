import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
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
    },
  },
});

export default theme;
