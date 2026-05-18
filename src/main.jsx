import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App";
import { AuthProvider } from "./components/AuthContext";
import { theme } from "./theme";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/trade-card.css";
import "./styles/learn.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
    </MantineProvider>
  </React.StrictMode>
);
