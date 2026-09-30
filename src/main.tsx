import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GameProvider } from "./state/game.tsx";
import { CalibrationProvider } from "./state/calibration.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <CalibrationProvider>
        <App />
      </CalibrationProvider>
    </GameProvider>
  </StrictMode>,
);
