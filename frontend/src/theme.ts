import { createTheme } from "@mui/material/styles";

// Colors inspired by the uploaded Flex theme
const primaryGreen = "#174b41"; // deep green header
const accentGreen = "#2f7b6c";
const creamBg = "#f6efe0";
const textColor = "#12202b";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: primaryGreen },
    secondary: { main: accentGreen },
    background: { default: creamBg, paper: "#ffffff" },
    text: { primary: textColor },
  },
  typography: {
    fontFamily: "Inter, Arial, sans-serif",
    h1: { fontWeight: 700 },
  },
});

export default theme;
