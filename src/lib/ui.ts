import { createStore } from './store';
import type { AppNotification, Area, WaterRecord } from '../types';
import type { SessionDraft } from '../device/sim';

export type Tab = 'today' | 'history' | 'insights' | 'more';

export type RouteName =
  | 'water'
  | 'plan'
  | 'sessionDetail'
  | 'diagnosis'
  | 'travel'
  | 'deviceHealth'
  | 'privacy'
  | 'report'
  | 'notifications'
  | 'settings'
  | 'callSettings'
  | 'reminders'
  | 'tutorial';

export interface Route {
  name: RouteName;
  params?: Record<string, string | number | boolean>;
}

export interface CallState {
  caller: string;
  favorite: boolean;
  phase: 'ringing' | 'answered' | 'ended';
  since: number;
}

export interface SessionCtx {
  firstSession: boolean;
  area: Area;
  water: WaterRecord | null;
  bakingSoda: boolean;
  place: string | null;
  lastMinuteAsked: number;
  lastProgressAsked: number;
  pauseAsked: boolean;
}

export interface PendingLog {
  sessionId: string;
  draft: SessionDraft;
  lowWater: boolean;
  newLimit: number | null;
}

export interface UIState {
  tab: Tab;
  stack: Route[];
  assistant: { id: number; text: string; heard?: string } | null;
  toast: { id: number; text: string } | null;
  banner: AppNotification | null;
  call: CallState | null;
  session: SessionCtx | null;
  pending: PendingLog | null;
  startIssue: { kind: 'battery'; minutesLeft: number; plannedMin: number } | null;
  consoleOpen: boolean;
  lockPreview: boolean;
  safetySheet: boolean;
  autoStartAfterWater: boolean;
  pauseTooLong: boolean;
  firstSessionTutorial: boolean;
  listening: boolean;
  log: { t: number; text: string }[];
}

export const ui = createStore<UIState>({
  tab: 'today',
  stack: [],
  assistant: null,
  toast: null,
  banner: null,
  call: null,
  session: null,
  pending: null,
  startIssue: null,
  consoleOpen: false,
  lockPreview: false,
  safetySheet: false,
  autoStartAfterWater: false,
  pauseTooLong: false,
  firstSessionTutorial: false,
  listening: false,
  log: [],
});

export const nav = {
  push(name: RouteName, params?: Route['params']) {
    ui.set((s) => ({ ...s, stack: [...s.stack, { name, params }] }));
  },
  back() {
    ui.set((s) => ({ ...s, stack: s.stack.slice(0, -1) }));
  },
  tab(tab: Tab) {
    ui.set({ tab, stack: [] });
  },
  home() {
    ui.set({ tab: 'today', stack: [] });
  },
};

let n = 0;
export const toast = (text: string, ms = 3200) => {
  const id = ++n;
  ui.set({ toast: { id, text } });
  window.setTimeout(() => {
    if (ui.get().toast?.id === id) ui.set({ toast: null });
  }, ms);
};

export const logEvent = (text: string) => {
  ui.set((s) => ({ ...s, log: [{ t: Date.now(), text }, ...s.log].slice(0, 60) }));
};
