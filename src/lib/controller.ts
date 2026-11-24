// The app's brain. Voice, the Control Panel, the phone screen and Call Guard all
// funnel into the same few actions here, and every action only *asks* the device.
import {
  device,
  minutesOfCharge,
  onDeviceEvent,
  resistanceNow,
  sim,
  tray,
  FW,
  world,
  type DeviceEvent,
  type SessionDraft,
} from '../device/sim';
import { data, update, uid } from './data';
import { ui, nav, toast, logEvent, type SessionCtx } from './ui';
import { chime, speak } from './audio';
import { DAY, dateKey, fmtTime, mmss, now } from './clock';
import { WATER, waterAgeMin, zoneAdvice, zoneOf } from './water';
import { missedToday, nextSession } from './schedule';
import { relapseCheck } from './insights';
import type {
  AppNotification,
  NotifType,
  SessionRecord,
  SweatRating,
  Source,
  WaterRecord,
} from '../types';

// ---------------------------------------------------------------- speech
let sayId = 0;
export function say(text: string, heard?: string) {
  const id = ++sayId;
  ui.set({ assistant: { id, text, heard } });
  logEvent(`Tray says: ${text}`);
  speak(text);
  window.setTimeout(() => {
    if (ui.get().assistant?.id === id) ui.set({ assistant: null });
  }, 6500);
}

const SOURCE_SAYS: Source[] = ['voice', 'panel'];

// ---------------------------------------------------------------- start
export function requestStart(source: Source, opts: { skipWater?: boolean; confirmed?: boolean; minutes?: number } = {}) {
  const d = data.get();
  const s = device.get();
  if (!d.onboarded) return; // e.g. the panel button test during setup must never start a session
  if (d.safetyPassed !== true) {
    say('Sessions are locked. Please talk to a doctor before using DryTray.');
    return;
  }
  if (s.sessionActive) {
    say('A session is already running.');
    return;
  }
  if (s.mode !== 'idle') {
    say("The tray is busy. Try again in a moment.");
    return;
  }
  const wanted = opts.minutes ?? d.plan.lengthMin;
  if (minutesOfCharge() < wanted + FW.RESERVE_MIN) {
    // Never a surprise stop mid-session: say so before anything else (PRD 6.5)
    const m = Math.max(0, Math.floor(minutesOfCharge() - FW.RESERVE_MIN));
    ui.set({ startIssue: { kind: 'battery', minutesLeft: m, plannedMin: wanted }, safetySheet: false });
    say(`Battery low: about ${m} minutes left. Charge your tray before starting.`);
    return;
  }
  const last = d.waterChecks[d.waterChecks.length - 1];
  const stale = waterAgeMin(last, now()) > WATER.VALID_MIN;
  if (source === 'app') {
    if (stale && !opts.skipWater) {
      ui.set({ autoStartAfterWater: true });
      nav.push('water');
      return;
    }
    if (!opts.confirmed) {
      ui.set({ safetySheet: true });
      return;
    }
  }

  const first = !d.firstSessionDone;
  const cap = d.plan.comfortLimitMa ?? 14;
  const setMa = first ? 6 : Math.min(d.plan.targetMa, cap);
  const res = tray.start({
    plannedMin: opts.minutes ?? d.plan.lengthMin,
    setMa,
    comfortCap: cap,
    insert: d.mode === 'insert',
    firstSession: first,
    source,
  });
  ui.set({ safetySheet: false, autoStartAfterWater: false });
  if (!res.ok) {
    if (res.reason === 'battery') {
      const m = Number(res.detail?.minutesLeft ?? 0);
      ui.set({ startIssue: { kind: 'battery', minutesLeft: m, plannedMin: d.plan.lengthMin } });
      say(`Battery low: about ${m} minutes left. Charge your tray before starting.`);
    }
    return;
  }
  const ctx: SessionCtx = {
    firstSession: first,
    area: d.area,
    water: stale ? null : last,
    bakingSoda: !!last?.bakingSoda && !stale,
    place: d.settings.placeTags ? d.currentPlace : null,
    lastMinuteAsked: 0,
    lastProgressAsked: 0,
    pauseAsked: false,
  };
  ui.set({ session: ctx, startIssue: null, pending: null, pauseTooLong: false });
  const extras: string[] = [];
  if (source !== 'app') {
    if (stale) extras.push("Water not checked. Starting anyway at your usual strength. Say 'check water' to test.");
    if (!(d.settings.shortSafetyReminder && d.sessions.length >= 3)) extras.push('Remove watches and rings.');
  }
  const hands = device.get().hands;
  say([...extras, hands ? 'Starting gently.' : 'Place your hands in the water when ready.'].join(' '));
}

