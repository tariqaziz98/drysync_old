import { createStore } from './store';
import { now, setClockOffset, startOfDay } from './clock';
import type { AppData, NotifType } from '../types';
import { FW } from '../device/sim';

const KEY = 'drysync.data.v1';

export const defaultData = (): AppData => ({
  version: 1,
  onboarded: false,
  safetyPassed: null,
  safetyFlags: [],
  area: 'hands',
  siriAdded: [],
  plan: {
    phase: 'starting',
    sessionsPerWeek: 4,
    lengthMin: 20,
    comfortLimitMa: null,
    targetMa: 8,
    startDate: startOfDay(now()),
    days: [1, 2, 4, 6],
    time: '20:00',
    boosterUntil: null,
  },
  settings: {
    callMode: 'ask',
    favoritesOnly: false,
    favorites: ['Sarah', 'Mom'],
    spoken: true,
    spokenProgress: false,
    controlStyle: 'both',
    placeTags: false,
    communityData: false,
    remindersOn: true,
    calendarAware: true,
    checkinOn: true,
    checkinTime: '09:00',
    notifOn: {
      reminder: true,
      reschedule: true,
      checkin: true,
      water: true,
      charge: true,
      relapse: true,
      followup: true,
    } as Record<NotifType, boolean>,
    shortSafetyReminder: true,
  },
  sessions: [],
  daily: [],
  device: {
    paired: false,
    id: 'DT-4F2A',
    name: 'My DryTray',
    firmware: FW.VERSION,
    latestFirmware: FW.VERSION,
    batteryCycles: 12,
    selfTests: [],
    panelStatus: 'ok',
    insertSessions: 0,
    lastCleaned: null,
  },
  waterChecks: [],
  places: ['Home'],
  currentPlace: null,
  mode: 'tray',
  diagnoses: [],
  notifications: [],
  travel: { active: false, destination: '', startedAt: null, checklist: {} },
  clockOffsetMs: 0,
  firstSessionDone: false,
});

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as Partial<AppData>;
      const d = defaultData();
      const merged: AppData = {
        ...d,
        ...j,
        plan: { ...d.plan, ...j.plan },
        settings: { ...d.settings, ...j.settings, notifOn: { ...d.settings.notifOn, ...j.settings?.notifOn } },
        device: { ...d.device, ...j.device },
        travel: { ...d.travel, ...j.travel },
      };
      setClockOffset(merged.clockOffsetMs);
      return merged;
    }
  } catch {
    /* corrupted or unavailable storage: start fresh */
  }
  return defaultData();
}

let timer: number | undefined;
export const data = createStore<AppData>(load(), (s) => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, 150);
});

export const update = (fn: (d: AppData) => Partial<AppData>) =>
  data.set((d) => ({ ...d, ...fn(d) }));

export const replaceAll = (d: AppData) => {
  setClockOffset(d.clockOffsetMs);
  data.set(d);
};

export const resetAll = () => replaceAll(defaultData());

export const advanceClock = (days: number) => {
  const d = data.get();
  const off = d.clockOffsetMs + days * 86_400_000;
  setClockOffset(off);
  data.set({ ...d, clockOffsetMs: off });
};

export const uid = () => Math.random().toString(36).slice(2, 10);
