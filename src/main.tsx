import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/rozha-one/latin-400.css";
import "@fontsource/mukta/latin-400.css";
import "@fontsource/mukta/latin-600.css";
import "@fontsource/mukta/latin-700.css";
import "./index.css";
import App from "./App.tsx";
import { GameProvider } from "./state/game.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
