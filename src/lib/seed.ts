// Demo data and scripted scenarios for usability tests ("Wizard of Oz" in code).
import type { AppData, DailyRecord, SessionRecord, SweatRating, WaterRecord } from '../types';
import { DAY, dateKey, now, startOfDay } from './clock';
import { data, defaultData, replaceAll, uid } from './data';
import { FW, sim, world, device } from '../device/sim';
import { zoneOf } from './water';
import { ui } from './ui';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface SessionOpts {
  daysAgo: number;
  hour?: number;
  minutes?: number;
  setMa?: number;
  fullShare?: number;
  r?: number;
  sweat?: SweatRating | null;
  handOuts?: number;
  quickDrops?: number;
  place?: string | null;
  us?: number;
  lowWater?: boolean;
  pauseCall?: boolean;
  seed: number;
  mode?: 'tray' | 'insert';
}

export function mkSession(o: SessionOpts): SessionRecord {
  const rand = rng(o.seed);
  const mins = o.minutes ?? 20;
  const setMa = o.setMa ?? 14;
  const full = o.fullShare ?? 0.93;
  const r = o.r ?? 1.6;
  const base = startOfDay(now()) - o.daysAgo * DAY;
  const start = base + (o.hour ?? 20) * 3_600_000 + Math.floor(rand() * 20) * 60_000;
  const samples: SessionRecord['samples'] = [];
  const total = mins * 60;
  let dels = 0;
  let n = 0;
  let minDel = 99;
  for (let t = 0; t <= total; t += 30) {
    const ramp = Math.min(1, t / 40);
    const mid = Math.abs(t - total / 2) < 20;
    const reach = rand() < full ? 1 : 0.7 + rand() * 0.2;
    const del = mid ? setMa * 0.2 : setMa * ramp * reach * (0.985 + rand() * 0.03);
    const rr = r * (1 + (t / total) * 0.04) * (0.97 + rand() * 0.06);
    samples.push({ t, set: setMa, del: Math.round(del * 10) / 10, r: Math.round(rr * 100) / 100, st: 'run' });
    if (t > 40 && !mid) {
      dels += del;
      n += 1;
      minDel = Math.min(minDel, del);
    }
  }
  const pauses = [] as SessionRecord['pauses'];
  for (let i = 0; i < (o.handOuts ?? 0); i++) pauses.push({ atSec: 200 + i * 240, reason: 'hand_out', lengthSec: 20 + i * 15 });
  if (o.pauseCall) pauses.push({ atSec: 600, reason: 'call', lengthSec: 120 });
  const us = o.us ?? 520;
  const water: WaterRecord = {
    at: start - 6 * 60_000,
    zone: zoneOf(us),
    us,
    tempC: 24,
    levelOk: !o.lowWater,
    place: o.place ?? 'Home',
    bakingSoda: false,
  };
  return {
    id: uid(),
    start,
    end: start + total * 1000 + pauses.reduce((a, p) => a + p.lengthSec, 0) * 1000,
    plannedMin: mins,
    actualMin: mins,
    area: 'hands',
    mode: o.mode ?? 'tray',
    setMa,
    avgDeliveredMa: Math.round((dels / Math.max(1, n)) * 10) / 10,
    minDeliveredMa: Math.round(minDel * 10) / 10,
    fullStrengthShare: full,
    avgResistance: r,
    resistanceTrend: Math.round((r * 0.04) * 100) / 100,
    polaritySwitches: 1,
    pauses,
    quickDrops: o.quickDrops ?? 0,
    handOuts: o.handOuts ?? 0,
    water,
    bakingSoda: false,
    place: o.place ?? 'Home',
    sweat: o.sweat ?? null,
    comfort: 'comfortable',
    tags: [],
    note: '',
    firmware: FW.VERSION,
    partial: false,
    endReason: 'complete',
    notReaching: full < 0.8,
    lowWater: !!o.lowWater,
    firstSession: false,
    samples,
  };
}

