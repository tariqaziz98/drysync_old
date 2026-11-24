import { useState } from 'react';
import { Btn, Disclaimer } from '../components/kit';
import { Face, IHand, ICheck } from '../components/Icons';
import { data } from '../lib/data';
import { useStore } from '../lib/store';
import { ui } from '../lib/ui';
import { device } from '../device/sim';
import { finishLog, rateSession, sweatWords } from '../lib/controller';
import { now } from '../lib/clock';
import { streakWeeks } from '../lib/insights';
import { zoneLabel } from '../lib/water';
import type { Comfort, SweatRating } from '../types';

const COMFORTS: { v: Comfort; l: string }[] = [
  { v: 'comfortable', l: 'Comfortable' },
  { v: 'tingly', l: 'A bit tingly' },
  { v: 'uncomfortable', l: 'Uncomfortable' },
];
const TAGS = ['hot day', 'stressful day', 'new water', 'used Comfort Insert'];

export function SessionDone() {
  const pending = useStore(ui, (u) => u.pending)!;
  const rec = useStore(data, (d) => d.sessions.find((s) => s.id === pending.sessionId));
  const sessions = useStore(data, (d) => d.sessions);
  const plan = useStore(data, (d) => d.plan);
  const mode = useStore(device, (d) => d.mode);
  const [note, setNote] = useState('');
  if (!rec) return null;
  const streak = streakWeeks({ ...data.get(), sessions }, now());

  const toggleTag = (t: string) =>
    rateSession(rec.id, { tags: rec.tags.includes(t) ? rec.tags.filter((x) => x !== t) : [...rec.tags, t] });

  return (
    <div className="screen">
      {mode === 'complete' && (
        <div className="band green" style={{ padding: '12px 20px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, background: '#0d7a4d', color: '#fff' }}>
          <IHand size={22} /> SAFE TO LIFT YOUR HANDS
        </div>
      )}
      <div className="scroll stack">
        <div className="center" style={{ paddingTop: 8 }}>
          <div className="bigcheck"><ICheck size={44} /></div>
          <h2 className="h2" style={{ fontSize: 28, marginTop: 12 }}>{rec.partial ? 'Session ended early' : 'Session done'}</h2>
          <p className="p">{rec.endReason === 'battery' ? 'The tray finished a little early to stay safe on battery.' : 'Saved automatically. Nothing to type.'}</p>
        </div>

        <div className="stat">
          <div><b>{Math.round(rec.actualMin)}</b><span>minutes</span></div>
          <div><b>{rec.avgDeliveredMa.toFixed(0)}</b><span>avg mA delivered</span></div>
          <div><b>{streak}</b><span>week streak</span></div>
        </div>

        {pending.newLimit !== null && (
          <div className="card tint-green">
            <h3>Comfort limit saved: {pending.newLimit} mA</h3>
            <p className="p ink">Most people need several sessions before they notice a change. Voice and the tray's Up button will never go above this.</p>
          </div>
        )}
        {rec.water && (
          <div className="card flat row between"><span className="p ink">Water before the session</span><span className={`chip ${rec.water.zone === 'good' ? 'good' : rec.water.zone === 'soft' ? 'warn' : 'blue'}`}>{zoneLabel[rec.water.zone]}</span></div>
        )}
        {pending.lowWater && <div className="warnbar">Water got low during the session. Fill to the line next time.</div>}
        {rec.notReaching && <div className="warnbar">Strength fell short of what you set. We kept a note for “Not working?”.</div>}
        {rec.quickDrops >= 3 && <div className="warnbar">You turned it down {rec.quickDrops} times. Check contact, small cuts and the water level.</div>}

        <h3 className="h3">How were your hands today?</h3>
        <div className="faces">
          {([1, 2, 3, 4] as SweatRating[]).map((r) => (
            <button key={r} className="face" aria-pressed={rec.sweat === r} onClick={() => rateSession(rec.id, { sweat: r })}>
              <Face level={r} />
              {sweatWords[r]}
            </button>
          ))}
        </div>
        <p className="small center">Or just say: dry, mostly dry, damp, or dripping.</p>

        <h3 className="h3">How did it feel? (optional)</h3>
        <div className="chips">
          {COMFORTS.map((c) => (
            <button key={c.v} className={`chip ${rec.comfort === c.v ? 'on' : ''}`} onClick={() => rateSession(rec.id, { comfort: c.v })}>{c.l}</button>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          {TAGS.map((t) => (
            <button key={t} className={`chip ${rec.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
          ))}
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="note">Note</label>
          <input id="note" placeholder="Anything to remember?" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => rateSession(rec.id, { note })} />
        </div>

        {plan.phase === 'starting' && sessions.length >= 10 && (
          <div className="card tint-brand"><h3>Ready for maintenance?</h3><p className="p ink">You've done {sessions.length} sessions. You can move to maintenance in Plan when you're ready.</p></div>
        )}

        <Btn onClick={() => { if (note) rateSession(rec.id, { note }); finishLog(); }}>Done</Btn>
        <Disclaimer />
      </div>
    </div>
  );
}
