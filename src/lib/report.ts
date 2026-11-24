import type { AppData } from '../types';

export function buildReport(d: AppData, from: number, to: number) {
  const ss = d.sessions.filter((s) => s.start >= from && s.start <= to).sort((a, b) => a.start - b.start);
  const weeks = Math.max(1, (to - from) / (7 * 86_400_000));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const rated = ss.filter((s) => s.sweat);
  return {
    sessions: ss.length,
    perWeek: ss.length / weeks,
    avgMin: mean(ss.map((s) => s.actualMin)),
    avgMa: mean(ss.map((s) => s.avgDeliveredMa)),
    firstSweat: rated[0]?.sweat ?? null,
    lastSweat: rated[rated.length - 1]?.sweat ?? null,
    uncomfortable: ss.filter((s) => s.comfort === 'uncomfortable').length,
    quickDrops: ss.reduce((a, s) => a + s.quickDrops, 0),
  };
}

const esc = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function sessionsToCsv(d: AppData) {
  const head = ['start', 'end', 'planned_min', 'actual_min', 'area', 'mode', 'set_ma', 'avg_delivered_ma', 'min_delivered_ma', 'full_strength_share', 'avg_resistance_kohm', 'polarity_switches', 'pauses', 'quick_drops', 'water_zone', 'water_us', 'place', 'sweat_1_to_4', 'comfort', 'tags', 'note', 'firmware'];
  const rows = d.sessions.map((s) =>
    [new Date(s.start).toISOString(), new Date(s.end).toISOString(), s.plannedMin, s.actualMin, s.area, s.mode, s.setMa, s.avgDeliveredMa, s.minDeliveredMa, s.fullStrengthShare, s.avgResistance, s.polaritySwitches, s.pauses.length, s.quickDrops, s.water?.zone ?? '', s.water?.us ?? '', s.place ?? '', s.sweat ?? '', s.comfort ?? '', s.tags.join('; '), s.note, s.firmware].map(esc).join(','),
  );
  const daily = ['', '# daily check-ins: date,sweat_1_to_4,tags', ...d.daily.map((c) => [c.date, c.sweat, c.tags.join('; ')].map(esc).join(','))];
  return [head.join(','), ...rows, ...daily].join('\n');
}