// -------------------------------------------------------- simple commands
export const actions = {
  start: requestStart,

  pause(source: Source) {
    return tray.pause(source);
  },
  resume(source: Source) {
    const s = device.get();
    if (ui.get().call?.phase === 'ended') ui.set({ call: null });
    if (s.mode === 'hold' && ui.get().call?.phase === 'ringing') {
      say("There's a call. Say answer, decline, or pause.");
      return { ok: false };
    }
    ui.set({ pauseTooLong: false });
    return tray.resume(source);
  },
  stop(source: Source) {
    ui.set({ call: null, pauseTooLong: false });
    return tray.stop(source);
  },
  down(source: Source) {
    return tray.down(source);
  },
  up(source: Source) {
    return tray.up(source);
  },
  timeLeft() {
    const s = device.get();
    if (!s.sessionActive) {
      say('No session is running.');
      return;
    }
    const m = Math.floor(s.remainingSec / 60);
    const sec = Math.round(s.remainingSec % 60);
    say(m >= 1 ? `About ${m} minute${m === 1 ? '' : 's'} left.` : `${sec} seconds left.`);
  },
  setHands: sim.setHands,
};

// ------------------------------------------------------------ water check
export function performWaterCheck(): WaterRecord {
  const d = data.get();
  const r = sim.readWater();
  const rec: WaterRecord = {
    at: now(),
    zone: zoneOf(r.us),
    us: Math.round(r.us),
    tempC: r.tempC,
    levelOk: r.levelOk,
    place: d.settings.placeTags ? d.currentPlace : null,
    bakingSoda: false,
  };
  update((x) => ({ waterChecks: [...x.waterChecks, rec].slice(-200) }));
  return rec;
}

export function markBakingSoda() {
  update((d) => {
    const w = d.waterChecks.slice();
    if (w.length) w[w.length - 1] = { ...w[w.length - 1], bakingSoda: true };
    return { waterChecks: w };
  });
}

export function speakWaterResult(rec: WaterRecord) {
  say(zoneAdvice(rec.zone, rec.levelOk));
}

