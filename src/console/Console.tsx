import { useState, type ReactNode } from 'react';
import { PanelMock } from '../components/PanelMock';
import { data, advanceClock, update } from '../lib/data';
import { useStore } from '../lib/store';
import { ui, nav, toast } from '../lib/ui';
import { device, sim, world, statusColor } from '../device/sim';
import { callApi, handleVoice, notify, runScheduler } from '../lib/controller';
import { loadPreset, presetLabels, type Preset } from '../lib/seed';
import { micSupported, startMic, stopMic } from '../lib/audio';
import { fmtDay, mmss, now } from '../lib/clock';
import { IClose } from '../components/Icons';

const PHRASES = [
  'Hey Siri, start DryTray', 'Hey Siri, pause DryTray', 'Hey Siri, resume DryTray', 'Hey Siri, stop DryTray',
  'How much time is left?', 'Ouch', "It stings", 'Turn it down', 'Turn it up a little', 'Set strength to 18',
  'Check my water', 'My hands are dry', 'My hands are mostly dry', 'My hands are damp', 'My hands are dripping',
  'Answer', 'Decline',
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section style={{ borderTop: '1px solid #26384a', padding: '12px 14px' }}>
    <h4 style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: '.09em', textTransform: 'uppercase', color: '#8fb3c9' }}>{title}</h4>
    {children}
  </section>
);
const B = ({ on, children, ...p }: { on?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid #3a5268', background: on ? '#0b7a85' : '#16293b', color: '#fff', fontSize: 12.5, fontWeight: 700, margin: '0 6px 6px 0', ...p.style }}>{children}</button>
);

export function Console({ docked }: { docked: boolean }) {
  const s = useStore(device, (x) => x);
  const w = useStore(world, (x) => x);
  const call = useStore(ui, (u) => u.call);
  const log = useStore(ui, (u) => u.log);
  const listening = useStore(ui, (u) => u.listening);
  const d = useStore(data, (x) => x);
  const [say, setSay] = useState('');
  const [caller, setCaller] = useState('Sarah');
  const [fav, setFav] = useState(true);
  const [preset, setPreset] = useState<Preset>('maya');

  const submit = (text: string) => { if (text.trim()) handleVoice(text); setSay(''); };
  const toggleMic = () => {
    if (listening) stopMic((on) => ui.set({ listening: on }));
    else if (!startMic(handleVoice, (on) => ui.set({ listening: on }))) toast('Microphone not available in this browser');
  };
  const col = statusColor(s);

  return (
    <aside
      aria-label="Researcher test console"
      style={{
        width: docked ? 372 : '100%', height: docked ? 'min(864px, calc(100dvh - 56px))' : '100%', background: '#0e1c2a', color: '#e6eef4',
        borderRadius: docked ? 24 : 0, overflowY: 'auto', fontSize: 13, flex: 'none', boxShadow: '0 20px 60px rgba(8,24,40,.35)',
        position: docked ? 'relative' : 'fixed', inset: docked ? undefined : 0, zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', position: 'sticky', top: 0, background: '#0e1c2a', zIndex: 2 }}>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 15 }}>Researcher console</b>
          <div style={{ color: '#8fb3c9', fontSize: 11 }}>Wizard of Oz · participants don't see this · press ~ to hide</div>
        </div>
        <button aria-label="Close console" onClick={() => ui.set({ consoleOpen: false })} style={{ color: '#fff', padding: 8 }}><IClose size={20} /></button>
      </div>

      <Section title="Live readout">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
          <span>Mode: <b>{s.mode}</b></span><span>Status: <b>{col}</b></span>
          <span>Set / delivered: <b>{s.setMa.toFixed(0)} / {s.deliveredMa.toFixed(1)} mA</b></span>
          <span>Push: <b>{s.voltage.toFixed(1)} V</b></span>
          <span>Resistance: <b>{s.resistance.toFixed(2)} kΩ</b></span>
          <span>Time left: <b>{mmss(s.remainingSec)}</b></span>
          <span>Hands: <b>{s.hands ? 'in water' : 'out'}</b></span>
          <span>Battery: <b>{s.battery.toFixed(0)}%</b></span>
          <span>Bluetooth: <b>{s.bt ? 'connected' : 'LOST'}</b></span>
          <span>Date: <b>{fmtDay(now())}</b></span>
        </div>
      </Section>

      <Section title="Scenario">
        <select aria-label="Scenario" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#16293b', color: '#fff', border: '1px solid #3a5268', marginBottom: 8 }}>
          {(Object.keys(presetLabels) as Preset[]).map((k) => <option key={k} value={k}>{presetLabels[k]}</option>)}
        </select>
        <B onClick={() => { loadPreset(preset); toast('Scenario loaded'); }}>Load scenario</B>
        <B onClick={() => { update(() => ({ safetyPassed: true, safetyFlags: [] })); toast('Safety lock cleared'); }}>Clear safety lock</B>
        <B onClick={() => advanceClock(1)}>+1 day</B>
        <B onClick={() => { advanceClock(7); runScheduler(); }}>+7 days</B>
        <div style={{ marginTop: 4 }}>Sim speed: {[1, 5, 20, 60].map((x) => <B key={x} on={s.speed === x} onClick={() => sim.setSpeed(x)}>{x}×</B>)}</div>
      </Section>

      <Section title="Triggers: during a session">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input aria-label="Caller name" value={caller} onChange={(e) => setCaller(e.target.value)} style={{ width: 90, padding: 6, borderRadius: 8, border: '1px solid #3a5268', background: '#16293b', color: '#fff' }} />
          <label><input type="checkbox" checked={fav} onChange={(e) => setFav(e.target.checked)} /> favorite</label>
        </div>
        <B onClick={() => callApi.incoming(caller || 'Unknown', fav)}>Incoming call</B>
        <B disabled={!call} onClick={() => callApi.end()}>{call?.phase === 'ringing' ? 'Caller hangs up' : 'End call'}</B>
        <B onClick={() => sim.setHands(!s.hands)}>{s.hands ? 'Hand lifted' : 'Hands in water'}</B>
        <B on={w.vMaxFactor < 1} onClick={() => world.set({ vMaxFactor: w.vMaxFactor < 1 ? 1 : 0.55 })}>Strength can't be reached</B>
        <B onClick={() => sim.setLevel(false)}>Water level drops</B>
        <B onClick={() => sim.setBattery(12)}>Battery low (12%)</B>
        <B on={!s.bt} onClick={() => sim.setBluetooth(!s.bt)}>{s.bt ? 'Bluetooth lost' : 'Restore Bluetooth'}</B>
      </Section>

      <Section title="Water (real sensor feed could replace this)">
        <B onClick={() => { sim.setWater(130, 22); sim.setLevel(true); }}>Too soft</B>
        <B onClick={() => { sim.setWater(520, 24); sim.setLevel(true); }}>Good</B>
        <B onClick={() => { sim.setWater(1350, 24); sim.setLevel(true); }}>Very hard</B>
        <B onClick={() => sim.setLevel(!s.levelOk)}>{s.levelOk ? 'Level low' : 'Refill'}</B>
        <div style={{ marginTop: 4 }}>Conductivity now: <b>{Math.round(w.waterBaseUs)} µS/cm</b> · {w.tempC}°C</div>
      </Section>

      <Section title="Device state">
        <B on={w.faults.outputBad} onClick={() => world.set({ faults: { ...w.faults, outputBad: !w.faults.outputBad } })}>Self-test fails (output)</B>
        <B on={w.faults.polarityBad} onClick={() => world.set({ faults: { ...w.faults, polarityBad: !w.faults.polarityBad } })}>Direction fault</B>
        <B on={w.faults.batterySag} onClick={() => world.set({ faults: { ...w.faults, batterySag: !w.faults.batterySag } })}>Battery sags</B>
        <B on={w.faults.panelBad} onClick={() => world.set({ faults: { ...w.faults, panelBad: !w.faults.panelBad } })}>Up button dead</B>
        <B onClick={() => world.set({ wear: w.wear > 0.6 ? 0.1 : 1.1 })} on={w.wear > 0.6}>Worn electrodes</B>
        <B onClick={() => sim.setBattery(95)}>Battery full</B>
        <B on={w.callControl === 'pauseOnly'} onClick={() => world.set({ callControl: w.callControl === 'full' ? 'pauseOnly' : 'full' })}>Phone can't answer by button</B>
        <B on={w.holdCounts} onClick={() => world.set({ holdCounts: !w.holdCounts })}>Hold time counts</B>
        <B onClick={() => { sim.resetDevice(); ui.set({ session: null, pending: null, call: null }); }}>Reset device</B>
      </Section>

      <Section title="Say something (voice)">
        <form onSubmit={(e) => { e.preventDefault(); submit(say); }} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input aria-label="Say a phrase" value={say} onChange={(e) => setSay(e.target.value)} placeholder='e.g. "pause DryTray"' style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #3a5268', background: '#16293b', color: '#fff' }} />
          <B type="submit" style={{ margin: 0 }}>Say</B>
        </form>
        {PHRASES.map((p) => <B key={p} onClick={() => submit(p)}>{p}</B>)}
        <div style={{ marginTop: 6 }}>
          <B on={listening} onClick={toggleMic} disabled={!micSupported()}>{listening ? 'Stop listening' : 'Use my microphone'}</B>
          <B on={d.settings.spoken} onClick={() => update((x) => ({ settings: { ...x.settings, spoken: !x.settings.spoken } }))}>Spoken replies {d.settings.spoken ? 'on' : 'off'}</B>
        </div>
      </Section>

      <Section title="Mock tray Control Panel">
        <PanelMock />
        <p style={{ color: '#8fb3c9', margin: '8px 0 0', textAlign: 'center' }}>Pause/Play · Call (hold to decline) · Down · Up</p>
      </Section>

      <Section title="Notifications (bypass the 2/day cap)">
        <B onClick={() => notify('reminder', 'DrySync', 'Session tonight at 8? Takes about 25 minutes.', { force: true })}>Reminder</B>
        <B onClick={() => notify('reschedule', 'DrySync', 'Missed today. Tomorrow at 8 instead?', { force: true })}>Reschedule</B>
        <B onClick={() => notify('checkin', 'DrySync', 'How are your hands today?', { force: true })}>Check-in</B>
        <B onClick={() => notify('water', 'DrySync', 'New place. Check your water before your next session.', { force: true })}>Water tip</B>
        <B onClick={() => notify('charge', 'DrySync', "Charge your DryTray before tonight's session.", { force: true })}>Charge</B>
        <B onClick={() => notify('relapse', 'DrySync', 'Your hands have been sweatier lately. Try a booster week?', { force: true })}>Relapse</B>
        <B onClick={() => notify('followup', 'DrySync', "Let's see if the fix helped.", { force: true })}>Follow-up</B>
      </Section>

      <Section title="Views">
        <B onClick={() => ui.set({ lockPreview: true })}>Lock screen / Dynamic Island</B>
        <B onClick={() => { ui.set({ stack: [], tab: 'today' }); nav.home(); }}>Go to Today</B>
        <B onClick={() => nav.push('diagnosis')}>Open “Not working?”</B>
      </Section>

      <Section title="Event log">
        <div style={{ maxHeight: 180, overflowY: 'auto', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: '#b5c6d4' }}>
          {log.length === 0 && <i>Nothing yet</i>}
          {log.map((l, i) => <div key={i}>{new Date(l.t).toLocaleTimeString()} {l.text}</div>)}
        </div>
      </Section>
    </aside>
  );
}
