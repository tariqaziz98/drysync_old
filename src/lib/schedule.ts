import type { AppData, Plan, SessionRecord } from '../types';
import { DAY, dateKey, startOfDay } from './clock';

export const FAKE_CALENDAR = [
  { day: 2, from: '19:30', to: '21:00', title: 'Study group' },
  { day: 4, from: '20:00', to: '20:45', title: 'Call with family' },
];

const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

export const weekStart = (t: number) => {
  const d = new Date(startOfDay(t));
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return d.getTime() - day * DAY;
};

export const sessionsBetween = (sessions: SessionRecord[], from: number, to: number) =>
  sessions.filter((s) => s.start >= from && s.start < to);

export const sessionsOnDay = (sessions: SessionRecord[], t: number) => {
  const k = dateKey(t);
  return sessions.filter((s) => dateKey(s.start) === k);
};

export const boosterStart = (plan: Plan) => (plan.boosterUntil ? plan.boosterUntil - 7 * DAY : null);

export const boosterActive = (plan: Plan, t: number) => !!plan.boosterUntil && plan.boosterUntil > t;

export const weeklyTarget = (plan: Plan, t: number) =>
  boosterActive(plan, t) ? Math.max(plan.sessionsPerWeek, 3) : plan.sessionsPerWeek;

export interface NextSession {
  at: number;
  shiftedFor?: string;
  today: boolean;
}

export function nextSession(d: AppData, t: number): NextSession | null {
  const { plan, sessions, settings } = d;
  const mins = hm(plan.time);
  const days = plan.days.length ? plan.days : [1, 3, 5];
  for (let off = 0; off < 15; off++) {
    const day = startOfDay(t) + off * DAY;
    // DST-safe: build the slot from a Date on that calendar day
    const dd = new Date(day);
    const dow = dd.getDay();
    const isBooster = boosterActive(plan, day) && off < 7;
    if (!days.includes(dow) && !isBooster) continue;
    if (!days.includes(dow) && isBooster && off % 2 !== 0) continue;
    if (sessionsOnDay(sessions, day).length > 0) continue;
    const slot = new Date(day);
    slot.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    let at = slot.getTime();
    let shiftedFor: string | undefined;
    if (settings.calendarAware) {
      const ev = FAKE_CALENDAR.find((e) => e.day === dow && hm(e.from) < mins + plan.lengthMin && hm(e.to) > mins);
      if (ev) {
        const s2 = new Date(day);
        const m2 = hm(ev.to) + 15;
        s2.setHours(Math.floor(m2 / 60), m2 % 60, 0, 0);
        at = s2.getTime();
        shiftedFor = ev.title;
      }
    }
    if (at < t - 3 * 3_600_000) continue; // long gone: counts as missed
    return { at, shiftedFor, today: off === 0 };
  }
  return null;
}

export const missedToday = (d: AppData, t: number) => {
  const dow = new Date(t).getDay();
  if (!d.plan.days.includes(dow)) return false;
  if (sessionsOnDay(d.sessions, t).length > 0) return false;
  const [h, m] = d.plan.time.split(':').map(Number);
  const slot = new Date(t);
  slot.setHours(h, m, 0, 0);
  return t > slot.getTime() + 3 * 3_600_000;
};

export function weekProgress(d: AppData, t: number) {
  const ws = weekStart(t);
  const done = sessionsBetween(d.sessions, ws, ws + 7 * DAY).length;
  return { done, target: weeklyTarget(d.plan, t) };
}

export function boosterProgress(d: AppData) {
  const start = boosterStart(d.plan);
  if (!start) return null;
  const done = sessionsBetween(d.sessions, start, start + 7 * DAY).length;
  return { done, target: 3 };
}
