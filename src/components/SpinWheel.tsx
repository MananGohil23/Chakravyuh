import { useEffect, useRef, useState } from "react";

export interface WheelItem {
  id: string;
  name: string;
}

interface Props {
  items: WheelItem[];
  onResult: (id: string) => void;
  disabled?: boolean;
}

const R = 150;
const COLORS = ["#b45309", "#7c2d12", "#a16207", "#78350f", "#9a3412"];

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}

/** Normalise any angle into [0, 360). */
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function SpinWheel({ items, onResult, disabled = false }: Props) {
  // Frozen copy of the segments for the wheel currently on screen. It only
  // changes when a new spin starts, so the wheel stays put after landing.
  const [wheelItems, setWheelItems] = useState<WheelItem[]>(items);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const n = wheelItems.length;
  const anglePer = n > 0 ? 360 / n : 0;

  function spin() {
    if (spinning || disabled || items.length === 0) return;
    const list = items;
    const count = list.length;
    const per = 360 / count;

    // Rebuild the wheel from the latest remaining territories.
    setWheelItems(list);
    setWinnerIdx(null);

    const start = rotationRef.current;
    const currentNorm = norm360(start);
    const targetAngle = Math.random() * 360;
    let delta = norm360(targetAngle - currentNorm);
    delta += 360 * (4 + Math.floor(Math.random() * 3));
    const end = start + delta;
    const duration = 4400;
    const t0 = performance.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);

    setSpinning(true);
    function frame(now: number) {
      const t = Math.min(1, (now - t0) / duration);
      const value = start + (end - start) * ease(t);
      rotationRef.current = value;
      setRotation(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      // Landed: derive the winner from where the wheel actually stopped.
      const landed = norm360(end);
      const angleAtPointer = norm360(-landed);
      let idx = Math.floor(angleAtPointer / per);
      if (idx >= count) idx = count - 1;

      rotationRef.current = landed;
      setRotation(landed);
      setSpinning(false);
      setWinnerIdx(idx);
      onResultRef.current(list[idx].id);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  function wedgePath(i: number): string {
    const a0 = i * anglePer;
    const a1 = (i + 1) * anglePer;
    const [x0, y0] = polar(R, a0);
    const [x1, y1] = polar(R, a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  }

  const winnerName =
    winnerIdx !== null && wheelItems[winnerIdx] ? wheelItems[winnerIdx].name : null;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="-180 -190 360 360" className="h-72 w-72 max-w-full">
        <circle cx={0} cy={0} r={R + 8} fill="#1c1917" stroke="#fbbf24" strokeWidth={4} />
        <g transform={`rotate(${rotation.toFixed(3)})`}>
          {n === 1 ? (
            <circle
              cx={0}
              cy={0}
              r={R}
              fill={COLORS[0]}
              stroke={winnerIdx === 0 ? "#fde047" : "#1c1917"}
              strokeWidth={winnerIdx === 0 ? 6 : 1.5}
            />
          ) : (
            wheelItems.map((_, i) => (
              <path
                key={i}
                d={wedgePath(i)}
                fill={COLORS[i % COLORS.length]}
                stroke={winnerIdx === i ? "#fde047" : "#1c1917"}
                strokeWidth={winnerIdx === i ? 6 : 1.5}
              />
            ))
          )}
          {n === 1 ? (
            <text x={0} y={-R * 0.55} textAnchor="middle" dominantBaseline="central" fontSize={18} fontFamily="Rozha One, serif" fill="#fff">
              {wheelItems[0]?.name}
            </text>
          ) : (
            wheelItems.map((item, i) => {
              const mid = i * anglePer + anglePer / 2;
              const r0 = R * 0.62;
              const [tx, ty] = polar(r0, mid);
              const flip = mid > 90 && mid < 270;
              const angle = flip ? mid + 90 : mid - 90;
              return (
                <text
                  key={item.id}
                  x={tx}
                  y={ty}
                  transform={`rotate(${angle} ${tx} ${ty})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontFamily="Rozha One, serif"
                  fill="#fff"
                  stroke="rgba(0,0,0,0.45)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {item.name}
                </text>
              );
            })
          )}
        </g>
        <circle cx={0} cy={0} r={26} fill="#1c1917" stroke="#fbbf24" strokeWidth={3} />
        <path d="M0 -156 L-16 -188 L16 -188 Z" fill="#fbbf24" stroke="#78350f" strokeWidth={2} />
      </svg>

      {winnerName && !spinning && (
        <p className="gilded font-display mt-2 text-lg">⚔ Landed: {winnerName}</p>
      )}

      <button
        onClick={spin}
        disabled={spinning || disabled || items.length === 0}
        className="btn btn-gold mt-3 w-full px-4 py-3 text-lg"
      >
        {spinning ? "Consulting the fates…" : "🎡 Spin the Wheel of Fate"}
      </button>
    </div>
  );
}
