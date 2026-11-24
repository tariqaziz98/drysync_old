import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Console } from './console/Console';
import { LockScreen } from './components/LockScreen';
import { Btn, CheckRow, Sheet } from './components/kit';
import { IBattery, IChart, ICal, IHome, IMenu } from './components/Icons';
import { useDeviceView } from './components/hooks';
import { Onboarding } from './screens/Onboarding';
import { Today } from './screens/Today';
import { History, SessionDetail } from './screens/History';
import { Insights } from './screens/Insights';
import { Live } from './screens/Live';
import { SessionDone } from './screens/SessionDone';
import { WaterCheck } from './screens/WaterCheck';
import { Diagnosis } from './screens/Diagnosis';
import { Tutorial } from './screens/Tutorial';
import {
  CallSettings, DeviceHealth, More, Notifications, PlanScreen, Privacy, Reminders, Report, SettingsScreen, Travel,
} from './screens/Misc';
import { data, update } from './lib/data';
import { useStore } from './lib/store';
import { nav, ui, type Route, type Tab } from './lib/ui';
import { initController, requestStart, runScheduler } from './lib/controller';
import { device, tray } from './device/sim';
import { fmtTime, now } from './lib/clock';
import { useNowTick } from './components/hooks';

function routeView(r: Route) {
  const p = r.params ?? {};
  switch (r.name) {
    case 'water': return <WaterCheck auto={!!p.auto} />;
    case 'plan': return <PlanScreen />;
    case 'sessionDetail': return <SessionDetail id={String(p.id)} />;
    case 'diagnosis': return <Diagnosis followUp={p.followUp ? String(p.followUp) : undefined} />;
    case 'travel': return <Travel />;
    case 'deviceHealth': return <DeviceHealth />;
    case 'privacy': return <Privacy />;
    case 'report': return <Report />;
    case 'notifications': return <Notifications />;
    case 'settings': return <SettingsScreen />;
    case 'callSettings': return <CallSettings />;
    case 'reminders': return <Reminders />;
    case 'tutorial': return <Tutorial />;
    default: return <Today />;
  }
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Today', icon: <IHome size={22} /> },
  { id: 'history', label: 'History', icon: <ICal size={22} /> },
  { id: 'insights', label: 'Insights', icon: <IChart size={22} /> },
  { id: 'more', label: 'More', icon: <IMenu size={22} /> },
];

function Main() {
  const onboarded = useStore(data, (d) => d.onboarded);
  const tab = useStore(ui, (u) => u.tab);
  const stack = useStore(ui, (u) => u.stack);
  const pending = useStore(ui, (u) => u.pending);
  const v = useDeviceView();
  const bt = useStore(device, (d) => d.bt);
  const mode = useStore(device, (d) => d.mode);

  // A finished session with no log waiting (e.g. app was reloaded): let the tray go idle
  useEffect(() => {
    if (mode === 'complete' && !pending && bt) {
      const id = window.setTimeout(() => { if (!ui.get().pending && device.get().mode === 'complete') tray.ack(); }, 800);
      return () => window.clearTimeout(id);
    }
  }, [mode, pending, bt]);

  if (!onboarded) return <Onboarding />;
  if (pending) return <SessionDone />;
  if (v.sessionActive) return <Live />;
  if (stack.length) return routeView(stack[stack.length - 1]);

  return (
    <>
      {tab === 'today' && <Today />}
      {tab === 'history' && <History />}
      {tab === 'insights' && <Insights />}
      {tab === 'more' && <More />}
    </>
  );
}