// ------------------------------------------------------------ sweat rating
export function rateSession(id: string, patch: Partial<Pick<SessionRecord, 'sweat' | 'comfort' | 'tags' | 'note'>>) {
  update((d) => ({ sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
}

export function logCheckin(rating: SweatRating, tags: string[] = []) {
  const key = dateKey(now());
  update((d) => ({
    daily: [...d.daily.filter((x) => x.date !== key), { date: key, sweat: rating, tags }],
  }));
}

export const sweatWords: Record<SweatRating, string> = {
  1: 'dry',
  2: 'mostly dry',
  3: 'damp',
  4: 'dripping',
};

function logSweatByVoice(r: SweatRating) {
  const p = ui.get().pending;
  if (p) rateSession(p.sessionId, { sweat: r });
  else logCheckin(r);
  say(`Logged: hands ${sweatWords[r]}.`);
}

export function finishLog() {
  tray.ack();
  ui.set({ pending: null, session: null });
  nav.home();
}

// -------------------------------------------------------------- Call Guard
let callTimer: number | undefined;
export const CALL_TIMEOUT_MS = 20_000; // TBD

export const callApi = {
  incoming(caller: string, favorite: boolean) {
    const d = data.get();
    const s = device.get();
    const active = ['ramping', 'running', 'switching'].includes(s.mode);
    logEvent(`Incoming call: ${caller}${favorite ? ' (favorite)' : ''}`);
    chime('call');
    if (!active) {
      toast(`Incoming call from ${caller}. No session running, so nothing changes.`);
      return;
    }
    if (d.settings.callMode === 'ignore' || (d.settings.favoritesOnly && !favorite)) {
      toast(`Call from ${caller} ignored during your session (your setting).`);
      return;
    }
    if (d.settings.callMode === 'pause') {
      tray.pause('system', 'call');
      say(`Call from ${caller}. Pausing your session so you can pick up safely.`);
      return;
    }
    tray.hold('system');
    ui.set({ call: { caller, favorite, phase: 'ringing', since: Date.now() } });
    say(`Call from ${caller}. Say answer, decline, or pause.`);
    window.clearTimeout(callTimer);
    callTimer = window.setTimeout(() => {
      if (ui.get().call?.phase === 'ringing') {
        ui.set({ call: null });
        tray.releaseHold('system');
        say('No answer. The call goes to voicemail. Bringing your strength back up.');
      }
    }, CALL_TIMEOUT_MS);
  },
  answer(via: 'voice' | 'panel' | 'app' = 'app') {
    const c = ui.get().call;
    if (!c || c.phase !== 'ringing') return;
    window.clearTimeout(callTimer);
    ui.set({ call: { ...c, phase: 'answered', since: Date.now() } });
    say(
      via === 'voice'
        ? 'Answered by your phone. Your session stays at a gentle level.'
        : 'Answered. Your session stays at a gentle level.',
    );
  },
  decline() {
    const c = ui.get().call;
    if (!c || c.phase !== 'ringing') return;
    window.clearTimeout(callTimer);
    ui.set({ call: null });
    tray.releaseHold('system');
    say('Call declined. Bringing your strength back up.');
  },
  pause() {
    const c = ui.get().call;
    if (!c) return;
    window.clearTimeout(callTimer);
    ui.set({ call: null });
    tray.pause('system', 'call');
  },
  /** The caller hung up or the user ended the call. */
  end() {
    const c = ui.get().call;
    if (!c) return;
    window.clearTimeout(callTimer);
    if (c.phase === 'ringing') {
      ui.set({ call: null });
      tray.releaseHold('system');
      say('The caller hung up. Bringing your strength back up.');
    } else {
      ui.set({ call: { ...c, phase: 'ended' } });
      say('Call ended. Resume your session?');
    }
  },
};

// ------------------------------------------------------------------ voice
export interface VoiceResult {
  heard: string;
  understood: boolean;
}

export function handleVoice(raw: string): VoiceResult {
  const heard = raw.trim();
  const t = heard
    .toLowerCase()
    .replace(/[.,!?']/g, '')
    .replace(/\b(hey siri|hey google|ok google|please|dry ?tray|dry ?sync)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const has = (re: RegExp) => re.test(t);
  logEvent(`You said: "${heard}"`);
  const s = device.get();
  const c = ui.get().call;

  const reply = (text: string, ok = true): VoiceResult => {
    say(text, heard);
    return { heard, understood: ok };
  };

  // Calls: handled by the phone's own assistant; the app only manages strength
  if (c && c.phase === 'ringing' && has(/^(answer|pick up|accept)/)) {
    toast("Handled by your phone's own assistant");
    callApi.answer('voice');
    return { heard, understood: true };
  }
  if (c && c.phase === 'ringing' && has(/^(decline|reject|ignore|dismiss)/)) {
    toast("Handled by your phone's own assistant");
    callApi.decline();
    return { heard, understood: true };
  }
  if (c && c.phase === 'ringing' && has(/pause|hold/)) {
    callApi.pause();
    return { heard, understood: true };
  }
  if (c && c.phase === 'answered' && has(/hang up|end call/)) {
    callApi.end();
    return { heard, understood: true };
  }

  // Safety first: a specific number is never accepted by voice (SR4)
  if (has(/set (the )?(strength|level|current)|\bto \d+\b|\b\d+ (milli|ma)\b/)) {
    return reply("I can't set a number by voice. Say 'turn it up a little' or 'turn it down'.", false);
  }
  if (has(/ouch|sting|stings|stinging|hurt|burn|too strong|turn (it )?down|^down$|lower|less/)) {
    tray.down('voice');
    return { heard, understood: true };
  }
  if (has(/turn (it )?up|up a little|^up$|a bit (more|higher)|higher|stronger|more/) && !has(/set up/)) {
    tray.up('voice');
    return { heard, understood: true };
  }
  const hands = t.match(/(?:my )?hands (?:are |feel )?(mostly dry|dry|damp|dripping)/);
  if (hands || (ui.get().pending && has(/^(mostly dry|dry|damp|dripping)$/))) {
    const w = hands ? hands[1] : t;
    const r: SweatRating = w === 'dry' ? 1 : w === 'mostly dry' ? 2 : w === 'damp' ? 3 : 4;
    logSweatByVoice(r);
    return { heard, understood: true };
  }
  if (has(/check (my )?water|test (my )?water/)) {
    if (s.sessionActive) return reply("I can't check the water during a session.", false);
    nav.push('water', { auto: 1 });
    return { heard, understood: true };
  }
  if (has(/time left|how much time|how long|time remaining/)) {
    actions.timeLeft();
    return { heard, understood: true };
  }
  if (has(/^(start|begin)|start (the )?(session|treatment)/)) {
    requestStart('voice');
    return { heard, understood: true };
  }
  if (has(/^(resume|continue|unpause|keep going)/)) {
    actions.resume('voice');
    return { heard, understood: true };
  }
  if (has(/^(pause|hold on|wait)/)) {
    actions.pause('voice');
    return { heard, understood: true };
  }
  if (has(/^(stop|end|finish|cancel)/)) {
    actions.stop('voice');
    return { heard, understood: true };
  }
  return reply("Sorry, I didn't catch that. Nothing has changed.", false);
}

// --------------------------------------------------------- device events
function speakCmd(e: Extract<DeviceEvent, { type: 'cmd' }>) {
  const spoken = SOURCE_SAYS.includes(e.source);
  const r = e.result;
  if (e.name === 'stop' && r.ok && !device.get().sessionActive) {
    // Stopped while still waiting for hands: nothing was delivered or logged
    if (spoken) say('Okay, cancelled. Nothing was started.');
    return;
  }
  if (e.name !== 'start' && !device.get().sessionActive && r.reason !== 'no_hands') {
    // Nothing is running: only a voice command deserves an answer
    if (e.source === 'voice' && e.name !== 'down') say('No session is running.');
    return;
  }
  const fail = (text: string) => (spoken ? say(text) : toast(text));
  switch (e.name) {
    case 'pause':
      if (r.ok && spoken) say('Pausing. Lowering strength.');
      break;
    case 'resume':
      if (r.ok && r.reason === 'already_running') {
        if (spoken) say("It's already running.");
      } else if (r.ok) {
        if (spoken) say('Resuming. Strength coming up gently.');
      } else if (r.reason === 'no_hands') fail("I can't tell your hands are in the water. Put them in, then resume.");
      else if (r.reason === 'no_session' && spoken) say('No session to resume.');
      break;
    case 'stop':
      if (r.ok && spoken) say('Finishing early. Lowering strength.');
      break;
    case 'down':
      if (spoken) say("Lowered. Say 'down' again to lower more, or 'pause' to stop.");
      else toast('Strength lowered');
      break;
    case 'up':
      if (r.ok) {
        if (spoken) say('Up a little.');
      } else if (r.reason === 'at_limit') fail("That's your comfort limit, so I won't go higher.");
      else if (r.reason === 'too_soon') fail(`Give it ${r.detail?.waitSec ?? 10} more seconds before going up again.`);
      else if (r.reason === 'not_running') fail('Strength can only go up while a session is running.');
      break;
    default:
      break;
  }
}

function buildRecord(draft: SessionDraft, ctx: SessionCtx): SessionRecord {
  const run = draft.samples.filter((x) => x.st === 'run');
  const q = Math.max(1, Math.floor(run.length / 4));
  const avgR = (xs: { r: number }[]) => (xs.length ? xs.reduce((a, b) => a + b.r, 0) / xs.length : 0);
  const trend = run.length >= 4 ? avgR(run.slice(-q)) - avgR(run.slice(0, q)) : 0;
  const r = (v: number) => Math.round(v * 100) / 100;
  const avgResistance = draft.nR > 0 ? draft.sumR / draft.nR : resistanceNow();
  return {
    id: uid(),
    start: draft.startedAt,
    end: now(),
    plannedMin: Math.round(draft.plannedSec / 60),
    actualMin: Math.round((draft.elapsedSec / 60) * 10) / 10,
    area: ctx.area,
    mode: draft.trayMode,
    setMa: draft.finalSetMa,
    avgDeliveredMa: draft.runSec > 0 ? Math.round((draft.sumDelRun / draft.runSec) * 10) / 10 : 0,
    minDeliveredMa: draft.minDelRun > 90 ? 0 : Math.round(draft.minDelRun * 10) / 10,
    fullStrengthShare: draft.elapsedSec > 0 ? Math.min(1, draft.fullSec / draft.elapsedSec) : 0,
    avgResistance: r(avgResistance),
    resistanceTrend: r(trend),
    polaritySwitches: draft.polaritySwitches,
    pauses: draft.pauses.map((p) => ({ ...p, lengthSec: Math.round(p.lengthSec) })),
    quickDrops: draft.quickDrops,
    handOuts: draft.handOuts,
    water: ctx.water,
    bakingSoda: ctx.bakingSoda,
    place: ctx.place,
    sweat: null,
    comfort: null,
    tags: [],
    note: '',
    firmware: data.get().device.firmware,
    partial: draft.partial,
    endReason: draft.endReason,
    notReaching: draft.notReaching,
    lowWater: draft.lowWater,
    firstSession: draft.firstSession,
    samples: draft.samples,
  };
}

function onComplete(draft: SessionDraft, late: boolean) {
  const ctx: SessionCtx = ui.get().session ?? {
    firstSession: draft.firstSession,
    area: data.get().area,
    water: null,
    bakingSoda: false,
    place: null,
    lastMinuteAsked: 0,
    lastProgressAsked: 0,
    pauseAsked: false,
  };
  const rec = buildRecord(draft, ctx);
  let newLimit: number | null = null;
  update((d) => {
    const patch: Partial<typeof d> = { sessions: [...d.sessions, rec] };
    if (draft.firstSession) {
      // Save the highest comfortable strength as the comfort limit (PRD 6.2)
      newLimit = Math.max(6, draft.quickDrops > 0 ? draft.finalSetMa : draft.maxSetMa);
      patch.plan = { ...d.plan, comfortLimitMa: newLimit, targetMa: Math.max(6, Math.round(newLimit * 0.9)) };
      patch.firstSessionDone = true;
    }
    if (draft.trayMode === 'insert') patch.device = { ...d.device, insertSessions: d.device.insertSessions + 1 };
    return patch;
  });
  ui.set({
    pending: { sessionId: rec.id, draft, lowWater: draft.lowWater, newLimit },
    session: null,
    call: null,
    pauseTooLong: false,
  });
  if (late) {
    toast('Your session finished normally. The log has synced.');
    return;
  }
  say(
    draft.partial
      ? 'Safe to lift your hands. Session ended early. How were your hands today? Say dry, mostly dry, damp, or dripping.'
      : 'Safe to lift your hands. Session done. How were your hands today? Say dry, mostly dry, damp, or dripping.',
  );
}

function onEvent(e: DeviceEvent) {
  const late = !!e.late;
  switch (e.type) {
    case 'cmd':
      if (!late) speakCmd(e);
      break;
    case 'safe':
      if (late) break;
      if (e.reason === 'hand_out') {
        chime('alert');
        say("Paused. Put your hands back and press the button or say 'resume'.");
      } else {
        chime('safe');
        if (e.reason === 'pause') say('Safe to lift your hands.');
      }
      break;
    case 'hands':
      if (late) break;
      if (e.in && device.get().mode === 'safe' && device.get().pauseReason === 'hand_out') {
        toast("Hands detected. Press the button or say 'resume'.");
      }
      break;
    case 'polarity':
      if (!late) {
        toast('Switching direction. You may feel a brief change.');
        if (data.get().settings.spoken) say('Switching direction. You may feel a brief change.');
      }
      break;
    case 'not_reaching':
      if (!late) toast("Not reaching full strength. We'll look at this after the session.", 5000);
      break;
    case 'water_low':
      logEvent('Water level dropped (shown after the session)');
      break;
    case 'battery_low':
      if (!late) {
        say(
          e.shortened
            ? `Battery low: about ${e.minutesLeft} minutes left. We'll finish a little early to stay safe.`
            : `Battery low: about ${e.minutesLeft} minutes left, enough to finish.`,
        );
      }
      break;
    case 'complete':
      onComplete(e.draft, late);
      break;
    case 'bt':
      if (!e.connected) {
        logEvent('Bluetooth lost. The tray keeps running on its own.');
        toast('Bluetooth lost. Your tray keeps running safely on its own.', 5000);
      } else {
        toast('Reconnected to your tray.');
      }
      break;
    case 'panel_start':
      requestStart('panel', { skipWater: true, confirmed: true });
      break;
    case 'panel_call': {
      const c = ui.get().call;
      const pauseOnly = world.get().callControl === 'pauseOnly';
      if (pauseOnly) {
        window.clearTimeout(callTimer);
        ui.set({ call: null });
        tray.pause('panel', 'call');
        say('Pausing for your call.');
      } else if (c?.phase === 'ringing') {
        if (e.long) callApi.decline();
        else callApi.answer('panel');
      } else if (c?.phase === 'answered') callApi.end();
      break;
    }
    default:
      break;
  }
}

// -------------------------------------------------------------- notifications
export function notify(
  type: NotifType,
  title: string,
  body: string,
  opts: { key?: string; force?: boolean } = {},
): boolean {
  const d = data.get();
  const t = now();
  const id = `${type}:${opts.key ?? uid()}`;
  if (d.notifications.some((n) => n.id === id)) return false;
  if (!opts.force) {
    if (!d.settings.notifOn[type]) return false;
    const today = d.notifications.filter((n) => dateKey(n.at) === dateKey(t)).length;
    if (today >= 2) return false; // at most two a day
  }
  const n: AppNotification = { id, type, title, body, at: t, read: false };
  update((x) => ({ notifications: [n, ...x.notifications].slice(0, 60) }));
  ui.set({ banner: n });
  chime('tap');
  window.setTimeout(() => {
    if (ui.get().banner?.id === id) ui.set({ banner: null });
  }, 6000);
  return true;
}

export function runScheduler() {
  const d = data.get();
  if (!d.onboarded) return;
  const t = now();
  const today = dateKey(t);
  const next = nextSession(d, t);
  const hr = new Date(t).getHours() * 60 + new Date(t).getMinutes();
  const [ch, cm] = d.settings.checkinTime.split(':').map(Number);

  if (d.settings.remindersOn && next && next.today && next.at - t < 90 * 60_000 && next.at - t > -30 * 60_000) {
    notify('reminder', 'DrySync', `Session ${new Date(next.at).getHours() >= 17 ? 'tonight' : 'today'} at ${fmtTime(next.at)}? Takes about ${d.plan.lengthMin + 5} minutes.`, { key: `rem-${today}` });
  }
  if (missedToday(d, t)) {
    notify('reschedule', 'DrySync', `Missed today. Tomorrow at ${fmtTime(new Date(t + DAY).setHours(Number(d.plan.time.split(':')[0]), Number(d.plan.time.split(':')[1])))} instead?`, { key: `miss-${today}` });
  }
  if (d.settings.checkinOn && hr >= ch * 60 + cm && !d.daily.some((x) => x.date === today) && !d.sessions.some((s) => dateKey(s.start) === today)) {
    notify('checkin', 'DrySync', 'How are your hands today?', { key: `chk-${today}` });
  }
  if (device.get().battery < 40 && next && next.today && next.at - t < 4 * 3_600_000) {
    notify('charge', 'DrySync', "Charge your DryTray before tonight's session.", { key: `chg-${today}` });
  }
  if (relapseCheck(d, t).warn) {
    notify('relapse', 'DrySync', 'Your hands have been sweatier lately. Try a booster week?', { key: `rel-${Math.floor(t / (5 * DAY))}` });
  }
  for (const dx of d.diagnoses) {
    if (!dx.done && dx.followUpAt <= t) notify('followup', 'DrySync', "Let's see if the fix helped.", { key: `fu-${dx.id}` });
  }
}

// ------------------------------------------------- watchers + initialisation
let started = false;
export function initController() {
  if (started) return;
  started = true;
  onDeviceEvent(onEvent);

  device.subscribe(() => {
    const s = device.get();
    const ctx = ui.get().session;
    if (!ctx || !s.sessionActive) return;

    if (s.mode === 'running') {
      const minute = Math.floor(s.elapsedSec / 60);
      if (ctx.firstSession && minute > ctx.lastMinuteAsked && s.remainingSec > 30) {
        ctx.lastMinuteAsked = minute;
        say("How does it feel? Say 'up a little' or 'down'.");
      }
      const set = data.get().settings;
      const every = Math.floor(s.remainingSec / 300);
      if (set.spokenProgress && every !== ctx.lastProgressAsked && s.remainingSec > 60 && s.remainingSec % 300 < 8) {
        ctx.lastProgressAsked = every;
        say(`About ${Math.round(s.remainingSec / 60)} minutes left.`);
      }
    }
    if (s.mode === 'safe') {
      if (s.pausedSec > FW.PAUSE_TOO_LONG_S && !ctx.pauseAsked && !s.finishing) {
        ctx.pauseAsked = true;
        ui.set({ pauseTooLong: true });
        say('Do you want to finish this session or continue?');
      }
    } else if (s.pausedSec < 5) ctx.pauseAsked = false;
  });
}

export const fmtRemaining = mmss;
