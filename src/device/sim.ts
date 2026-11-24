// The simulated DryTray. It plays the role of the firmware + sensors and speaks
// the same commands/readings a real BLE device would (PRD 13). The app only
// ever *asks*; every safety limit below is enforced here, never in the UI.
import { createStore } from '../lib/store';
import { now } from '../lib/clock';
import { correctForTemp } from '../lib/water';
import type {
  Pause,
  PauseReason,
  Sample,
  SelfTestResult,
  Source,
  TrayMode,
} from '../types';

export const FW = {
  VERSION: '0.3.1',
  MAX_MA: 20, // absolute cap, regardless of any app request (SR1)
  MIN_MA: 2,
  UP_STEP: 1,
  DOWN_STEP: 2, // TBD
  RAMP_UP: 0.5, // mA per second (gentle)
  RAMP_DOWN: 2.5, // mA per second
  FAST_DOWN: 8, // hand left the water
  UP_INTERVAL_S: 15, // at most one step up per this many seconds (TBD)
  V_MAX: 45, // volts the output stage can push
  HOLD_FRACTION: 0.3, // Call Guard hold level (TBD)
  HOLD_MIN_MA: 3,
  BATTERY_PER_MIN: 0.6, // % per minute under load
  RESERVE_MIN: 1,
  PAUSE_TOO_LONG_S: 600, // TBD
};

export type Mode =
  | 'idle'
  | 'armed' // session requested, waiting for hands in the water
  | 'ramping'
  | 'running'
  | 'switching' // polarity change
  | 'hold' // Call Guard hold level
  | 'lowering' // ramping to zero before Safe to Lift
  | 'safe'
  | 'complete'
  | 'selftest';

export type StatusColor = 'blue' | 'amber' | 'green' | 'red' | 'gray';

export interface DeviceState {
  mode: Mode;
  sessionActive: boolean;
  pauseReason: PauseReason | null;
  finishing: boolean;
  trayMode: TrayMode;
  firstSession: boolean;
  setMa: number;
  cmdMa: number;
  deliveredMa: number;
  voltage: number;
  resistance: number;
  hands: boolean;
  polarity: 1 | -1;
  polaritySwitches: number;
  plannedSec: number;
  elapsedSec: number;
  remainingSec: number;
  clockSec: number;
  comfortCap: number;
  battery: number;
  bt: boolean;
  speed: number;
  levelOk: boolean;
  notReaching: boolean;
  severe: boolean;
  lastUpClock: number;
  pausedSec: number; // how long the current pause has lasted
  panelFlash: { button: string; at: number } | null;
  selfTest: { running: boolean; progress: number; last: SelfTestResult | null };
}

export interface World {
  waterBaseUs: number; // conductivity at 25C
  tempC: number;
  wear: number; // electrode wear, 0 (new) .. 1.5 (worn)
  vMaxFactor: number;
  holdCounts: boolean;
  callControl: 'full' | 'pauseOnly';
  faults: { outputBad: boolean; polarityBad: boolean; batterySag: boolean; panelBad: boolean };
}

export type CmdResult = { ok: boolean; reason?: string; detail?: Record<string, number | string> };

export type DeviceEvent =
  | { type: 'cmd'; name: string; source: Source; result: CmdResult; late?: boolean }
  | { type: 'safe'; reason: 'pause' | 'hand_out' | 'stop' | 'complete'; late?: boolean }
  | { type: 'hands'; in: boolean; late?: boolean }
  | { type: 'polarity'; late?: boolean }
  | { type: 'not_reaching'; severe: boolean; late?: boolean }
  | { type: 'water_low'; late?: boolean }
  | { type: 'battery_low'; minutesLeft: number; shortened: boolean; late?: boolean }
  | { type: 'complete'; draft: SessionDraft; late?: boolean }
  | { type: 'bt'; connected: boolean; late?: boolean }
  | { type: 'panel_call'; long: boolean; late?: boolean }
  | { type: 'panel_start'; late?: boolean }
  | { type: 'started'; late?: boolean };

