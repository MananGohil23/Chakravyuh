import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface Geom {
  dx: number;
  dy: number;
  s: number;
}

const STORAGE_KEY = "battlefield.calibration.v2";
const DEFAULT: Geom = { dx: 0, dy: 0, s: 1 };

function loadOverrides(): Record<string, Geom> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, Geom>;
  } catch (err) {
    console.error("Failed to load calibration:", err);
  }
  return {};
}

interface CalibrationContextValue {
  overrides: Record<string, Geom>;
  calibrating: boolean;
  setCalibrating: (v: boolean) => void;
  setGeom: (id: string, patch: Partial<Geom>) => void;
  reset: () => void;
  geomFor: (id: string) => Geom;
  exportSnippet: () => string;
}

const CalibrationContext = createContext<CalibrationContextValue | null>(null);

export function CalibrationProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, Geom>>(loadOverrides);
  const [calibrating, setCalibrating] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  function setGeom(id: string, patch: Partial<Geom>) {
    setOverrides((prev) => {
      const current = prev[id] ?? DEFAULT;
      const next: Geom = {
        dx: Math.round(patch.dx ?? current.dx),
        dy: Math.round(patch.dy ?? current.dy),
        s: Math.max(0.2, Number((patch.s ?? current.s).toFixed(3))),
      };
      return { ...prev, [id]: next };
    });
  }

  return (
    <CalibrationContext.Provider
      value={{
        overrides,
        calibrating,
        setCalibrating,
        setGeom,
        reset: () => setOverrides({}),
        geomFor: (id) => overrides[id] ?? DEFAULT,
        exportSnippet: () => JSON.stringify(overrides, null, 2),
      }}
    >
      {children}
    </CalibrationContext.Provider>
  );
}

export function useCalibration(): CalibrationContextValue {
  const ctx = useContext(CalibrationContext);
  if (!ctx) throw new Error("useCalibration must be used within CalibrationProvider");
  return ctx;
}
