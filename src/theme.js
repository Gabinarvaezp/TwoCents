// theme.js
import { extendTheme } from "@chakra-ui/react";
const theme = extendTheme({
  colors: {
    gabby: {
      500: "#F3B0C3",
      700: "#E573A7"
    },
    jorgie: {
      500: "#A3CEF1",
      700: "#3B82F6"
    },
    background: {
      light: "#fff",
      dark: "#18181b"
    }
  },
  fonts: {
    heading: "Poppins, sans-serif",
    body: "Inter, sans-serif"
  }
});
export default theme;