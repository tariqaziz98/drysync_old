// All app logic reads time from here so the researcher console can move the
// calendar forward ("+1 day") during a usability test.
let offset = 0;

export const setClockOffset = (ms: number) => {
  offset = ms;
};
export const now = () => Date.now() + offset;

export const DAY = 86_400_000;

export const dateKey = (t: number) => {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });

export const fmtDayLong = (t: number) =>
  new Date(t).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