const dailyFor = (daysAgo: number, sweat: SweatRating): DailyRecord => ({
  date: dateKey(startOfDay(now()) - daysAgo * DAY),
  sweat,
  tags: [],
});

function baseOnboarded(): AppData {
  const d = defaultData();
  d.onboarded = true;
  d.safetyPassed = true;
  d.safetyFlags = [];
  d.area = 'hands';
  d.device.paired = true;
  d.siriAdded = ['Start DryTray', 'Pause DryTray', 'Resume DryTray', 'Stop DryTray'];
  d.settings.controlStyle = 'both';
  d.plan.startDate = startOfDay(now());
  d.places = ['Home'];
  return d;
}

function resetSim(us = 520, wear = 0.1) {
  sim.resetDevice();
  world.set({
    waterBaseUs: us,
    tempC: 24,
    wear,
    vMaxFactor: 1,
    holdCounts: false,
    callControl: 'full',
    faults: { outputBad: false, polarityBad: false, batterySag: false, panelBad: false },
  });
  device.set({ battery: 86, levelOk: true, selfTest: { running: false, progress: 0, last: null } });
}

function clearUi() {
  ui.set({ stack: [], tab: 'today', call: null, session: null, pending: null, startIssue: null, lockPreview: false });
}

export type Preset =
  | 'fresh'
  | 'maya'
  | 'daniel'
  | 'case-device'
  | 'case-water'
  | 'case-schedule'
  | 'case-early'
  | 'case-setup'
  | 'case-doctor'
  | 'demo-history';

export const presetLabels: Record<Preset, string> = {
  fresh: 'Fresh install (onboarding)',
  maya: 'Maya: new user, set up, no sessions',
  daniel: 'Daniel: lapsed user, 8 weeks of history',
  'case-device': 'Diagnosis case: Device',
  'case-water': 'Diagnosis case: Water',
  'case-schedule': 'Diagnosis case: Schedule',
  'case-early': 'Diagnosis case: Too early',
  'case-setup': 'Diagnosis case: Setup',
  'case-doctor': 'Diagnosis case: See a doctor',
  'demo-history': 'Healthy demo history (keep current settings)',
};

