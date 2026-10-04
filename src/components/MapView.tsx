import { TERRITORIES } from "../engine/data.ts";
import { REGIONS } from "../engine/regions.ts";
import { REGION_GEOM } from "../engine/geometry.ts";
import type { Owner } from "../engine/types.ts";
import { useGame } from "../state/game.tsx";

const OWNER_FILL: Record<"A" | "B", string> = { A: "#1e3a8a", B: "#7f1d1d" };
const OWNER_STROKE: Record<"A" | "B", string> = { A: "#60a5fa", B: "#fb7185" };

function fillFor(owner: Owner): string {
  return owner === null ? "transparent" : OWNER_FILL[owner];
}

interface MapViewProps {
  highlight?: string[];
  selected?: string | null;
  onSelect?: (id: string) => void;
}

export function MapView({ highlight = [], selected = null, onSelect }: MapViewProps) {
  const { state } = useGame();
  const highlightSet = new Set(highlight);
  const markerAt: Record<string, "A" | "B"> = {};
  if (state.markers.A) markerAt[state.markers.A] = "A";
  if (state.markers.B) markerAt[state.markers.B] = "B";

  return (
    <div className="relative min-h-[45vh] w-full flex-1 select-none lg:min-h-0">
      <img
        src="/map.jpeg"
        alt="The Battlefield map"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <svg
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Game map"
      >
        {TERRITORIES.map((t) => {
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
          const label = owner ? `${t.name} — ${state.teamNames[owner]}` : `${t.name} — Neutral`;
          return (
            <g
              key={t.id}
              onClick={() => onSelect?.(t.id)}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            >
              <title>{`${label}${fort ? " (fortified)" : ""}`}</title>
              <path
                d={REGIONS[t.id]}
                style={{
                  fill: fillFor(owner),
                  fillOpacity: owner ? 0.96 : 0.06,
                  stroke: isSelected
                    ? "#facc15"
                    : isHighlight
                      ? "#fde047"
                      : owner
                        ? OWNER_STROKE[owner]
                        : "rgba(120,113,108,0.55)",
                  strokeWidth: isSelected ? 8 : isHighlight ? 7 : owner ? 4 : 1.5,
                  transition:
                    "fill 700ms ease, fill-opacity 700ms ease, stroke 700ms ease, stroke-width 400ms ease",
                }}
                strokeLinejoin="round"
                className={isHighlight ? "bf-pulse" : undefined}
              />
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
