import { useState } from 'react';
import { Btn, Header, Item, Seg } from '../components/kit';
import { Face, IChev } from '../components/Icons';
import { SessionChart } from '../components/Charts';
import { data, update } from '../lib/data';
import { useStore } from '../lib/store';
import { nav } from '../lib/ui';
import { DAY, dateKey, fmtDayLong, fmtTime, now, startOfDay } from '../lib/clock';
import { monthDays } from '../lib/insights';
import { zoneLabel } from '../lib/water';
import { sweatWords } from '../lib/controller';
import type { SessionRecord } from '../types';

export function History() {
  const sessions = useStore(data, (d) => d.sessions);
  const daily = useStore(data, (d) => d.daily);
  const [view, setView] = useState<'cal' | 'list'>('cal');
  const [month, setMonth] = useState(() => now());
  const [sel, setSel] = useState<string | null>(dateKey(now()));
  const m = monthDays(month);
  const byDay = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const k = dateKey(s.start);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const checkins = new Set(daily.map((x) => x.date));
  const todayK = dateKey(now());
  const shift = (n: number) => { const d = new Date(month); d.setMonth(d.getMonth() + n, 1); setMonth(d.getTime()); };
  const list = [...sessions].sort((a, b) => b.start - a.start);
  const selected = sel ? byDay.get(sel) ?? [] : [];

  return (
    <div className="screen">
      <div className="hdr big"><h1>History</h1></div>
      <div className="scroll stack">
        <Seg value={view} onChange={setView} options={[{ v: 'cal', label: 'Calendar' }, { v: 'list', label: 'List' }]} />
        {view === 'cal' ? (
          <>
            <div className="card">
              <div className="row between" style={{ marginBottom: 10 }}>
                <button className="iconbtn" aria-label="Previous month" onClick={() => shift(-1)}><span style={{ transform: 'rotate(180deg)', display: 'grid' }}><IChev /></span></button>
                <b>{new Date(month).toLocaleDateString([], { month: 'long', year: 'numeric' })}</b>
                <button className="iconbtn" aria-label="Next month" onClick={() => shift(1)}><IChev /></button>
              </div>
              <div className="heat">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="dow">{d}</div>)}
                {Array.from({ length: m.lead }).map((_, i) => <div key={'e' + i} className="cell empty" />)}
                {Array.from({ length: m.count }).map((_, i) => {
                  const t = startOfDay(m.first) + i * DAY;
                  const k = dateKey(t);
                  const n = byDay.get(k)?.length ?? 0;
                  const cls = n > 0 ? (n > 1 ? 'l3' : 'l2') : checkins.has(k) ? 'l1' : '';
                  return (
                    <button key={k} className={`cell ${cls} ${k === todayK ? 'today' : ''} ${sel === k ? 'sel' : ''}`} aria-label={`${fmtDayLong(t)}${n ? `, ${n} session${n > 1 ? 's' : ''}` : ''}`} onClick={() => setSel(k)}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="row small" style={{ marginTop: 12, gap: 14 }}>
                <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 4, background: '#6a00ff', marginRight: 5 }} />Session</span>
                <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 4, background: '#e9eaff', marginRight: 5 }} />Check-in only</span>
              </div>
            </div>
            {sel && (
              <>
                <h3 className="h3">{fmtDayLong(new Date(sel + 'T12:00:00').getTime())}</h3>
                {selected.length ? <SessionList items={selected} /> : <p className="p">No session this day.</p>}
              </>
            )}
          </>
        ) : list.length ? (
          <SessionList items={list} showDate />
        ) : (
          <div className="card center"><h3>No sessions yet</h3><p className="p">Your first session will show up here automatically.</p></div>
        )}
      </div>
    </div>
  );
}

function SessionList({ items, showDate }: { items: SessionRecord[]; showDate?: boolean }) {
  return (
    <div className="list">
      {items.map((s) => (
        <button key={s.id} className="item" onClick={() => nav.push('sessionDetail', { id: s.id })}>
          <span className="ico">{s.sweat ? <Face level={s.sweat} size={28} plain /> : <span style={{ fontWeight: 900 }}>·</span>}</span>
          <span className="grow">
            <div className="t">{showDate ? new Date(s.start).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' : ''}{fmtTime(s.start)}</div>
            <div className="s">{Math.round(s.actualMin)} min · {s.avgDeliveredMa.toFixed(0)} mA · {Math.round(s.fullStrengthShare * 100)}% full strength{s.partial ? ' · partial' : ''}</div>
          </span>
          <span className="chev"><IChev size={18} /></span>
        </button>
      ))}
    </div>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const s = useStore(data, (d) => d.sessions.find((x) => x.id === id));
  if (!s) return <div className="screen"><Header title="Session" /></div>;
  const pauseStr = s.pauses.length ? s.pauses.map((p) => `${p.reason === 'hand_out' ? 'hand out' : p.reason} ${Math.max(1, Math.round(p.lengthSec / 60))} min`).join(', ') : 'None';
  return (
    <div className="screen">
      <Header title={new Date(s.start).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + fmtTime(s.start)} />
      <div className="scroll stack">
        <div className="card">
          <div className="row between"><b>Strength over time</b><span className="small">gray = paused or on hold</span></div>
          <SessionChart rec={s} />
        </div>
        <div className="list">
          <Item title="Time" right={<b>{s.actualMin} of {s.plannedMin} min</b>} />
          <Item title="Strength set" right={<b>{s.setMa} mA</b>} />
          <Item title="Strength delivered" sub="Average · lowest" right={<b>{s.avgDeliveredMa} · {s.minDeliveredMa} mA</b>} />
          <Item title="Time at full strength" right={<b>{Math.round(s.fullStrengthShare * 100)}%</b>} />
          <Item title="Resistance" sub="How much the current is blocked" right={<b>{s.avgResistance} kΩ</b>} />
          <Item title="Direction switches" right={<b>{s.polaritySwitches}</b>} />
          <Item title="Pauses" right={<b style={{ textAlign: 'right', maxWidth: 170 }}>{pauseStr}</b>} />
          <Item title="Turned down (ouch)" right={<b>{s.quickDrops}</b>} />
          <Item title="Water" right={<b>{s.water ? zoneLabel[s.water.zone] : 'Not checked'}</b>} />
          <Item title="Mode" right={<b>{s.mode === 'insert' ? 'Comfort Insert' : 'Full tray'}</b>} />
          {s.place && <Item title="Place" right={<b>{s.place}</b>} />}
          <Item title="Sweat rating" right={<b>{s.sweat ? sweatWords[s.sweat] : '—'}</b>} />
          <Item title="Comfort" right={<b>{s.comfort ?? '—'}</b>} />
          {s.tags.length > 0 && <Item title="Tags" right={<b>{s.tags.join(', ')}</b>} />}
          {s.note && <Item title="Note" right={<b style={{ maxWidth: 190, textAlign: 'right' }}>{s.note}</b>} />}
          <Item title="Firmware" right={<b>{s.firmware}</b>} />
        </div>
        <Btn variant="secondary" onClick={() => { update((d) => ({ sessions: d.sessions.filter((x) => x.id !== id) })); nav.back(); }}>Delete this session</Btn>
      </div>
    </div>
  );
}

