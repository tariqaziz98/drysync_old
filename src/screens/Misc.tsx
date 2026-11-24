import { useState } from 'react';
import { Btn, CheckRow, Disclaimer, Header, Item, Seg, Toggle } from '../components/kit';
import { IBattery, IBell, IDoc, IGear, IPlane, IShield, IStetho, IPhone, IDrop, IBolt, IMic } from '../components/Icons';
import { PanelMock } from '../components/PanelMock';
import { data, update, resetAll } from '../lib/data';
import { useStore } from '../lib/store';
import { nav, toast, ui } from '../lib/ui';
import { device } from '../device/sim';
import { DAY, fmtDay, fmtTime, now } from '../lib/clock';
import { FAKE_CALENDAR, nextSession } from '../lib/schedule';
import { callApi, notify } from '../lib/controller';
import { sessionsToCsv, buildReport } from '../lib/report';
import type { CallMode, NotifType, TrayMode } from '../types';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ---------------------------------------------------------------- More menu
export function More() {
  const d = useStore(data, (x) => x);
  const unread = d.notifications.filter((n) => !n.read).length;
  return (
    <div className="screen">
      <div className="hdr big"><h1>More</h1></div>
      <div className="scroll stack">
        <div className="list">
          <Item icon={<IDoc size={24} />} title="Treatment plan" sub={`${d.plan.phase === 'starting' ? 'Starting phase' : 'Maintenance'} · ${d.plan.sessionsPerWeek} a week`} onClick={() => nav.push('plan')} />
          <Item icon={<IBell size={24} />} title="Reminders" sub={d.settings.remindersOn ? `At ${d.plan.time}, calendar-aware` : 'Off'} onClick={() => nav.push('reminders')} />
          <Item icon={<IBell size={24} />} title="Notifications" sub={unread ? `${unread} unread` : 'All caught up'} onClick={() => nav.push('notifications')} />
        </div>
        <div className="list">
          <Item icon={<IPlane size={24} />} title="Travel" sub={d.travel.active ? `Traveling: ${d.travel.destination || 'on'}` : 'Checklist, Comfort Insert, places'} onClick={() => nav.push('travel')} />
          <Item icon={<IBattery size={24} />} title="Device health" sub={`${d.device.name} · firmware ${d.device.firmware}`} onClick={() => nav.push('deviceHealth')} />
          <Item icon={<IStetho size={24} />} title="Not working?" sub="Guided check" onClick={() => nav.push('diagnosis')} />
        </div>
        <div className="list">
          <Item icon={<IPhone size={24} />} title="Call handling" sub="What happens when your phone rings" onClick={() => nav.push('callSettings')} />
          <Item icon={<IMic size={24} />} title="Control and voice" sub="Voice, tray panel, spoken replies" onClick={() => nav.push('settings')} />
          <Item icon={<IDoc size={24} />} title="Doctor or insurer report" sub="One-page PDF" onClick={() => nav.push('report')} />
          <Item icon={<IShield size={24} />} title="Privacy Center" sub="What's stored, export, delete" onClick={() => nav.push('privacy')} />
        </div>
        <Disclaimer />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Plan
export function PlanScreen() {
  const plan = useStore(data, (d) => d.plan);
  const sessions = useStore(data, (d) => d.sessions.length);
  const set = (p: Partial<typeof plan>) => update((d) => ({ plan: { ...d.plan, ...p } }));
  const toggleDay = (i: number) => {
    const days = plan.days.includes(i) ? plan.days.filter((x) => x !== i) : [...plan.days, i].sort();
    set({ days, sessionsPerWeek: Math.max(1, days.length) });
  };
  return (
    <div className="screen">
      <Header title="Treatment plan" />
      <div className="scroll stack">
        <div className="card tint-brand">
          <h3>{plan.phase === 'starting' ? 'Starting phase' : 'Maintenance'}</h3>
          <p className="p ink">{plan.phase === 'starting' ? '4 sessions a week for about 3 weeks, then 1 to 3 a week to keep results.' : '1 to 3 sessions a week keeps results going.'}</p>
        </div>
        <Seg value={plan.phase} onChange={(v) => set({ phase: v })} options={[{ v: 'starting', label: 'Starting' }, { v: 'maintenance', label: 'Maintenance' }]} />
        {plan.phase === 'starting' && sessions >= 12 && <div className="warnbar green">You've done {sessions} sessions. You can move to maintenance.</div>}
        <h3 className="h3">Days</h3>
        <div className="chips">
          {DAYS.map((l, i) => (
            <button key={i} className={`chip ${plan.days.includes(i) ? 'on' : ''}`} style={{ width: 44, height: 44, justifyContent: 'center' }} aria-pressed={plan.days.includes(i)} aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]} onClick={() => toggleDay(i)}>{l}</button>
          ))}
        </div>
        <div className="field"><label htmlFor="tm">Usual time</label><input id="tm" type="time" value={plan.time} onChange={(e) => set({ time: e.target.value })} /></div>
        <h3 className="h3">Session length</h3>
        <Seg value={String(plan.lengthMin)} onChange={(v) => set({ lengthMin: Number(v) })} options={['15', '20', '25', '30'].map((v) => ({ v, label: v + ' min' }))} />
        <div className="list">
          <Item title="Comfort limit" sub="Found in your first session. Voice and the Up button never go above it." right={<b>{plan.comfortLimitMa ? plan.comfortLimitMa + ' mA' : 'Not set'}</b>} />
          <Item title="Usual strength" right={<b>{plan.targetMa} mA</b>} />
        </div>
        {plan.comfortLimitMa && (
          <div className="row" style={{ gap: 10 }}>
            <Btn variant="secondary" onClick={() => set({ targetMa: Math.max(4, plan.targetMa - 1) })}>Usual strength −1</Btn>
            <Btn variant="secondary" onClick={() => set({ targetMa: Math.min(plan.comfortLimitMa!, plan.targetMa + 1) })}>+1</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Reminders
export function Reminders() {
  const s = useStore(data, (d) => d.settings);
  const d = useStore(data, (x) => x);
  const set = (p: Partial<typeof s>) => update((x) => ({ settings: { ...x.settings, ...p } }));
  const next = nextSession(d, now());
  return (
    <div className="screen">
      <Header title="Reminders" />
      <div className="scroll stack">
        <div className="list">
          <Item title="Session reminders" sub="At your plan times" right={<Toggle on={s.remindersOn} onChange={(v) => set({ remindersOn: v })} label="Session reminders" />} />
          <Item title="Respect my calendar" sub="Move a reminder if you're busy" right={<Toggle on={s.calendarAware} onChange={(v) => set({ calendarAware: v })} label="Respect my calendar" />} />
          <Item title="Daily check-in" sub="Only on days with no session" right={<Toggle on={s.checkinOn} onChange={(v) => set({ checkinOn: v })} label="Daily check-in" />} />
        </div>
        <div className="field"><label htmlFor="ct">Check-in time</label><input id="ct" type="time" value={s.checkinTime} onChange={(e) => set({ checkinTime: e.target.value })} /></div>
        <h3 className="h3">Your calendar (simulated)</h3>
        <div className="list">
          {FAKE_CALENDAR.map((e) => (
            <Item key={e.title} title={e.title} sub={`${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][e.day]} · ${e.from} to ${e.to}`} />
          ))}
        </div>
        {next && <div className="card tint-brand"><h3>Next session</h3><p className="p ink">{fmtDay(next.at)}, {fmtTime(next.at)}{next.shiftedFor ? `. Moved to avoid “${next.shiftedFor}”.` : ''}</p></div>}
        <p className="small">At most two notifications a day. Each type can be turned off in Notifications.</p>
      </div>
    </div>
  );
}

const NOTIF_LABELS: Record<NotifType, string> = {
  reminder: 'Session reminder', reschedule: 'Smart reschedule', checkin: 'Daily check-in', water: 'Water tip',
  charge: 'Charge reminder', relapse: 'Relapse warning', followup: 'Diagnosis follow-up',
};

export function Notifications() {
  const items = useStore(data, (d) => d.notifications);
  const s = useStore(data, (d) => d.settings);
  const [prefs, setPrefs] = useState(false);
  return (
    <div className="screen">
      <Header title="Notifications" right={<button className="linkbtn" style={{ color: 'var(--brand)' }} onClick={() => { setPrefs((p) => !p); update((d) => ({ notifications: d.notifications.map((n) => ({ ...n, read: true })) })); }}>{prefs ? 'Inbox' : 'Settings'}</button>} />
      <div className="scroll stack">
        {prefs ? (
          <div className="list">
            {(Object.keys(NOTIF_LABELS) as NotifType[]).map((k) => (
              <Item key={k} title={NOTIF_LABELS[k]} right={<Toggle on={s.notifOn[k]} label={NOTIF_LABELS[k]} onChange={(v) => update((d) => ({ settings: { ...d.settings, notifOn: { ...d.settings.notifOn, [k]: v } } }))} />} />
            ))}
          </div>
        ) : items.length ? (
          <div className="list">
            {items.map((n) => (
              <Item key={n.id} title={n.body} sub={`${NOTIF_LABELS[n.type]} · ${fmtDay(n.at)}, ${fmtTime(n.at)}`} />
            ))}
          </div>
        ) : (
          <div className="card center"><h3>Nothing yet</h3><p className="p">At most two a day, and you control each type.</p></div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------- Settings: control
export function SettingsScreen() {
  const s = useStore(data, (d) => d.settings);
  const set = (p: Partial<typeof s>) => update((x) => ({ settings: { ...x.settings, ...p } }));
  return (
    <div className="screen">
      <Header title="Control and voice" />
      <div className="scroll stack">
        <h3 className="h3" style={{ marginTop: 4 }}>How do you want to control sessions?</h3>
        <Seg value={s.controlStyle} onChange={(v) => set({ controlStyle: v })} options={[{ v: 'voice', label: 'Voice' }, { v: 'panel', label: 'Tray panel' }, { v: 'both', label: 'Both' }]} />
        <div className="list">
          <Item icon={<IMic size={20} />} title="Spoken replies" sub="The phone speaks back, like “Safe to lift”" right={<Toggle on={s.spoken} onChange={(v) => set({ spoken: v })} label="Spoken replies" />} />
          <Item icon={<IBolt size={20} />} title="Spoken progress" sub="Time left every 5 minutes" right={<Toggle on={s.spokenProgress} onChange={(v) => set({ spokenProgress: v })} label="Spoken progress" />} />
          <Item icon={<IShield size={24} />} title="Shorter safety reminder" sub="After 3 sessions, remind me in one line" right={<Toggle on={s.shortSafetyReminder} onChange={(v) => set({ shortSafetyReminder: v })} label="Shorter safety reminder" />} />
        </div>
        <h3 className="h3">Voice phrases</h3>
        <div className="card flat small stack">
          {['“Start DryTray”', '“Pause DryTray”  ·  “Resume DryTray”', '“Stop DryTray”', '“How much time is left?”', '“Ouch”  ·  “It stings”  ·  “Turn it down”', '“Turn it up a little”', '“Check my water”', '“My hands are dry / mostly dry / damp / dripping”'].map((x) => <div key={x} style={{ fontWeight: 700, color: 'var(--ink)' }}>{x}</div>)}
          <p>You can't set an exact number by voice. That keeps a misheard word from causing a big jump.</p>
        </div>
        <h3 className="h3">Control Panel on the tray</h3>
        <PanelMock interactive={false} />
        <p className="small center">Pause/Play · Call · Down · Up</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------ Settings: calls
export function CallSettings() {
  const s = useStore(data, (d) => d.settings);
  const set = (p: Partial<typeof s>) => update((x) => ({ settings: { ...x.settings, ...p } }));
  const [name, setName] = useState('');
  return (
    <div className="screen">
      <Header title="Call handling" />
      <div className="scroll stack">
        <div className="card tint-brand"><h3>Call Guard</h3><p className="p ink">When your phone rings mid-session, strength drops to a gentle level right away, so grabbing the phone never jolts you.</p></div>
        <h3 className="h3">When a call comes in</h3>
        <Seg<CallMode> value={s.callMode} onChange={(v) => set({ callMode: v })} options={[{ v: 'ask', label: 'Always ask' }, { v: 'pause', label: 'Always pause' }, { v: 'ignore', label: 'Ignore' }]} />
        <p className="small">{s.callMode === 'ask' ? 'Lower strength and let me answer, decline or pause.' : s.callMode === 'pause' ? 'Pause safely so I can pick up.' : 'Keep going. The phone rings as usual.'}</p>
        <div className="list">
          <Item title="Favorites only" sub="Only these contacts trigger Call Guard" right={<Toggle on={s.favoritesOnly} onChange={(v) => set({ favoritesOnly: v })} label="Favorites only" />} />
        </div>
        {s.favoritesOnly && (
          <div className="card flat">
            <div className="chips">{s.favorites.map((f) => <button key={f} className="chip on" onClick={() => set({ favorites: s.favorites.filter((x) => x !== f) })}>{f} ✕</button>)}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field grow"><input aria-label="Add favorite" placeholder="Add a name" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <Btn variant="small" onClick={() => { if (name.trim()) { set({ favorites: [...s.favorites, name.trim()] }); setName(''); } }}>Add</Btn>
            </div>
          </div>
        )}
        <h3 className="h3">What your phone can do</h3>
        <div className="card flat small stack">
          <p><b>Answer or decline by voice:</b> turn on call announcements in your phone settings (iPhone: Siri, Announce Calls). The phone handles it, not DrySync.</p>
          <p><b>Answer with the tray button:</b> works if your phone treats the tray like a headset button (to be tested). If not, the button simply pauses for the call.</p>
        </div>
        <p className="small">Try it: <button className="linkbtn" style={{ color: 'var(--brand)', padding: 0 }} onClick={() => callApi.incoming('Sarah', true)}>simulate a call from Sarah</button> (only affects a running session).</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Travel
const TRAVEL_ITEMS = ['Charge the tray', 'Pack the Comfort Insert', 'Pack baking soda', 'Pack a travel basin', 'Pack the charging cable'];

export function Travel() {
  const d = useStore(data, (x) => x);
  const t = d.travel;
  const [newPlace, setNewPlace] = useState('');
  const setT = (p: Partial<typeof t>) => update((x) => ({ travel: { ...x.travel, ...p } }));
  const sessionsByPlace = new Map<string, number>();
  d.sessions.forEach((s) => s.place && sessionsByPlace.set(s.place, (sessionsByPlace.get(s.place) ?? 0) + 1));
  return (
    <div className="screen">
      <Header title="Travel" />
      <div className="scroll stack">
        <div className="hero">
          <div className="big">{t.active ? `Traveling${t.destination ? ': ' + t.destination : ''}` : 'Going somewhere?'}</div>
          <p className="p" style={{ marginTop: 4 }}>Hotel water is often soft. We'll help you pack and check it when you arrive.</p>
          {!t.active ? (
            <Btn onClick={() => setT({ active: true, startedAt: now() })}>Start travel mode</Btn>
          ) : (
            <Btn onClick={() => { setT({ active: false, startedAt: null }); update(() => ({ currentPlace: 'Home', mode: 'tray' as TrayMode })); }}>I'm home</Btn>
          )}
        </div>
        {t.active && (
          <>
            <div className="field"><label htmlFor="dest">Where to?</label><input id="dest" value={t.destination} placeholder="Hotel Chicago" onChange={(e) => setT({ destination: e.target.value })} /></div>
            <Btn variant="secondary" onClick={() => {
              const name = t.destination.trim();
              if (!name) return toast('Add where you are first');
              update((x) => ({ places: x.places.includes(name) ? x.places : [...x.places, name], currentPlace: name, settings: { ...x.settings, placeTags: true } }));
              notify('water', 'DrySync', 'New place. Check your water before your next session.', { key: 'new-' + name, force: true });
              nav.push('water');
            }}>I've arrived. Check water here</Btn>
          </>
        )}
        <h3 className="h3">Pack list</h3>
        <div className="card">
          {TRAVEL_ITEMS.map((i) => <CheckRow key={i} on={!!t.checklist[i]} onChange={(v) => setT({ checklist: { ...t.checklist, [i]: v } })}>{i}</CheckRow>)}
        </div>
        <h3 className="h3">Mode</h3>
        <Seg<TrayMode> value={d.mode} onChange={(v) => update(() => ({ mode: v }))} options={[{ v: 'tray', label: 'Full tray' }, { v: 'insert', label: 'Comfort Insert' }]} />
        {d.mode === 'insert' && <div className="warnbar">Comfort Insert mode is less tested. Plan a maintenance-style session and see how it feels.</div>}
        <h3 className="h3">Places</h3>
        <div className="list">
          {d.places.map((p) => (
            <Item key={p} title={p} sub={`${sessionsByPlace.get(p) ?? 0} sessions`} right={d.currentPlace === p ? <span className="chip good">Here</span> : <Btn variant="small" onClick={() => update(() => ({ currentPlace: p }))}>I'm here</Btn>} />
          ))}
        </div>
        <div className="row">
          <div className="field grow"><input aria-label="New place" placeholder="Add a place" value={newPlace} onChange={(e) => setNewPlace(e.target.value)} /></div>
          <Btn variant="small" onClick={() => { const n = newPlace.trim(); if (n) { update((x) => ({ places: x.places.includes(n) ? x.places : [...x.places, n] })); setNewPlace(''); } }}>Add</Btn>
        </div>
        <p className="small">{d.settings.placeTags ? 'Place tags are on. You choose the names; no exact location is stored.' : 'Place tags are off. Turn them on in Privacy Center to remember water by place.'}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Device health
export function DeviceHealth() {
  const d = useStore(data, (x) => x.device);
  const insert = useStore(data, (x) => x.device.insertSessions);
  const batt = useStore(device, (x) => Math.round(x.battery));
  const last = d.selfTests[0];
  const rTrend = d.selfTests.slice(0, 5).map((s) => s.loadKohm);
  const needsClean = rTrend.length >= 2 && rTrend[0] - rTrend[rTrend.length - 1] > 0.08;
  return (
    <div className="screen">
      <Header title="Device health" />
      <div className="scroll stack">
        <div className="list">
          <Item icon={<IBattery size={24} />} title="Battery" sub={`${d.batteryCycles} charge cycles`} right={<b>{batt}%</b>} />
          <Item icon={<IBolt size={20} />} title="Firmware" sub={d.firmware === d.latestFirmware ? 'Up to date' : `Update to ${d.latestFirmware} available`} right={<b>{d.firmware}</b>} />
          <Item icon={<IDrop size={20} />} title="Electrodes" sub={needsClean ? 'Self-test readings are drifting. May need cleaning.' : 'No drift in recent self-tests'} right={<span className={`chip ${needsClean ? 'warn' : 'good'}`}>{needsClean ? 'Clean' : 'Good'}</span>} />
          <Item icon={<IGear size={20} />} title="Control Panel" sub="Four buttons and the screen" right={<span className={`chip ${d.panelStatus === 'ok' ? 'good' : 'bad'}`}>{d.panelStatus === 'ok' ? 'Working' : 'Check'}</span>} />
          <Item icon={<IShield size={24} />} title="Comfort Insert" sub={insert > 40 ? 'Consider replacing it' : 'Replace after about 50 sessions (TBD)'} right={<b>{insert} sessions</b>} />
        </div>
        <h3 className="h3">Last self-test</h3>
        {last ? (
          <div className="card">
            <div className="row between"><b>{last.pass ? 'Passed' : 'Did not pass'}</b><span className="small">{fmtDay(last.at)}, {fmtTime(last.at)}</span></div>
            <p className="small">Test load read {last.loadKohm.toFixed(2)} kΩ (should be 1.00)</p>
          </div>
        ) : <p className="p">No self-test yet. Run one from “Not working?”.</p>}
        <Btn variant="secondary" onClick={() => nav.push('diagnosis')}>Run the guided check</Btn>
        <Btn variant="ghost" onClick={() => update((x) => ({ device: { ...x.device, lastCleaned: now() } }))}>I cleaned the electrodes{d.lastCleaned ? ` (last: ${fmtDay(d.lastCleaned)})` : ''}</Btn>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Privacy
export function Privacy() {
  const d = useStore(data, (x) => x);
  const [confirm, setConfirm] = useState(false);
  const set = (p: Partial<typeof d.settings>) => update((x) => ({ settings: { ...x.settings, ...p } }));
  return (
    <div className="screen">
      <Header title="Privacy Center" />
      <div className="scroll stack">
        <div className="card tint-brand"><h3>Your data stays on this phone</h3><p className="p ink">Unless you choose otherwise. Nothing leaves the phone until you tap Share.</p></div>
        <h3 className="h3">What's stored</h3>
        <div className="list">
          <Item title="Sessions" sub="Time, strength, pauses, charts" right={<b>{d.sessions.length}</b>} />
          <Item title="Sweat ratings and check-ins" right={<b>{d.daily.length + d.sessions.filter((s) => s.sweat).length}</b>} />
          <Item title="Water checks" right={<b>{d.waterChecks.length}</b>} />
          <Item title="Places you named" sub={d.settings.placeTags ? 'Names only, no location' : 'Off'} right={<b>{d.settings.placeTags ? d.places.length : 0}</b>} />
        </div>
        <h3 className="h3">Where and who</h3>
        <div className="card flat small stack">
          <p><b>Where:</b> on this phone, encrypted. Optional encrypted backup is off.</p>
          <p><b>Who can see it:</b> only you, unless you share a report.</p>
          <p><b>Voice assistants:</b> receive only the command you say, never your health data. No voice recordings are kept by DrySync.</p>
          <p><b>Never stored:</b> medical records, photos, exact location.</p>
        </div>
        <h3 className="h3">Your choices</h3>
        <div className="list">
          <Item title="Place tags" sub="Remember water by place" right={<Toggle on={d.settings.placeTags} onChange={(v) => set({ placeTags: v })} label="Place tags" />} />
          <Item title="Community water insights" sub="Planned, opt-in. Not available yet." right={<Toggle on={false} onChange={() => toast('Not available in this version')} label="Community data" />} />
        </div>
        <div className="btns">
          <Btn variant="secondary" onClick={() => download('drysync-sessions.csv', sessionsToCsv(d), 'text/csv')}>Export all (CSV)</Btn>
          <Btn variant="secondary" onClick={() => nav.push('report')}>Export a report (PDF)</Btn>
          <Btn variant="danger" onClick={() => setConfirm(true)}>Delete all my data</Btn>
        </div>
        <Disclaimer />
      </div>
      {confirm && (
        <div className="sheet-wrap" onClick={() => setConfirm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="h2">Delete everything?</h2>
            <p className="p">This removes all sessions, ratings and settings from this phone. It can't be undone.</p>
            <div className="btns" style={{ marginTop: 16 }}>
              <Btn variant="danger" onClick={() => { resetAll(); ui.set({ stack: [], tab: 'today' }); setConfirm(false); }}>Delete all</Btn>
              <Btn variant="secondary" onClick={() => setConfirm(false)}>Keep my data</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- Report
export function Report() {
  const d = useStore(data, (x) => x);
  const [days, setDays] = useState<'30' | '60' | '90'>('30');
  const t = now();
  const r = buildReport(d, t - Number(days) * DAY, t);
  return (
    <div className="screen">
      <Header title="Report" />
      <div className="scroll stack">
        <Seg value={days} onChange={setDays} options={[{ v: '30', label: '30 days' }, { v: '60', label: '60 days' }, { v: '90', label: '90 days' }]} />
        <div className="card print-area" id="report">
          <h3 style={{ fontSize: 20 }}>DryTray treatment summary</h3>
          <p className="small">{fmtDay(t - Number(days) * DAY)} to {fmtDay(t)} · generated by DrySync (research prototype)</p>
          <div className="list" style={{ boxShadow: 'none', border: '1px solid var(--line)', marginTop: 12 }}>
            <Item title="Sessions per week" right={<b>{r.perWeek.toFixed(1)}</b>} />
            <Item title="Sessions in range" right={<b>{r.sessions}</b>} />
            <Item title="Average length" right={<b>{r.avgMin.toFixed(0)} min</b>} />
            <Item title="Average strength delivered" right={<b>{r.avgMa.toFixed(1)} mA</b>} />
            <Item title="Sweat rating, first → latest" sub="1 dry … 4 dripping" right={<b>{r.firstSweat ?? '—'} → {r.lastSweat ?? '—'}</b>} />
            <Item title="Side effects reported" sub="Turn-downs and uncomfortable sessions" right={<b>{r.uncomfortable} uncomfortable · {r.quickDrops} turn-downs</b>} />
            <Item title="Device" right={<b>{d.device.name} · fw {d.device.firmware}</b>} />
          </div>
          <p className="small" style={{ marginTop: 10 }}>Self-reported and device-measured data. Not a diagnosis.</p>
        </div>
        <Btn onClick={() => window.print()}>Share as PDF</Btn>
        <Btn variant="secondary" onClick={() => download('drysync-report.csv', sessionsToCsv(d), 'text/csv')}>Download CSV</Btn>
        <p className="small center">Nothing leaves your phone until you tap Share. Use “Save as PDF” in the print dialog.</p>
      </div>
    </div>
  );
}

