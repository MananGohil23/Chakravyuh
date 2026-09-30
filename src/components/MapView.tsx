import { useRef, useState } from "react";
import { TERRITORIES } from "../engine/data.ts";
import { REGIONS } from "../engine/regions.ts";
import { REGION_GEOM } from "../engine/geometry.ts";
import type { Owner } from "../engine/types.ts";
import { useGame } from "../state/game.tsx";
import { useCalibration, type Geom } from "../state/calibration.tsx";

const OWNER_FILL: Record<"A" | "B", string> = { A: "#2563eb", B: "#e11d48" };
const OWNER_STROKE: Record<"A" | "B", string> = { A: "#60a5fa", B: "#fb7185" };

function fillFor(owner: Owner): string {
  return owner === null ? "transparent" : OWNER_FILL[owner];
}

interface MapViewProps {
  highlight?: string[];
  selected?: string | null;
  onSelect?: (id: string) => void;
}

interface DragState {
  mode: "move" | "scale";
  id: string;
  startX: number;
  startY: number;
  orig: Geom;
}

export function MapView({ highlight = [], selected = null, onSelect }: MapViewProps) {
  const { state } = useGame();
  const { calibrating, geomFor, setGeom } = useCalibration();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const [, forceRender] = useState(0);

  const highlightSet = new Set(highlight);
  const markerAt: Record<string, "A" | "B"> = {};
  if (state.markers.A) markerAt[state.markers.A] = "A";
  if (state.markers.B) markerAt[state.markers.B] = "B";

  function scaleFactor(): number {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? 1536 / rect.width : 1;
  }

  function startDrag(mode: "move" | "scale", id: string, e: React.PointerEvent) {
    e.stopPropagation();
    movedRef.current = false;
    dragRef.current = { mode, id, startX: e.clientX, startY: e.clientY, orig: geomFor(id) };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const k = scaleFactor();
    const dx = (e.clientX - drag.startX) * k;
    const dy = (e.clientY - drag.startY) * k;
    if (Math.abs(dx) + Math.abs(dy) > 1.5) movedRef.current = true;
    if (drag.mode === "move") {
      setGeom(drag.id, { dx: drag.orig.dx + dx, dy: drag.orig.dy + dy });
    } else {
      setGeom(drag.id, { s: drag.orig.s + dx / 200 });
    }
  }

  function endDrag() {
    const drag = dragRef.current;
    if (drag && !movedRef.current) onSelect?.(drag.id);
    dragRef.current = null;
    forceRender((n) => n + 1);
  }

  return (
    <div className="relative w-full select-none" style={{ aspectRatio: "1536 / 1024" }}>
      <img
        src="/map.jpeg"
        alt="The Battlefield map"
        className="absolute inset-0 h-full w-full rounded-lg object-contain"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 1536 1024"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Game map"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {TERRITORIES.map((t) => {
          const g = geomFor(t.id);
          const { centroid, bbox } = REGION_GEOM[t.id];
          const [cx, cy] = centroid;
          const w = bbox.maxX - bbox.minX;
          const h = bbox.maxY - bbox.minY;
          const nameFont = Math.max(13, Math.min(30, (w * 0.82) / (t.name.length * 0.62)));
          const owner = state.territories[t.id].owner;
          const fort = state.territories[t.id].fort;
          const isHighlight = highlightSet.has(t.id);
          const isSelected = selected === t.id;
          const marker = markerAt[t.id];
          const transform = `translate(${g.dx} ${g.dy}) translate(${cx} ${cy}) scale(${g.s}) translate(${-cx} ${-cy})`;
          const label = owner
            ? `${t.name} — ${state.teamNames[owner]}`
            : `${t.name} — Neutral`;
          return (
            <g
              key={t.id}
              transform={transform}
              onClick={() => {
                if (!calibrating) onSelect?.(t.id);
              }}
              onPointerDown={calibrating ? (e) => startDrag("move", t.id, e) : undefined}
              style={{ cursor: onSelect || calibrating ? "pointer" : "default" }}
            >
              <title>{`${label}${fort ? " (fortified)" : ""}`}</title>
              <path
                d={REGIONS[t.id]}
                style={{
                  fill: fillFor(owner),
                  fillOpacity: owner ? 0.92 : 0.06,
                  stroke: calibrating
                    ? "#22d3ee"
                    : isSelected
                      ? "#facc15"
                      : isHighlight
                        ? "#fde047"
                        : owner
                          ? OWNER_STROKE[owner]
                          : "rgba(120,113,108,0.55)",
                  strokeWidth: calibrating ? 3 : isSelected ? 8 : isHighlight ? 7 : owner ? 4 : 1.5,
                  transition:
                    "fill 700ms ease, fill-opacity 700ms ease, stroke 700ms ease, stroke-width 400ms ease",
                }}
                strokeLinejoin="round"
                className={isHighlight && !calibrating ? "bf-pulse" : undefined}
                strokeDasharray={calibrating ? "12 8" : undefined}
              />
              {calibrating && (
                <>
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={26}
                    fill="#22d3ee"
                    fontWeight={700}
                  >
                    {t.number}
                  </text>
                  <rect
                    x={bbox.maxX}
                    y={cy - 8}
                    width={16}
                    height={16}
                    fill="#22d3ee"
                    stroke="#0e7490"
                    strokeWidth={2}
                    style={{ cursor: "ew-resize" }}
                    onPointerDown={(e) => startDrag("scale", t.id, e)}
                  />
                </>
              )}
              <text
                x={cx}
                y={cy - h * 0.05}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={nameFont}
                fontFamily="Rozha One, serif"
                fontWeight={400}
                fill="#ffffff"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={4}
                paintOrder="stroke"
                strokeLinejoin="round"
                pointerEvents="none"
                style={{ opacity: owner ? 1 : 0, transition: "opacity 600ms ease 150ms" }}
              >
                {t.name}
              </text>
              {fort && (
                <g transform={`translate(${cx + w * 0.28}, ${cy - h * 0.28})`}>
                  <circle r={20} fill="#1c1917" stroke="#fbbf24" strokeWidth={3} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={22} fill="#fbbf24">
                    ⛨
                  </text>
                </g>
              )}
              {marker && (
                <g transform={`translate(${cx}, ${cy + h * 0.15})`}>
                  <circle r={24} fill={OWNER_FILL[marker]} stroke="#ffffff" strokeWidth={4} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={24}
                    fontWeight={700}
                    fill="#ffffff"
                  >
                    {state.teamNames[marker].trim().charAt(0).toUpperCase() || marker}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
