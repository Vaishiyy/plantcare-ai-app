// Potted-plant illustration inside a three-arc status ring.
// The ring has one arc per model class (High stress · Moderate · Suitable); only the
// current class is lit. It is a status indicator, not a percentage or a confidence.

import type { MlClass, PlantType } from '../types';

const LEAF: Record<string, { fill: string; vein: string }> = {
  good: { fill: '#7fae73', vein: '#4f8550' },
  warn: { fill: '#b9b25a', vein: '#8a8236' },
  bad: { fill: '#c98a5c', vein: '#9c5f3a' },
  off: { fill: '#aab3aa', vein: '#868f87' },
};
const RING: Record<MlClass, string> = { 0: '#D2553F', 1: '#D9AE34', 2: '#3B8A5A' };

export function toneOf(cls: MlClass | null | undefined, live: boolean) {
  if (cls === null || cls === undefined || !live) return 'off';
  return cls === 2 ? 'good' : cls === 1 ? 'warn' : 'bad';
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

export function PlantArt({ plant, cls, live, size = 140, ringBg = 'rgba(246,244,234,0.16)' }: {
  plant: PlantType | null; cls: MlClass | null; live: boolean; size?: number; ringBg?: string;
}) {
  const tone = toneOf(cls, live);
  const c = LEAF[tone];
  // Arcs: start at 150°, sweep 240° in three 76° segments with 6° gaps (bottom left → bottom right).
  const segs: { cls: MlClass; a0: number; a1: number }[] = [
    { cls: 0, a0: 150, a1: 226 }, { cls: 1, a0: 232, a1: 308 }, { cls: 2, a0: 314, a1: 390 },
  ];
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img"
      aria-label={plant ? `${plant === 'POTHOS' ? 'Pothos' : 'Aloe Vera'} illustration` : 'Plant illustration'}>
      {segs.map((s) => (
        <path key={s.cls} d={arc(70, 70, 63, s.a0, s.a1)} fill="none" strokeWidth={7} strokeLinecap="round"
          stroke={live && cls === s.cls ? RING[s.cls] : ringBg} />
      ))}
      {/* pot */}
      <path d="M44 94 h52 l-6 26 a6 6 0 0 1 -6 5 h-28 a6 6 0 0 1 -6 -5 z" fill="#c9825d" />
      <rect x="40" y="88" width="60" height="10" rx="4" fill="#b8704c" />
      <ellipse cx="70" cy="90" rx="27" ry="3" fill="#6b4a33" />
      {plant === 'ALOE_VERA' ? (
        <g>
          {[
            'M70 90 C66 66 64 46 66 24 C72 44 74 66 72 90 Z',
            'M68 90 C58 74 48 60 38 46 C52 54 62 68 72 88 Z',
            'M72 90 C82 74 92 60 104 48 C90 56 80 68 70 88 Z',
            'M66 90 C54 82 42 78 28 76 C42 72 56 76 70 88 Z',
            'M74 90 C86 82 98 78 112 78 C98 72 84 76 70 88 Z',
          ].map((d, i) => (
            <path key={i} d={d} fill={c.fill} stroke={c.vein} strokeWidth="1.2" />
          ))}
          {[[66, 50], [52, 64], [88, 64], [62, 70], [80, 72]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.4" fill="#eef3e6" opacity="0.8" />
          ))}
        </g>
      ) : plant === 'POTHOS' ? (
        <g>
          <path d="M70 90 C68 70 62 54 54 42 M70 90 C76 72 86 58 96 50 M70 90 C64 92 46 98 34 112 M72 90 C84 96 98 104 106 116"
            fill="none" stroke={c.vein} strokeWidth="2" strokeLinecap="round" />
          {[[54, 40, -20], [96, 48, 25], [64, 58, -5], [84, 64, 15], [36, 108, -50], [104, 112, 50], [48, 76, -35], [92, 82, 30]].map(([x, y, r], i) => (
            <path key={i} transform={`translate(${x} ${y}) rotate(${r})`}
              d="M0 10 C-11 2 -11 -9 -4 -11 C-1 -12 0 -9 0 -7 C0 -9 1 -12 4 -11 C11 -9 11 2 0 10 Z"
              fill={c.fill} stroke={c.vein} strokeWidth="1.2" />
          ))}
        </g>
      ) : (
        <path d="M70 90 V60 M70 70 C60 66 54 58 54 50 C64 52 70 60 70 70 M70 64 C80 60 86 52 86 44 C76 46 70 54 70 64"
          fill="none" stroke={c.vein} strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function LeafMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1F4D3A" />
      <path d="M32 50V28" stroke="#F6F4EA" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 34c-10 0-15-7-15-15 9 0 15 5 15 15zM32 30c0-9 5-15 15-15 0 9-6 15-15 15z" fill="#9DBB93" />
    </svg>
  );
}
