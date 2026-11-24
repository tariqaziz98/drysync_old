export type Source = 'voice' | 'panel' | 'app' | 'system';
export type SweatRating = 1 | 2 | 3 | 4; // 1 dry, 2 mostly dry, 3 damp, 4 dripping
export type Comfort = 'comfortable' | 'tingly' | 'uncomfortable';
export type Zone = 'soft' | 'good' | 'hard';
export type TrayMode = 'tray' | 'insert';
export type Area = 'hands' | 'feet' | 'both';
export type PauseReason = 'user' | 'call' | 'hand_out' | 'battery';

export interface Pause {
  atSec: number; // session clock (includes pauses)
  reason: PauseReason;
  lengthSec: number;
}

export interface Sample {
  t: number; // session clock seconds
  set: number;
  del: number;
  r: number; // kOhm
  st: 'run' | 'pause' | 'hold';
}

export interface WaterRecord {
  at: number;
  zone: Zone;
  us: number; // conductivity corrected to 25C, uS/cm
  tempC: number;
  levelOk: boolean;
  place: string | null;
  bakingSoda: boolean;
}

export interface SessionRecord {
  id: string;
  start: number;
  end: number;
  plannedMin: number;
  actualMin: number;
  area: Area;
  mode: TrayMode;
  setMa: number;
  avgDeliveredMa: number;
  minDeliveredMa: number;
  fullStrengthShare: number; // 0..1
  avgResistance: number; // kOhm
  resistanceTrend: number; // kOhm, end minus start
  polaritySwitches: number;
  pauses: Pause[];
  quickDrops: number;
  handOuts: number;
  water: WaterRecord | null;
  bakingSoda: boolean;
  place: string | null;
  sweat: SweatRating | null;
  comfort: Comfort | null;
  tags: string[];
  note: string;
  firmware: string;
  partial: boolean;
  endReason: 'complete' | 'user' | 'battery';
  notReaching: boolean;
  lowWater: boolean;
  firstSession: boolean;
  samples: Sample[];
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  sweat: SweatRating;
  tags: string[];
}

export interface SelfTestCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface SelfTestResult {
  at: number;
  pass: boolean;
  checks: SelfTestCheck[];
  loadKohm: number;
}

export interface DeviceRecord {
  paired: boolean;
  id: string;
  name: string;
  firmware: string;
  latestFirmware: string;
  batteryCycles: number;
  selfTests: SelfTestResult[];
  panelStatus: 'ok' | 'check';
  insertSessions: number;
  lastCleaned: number | null;
}

export interface Plan {
  phase: 'starting' | 'maintenance';
  sessionsPerWeek: number;
  lengthMin: number;
  comfortLimitMa: number | null;
  targetMa: number;
  startDate: number;
  days: number[]; // 0 = Sunday
  time: string; // HH:MM
  boosterUntil: number | null;
}

export type CallMode = 'ask' | 'pause' | 'ignore';

export interface Settings {
  callMode: CallMode;
  favoritesOnly: boolean;
  favorites: string[];
  spoken: boolean;
  spokenProgress: boolean;
  controlStyle: 'voice' | 'panel' | 'both';
  placeTags: boolean;
  communityData: boolean;
  remindersOn: boolean;
  calendarAware: boolean;
  checkinOn: boolean;
  checkinTime: string;
  notifOn: Record<NotifType, boolean>;
  shortSafetyReminder: boolean;
}

export type NotifType =
  | 'reminder'
  | 'reschedule'
  | 'checkin'
  | 'water'
  | 'charge'
  | 'relapse'
  | 'followup';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  at: number;
  read: boolean;
}

export type DiagCause = 'device' | 'water' | 'setup' | 'schedule' | 'early' | 'doctor';

export interface DiagnosisRecord {
  id: string;
  at: number;
  symptom: string;
  cause: DiagCause;
  also: DiagCause[];
  followUpAt: number;
  fullStrengthBefore: number | null;
  done: boolean;
}

export interface TravelState {
  active: boolean;
  destination: string;
  startedAt: number | null;
  checklist: Record<string, boolean>;
}

export interface AppData {
  version: 1;
  onboarded: boolean;
  safetyPassed: boolean | null; // null = not answered
  safetyFlags: string[];
  area: Area;
  siriAdded: string[];
  plan: Plan;
  settings: Settings;
  sessions: SessionRecord[];
  daily: DailyRecord[];
  device: DeviceRecord;
  waterChecks: WaterRecord[];
  places: string[];
  currentPlace: string | null;
  mode: TrayMode;
  diagnoses: DiagnosisRecord[];
  notifications: AppNotification[];
  travel: TravelState;
  clockOffsetMs: number;
  firstSessionDone: boolean;
}
