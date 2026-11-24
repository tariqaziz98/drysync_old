import { useEffect, useState } from 'react';
import { device, type DeviceState } from '../device/sim';
import { useStore } from '../lib/store';

// The phone's last good picture of the tray. When Bluetooth drops, the app is
// left with this and has to estimate; the tray itself keeps going (SR6).
let lastGood: DeviceState = device.get();
let lostAt: number | null = null;
device.subscribe(() => {
  const s = device.get();
  if (s.bt) {
    lastGood = s;
    lostAt = null;
  } else if (lostAt === null) lostAt = Date.now();
});

export interface DeviceView extends DeviceState {
  stale: boolean;
  estRemaining: number;
}

export function useNowMs(ms = 1000, active = true) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setT(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return t;
}

export function useDeviceView(): DeviceView {
  const s = useStore(device, (x) => x);
  const tick = useNowMs(1000, !s.bt);
  if (s.bt) return { ...s, stale: false, estRemaining: s.remainingSec };
  const f = lastGood;
  const runs = ['ramping', 'running', 'switching'].includes(f.mode);
  const elapsed = lostAt ? (Math.max(tick, lostAt) - lostAt) / 1000 * f.speed : 0;
  return { ...f, bt: false, stale: true, estRemaining: runs ? Math.max(0, f.remainingSec - elapsed) : f.remainingSec };
}

export function useNowTick(ms = 1000) {
  useNowMs(ms);
}