export interface SessionDraft {
  startedAt: number;
  plannedSec: number;
  trayMode: TrayMode;
  firstSession: boolean;
  setMaStart: number;
  maxSetMa: number;
  finalSetMa: number;
  samples: Sample[];
  pauses: Pause[];
  quickDrops: number;
  handOuts: number;
  polaritySwitches: number;
  runSec: number;
  fullSec: number;
  sumDelRun: number;
  minDelRun: number;
  sumR: number;
  nR: number;
  notReaching: boolean;
  lowWater: boolean;
  partial: boolean;
  endReason: 'complete' | 'user' | 'battery';
  elapsedSec: number;
  lastSampleClock: number;
}

const LS_KEY = 'drysync.sim.v1';

const defaultWorld: World = {
  waterBaseUs: 520,
  tempC: 24,
  wear: 0.1,
  vMaxFactor: 1,
  holdCounts: false,
  callControl: 'full',
  faults: { outputBad: false, polarityBad: false, batterySag: false, panelBad: false },
};

function loadSim(): { world: World; battery: number; levelOk: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      return {
        world: { ...defaultWorld, ...j.world, faults: { ...defaultWorld.faults, ...j.world?.faults } },
        battery: j.battery ?? 82,
        levelOk: j.levelOk ?? true,
      };
    }
  } catch {
    /* storage unavailable: fall back to defaults */
  }
  return { world: defaultWorld, battery: 82, levelOk: true };
}

const boot = loadSim();

export const world = createStore<World>(boot.world, () => persist());

export const device = createStore<DeviceState>({
  mode: 'idle',
  sessionActive: false,
  pauseReason: null,
  finishing: false,
  trayMode: 'tray',
  firstSession: false,
  setMa: 0,
  cmdMa: 0,
  deliveredMa: 0,
  voltage: 0,
  resistance: 0,
  hands: false,
  polarity: 1,
  polaritySwitches: 0,
  plannedSec: 0,
  elapsedSec: 0,
  remainingSec: 0,
  clockSec: 0,
  comfortCap: 14,
  battery: boot.battery,
  bt: true,
  speed: 1,
  levelOk: boot.levelOk,
  notReaching: false,
  severe: false,
  lastUpClock: -999,
  pausedSec: 0,
  panelFlash: null,
  selfTest: { running: false, progress: 0, last: null },
}, () => persist());

function persist() {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        world: world.get(),
        battery: device.get().battery,
        levelOk: device.get().levelOk,
      }),
    );
  } catch {
    /* ignore */
  }
}

// ---------- events (queued while Bluetooth is down, SR6) ----------
type Listener = (e: DeviceEvent) => void;
const listeners = new Set<Listener>();
let queued: DeviceEvent[] = [];

