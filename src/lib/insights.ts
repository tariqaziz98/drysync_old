import type { AppData, SweatRating } from '../types';
import { DAY, dateKey, startOfDay } from './clock';
import { sessionsBetween, weekStart, weeklyTarget } from './schedule';

export interface SweatPoint {
  t: number;
  date: string;
  rating: SweatRating;
}

/** One sweat rating per calendar day: a session rating wins over a check-in. */
export function sweatSeries(d: AppData): SweatPoint[] {
  const byDay = new Map<string, SweatPoint>();
  for (const c of d.daily) {
    byDay.set(c.date, { t: new Date(c.date + 'T12:00:00').getTime(), date: c.date, rating: c.sweat });
  }
  for (const s of d.sessions) {
    if (s.sweat) {
      const k = dateKey(s.start);
      byDay.set(k, { t: s.start, date: k, rating: s.sweat });
    }
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function relapseCheck(d: AppData, t: number) {
  const pts = sweatSeries(d);
  const recent = pts.filter((p) => p.t > t - 10 * DAY && p.t <= t).map((p) => p.rating);
  const prior = pts.filter((p) => p.t > t - 20 * DAY && p.t <= t - 10 * DAY).map((p) => p.rating);
  const r = avg(recent);
  const p = avg(prior);
  // Rule is TBD (PRD 6.11): rating creeping up by half a point or more
  const warn = r !== null && p !== null && recent.length >= 3 && prior.length >= 3 && r - p >= 0.5;
  return { warn, recent: r, prior: p };
}

export function dryDaysInWeek(d: AppData, wkStart: number) {
  return sweatSeries(d).filter((p) => p.t >= wkStart && p.t < wkStart + 7 * DAY && p.rating <= 2).length;
}

export function streakWeeks(d: AppData, t: number) {
  let streak = 0;
  let ws = weekStart(t);
  const target = Math.max(1, weeklyTarget(d.plan, t));
  const thisWeek = sessionsBetween(d.sessions, ws, ws + 7 * DAY).length;
  if (thisWeek < target) ws -= 7 * DAY; // this week is still in progress
  for (let i = 0; i < 52; i++) {
    const n = sessionsBetween(d.sessions, ws, ws + 7 * DAY).length;
    if (n >= target && ws >= weekStart(d.plan.startDate) - 7 * DAY) {
      streak++;
      ws -= 7 * DAY;
    } else break;
  }
  return streak;
}

export function weeklyBars(d: AppData, t: number, weeks = 8) {
  const out: { start: number; count: number; target: number }[] = [];
  const cur = weekStart(t);
  for (let i = weeks - 1; i >= 0; i--) {
    const s = cur - i * 7 * DAY;
    out.push({ start: s, count: sessionsBetween(d.sessions, s, s + 7 * DAY).length, target: d.plan.sessionsPerWeek });
  }
  return out;
}

export function waterByPlace(d: AppData) {
  const m = new Map<string, { n: number; soft: number }>();
  for (const w of d.waterChecks) {
    const k = w.place ?? 'Home';
    const e = m.get(k) ?? { n: 0, soft: 0 };
    e.n += 1;
    if (w.zone === 'soft') e.soft += 1;
    m.set(k, e);
  }
  return m;
}

export interface Insight {
  text: string;
  tone: 'good' | 'info' | 'warn';
}

export function insightSentences(d: AppData, t: number): Insight[] {
  const out: Insight[] = [];
  const ws = weekStart(t);
  const done = sessionsBetween(d.sessions, ws, ws + 7 * DAY).length;
  const target = weeklyTarget(d.plan, t);
  if (d.sessions.length === 0 && d.daily.length === 0) {
    return [{ text: 'Insights appear after your first few sessions. Nothing to do but start.', tone: 'info' }];
  }
  out.push({
    text: `You did ${done} of ${target} planned sessions this week.`,
    tone: done >= target ? 'good' : 'info',
  });

  const pts = sweatSeries(d);
  if (pts.length >= 4) {
    const firstWk = weekStart(pts[0].t);
    const a = dryDaysInWeek(d, firstWk);
    const lastWk = weekStart(t) - (dryDaysInWeek(d, weekStart(t)) === 0 ? 7 * DAY : 0);
    const b = dryDaysInWeek(d, lastWk);
    if (lastWk > firstWk && b !== a) {
      out.push({
        text: `Your dry days went from ${a} to ${b} a week since you started.`,
        tone: b > a ? 'good' : 'warn',
      });
    }
  }

  const recentSessions = d.sessions.filter((s) => s.start > t - 28 * DAY);
  if (recentSessions.length >= 3) {
    const full = recentSessions.filter((s) => s.fullStrengthShare >= 0.85).length / recentSessions.length;
    out.push({
      text: `Your sessions reached full strength ${Math.round(full * 100)}% of the time.`,
      tone: full >= 0.8 ? 'good' : 'warn',
    });
  }

  for (const [place, e] of waterByPlace(d)) {
    if (place !== 'Home' && e.n >= 2 && e.soft / e.n >= 0.6) {
      out.push({ text: `${place} water was soft on ${e.soft} of ${e.n} checks. Pack baking soda.`, tone: 'warn' });
    }
  }

  // The relapse warning has its own card on Today and Insights, so it isn't repeated here.
  const streak = streakWeeks(d, t);
  if (streak >= 2) out.push({ text: `${streak} weeks in a row on plan. Nice.`, tone: 'good' });
  return out;
}

export const monthDays = (t: number) => {
  const d = new Date(t);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { first: first.getTime(), lead, count, start: startOfDay(first.getTime()) };
};
