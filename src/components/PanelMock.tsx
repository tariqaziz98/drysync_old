import { useRef } from 'react';
import { device, statusColor, tray } from '../device/sim';
import { useStore } from '../lib/store';
import { mmss } from '../lib/clock';
import { IDown, IHangup, IPause, IPlay, IUp } from './Icons';

const COLORS = { blue: '#2a64f5', amber: '#f0a030', green: '#17a56c', red: '#d6403f', gray: '#5d7083' };

/** The tray's built-in waterproof Control Panel (PRD 9). Reads the device
 *  directly, so it keeps working when Bluetooth is down. */
export function PanelMock({ interactive = true }: { interactive?: boolean }) {
  const s = useStore(device, (x) => x);
  const col = COLORS[statusColor(s)];
  const hold = useRef<number | null>(null);
  const longFired = useRef(false);
  const label = !s.sessionActive
    ? 'Ready'
    : s.mode === 'armed'
      ? 'Waiting for hands'
      : s.mode === 'complete'
        ? 'Safe to lift'
        : s.mode === 'safe'
          ? s.pauseReason === 'hand_out' ? 'Paused' : 'Safe to lift'
          : s.mode === 'lowering'
            ? 'Lowering…'
            : s.mode === 'hold'
              ? 'On hold (call)'
              : 'Running';
  const flash = (b: string) => (s.panelFlash?.button === b ? 'flash' : '');
  const isPause = s.sessionActive && ['ramping', 'running', 'switching'].includes(s.mode);

  const callDown = () => {
    longFired.current = false;
    hold.current = window.setTimeout(() => {
      longFired.current = true;
      tray.panel('call', true);
    }, 650);
  };
  const callUp = () => {
    if (hold.current) window.clearTimeout(hold.current);
    if (!longFired.current) tray.panel('call', false);
  };

  return (
    <div className="panel-mock" aria-label="DryTray Control Panel">
      <div className="panel-screen">
        <div className="pt">{s.sessionActive ? mmss(s.remainingSec) : '--:--'}</div>
        <div className="ps">
          {label}
          {s.sessionActive && s.mode !== 'complete' ? ` · ${s.setMa.toFixed(0)} mA` : ''}
        </div>
        <div className="pband" style={{ background: col }} />
      </div>
      <div className="panel-btns">
        <button disabled={!interactive} aria-label="Pause or play" className={flash('play')} onClick={() => tray.panel('play')}>
          {isPause ? <IPause size={22} /> : <IPlay size={22} />}
        </button>
        <button
          disabled={!interactive}
          aria-label="Call: press to answer or hang up, hold to decline"
          className={flash('call')}
          onPointerDown={callDown}
          onPointerUp={callUp}
          onPointerLeave={() => hold.current && window.clearTimeout(hold.current)}
        >
          <IHangup size={22} />
        </button>
        <button disabled={!interactive} aria-label="Down" className={flash('down')} onClick={() => tray.panel('down')}>
          <IDown size={22} />
        </button>
        <button disabled={!interactive} aria-label="Up" className={flash('up')} onClick={() => tray.panel('up')}>
          <IUp size={22} />
        </button>
      </div>
    </div>
  );
}