export const onDeviceEvent = (fn: Listener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

function emit(e: DeviceEvent) {
  if (!device.get().bt && e.type !== 'bt') {
    queued.push({ ...e, late: true } as DeviceEvent);
    return;
  }
  listeners.forEach((l) => l(e));
}

// ---------- internal bookkeeping ----------
let draft: SessionDraft | null = null;
let openPause: Pause | null = null;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const noise = (pct: number) => 1 + (Math.random() * 2 - 1) * pct;

export const holdLevel = (setMa: number) =>
  Math.max(FW.HOLD_MIN_MA, Math.round(setMa * FW.HOLD_FRACTION));

export function resistanceNow(): number {
  const w = world.get();
  const s = device.get();
  const base = 0.6 + 600 / Math.max(40, w.waterBaseUs);
  const insert = s.trayMode === 'insert' ? 1.25 : 1;
  const level = s.levelOk ? 1 : 1.35;
  return base * (1 + w.wear) * insert * level;
}

export const minutesOfCharge = (battery = device.get().battery) => battery / FW.BATTERY_PER_MIN;

function beginPause(reason: PauseReason) {
  if (!draft || openPause) return;
  openPause = { atSec: device.get().clockSec, reason, lengthSec: 0 };
  draft.pauses.push(openPause);
}
function endPause() {
  openPause = null;
}

// ---------- commands ----------
export const tray = {
  start(opts: {
    plannedMin: number;
    setMa: number;
    comfortCap: number;
    insert: boolean;
    firstSession: boolean;
    source: Source;
  }): CmdResult {
    const s = device.get();
    let result: CmdResult;
    if (s.mode !== 'idle') result = { ok: false, reason: 'busy' };
    else if (minutesOfCharge() < opts.plannedMin + FW.RESERVE_MIN) {
      result = {
        ok: false,
        reason: 'battery',
        detail: { minutesLeft: Math.max(0, Math.floor(minutesOfCharge() - FW.RESERVE_MIN)) },
      };
    } else {
      const cap = Math.min(FW.MAX_MA, opts.comfortCap);
      const setMa = clamp(Math.round(opts.setMa), FW.MIN_MA, cap);
      draft = {
        startedAt: now(),
        plannedSec: opts.plannedMin * 60,
        trayMode: opts.insert ? 'insert' : 'tray',
        firstSession: opts.firstSession,
        setMaStart: setMa,
        maxSetMa: setMa,
        finalSetMa: setMa,
        samples: [],
        pauses: [],
        quickDrops: 0,
        handOuts: 0,
        polaritySwitches: 0,
        runSec: 0,
        fullSec: 0,
        sumDelRun: 0,
        minDelRun: 99,
        sumR: 0,
        nR: 0,
        notReaching: false,
        lowWater: false,
        partial: false,
        endReason: 'complete',
        elapsedSec: 0,
        lastSampleClock: -99,
      };
      openPause = null;
      device.set({
        mode: s.hands ? 'ramping' : 'armed',
        sessionActive: true,
        pauseReason: null,
        finishing: false,
        trayMode: draft.trayMode,
        firstSession: opts.firstSession,
        setMa,
        cmdMa: 0,
        deliveredMa: 0,
        voltage: 0,
        polarity: 1,
        polaritySwitches: 0,
        plannedSec: draft.plannedSec,
        elapsedSec: 0,
        remainingSec: draft.plannedSec,
        clockSec: 0,
        comfortCap: cap,
        notReaching: false,
        severe: false,
        lastUpClock: -999,
        pausedSec: 0,
      });
      emit({ type: 'started' });
      result = { ok: true, detail: { armed: s.hands ? 0 : 1 } };
    }
    emit({ type: 'cmd', name: 'start', source: opts.source, result });
    return result;
  },

  pause(source: Source, reason: PauseReason = 'user'): CmdResult {
    const s = device.get();
    let result: CmdResult = { ok: true };
    if (!s.sessionActive) result = { ok: false, reason: 'no_session' };
    else if (['ramping', 'running', 'switching', 'hold'].includes(s.mode)) {
      if (s.mode === 'hold' && openPause) openPause.reason = reason;
      else beginPause(reason);
      device.set({ mode: 'lowering', pauseReason: reason, finishing: false });
    } else if (s.mode === 'armed') {
      result = { ok: true, reason: 'armed' };
    }
    emit({ type: 'cmd', name: 'pause', source, result });
    return result;
  },

  resume(source: Source): CmdResult {
    const s = device.get();
    let result: CmdResult = { ok: true };
    if (!s.sessionActive || s.mode === 'complete') result = { ok: false, reason: 'no_session' };
    else if (['safe', 'lowering', 'hold'].includes(s.mode) && !s.finishing) {
      if (!s.hands) result = { ok: false, reason: 'no_hands' };
      else {
        endPause();
        device.set({ mode: 'ramping', pauseReason: null, pausedSec: 0 });
      }
    } else if (['ramping', 'running', 'switching'].includes(s.mode)) {
      result = { ok: true, reason: 'already_running' };
    } else if (s.mode === 'armed') {
      result = { ok: false, reason: s.hands ? 'ok' : 'no_hands' };
    }
    emit({ type: 'cmd', name: 'resume', source, result });
    return result;
  },

  stop(source: Source): CmdResult {
    const s = device.get();
    let result: CmdResult = { ok: true };
    if (!s.sessionActive || s.mode === 'complete') result = { ok: false, reason: 'no_session' };
    else {
      if (draft) {
        draft.partial = s.remainingSec > 5;
        draft.endReason = 'user';
      }
      if (s.mode === 'armed') {
        // nothing was delivered: cancel without creating a log
        draft = null;
        openPause = null;
        device.set({ mode: 'idle', sessionActive: false, cmdMa: 0, deliveredMa: 0, voltage: 0 });
      } else if (s.mode === 'safe') finish();
      else device.set({ mode: 'lowering', finishing: true });
    }
    emit({ type: 'cmd', name: 'stop', source, result });
    return result;
  },

  /** "Ouch": always allowed, immediate, no confirmation (SR3). */
  down(source: Source): CmdResult {
    const s = device.get();
    const setMa = Math.max(FW.MIN_MA, s.setMa - FW.DOWN_STEP);
    if (draft && s.sessionActive && s.mode !== 'complete') draft.quickDrops += 1;
    device.set({
      setMa,
      cmdMa: Math.min(s.cmdMa, s.mode === 'hold' ? s.cmdMa : setMa),
    });
    const result: CmdResult = { ok: true, detail: { setMa } };
    emit({ type: 'cmd', name: 'down', source, result });
    return result;
  },

  /** Raising is stepwise, rate-limited and capped at the comfort limit (SR3, SR4). */
  up(source: Source): CmdResult {
    const s = device.get();
    let result: CmdResult;
    if (!s.sessionActive || !['running', 'ramping'].includes(s.mode)) {
      result = { ok: false, reason: 'not_running' };
    } else if (s.setMa + FW.UP_STEP > Math.min(s.comfortCap, FW.MAX_MA)) {
      result = { ok: false, reason: 'at_limit' };
    } else if (s.clockSec - s.lastUpClock < FW.UP_INTERVAL_S) {
      result = {
        ok: false,
        reason: 'too_soon',
        detail: { waitSec: Math.ceil(FW.UP_INTERVAL_S - (s.clockSec - s.lastUpClock)) },
      };
    } else {
      const setMa = s.setMa + FW.UP_STEP;
      if (draft) draft.maxSetMa = Math.max(draft.maxSetMa, setMa);
      device.set({ setMa, lastUpClock: s.clockSec });
      result = { ok: true, detail: { setMa } };
    }
    emit({ type: 'cmd', name: 'up', source, result });
    return result;
  },

  /** Call Guard: drop to a gentle hold level while the user deals with a call. */
  hold(source: Source): CmdResult {
    const s = device.get();
    let result: CmdResult = { ok: true };
    if (['running', 'ramping', 'switching'].includes(s.mode)) {
      if (!world.get().holdCounts) beginPause('call');
      device.set({ mode: 'hold', pauseReason: 'call' });
    } else result = { ok: false, reason: 'not_running' };
    emit({ type: 'cmd', name: 'hold', source, result });
    return result;
  },

  releaseHold(source: Source): CmdResult {
    const s = device.get();
    let result: CmdResult = { ok: true };
    if (s.mode === 'hold') {
      endPause();
      device.set({ mode: 'ramping', pauseReason: null });
    } else result = { ok: false, reason: 'not_holding' };
    emit({ type: 'cmd', name: 'release', source, result });
    return result;
  },

  /** Panel buttons are handled by the device itself so they work without the phone. */
  panel(button: 'play' | 'call' | 'down' | 'up', long = false) {
    const s = device.get();
    device.set({ panelFlash: { button, at: Date.now() } });
    if (world.get().faults.panelBad && button === 'up') return; // a dead button
    if (button === 'play') {
      if (!s.sessionActive) {
        if (s.mode === 'idle') emit({ type: 'panel_start' });
        return;
      }
      if (['ramping', 'running', 'switching'].includes(s.mode)) tray.pause('panel');
      else if (s.mode === 'armed') {
        /* waiting for hands: nothing to do */
      } else if (s.mode === 'complete') ack();
      else tray.resume('panel');
    } else if (button === 'down') tray.down('panel');
    else if (button === 'up') tray.up('panel');
    else emit({ type: 'panel_call', long });
  },

  ack() {
    ack();
  },
};

function ack() {
  const s = device.get();
  if (s.mode !== 'complete') return;
  draft = null;
  openPause = null;
  device.set({
    mode: 'idle',
    sessionActive: false,
    hands: false,
    cmdMa: 0,
    deliveredMa: 0,
    voltage: 0,
    pauseReason: null,
    finishing: false,
    notReaching: false,
    severe: false,
  });
}

function finish() {
  const s = device.get();
  if (!draft) return;
  const d = draft;
  d.finalSetMa = s.setMa;
  d.elapsedSec = s.elapsedSec;
  d.polaritySwitches = s.polaritySwitches;
  device.set({ mode: 'complete', cmdMa: 0, deliveredMa: 0, voltage: 0, pauseReason: null, finishing: false });
  emit({ type: 'safe', reason: d.partial ? 'stop' : 'complete' });
  emit({ type: 'complete', draft: d });
}

// ---------- environment (what a researcher or the sensors would change) ----------
export const sim = {
  setHands(inWater: boolean) {
    const s = device.get();
    if (s.hands === inWater) return;
    device.set({ hands: inWater });
    emit({ type: 'hands', in: inWater });
    if (!inWater && s.sessionActive && ['ramping', 'running', 'switching', 'hold'].includes(s.mode)) {
      if (draft) draft.handOuts += 1;
      beginPause('hand_out');
      device.set({ mode: 'lowering', pauseReason: 'hand_out', finishing: false });
    }
  },
  setBluetooth(connected: boolean) {
    if (device.get().bt === connected) return;
    if (!connected) {
      device.set({ bt: false });
      listeners.forEach((l) => l({ type: 'bt', connected: false }));
    } else {
      device.set({ bt: true });
      listeners.forEach((l) => l({ type: 'bt', connected: true }));
      const q = queued;
      queued = [];
      q.forEach((e) => listeners.forEach((l) => l(e)));
    }
  },
  setBattery(pct: number) {
    const s = device.get();
    device.set({ battery: clamp(pct, 0, 100) });
    if (s.sessionActive && ['ramping', 'running', 'switching', 'hold'].includes(s.mode)) checkBatteryMidSession();
  },
  setLevel(ok: boolean) {
    const s = device.get();
    device.set({ levelOk: ok });
    if (!ok && s.sessionActive && draft) {
      draft.lowWater = true;
      emit({ type: 'water_low' });
    }
  },
  setSpeed(speed: number) {
    device.set({ speed });
  },
  setWater(us: number, tempC?: number) {
    world.set({ waterBaseUs: us, ...(tempC !== undefined ? { tempC } : {}) });
  },
  addBakingSoda() {
    world.set((w) => ({ ...w, waterBaseUs: w.waterBaseUs + 380 }));
  },
  addWater() {
    device.set({ levelOk: true });
  },
  readWater() {
    const w = world.get();
    const s = device.get();
    const raw = correctedToRaw(w.waterBaseUs, w.tempC) * noise(0.04);
    const tempC = Math.round((w.tempC + (Math.random() - 0.5) * 0.6) * 10) / 10;
    return { rawUs: raw, tempC, levelOk: s.levelOk, us: correctForTemp(raw, tempC) };
  },
  resetDevice() {
    draft = null;
    openPause = null;
    queued = [];
    device.set({
      mode: 'idle',
      sessionActive: false,
      hands: false,
      bt: true,
      cmdMa: 0,
      deliveredMa: 0,
      voltage: 0,
      pauseReason: null,
      finishing: false,
      notReaching: false,
      severe: false,
      levelOk: true,
    });
  },
};

const correctedToRaw = (us25: number, tempC: number) => us25 * (1 + 0.02 * (tempC - 25));

function checkBatteryMidSession() {
  const s = device.get();
  if (!draft) return;
  const left = minutesOfCharge(s.battery) - FW.RESERVE_MIN;
  const need = s.remainingSec / 60;
  if (s.battery <= 20) {
    if (left < need) {
      const newRemain = Math.max(60, Math.floor(left) * 60);
      draft.endReason = 'battery';
      draft.partial = true;
      device.set({ remainingSec: Math.min(s.remainingSec, newRemain) });
      emit({ type: 'battery_low', minutesLeft: Math.max(1, Math.floor(left)), shortened: true });
    } else {
      emit({ type: 'battery_low', minutesLeft: Math.floor(left), shortened: false });
    }
  }
}

// ---------- self-test (PRD 6.12 step 2) ----------
export function runSelfTest(): Promise<SelfTestResult> {
  const s = device.get();
  if (s.sessionActive || s.selfTest.running) return Promise.reject(new Error('busy'));
  const f = world.get().faults;
  device.set({ mode: 'selftest', selfTest: { running: true, progress: 0, last: s.selfTest.last } });
  return new Promise((resolve) => {
    const steps = 30;
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      device.set((d) => ({ ...d, selfTest: { ...d.selfTest, progress: i / steps } }));
      if (i >= steps) {
        window.clearInterval(timer);
        const battOk = !f.batterySag && device.get().battery > 10;
        const result: SelfTestResult = {
          at: now(),
          pass: !f.outputBad && !f.polarityBad && battOk && !f.panelBad,
          loadKohm: f.outputBad ? 1.19 : 1.0,
          checks: [
            {
              name: 'Output accuracy',
              ok: !f.outputBad,
              detail: f.outputBad ? 'Delivered 14% below what was asked' : 'Within 2% of what was asked',
            },
            {
              name: 'Direction switching',
              ok: !f.polarityBad,
              detail: f.polarityBad ? 'Direction did not switch cleanly' : 'Switched cleanly',
            },
            {
              name: 'Battery under load',
              ok: battOk,
              detail: battOk ? 'Holds steady under load' : 'Charge sagged under load',
            },
            {
              name: 'Control Panel buttons and screen',
              ok: !f.panelBad,
              detail: f.panelBad ? 'The Up button did not respond' : 'All four buttons and the screen respond',
            },
          ],
        };
        device.set((d) => ({
          ...d,
          mode: 'idle',
          selfTest: { running: false, progress: 1, last: result },
        }));
        resolve(result);
      }
    }, 220);
  });
}

