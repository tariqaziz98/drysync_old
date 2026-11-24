import type { SessionRecord } from '../types';
import type { SweatPoint } from '../lib/insights';
import { mmss } from '../lib/clock';

/** Strength over time for one session, with pauses marked (PRD 6.11). */
export function SessionChart({ rec }: { rec: SessionRecord }) {
  const W = 340, H = 170, L = 30, B = 22, T = 10, R = 8;
  const s = rec.samples;
  if (s.length < 2) return <p className="small">No chart data for this session.</p>;
  const tMax = s[s.length - 1].t || 1;
  const yMax = Math.max(20, ...s.map((x) => x.set)) + 1;
  const x = (t: number) => L + (t / tMax) * (W - L - R);
  const y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const path = s.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.del).toFixed(1)}`).join(' ');
  const setPath = s.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.set).toFixed(1)}`).join(' ');
  const area = `${path} L${x(tMax)},${y(0)} L${x(0)},${y(0)} Z`;
  const bands: { a: number; b: number; st: string }[] = [];
  s.forEach((p, i) => {
    if (p.st === 'run') return;
    const next = s[i + 1]?.t ?? p.t + 5;
    const last = bands[bands.length - 1];
    if (last && last.st === p.st && Math.abs(last.b - p.t) <= 6) last.b = next;
    else bands.push({ a: p.t, b: next, st: p.st });
  });
  const mid = s.find((p) => p.t >= tMax / 2 - 20 && p.del < p.set * 0.4 && p.st === 'run');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Strength over time, pauses shaded">
      {[0, 10, 20].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="rgba(0,0,0,0.05)" />
          <text x={L - 6} y={y(g) + 4} fontSize="10" textAnchor="end" fill="rgba(0,0,0,0.6)">{g}</text>
        </g>
      ))}
      {bands.map((b, i) => (
        <rect key={i} x={x(b.a)} width={Math.max(3, x(b.b) - x(b.a))} y={T} height={H - B - T} fill={b.st === 'hold' ? '#ffb900' : '#9a9aa8'} opacity="0.28" />
      ))}
      <path d={area} fill="#6a00ff" opacity="0.14" />
      <path d={setPath} stroke="rgba(0,0,0,0.6)" strokeDasharray="4 3" fill="none" strokeWidth="1.5" />
      <path d={path} stroke="#6a00ff" fill="none" strokeWidth="2.5" strokeLinejoin="round" />
      {mid && <text x={x(mid.t)} y={T + 10} fontSize="10" textAnchor="middle" fill="rgba(0,0,0,0.6)">direction switch</text>}
      <text x={L} y={H - 6} fontSize="10" fill="rgba(0,0,0,0.6)">0:00</text>
      <text x={W - R} y={H - 6} fontSize="10" textAnchor="end" fill="rgba(0,0,0,0.6)">{mmss(tMax)}</text>
      <text x={L} y={T + 2} fontSize="10" fill="rgba(0,0,0,0.6)">mA</text>
    </svg>
  );
}

/** Sweat score over time (1 = dry … 4 = dripping). Lower is better. */
export function SweatChart({ points }: { points: SweatPoint[] }) {
  const W = 340, H = 140, L = 30, B = 22, T = 10, R = 10;
  if (points.length < 2) return <p className="small">Rate a few days to see your trend.</p>;
  const t0 = points[0].t, t1 = points[points.length - 1].t || t0 + 1;
  const x = (t: number) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (v: number) => T + ((v - 1) / 3) * (H - B - T);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const labels = ['dry', 'mostly', 'damp', 'drip'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sweat rating over time">
      {[1, 2, 3, 4].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="rgba(0,0,0,0.05)" />
          <text x={L - 4} y={y(g) + 3} fontSize="9" textAnchor="end" fill="rgba(0,0,0,0.6)">{labels[g - 1]}</text>
        </g>
      ))}
      <path d={path} stroke="#6a00ff" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      {points.map((p) => <circle key={p.date} cx={x(p.t)} cy={y(p.rating)} r="3.5" fill="#6a00ff" />)}
      <text x={L} y={H - 6} fontSize="10" fill="rgba(0,0,0,0.6)">{new Date(t0).toLocaleDateString([], { month: 'short', day: 'numeric' })}</text>
      <text x={W - R} y={H - 6} fontSize="10" textAnchor="end" fill="rgba(0,0,0,0.6)">{new Date(t1).toLocaleDateString([], { month: 'short', day: 'numeric' })}</text>
    </svg>
  );
}

/** Tiny sparkline of the last 10 sweat scores for the relapse card (higher = sweatier). */
export function Trend({ points }: { points: SweatPoint[] }) {
  const pts = points.slice(-10);
  if (pts.length < 2) return null;
  const W = 84, H = 40;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  const x = (t: number) => 2 + ((t - t0) / Math.max(1, t1 - t0)) * (W - 4);
  const y = (r: number) => H - 2 - ((r - 1) / 3) * (H - 4);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', flex: 'none' }} role="img" aria-label="Sweat score trend, last 10 days">
      <path d={d} fill="none" stroke="#6a00ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last.t)} cy={y(last.rating)} r="3.5" fill="#ffb900" />
    </svg>
  );
}
