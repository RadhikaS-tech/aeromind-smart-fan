import { useCallback, useEffect, useRef, useState } from 'react';
import type { Decision, FanState, Occupant } from '@/sim/types';
import { FAN_POS } from '@/sim/physics';

interface RoomViewProps {
  occupants: Occupant[];
  onMoveOccupant: (id: string, x: number, y: number) => void;
  fan: FanState;
  decision: Decision;
  width?: number;
  height?: number;
}

/**
 * Top-down floor plan with three draggable occupants and an animated
 * pedestal fan at the bottom-center. Airflow is drawn as a translucent
 * cone that oscillates between heading ± swing.
 *
 * Coordinates are normalized [0..1]; we map to SVG pixels.
 */
export default function RoomView({
  occupants,
  onMoveOccupant,
  fan,
  decision,
  width = 560,
  height = 600,
}: RoomViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Animate oscillation phase
  useEffect(() => {
    if (!fan.on || fan.swing <= 0) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTick((t) => t + dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fan.on, fan.swing]);

  // Oscillation period depends on speed: faster speed -> faster sweep
  const period = fan.speed > 0 ? 4.2 / (0.5 + fan.speed) : 4;
  const phase = (tick / period) * Math.PI * 2;
  const sweep = fan.on ? Math.sin(phase) * fan.swing : 0;
  const currentAngle = fan.on ? fan.heading + sweep : fan.heading;

  const toPx = (x: number, y: number) => ({ px: x * width, py: y * height });

  const pointFromAngle = useCallback(
    (angleDeg: number, len: number) => {
      // 0 deg = up (-Y). +90 deg = right (+X). -90 deg = left.
      const rad = (angleDeg * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      const origin = toPx(FAN_POS.x, FAN_POS.y);
      return {
        x: origin.px + dx * len,
        y: origin.py + dy * len,
      };
    },
    [width, height],
  );

  const handlePointer = (e: React.PointerEvent) => {
    if (!dragId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = Math.min(1, Math.max(0, ((e.clientX - rect.left) * scaleX) / width));
    const y = Math.min(0.92, Math.max(0.05, ((e.clientY - rect.top) * scaleY) / height));
    onMoveOccupant(dragId, x, y);
  };

  const stopDrag = () => setDragId(null);

  const fanPx = toPx(FAN_POS.x, FAN_POS.y);
  const tipLeft = pointFromAngle(currentAngle - fan.swing, Math.max(width, height) * 0.7);
  const tipRight = pointFromAngle(currentAngle + fan.swing, Math.max(width, height) * 0.7);
  const tipCenter = pointFromAngle(currentAngle, Math.max(width, height) * 0.7);

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto touch-none rounded-2xl"
        onPointerMove={handlePointer}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
        role="img"
        aria-label="Top-down room view with draggable occupants and animated fan airflow"
      >
        <defs>
          <linearGradient id="airflowGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#22c2ff" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#22c2ff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#22c2ff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="fanGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#22c2ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22c2ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Floor */}
        <rect x="0" y="0" width={width} height={height} rx="18" className="floor-grid" fill="#0a1020" />
        {/* Inner border */}
        <rect
          x="8"
          y="8"
          width={width - 16}
          height={height - 16}
          rx="12"
          fill="none"
          stroke="rgba(120,180,255,0.18)"
          strokeWidth="1.5"
        />

        {/* Zone labels for occupied sectors */}
        {decision.zones.map((z) => {
          const p = toPx(z.occupant.x, z.occupant.y);
          const dir = pointFromAngle(z.angle, 46);
          return (
            <g key={z.id} opacity={fan.on ? 0.8 : 0.35}>
              <line
                x1={fanPx.px}
                y1={fanPx.py}
                x2={dir.x}
                y2={dir.y}
                stroke="#5dd4ff"
                strokeWidth="1.4"
                strokeDasharray="3 5"
                opacity="0.5"
              />
              <circle cx={p.px} cy={p.py} r="30" fill="none" stroke="#5dd4ff" strokeWidth="1.2" strokeDasharray="2 4" opacity="0.5" />
            </g>
          );
        })}

        {/* Airflow cone */}
        {fan.on && (
          <g>
            <path
              d={`M ${fanPx.px} ${fanPx.py} L ${tipLeft.x} ${tipLeft.y} L ${tipRight.x} ${tipRight.y} Z`}
              fill="url(#airflowGrad)"
              opacity="0.9"
            />
            {/* center beam */}
            <line
              x1={fanPx.px}
              y1={fanPx.py}
              x2={tipCenter.x}
              y2={tipCenter.y}
              stroke="#99e6ff"
              strokeWidth="2"
              strokeDasharray="6 8"
              className="airflow-line"
              opacity="0.7"
            />
          </g>
        )}

        {/* Aim indicator (heading) */}
        {fan.on && (
          <line
            x1={fanPx.px}
            y1={fanPx.py}
            x2={pointFromAngle(fan.heading, 90).x}
            y2={pointFromAngle(fan.heading, 90).y}
            stroke="#3ad6a0"
            strokeWidth="1.5"
            strokeDasharray="2 4"
            opacity="0.7"
          />
        )}

        {/* Fan glow */}
        <circle cx={fanPx.px} cy={fanPx.py} r="60" fill="url(#fanGlow)" />

        {/* Occupants */}
        {occupants.map((o) => {
          const p = toPx(o.x, o.y);
          const isDrag = dragId === o.id;
          const isHover = hoverId === o.id;
          const inZone = decision.zones.some((z) => z.id === o.id);
          return (
            <g
              key={o.id}
              transform={`translate(${p.px} ${p.py})`}
              style={{ cursor: o.active ? 'grab' : 'not-allowed', opacity: o.active ? 1 : 0.35 }}
              onPointerDown={(e) => {
                if (!o.active) return;
                e.preventDefault();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDragId(o.id);
              }}
              onPointerEnter={() => setHoverId(o.id)}
              onPointerLeave={() => setHoverId((h) => (h === o.id ? null : h))}
            >
              <circle
                r="15"
                fill={o.active ? (inZone && fan.on ? '#3ad6a0' : '#22c2ff') : '#1e2a4d'}
                stroke={isDrag ? '#ffffff' : o.active ? '#99e6ff' : '#2a385f'}
                strokeWidth={isDrag ? 3 : 2}
                className="fan-glow"
                style={{ transition: 'r 0.15s ease' }}
              />
              {(isHover || isDrag) && o.active && (
                <circle r="18" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              )}
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#0a1020"
                style={{ pointerEvents: 'none' }}
              >
                {o.label.replace('Person ', '')}
              </text>
              <text
                x="0"
                y="-24"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill="#c8f1ff"
                style={{ pointerEvents: 'none' }}
                opacity={o.active ? 0.9 : 0.5}
              >
                {o.active ? (inZone && fan.on ? 'targeted' : 'active') : 'absent'}
              </text>
            </g>
          );
        })}

        {/* Pedestal fan */}
        <g transform={`translate(${fanPx.px} ${fanPx.py})`}>
          {/* base */}
          <ellipse cx="0" cy="14" rx="26" ry="7" fill="#0e4a6b" opacity="0.8" />
          {/* pole */}
          <rect x="-3" y="-6" width="6" height="20" rx="3" fill="#16213d" />
          {/* head housing */}
          <circle r="22" fill="#0f1830" stroke="#1e2a4d" strokeWidth="2" />
          {/* blades */}
          <g
            transform={`rotate(${currentAngle * 6 + (fan.on ? tick * 90 * (fan.speed + 0.4) : 0)})`}
            style={{ transition: 'transform 0.1s linear' }}
          >
            {[0, 120, 240].map((a) => (
              <ellipse
                key={a}
                cx="0"
                cy="-13"
                rx="5"
                ry="14"
                fill="#22c2ff"
                opacity="0.55"
                transform={`rotate(${a})`}
              />
            ))}
            <circle r="5" fill="#5dd4ff" />
          </g>
          {/* direction nub */}
          <circle
            cx={Math.sin((currentAngle * Math.PI) / 180) * 20}
            cy={-Math.cos((currentAngle * Math.PI) / 180) * 20}
            r="3.5"
            fill="#3ad6a0"
          />
        </g>
      </svg>

      {/* Legend overlay */}
      <div className="absolute left-3 top-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-white/70">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-breeze-400" /> active occupant
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-mint-400" /> targeted
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-ink-500" /> absent
        </span>
      </div>
      <div className="absolute right-3 top-3 rounded-md bg-ink-900/70 px-2 py-1 text-[10px] font-medium text-white/60 backdrop-blur">
        Drag the glowing dots to move occupants
      </div>
    </div>
  );
}