// ---------- the 5 Hz physics loop ----------
const TICK_MS = 200;

function tick() {
  const s = device.get();
  const w = world.get();
  const dt = (TICK_MS / 1000) * s.speed;
  const patch: Partial<DeviceState> = {};

  const R = resistanceNow();
  patch.resistance = R;

  const loaded = ['ramping', 'running', 'switching', 'hold', 'lowering'].includes(s.mode);
  if (loaded) patch.battery = Math.max(0, s.battery - (FW.BATTERY_PER_MIN / 60) * dt);

  if (!s.sessionActive) {
    // idle: current is zero, readings sit at zero
    if (s.mode !== 'selftest' && (s.cmdMa !== 0 || s.deliveredMa !== 0)) {
      patch.cmdMa = 0;
      patch.deliveredMa = 0;
      patch.voltage = 0;
    }
    if (s.panelFlash && Date.now() - s.panelFlash.at > 600) patch.panelFlash = null;
    if (Object.keys(patch).length) device.set(patch);
    return;
  }

  let { cmdMa, mode, remainingSec, elapsedSec } = s;
  let polarity = s.polarity;
  let polaritySwitches = s.polaritySwitches;
  let clockSec = s.clockSec;
  let pausedSec = s.pausedSec;

  clockSec += dt;
  const timerRuns = mode === 'ramping' || mode === 'running' || mode === 'switching' || (mode === 'hold' && w.holdCounts);

  const down = (rate: number) => Math.max(0, cmdMa - rate * dt);
  const up = (target: number) => Math.min(target, cmdMa + FW.RAMP_UP * dt);

  switch (mode) {
    case 'armed':
      if (s.hands) mode = 'ramping';
      break;
    case 'ramping':
      cmdMa = up(s.setMa);
      // Cmd above a lowered set point comes down quickly
      if (cmdMa > s.setMa) cmdMa = s.setMa;
      if (cmdMa >= s.setMa - 0.05) mode = 'running';
      break;
    case 'running':
      if (cmdMa > s.setMa) cmdMa = s.setMa;
      else if (cmdMa < s.setMa) cmdMa = up(s.setMa);
      if (elapsedSec >= s.plannedSec / 2 && polaritySwitches === 0 && remainingSec > 30) {
        mode = 'switching';
        emit({ type: 'polarity' });
      }
      break;
    case 'switching': {
      if (polarity === s.polarity && polaritySwitches === 0) {
        cmdMa = down(FW.RAMP_DOWN * 2);
        if (cmdMa <= 0.01) {
          cmdMa = 0;
          polarity = (s.polarity * -1) as 1 | -1;
          polaritySwitches = 1;
        }
      } else {
        cmdMa = up(s.setMa);
        if (cmdMa >= s.setMa - 0.05) mode = 'running';
      }
      break;
    }
    case 'hold': {
      const target = Math.min(holdLevel(s.setMa), s.setMa);
      cmdMa = cmdMa > target ? down(FW.RAMP_DOWN) : up(target);
      if (cmdMa < target && cmdMa > target - 0.05) cmdMa = target;
      break;
    }
    case 'lowering': {
      const rate = s.pauseReason === 'hand_out' ? FW.FAST_DOWN : FW.RAMP_DOWN;
      cmdMa = down(rate);
      if (cmdMa <= 0.01) {
        cmdMa = 0;
        if (s.finishing) {
          device.set({ ...patch, mode: 'lowering', cmdMa: 0, clockSec });
          finish();
          return;
        }
        mode = 'safe';
        emit({ type: 'safe', reason: s.pauseReason === 'hand_out' ? 'hand_out' : 'pause' });
      }
      break;
    }
    case 'safe':
      pausedSec += dt;
      if (openPause) openPause.lengthSec += dt;
      break;
    default:
      break;
  }
  if (mode === 'hold' && openPause && !w.holdCounts) openPause.lengthSec += dt;
  if (mode === 'lowering' && openPause) openPause.lengthSec += dt;

  if (timerRuns) {
    elapsedSec += dt;
    remainingSec = Math.max(0, remainingSec - dt);
  }

  // physics: what actually reaches the skin
  const vMax = FW.V_MAX * w.vMaxFactor * (w.faults.outputBad ? 0.86 : 1);
  const maxDeliverable = vMax / R;
  const deliveredMa = Math.min(cmdMa, maxDeliverable) * (cmdMa > 0 ? noise(0.012) : 1);
  const voltage = deliveredMa * R;

  const reaching = s.setMa > 0 ? deliveredMa / s.setMa : 1;
  const notReaching = mode === 'running' && cmdMa >= s.setMa - 0.1 && reaching < 0.9;
  const severe = notReaching && reaching < 0.6;

  if (draft) {
    draft.polaritySwitches = polaritySwitches;
    if (mode === 'running' || mode === 'switching' || mode === 'ramping') {
      draft.elapsedSec = elapsedSec;
    }
    if (mode === 'running') {
      draft.runSec += dt;
      if (reaching >= 0.9) draft.fullSec += dt;
      draft.sumDelRun += deliveredMa * dt;
      draft.minDelRun = Math.min(draft.minDelRun, deliveredMa);
      draft.sumR += R * dt;
      draft.nR += dt;
    }
    if (notReaching && !draft.notReaching) {
      draft.notReaching = true;
      emit({ type: 'not_reaching', severe });
    }
    if (clockSec - draft.lastSampleClock >= 5 && mode !== 'armed') {
      draft.lastSampleClock = clockSec;
      draft.samples.push({
        t: Math.round(clockSec),
        set: s.setMa,
        del: Math.round(deliveredMa * 10) / 10,
        r: Math.round(R * 100) / 100,
        st: mode === 'hold' ? 'hold' : ['safe', 'lowering'].includes(mode) ? 'pause' : 'run',
      });
    }
  }

  device.set({
    ...patch,
    mode,
    cmdMa,
    deliveredMa,
    voltage,
    remainingSec,
    elapsedSec,
    clockSec,
    polarity,
    polaritySwitches,
    pausedSec,
    notReaching,
    severe,
    panelFlash: s.panelFlash && Date.now() - s.panelFlash.at > 600 ? null : s.panelFlash,
  });

  // natural end of the planned time
  if (mode !== 'lowering' && mode !== 'safe' && mode !== 'armed' && remainingSec <= 0 && timerRuns) {
    device.set({ mode: 'lowering', finishing: true });
    if (draft) draft.partial = draft.endReason === 'battery';
  }
}

declare global {
  interface Window {
    __drysyncTick?: number;
  }
}
if (typeof window !== 'undefined') {
  if (window.__drysyncTick) window.clearInterval(window.__drysyncTick);
  window.__drysyncTick = window.setInterval(tick, TICK_MS);
}

export const statusColor = (s: DeviceState): StatusColor => {
  if (!s.sessionActive) return 'gray';
  if (s.severe) return 'red';
  switch (s.mode) {
    case 'ramping':
    case 'running':
    case 'switching':
      return 'blue';
    case 'safe':
      return s.pauseReason === 'hand_out' ? 'amber' : 'green';
    case 'complete':
      return 'green';
    default:
      return 'amber';
  }
};

export const draftOf = () => draft;
