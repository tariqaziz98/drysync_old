import { useDeviceView, useNowMs } from '../components/hooks';
import { ui } from '../lib/ui';
import { mmss } from '../lib/clock';
import { statusColor } from '../device/sim';

const COLORS = { blue: '#4d86ff', amber: '#f0a030', green: '#2ed08c', red: '#ff6b6a', gray: '#8aa0b2' };

/** Lock screen + Dynamic Island view of a running session (F22, S21). */
export function LockScreen() {
  const v = useDeviceView();
  const col = COLORS[statusColor(v)];
  const t = new Date(useNowMs(15000));
  const label = !v.sessionActive ? 'No session' : v.mode === 'safe' || v.mode === 'complete' ? 'Safe to lift' : v.mode === 'hold' ? 'On hold (call)' : v.mode === 'lowering' ? 'Lowering…' : 'Running';
  const rem = v.stale ? v.estRemaining : v.remainingSec;
  const pct = v.plannedSec ? Math.max(0, Math.min(100, ((v.plannedSec - rem) / v.plannedSec) * 100)) : 0;
  return (
    <div className="lock" onClick={() => ui.set({ lockPreview: false })} role="dialog" aria-label="Lock screen preview. Tap to close.">
      <div className="island-live"><span className="d" style={{ background: col }} />{v.sessionActive ? mmss(rem) : '--:--'}</div>
      <div style={{ opacity: 0.8, fontWeight: 600 }}>{t.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div className="clock">{t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/ ?[AP]M/, '')}</div>
      <div className="la">
        <div className="top"><span>DrySync · DryTray</span><span style={{ color: col }}>● {label}</span></div>
        <div className="time">{v.sessionActive ? mmss(rem) : '--:--'} <span style={{ fontSize: 16, opacity: 0.7 }}>left</span></div>
        <div className="bar"><i style={{ width: pct + '%', background: col }} /></div>
      </div>
      <p style={{ marginTop: 'auto', marginBottom: 40, opacity: 0.6, fontSize: 13 }}>Tap anywhere to go back</p>
    </div>
  );
}
