import { useState } from "react";
import { TERRITORIES } from "../engine/data.ts";
import { useCalibration } from "../state/calibration.tsx";

export function CalibrationPanel({
  selectedId,
  onSelectId,
}: {
  selectedId: string | null;
  onSelectId: (id: string) => void;
}) {
  const { calibrating, setCalibrating, geomFor, setGeom, reset, exportSnippet } =
    useCalibration();
  const [copied, setCopied] = useState(false);
  const id = selectedId ?? TERRITORIES[0].id;
  const geom = geomFor(id);

  function field(label: string, key: "dx" | "dy" | "s") {
    return (
      <label className="text-xs text-stone-400">
        {label}
        <input
          type="number"
          step={key === "s" ? 0.01 : 1}
          value={geom[key]}
          onChange={(e) => setGeom(id, { [key]: Number(e.target.value) })}
          className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-100"
        />
      </label>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-cyan-700/60 bg-cyan-950/30 p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-widest text-cyan-300">
          Map calibration
        </h2>
        <button
          onClick={() => setCalibrating(!calibrating)}
          className={`font-display rounded px-2 py-1 text-sm ${
            calibrating ? "bg-cyan-400 text-stone-900" : "bg-stone-700 hover:bg-stone-600"
          }`}
        >
          {calibrating ? "On" : "Off"}
        </button>
      </div>

      <p className="text-[11px] text-cyan-200/80">
        {calibrating
          ? "Drag a territory shape to nudge it. Drag its cyan handle to scale. Click to select."
          : "Shapes are traced from the artwork; use this only for fine alignment."}
      </p>

      <select
        value={id}
        onChange={(e) => onSelectId(e.target.value)}
        className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm"
      >
        {TERRITORIES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.number}. {t.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        {field("offset x", "dx")}
        {field("offset y", "dy")}
        {field("scale", "s")}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(exportSnippet()).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              },
              () => setCopied(false),
            );
          }}
          className="font-display flex-1 rounded bg-stone-700 px-2 py-1 text-sm hover:bg-stone-600"
        >
          {copied ? "Copied!" : "Copy alignment JSON"}
        </button>
        <button
          onClick={() => {
            if (window.confirm("Reset all calibration to the defaults?")) reset();
          }}
          className="font-display rounded bg-rose-800 px-2 py-1 text-sm hover:bg-rose-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
