import { Btn } from '../components/kit';
import { SweatChart } from '../components/Charts';
import { data, update } from '../lib/data';
import { useStore } from '../lib/store';
import { nav } from '../lib/ui';
import { DAY, fmtDay, now } from '../lib/clock';
import { insightSentences, relapseCheck, sweatSeries, waterByPlace, weeklyBars } from '../lib/insights';

export function Insights() {
  const d = useStore(data, (x) => x);
  const t = now();
  const sentences = insightSentences(d, t);
  const bars = weeklyBars(d, t, 8);
  const maxBar = Math.max(4, ...bars.map((b) => b.count), d.plan.sessionsPerWeek);
  const pts = sweatSeries(d);
  const rel = relapseCheck(d, t);
  const water = [...waterByPlace(d)];

  return (
    <div className="screen">
      <div className="hdr big"><h1>Insights</h1></div>
      <div className="scroll stack">
        {rel.warn && (
          <div className="card">
            <h3>Relapse warning</h3>
            <p className="p ink">Your sweat scores have crept up over the last 10 days. A booster week (3 sessions) often helps.</p>
            <div className="btns two" style={{ marginTop: 10 }}>
              <Btn variant="amber" onClick={() => update((x) => ({ plan: { ...x.plan, boosterUntil: now() + 7 * DAY } }))}>Start booster week</Btn>
              <Btn variant="secondary" onClick={() => nav.push('diagnosis')}>Not working?</Btn>
            </div>
          </div>
        )}
        <div className="stack">
          {sentences.map((s, i) => (
            <div key={i} className={`insight ${s.tone}`}><span className="dot" />{s.text}</div>
          ))}
        </div>

        <h3 className="h3">Sessions per week</h3>
        <div className="card">
          <div className="bars" role="img" aria-label="Sessions per week for the last 8 weeks">
            {bars.map((b) => (
              <div key={b.start} className={`b ${b.count < b.target ? 'miss' : ''}`}>
                {b.count}
                <i style={{ height: `${(b.count / maxBar) * 80}%` }} />
                <span>{fmtDay(b.start)}</span>
              </div>
            ))}
          </div>
          <p className="small" style={{ marginTop: 8 }}>Red bars: fewer than your {d.plan.sessionsPerWeek} planned.</p>
        </div>

        <h3 className="h3">How dry your hands are</h3>
        <div className="card"><SweatChart points={pts} /></div>

        {water.length > 0 && (
          <>
            <h3 className="h3">Your water by place</h3>
            <div className="list">
              {water.map(([place, e]) => (
                <div key={place} className="item">
                  <span className="grow"><div className="t">{place}</div><div className="s">{e.n} check{e.n > 1 ? 's' : ''}</div></span>
                  <span className={`chip ${e.soft / e.n >= 0.6 ? 'warn' : 'good'}`}>{e.soft / e.n >= 0.6 ? 'Often soft' : 'Mostly good'}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="small center">Smart insights are a planned paid feature in the full product.</p>
      </div>
    </div>
  );
}
