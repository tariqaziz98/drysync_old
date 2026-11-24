import { data } from './data';

let ctx: AudioContext | null = null;
const ac = () => {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

function beep(freq: number, start: number, dur: number, gain = 0.12) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export const chime = (kind: 'safe' | 'call' | 'alert' | 'tap') => {
  if (kind === 'safe') {
    beep(659, 0, 0.35);
    beep(880, 0.18, 0.5);
    beep(1175, 0.4, 0.7);
  } else if (kind === 'call') {
    beep(520, 0, 0.18);
    beep(520, 0.26, 0.18);
  } else if (kind === 'alert') beep(330, 0, 0.4, 0.1);
  else beep(740, 0, 0.06, 0.06);
};

export const speak = (text: string) => {
  if (!data.get().settings.spoken) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    synth.speak(u);
  } catch {
    /* speech unavailable */
  }
};

// ---- optional real microphone (Chrome/Safari). The simulated "Say…" box always works. ----
type Rec = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
let rec: Rec | null = null;
let wanted = false;

export const micSupported = () =>
  typeof window !== 'undefined' &&
  !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

export function startMic(onText: (t: string) => void, onState: (on: boolean) => void) {
  const W = window as unknown as Record<string, new () => Rec>;
  const R = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!R) return false;
  wanted = true;
  rec = new R();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) onText(r[0].transcript);
    }
  };
  rec.onend = () => {
    if (wanted) {
      try {
        rec?.start();
      } catch {
        onState(false);
      }
    } else onState(false);
  };
  rec.onerror = () => {
    /* onend handles restart or stop */
  };
  try {
    rec.start();
    onState(true);
    return true;
  } catch {
    onState(false);
    return false;
  }
}

export function stopMic(onState: (on: boolean) => void) {
  wanted = false;
  try {
    rec?.stop();
  } catch {
    /* ignore */
  }
  onState(false);
}