export function loadPreset(p: Preset) {
  clearUi();
  switch (p) {
    case 'fresh': {
      resetSim();
      replaceAll(defaultData());
      return;
    }
    case 'maya': {
      resetSim();
      const d = baseOnboarded();
      replaceAll(d);
      return;
    }
    case 'daniel': {
      resetSim(520);
      const d = baseOnboarded();
      d.firstSessionDone = true;
      d.plan.phase = 'maintenance';
      d.plan.sessionsPerWeek = 2;
      d.plan.days = [2, 5];
      d.plan.comfortLimitMa = 16;
      d.plan.targetMa = 14;
      d.plan.startDate = startOfDay(now()) - 60 * DAY;
      d.places = ['Home', 'Hotel Chicago'];
      d.settings.placeTags = true;
      const rand = rng(7);
      // 4 weeks strong, then fading
      for (let i = 0; i < 20; i++) {
        const daysAgo = 56 - i * 2.4;
        if (daysAgo < 14) break;
        d.sessions.push(
          mkSession({ daysAgo: Math.round(daysAgo), seed: 100 + i, setMa: 14 + (i % 3 === 0 ? 1 : 0), sweat: (i < 6 ? 3 : i < 12 ? 2 : 1) as SweatRating, r: 1.5 + rand() * 0.1 }),
        );
      }
      for (const [i, ago] of [30, 23, 16].entries()) {
        d.sessions.push(
          mkSession({ daysAgo: ago, seed: 300 + i, place: 'Hotel Chicago', us: 130 + i * 20, fullShare: 0.55, r: 3.4, sweat: 2, setMa: 14 }),
        );
        d.waterChecks.push({ at: now() - ago * DAY, zone: 'soft', us: 130 + i * 20, tempC: 22, levelOk: true, place: 'Hotel Chicago', bakingSoda: false });
      }
      for (const [i, ago] of [9, 6, 3, 1].entries()) d.daily.push(dailyFor(ago, (3 + (i > 1 ? 1 : 0)) as SweatRating));
      for (const [i, ago] of [13, 12, 11, 10].entries()) d.daily.push(dailyFor(ago, (1 + (i % 2)) as SweatRating));
      d.sessions.sort((a, b) => a.start - b.start);
      d.waterChecks.sort((a, b) => a.at - b.at);
      replaceAll(d);
      return;
    }
    case 'demo-history': {
      const cur = data.get();
      const d = { ...cur, sessions: [...cur.sessions] };
      for (let i = 0; i < 14; i++) {
        d.sessions.push(mkSession({ daysAgo: 1 + i * 2, seed: 900 + i, sweat: (i > 8 ? 3 : i > 4 ? 2 : 1) as SweatRating }));
      }
      d.sessions.sort((a, b) => a.start - b.start);
      replaceAll({ ...d, onboarded: true });
      return;
    }
    default:
      break;
  }

  // ---- scripted diagnosis cases: real data + sim faults so the rules fire honestly ----
  resetSim();
  const d = baseOnboarded();
  d.firstSessionDone = true;
  d.plan.comfortLimitMa = 16;
  d.plan.targetMa = 14;
  d.plan.startDate = startOfDay(now()) - 28 * DAY;
  const add = (o: Omit<SessionOpts, 'seed'>, i: number) => d.sessions.push(mkSession({ ...o, seed: 500 + i }));

  if (p === 'case-device') {
    for (let i = 0; i < 10; i++) {
      add({ daysAgo: 20 - i * 2, fullShare: 0.9 - i * 0.045, r: 1.4 + i * 0.22, sweat: (1 + Math.floor(i / 4)) as SweatRating }, i);
    }
    world.set({ wear: 1.0, faults: { outputBad: true, polarityBad: false, batterySag: false, panelBad: false } });
    d.waterChecks.push({ at: now() - 1 * DAY, zone: 'good', us: 520, tempC: 24, levelOk: true, place: 'Home', bakingSoda: false });
  } else if (p === 'case-water') {
    d.places = ['Home', 'Hotel Chicago'];
    d.currentPlace = 'Hotel Chicago';
    d.settings.placeTags = true;
    for (let i = 0; i < 9; i++) {
      add({ daysAgo: 20 - i * 2, fullShare: 0.5, r: 3.3, us: 120, place: 'Hotel Chicago', sweat: 3 }, i);
    }
    world.set({ waterBaseUs: 120, wear: 0.1 });
  } else if (p === 'case-schedule') {
    d.plan.phase = 'starting';
    for (const [i, ago] of [19, 18, 11, 5].entries()) add({ daysAgo: ago, sweat: (2 + (i > 2 ? 1 : 0)) as SweatRating }, i);
    d.daily.push(dailyFor(4, 3), dailyFor(2, 3));
  } else if (p === 'case-early') {
    for (const [i, ago] of [6, 4, 2].entries()) add({ daysAgo: ago, sweat: 3, setMa: 8 + i * 2 }, i);
    d.plan.startDate = startOfDay(now()) - 7 * DAY;
    d.plan.comfortLimitMa = 12;
    d.plan.targetMa = 10;
  } else if (p === 'case-setup') {
    for (let i = 0; i < 9; i++) {
      add({ daysAgo: 20 - i * 2, handOuts: 2, quickDrops: 2, lowWater: i % 2 === 0, fullShare: 0.88, sweat: 3 }, i);
    }
    d.plan.comfortLimitMa = 7;
    d.plan.targetMa = 6;
    device.set({ levelOk: false });
  } else if (p === 'case-doctor') {
    for (let i = 0; i < 12; i++) add({ daysAgo: 20 - Math.round(i * 1.7), sweat: 3, fullShare: 0.93 }, i);
    d.plan.phase = 'maintenance';
    d.plan.startDate = startOfDay(now()) - 40 * DAY;
  }
  d.sessions.sort((a, b) => a.start - b.start);
  replaceAll(d);
}