function TabBar() {
  const tab = useStore(ui, (u) => u.tab);
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => nav.tab(t.id)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function SafetySheet() {
  const open = useStore(ui, (u) => u.safetySheet);
  const sessions = useStore(data, (d) => d.sessions.length);
  const short = useStore(data, (d) => d.settings.shortSafetyReminder);
  const lines = ['My watches and rings are off', 'The trays are filled to the line', 'Any small cuts are covered with petroleum jelly'];
  const [state, setState] = useChecks();
  if (!open) return null;
  const brief = short && sessions >= 3;
  const ready = brief || lines.every((_, i) => state[i]);
  return (
    <Sheet onClose={() => ui.set({ safetySheet: false })}>
      <h2 className="h2">Before you start</h2>
      {brief ? (
        <p className="p ink" style={{ fontSize: 17 }}>Watches and rings off? Trays filled to the line?</p>
      ) : (
        lines.map((l, i) => <CheckRow key={l} on={!!state[i]} onChange={(v) => setState((s) => ({ ...s, [i]: v }))}>{l}</CheckRow>)
      )}
      <div className="btns" style={{ marginTop: 14 }}>
        <Btn disabled={!ready} onClick={() => { setState({}); requestStart('app', { skipWater: true, confirmed: true }); }}>Start session</Btn>
        <Btn variant="ghost" onClick={() => ui.set({ safetySheet: false })}>Not now</Btn>
      </div>
    </Sheet>
  );
}

function useChecks() {
  return useState<Record<number, boolean>>({});
}

function StartIssueSheet() {
  const issue = useStore(ui, (u) => u.startIssue);
  if (!issue) return null;
  const shorter = Math.floor(issue.minutesLeft / 5) * 5;
  return (
    <Sheet onClose={() => ui.set({ startIssue: null })}>
      <div style={{ color: 'var(--amber)' }}><IBattery size={40} /></div>
      <h2 className="h2">Charge your tray first</h2>
      <p className="p">Battery low: about {issue.minutesLeft} minutes left. A {issue.plannedMin}-minute session needs a bit more. The tray never stops without warning mid-session.</p>
      <div className="btns" style={{ marginTop: 14 }}>
        {shorter >= 10 && <Btn onClick={() => { ui.set({ startIssue: null }); requestStart('app', { skipWater: true, confirmed: true, minutes: shorter }); }}>Start a shorter {shorter}-minute session</Btn>}
        <Btn variant="secondary" onClick={() => ui.set({ startIssue: null })}>OK, I'll charge it</Btn>
      </div>
    </Sheet>
  );
}

function Overlays() {
  const assistant = useStore(ui, (u) => u.assistant);
  const toast = useStore(ui, (u) => u.toast);
  const banner = useStore(ui, (u) => u.banner);
  const lock = useStore(ui, (u) => u.lockPreview);
  return (
    <>
      <div className="top-stack">
        {assistant && (
          <div className="assistant" role="status" aria-live="assertive" key={assistant.id}>
            <div className="who">● DryTray</div>
            {assistant.heard && <div className="heard">“{assistant.heard}”</div>}
            <div className="say">{assistant.text}</div>
          </div>
        )}
        {toast && <div className="toast" role="status" key={toast.id}>{toast.text}</div>}
      </div>
      {banner && (
        <button className="banner" onClick={() => { ui.set({ banner: null }); if (banner.type === 'relapse') nav.tab('insights'); else if (banner.type === 'water') nav.push('water'); else nav.home(); update((d) => ({ notifications: d.notifications.map((n) => (n.id === banner.id ? { ...n, read: true } : n)) })); }}>
          <span className="appico"><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 3c4 5 7 8.500 7 12a7 7 0 0 1-14 0c0-3.500 3-7 7-12z" /></svg></span>
          <span><b>DRYSYNC · now</b><span>{banner.body}</span></span>
        </button>
      )}
      <SafetySheet />
      <StartIssueSheet />
      {lock && <LockScreen />}
    </>
  );
}

function Phone() {
  useNowTick(15_000);
  const onboarded = useStore(data, (d) => d.onboarded);
  const pending = useStore(ui, (u) => u.pending);
  const stack = useStore(ui, (u) => u.stack);
  const v = useDeviceView();
  const live = v.sessionActive && !pending;
  const dark = live;
  const showTabs = onboarded && !live && !pending && stack.length === 0;
  const taps = useRef({ n: 0, t: 0 });
  const clockTap = () => {
    const t = Date.now();
    const k = taps.current;
    k.n = t - k.t < 600 ? k.n + 1 : 1;
    k.t = t;
    if (k.n >= 5) ui.set({ consoleOpen: !ui.get().consoleOpen });
  };
  return (
    <div className={`phone ${dark ? 'dark' : ''}`} style={dark ? { background: 'var(--night)' } : undefined}>
      <div className="island" />
      <div className="statusbar" style={{ background: dark ? 'var(--night)' : undefined }}>
        <span className="time" onClick={clockTap}>{fmtTime(now())}</span>
        <span style={{ fontSize: 12 }}>{v.sessionActive ? '● Session' : ''}</span>
      </div>
      <div className="phone-body">
        <Main />
        <Overlays />
      </div>
      {showTabs && <TabBar />}
      <div className="homebar"><i /></div>
    </div>
  );
}

export function App() {
  const consoleOpen = useStore(ui, (u) => u.consoleOpen);
  const wide = typeof window !== 'undefined' && window.innerWidth > 900;

  useEffect(() => {
    initController();
    if (new URLSearchParams(location.search).has('console')) ui.set({ consoleOpen: true });
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName) && e.key !== 'Escape') return;
      if (e.key === '`' || e.key === '~') ui.set({ consoleOpen: !ui.get().consoleOpen });
      if (e.key === 'Escape') ui.set({ consoleOpen: false });
    };
    window.addEventListener('keydown', onKey);
    const first = window.setTimeout(runScheduler, 1500);
    const id = window.setInterval(runScheduler, 20_000);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="stage">
      <Phone />
      {consoleOpen && <Console docked={wide} />}
      <div className="stage-note">DrySync research prototype · simulated DryTray · no current is ever delivered · researcher console: press ~ (or tap the phone clock 5×)</div>
    </div>
  );
}
