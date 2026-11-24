import type { AppData, DiagCause, SelfTestResult, SessionRecord, WaterRecord } from '../types';
import { DAY } from './clock';
import { weeklyTarget } from './schedule';

// Every threshold here is TBD from bench testing (PRD 6.12). Simple rules, no ML in v1.
export const DX = {
  WINDOW_DAYS: 21,
  FALLS_SHORT_BELOW: 0.75, // share of time at full strength
  RISING_R_PER_WEEK: 0.12, // kOhm per week
  RISING_R_TOTAL: 0.3,
  LOW_ADHERENCE_BELOW: 0.6,
  TOO_EARLY_SESSIONS: 6,
  HANDOUTS_FLAG: 3,
  QUICKDROPS_PER_SESSION: 1.5,
  LOW_COMFORT_LIMIT_MA: 8,
  FULL_PHASE_SESSIONS: 12,
};

export type Symptom = 'sweaty' | 'weaker' | 'stings' | 'wontStart';

export const symptomLabel: Record<Symptom, string> = {
  sweaty: 'Still sweaty, or getting sweatier',
  weaker: 'The tingle feels weaker than before',
  stings: 'Stings or burns',
  wontStart: 'Device will not start or keeps stopping',
};

export interface DataReview {
  windowDays: number;
  sessions: number;
  planned: number;
  adherence: number;
  avgMin: number;
  avgSetMa: number;
  avgDeliveredMa: number;
  fullShare: number | null;
  rFirst: number | null;
  rLast: number | null;
  rSlopePerWeek: number;
  handOuts: number;
  quickDrops: number;
  quickDropsPerSession: number;
  lowWaterCount: number;
  pauses: number;
  total: number;
  phase: 'starting' | 'maintenance';
  comfortLimit: number | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function reviewData(d: AppData, t: number): DataReview {
  const from = t - DX.WINDOW_DAYS * DAY;
  const ss: SessionRecord[] = d.sessions.filter((s) => s.start >= from).sort((a, b) => a.start - b.start);
  // A plan that is only a week old can't have 3 weeks of planned sessions
  const ageDays = (t - d.plan.startDate) / DAY;
  const effDays = Math.min(DX.WINDOW_DAYS, Math.max(7, ageDays));
  const planned = Math.max(1, Math.round(weeklyTarget(d.plan, t) * (effDays / 7)));
  // Slope of average resistance across sessions (kOhm per week)
  let slope = 0;
  if (ss.length >= 3) {
    const xs = ss.map((s) => (s.start - ss[0].start) / (7 * DAY));
    const ys = ss.map((s) => s.avgResistance);
    const mx = mean(xs);
    const my = mean(ys);
    const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    slope = den > 0 ? num / den : 0;
  }
  return {
    windowDays: DX.WINDOW_DAYS,
    sessions: ss.length,
    planned,
    adherence: ageDays < 7 ? 1 : ss.length / planned,
    avgMin: mean(ss.map((s) => s.actualMin)),
    avgSetMa: mean(ss.map((s) => s.setMa)),
    avgDeliveredMa: mean(ss.map((s) => s.avgDeliveredMa)),
    fullShare: ss.length ? mean(ss.map((s) => s.fullStrengthShare)) : null,
    rFirst: ss.length ? ss[0].avgResistance : null,
    rLast: ss.length ? ss[ss.length - 1].avgResistance : null,
    rSlopePerWeek: slope,
    handOuts: ss.reduce((a, s) => a + s.handOuts, 0),
    quickDrops: ss.reduce((a, s) => a + s.quickDrops, 0),
    quickDropsPerSession: ss.length ? ss.reduce((a, s) => a + s.quickDrops, 0) / ss.length : 0,
    lowWaterCount: ss.filter((s) => s.lowWater || (s.water && !s.water.levelOk)).length,
    pauses: ss.reduce((a, s) => a + s.pauses.length, 0),
    total: d.sessions.length,
    phase: d.plan.phase,
    comfortLimit: d.plan.comfortLimitMa,
  };
}

export interface DiagnosisInput {
  symptom: Symptom;
  stingsTriedFixes: boolean;
  skinDamage: boolean;
  selfTest: SelfTestResult;
  water: WaterRecord;
  review: DataReview;
}

export interface DiagnosisResult {
  cause: DiagCause;
  also: DiagCause[];
  reasons: string[];
}

export function diagnose(i: DiagnosisInput): DiagnosisResult {
  const r = i.review;
  const flags: Partial<Record<DiagCause, string>> = {};
  const deviceFail = !i.selfTest.pass;
  const waterSoft = i.water.zone === 'soft';
  const levelLow = !i.water.levelOk || r.lowWaterCount >= 2;
  const fallsShort = r.fullShare !== null && r.sessions >= 2 && r.fullShare < DX.FALLS_SHORT_BELOW;
  const risingR =
    r.rFirst !== null && r.rLast !== null && r.rSlopePerWeek > DX.RISING_R_PER_WEEK && r.rLast - r.rFirst > DX.RISING_R_TOTAL;
  const lowAdherence = r.adherence < DX.LOW_ADHERENCE_BELOW;
  const setupSigns =
    r.handOuts >= DX.HANDOUTS_FLAG ||
    r.quickDropsPerSession >= DX.QUICKDROPS_PER_SESSION ||
    (r.comfortLimit !== null && r.comfortLimit < DX.LOW_COMFORT_LIMIT_MA) ||
    levelLow;
  const early = r.phase === 'starting' && r.total < DX.TOO_EARLY_SESSIONS;

  if (deviceFail) flags.device = 'The device self-test did not pass.';
  else if (fallsShort && !waterSoft && risingR)
    flags.device = 'Strength falls short even with good water, and resistance has risen steadily (possible electrode wear).';
  if (waterSoft) flags.water = 'Your water reads too soft to carry enough current.';
  if (setupSigns)
    flags.setup = levelLow
      ? 'Water level was low.'
      : r.handOuts >= DX.HANDOUTS_FLAG
        ? 'Your hands left the water several times.'
        : 'You turned the strength down often, or your comfort limit is low.';
  if (lowAdherence) flags.schedule = `You did ${r.sessions} of ${r.planned} planned sessions in the last 3 weeks.`;
  if (early) flags.early = 'You are still in the first sessions.';

  const doctorFull = r.total >= DX.FULL_PHASE_SESSIONS && r.adherence >= 0.8;

  let cause: DiagCause;
  const reasons: string[] = [];
  if (i.symptom === 'stings' && (i.skinDamage || i.stingsTriedFixes)) {
    cause = 'doctor';
    reasons.push(
      i.skinDamage ? 'You reported skin damage.' : 'Stinging continued after the usual setup fixes.',
    );
  } else if (flags.device) cause = 'device';
  else if (flags.water) cause = 'water';
  else if (flags.schedule) cause = 'schedule';
  else if (flags.setup || i.symptom === 'stings') cause = 'setup';
  else if (flags.early) cause = 'early';
  else if (doctorFull) {
    cause = 'doctor';
    reasons.push('Everything checks out, but there has been no change after a full starting phase.');
  } else if (i.symptom === 'weaker') cause = 'setup';
  else if (r.phase === 'maintenance') {
    cause = 'doctor';
    reasons.push('Device, water, setup and schedule all check out, but your symptoms are still there.');
  } else cause = 'early';

  if (flags[cause]) reasons.push(flags[cause]!);
  const order: DiagCause[] = ['device', 'water', 'setup', 'schedule', 'early'];
  const also = order.filter((c) => c !== cause && flags[c] && !(c === 'early' && cause === 'schedule')).slice(0, 2);
  return { cause, also, reasons };
}

export interface CauseCopy {
  tone: 'red' | 'amber' | 'blue' | 'green';
  title: string;
  headline: string;
  steps: string[];
  alsoLabel: string;
}

export const causeCopy: Record<DiagCause, CauseCopy> = {
  device: {
    tone: 'red',
    title: 'Device',
    headline: 'Your device may need attention.',
    steps: [
      'Clean the electrodes with a damp cloth.',
      'Charge the tray fully.',
      'Update the firmware if one is waiting.',
      'Run the self-test again.',
      'Still failing? Contact support or open the repair guide.',
    ],
    alsoLabel: 'Device',
  },
  water: {
    tone: 'amber',
    title: 'Water',
    headline: 'Your water is likely too soft to carry enough current.',
    steps: [
      'Add about 1 teaspoon of baking soda to each tray and stir.',
      'Check your water again.',
      'Save this tip for this place so we remind you next time.',
    ],
    alsoLabel: 'Water',
  },
  setup: {
    tone: 'blue',
    title: 'Setup or technique',
    headline: 'Small setup changes may help.',
    steps: [
      'Fill each tray to the line.',
      'Rest your palms fully on the bed.',
      'Cover small cuts with petroleum jelly.',
      'Try the Comfort Insert if the tray stings in spots.',
      'Raise strength slowly over several sessions.',
    ],
    alsoLabel: 'Setup',
  },
  schedule: {
    tone: 'blue',
    title: 'Schedule',
    headline: 'Results fade without regular sessions.',
    steps: ['Adjust your reminders so they fit your week.', 'Try a booster week: 3 sessions in 7 days.'],
    alsoLabel: 'Schedule',
  },
  early: {
    tone: 'green',
    title: 'Too early to tell',
    headline: 'It usually takes several sessions before people notice a change.',
    steps: ['Keep going with your plan.', "We'll check again in a week."],
    alsoLabel: 'Give it time',
  },
  doctor: {
    tone: 'red',
    title: 'See a doctor',
    headline: 'This is worth checking with a doctor.',
    steps: [
      'Stop sessions until you have talked to a doctor if you have skin damage.',
      'Share your report so they can see your sessions and readings.',
    ],
    alsoLabel: 'Doctor',
  },
};
