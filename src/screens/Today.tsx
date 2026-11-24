import { Btn, Item } from '../components/kit';
import { Face, IBattery, IBell, IBooster, IDiag, IDrop, IMic, IPlane, IStetho } from '../components/Icons';
import { Trend } from '../components/Charts';
import { data, update } from '../lib/data';
import { useStore } from '../lib/store';
import { nav } from '../lib/ui';
import { device } from '../device/sim';
import { now, dateKey, fmtDay, fmtTime } from '../lib/clock';
import { boosterProgress, nextSession, weekProgress } from '../lib/schedule';
import { relapseCheck, streakWeeks, sweatSeries } from '../lib/insights';
import { logCheckin, requestStart, say, sweatWords } from '../lib/controller';
import { waterAgeMin, WATER, zoneLabel } from '../lib/water';
import { minutesOfCharge } from '../device/sim';
import { useNowTick } from '../components/hooks';
import type { SweatRating } from '../types';

export function Today() {
  useNowTick(30_000);
  const d = useStore(data, (x) => x);
  const battery = useStore(device, (x) => Math.round(x.battery));
  const unread = d.notifications.filter((n) => !n.read).length;
  const t = now();
  const next = nextSession(d, t);
  const wk = weekProgress(d, t);
  const streak = streakWeeks(d, t);
  const lastWater = d.waterChecks[d.waterChecks.length - 1];
  const age = waterAgeMin(lastWater, t);
  const locked = d.safetyPassed !== true;
  const todayKey = dateKey(t);
  const checkedIn = d.daily.some((x) => x.date === todayKey) || d.sessions.some((s) => dateKey(s.start) === todayKey && s.sweat);
  const didToday = d.sessions.some((s) => dateKey(s.start) === todayKey);
  const rel = relapseCheck(d, t);
  const booster = boosterProgress(d);
  const followUp = d.diagnoses.find((x) => !x.done && x.followUpAt <= t);
  const lowBattery = minutesOfCharge(battery) < d.plan.lengthMin + 1;
  const first = !d.firstSessionDone;

  const start = () => {
    if (first) nav.push('tutorial');
    else requestStart('app');
  };

  return (
    <div className="screen">
      <div className="hdr big">
        <h1>{greeting(t)}</h1>
        <button className="iconbtn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => nav.push('notifications')} style={{ position: 'relative' }}>
          <IBell />
          {unread > 0 && <span style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: '#f0a031' }} />}
        </button>
      </div>
      <div className="scroll stack">
        <div className="stat">
          <div><b>{streak}</b><span>Streak</span></div>
          <div><b>{wk.done}/{wk.target}</b><span>This Week</span></div>
          <div><b>{battery}%</b><span>Battery</span></div>
        </div>

        <div className="hero">
          {locked ? (
            <>
              <div className="big sm">Sessions are locked</div>
              <p className="p" style={{ marginTop: 6 }}>Please talk to a doctor before using DryTray. You can still browse the app.</p>
            </>
          ) : (
            <>
              <div className="eyebrow-l">{first ? 'Your first session' : next?.today ? 'Next Session · Today' : 'Next Session'}</div>
              <div className={`big ${first || !next ? 'sm' : ''}`}>
                {first ? 'Let’s do a gentle first one' : next ? `${next.today ? 'Tonight' : fmtDay(next.at)}, ${fmtTime(next.at)}` : 'Pick your days in Plan'}
              </div>
              {first ? (
                <p className="p">About {d.plan.lengthMin} minutes at a low strength. We'll find your comfort limit together.</p>
              ) : (
                <>
                  {next?.shiftedFor && <p className="p">Moved after “{next.shiftedFor}” on your calendar.</p>}
                  <div className="pills"><span>~{d.plan.lengthMin} mins total</span><span>{wk.done}/{wk.target} done this week</span></div>
                </>
              )}
              <Btn onClick={start}>{first ? 'Start my first session' : 'Start session'}</Btn>
            </>
          )}
        </div>

        {lowBattery && !locked && (
          <div className="warnbar"><IBattery size={20} /><span>Battery low: about {Math.max(0, Math.floor(minutesOfCharge(battery) - 1))} minutes of charge. Charge your tray before a {d.plan.lengthMin}-minute session.</span></div>
        )}

        {followUp && (
          <div className="card tint-blue">
            <h3>Let's see if the fix helped</h3>
            <p className="p ink">It's been a week since your “{followUp.cause}” check.</p>
            <Btn variant="small" className="inline" style={{ marginTop: 10 }} onClick={() => nav.push('diagnosis', { followUp: followUp.id })}>See before and after</Btn>
          </div>
        )}

        {rel.warn && (
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Your hands have been sweatier lately</h3>
            <div className="trend">
              <div className="grow">
                <div className="lbl">Sweat score, last 10 days</div>
                <p>A booster week (3 sessions) often helps.</p>
              </div>
              <Trend points={sweatSeries(d)} />
            </div>
            <div className="btns two">
              <button className="tile amber" onClick={() => update((x) => ({ plan: { ...x.plan, boosterUntil: now() + 7 * 86400000 } }))}><IBooster />Start Booster Week</button>
              <button className="tile" onClick={() => nav.push('diagnosis')}><IDiag />Not Working?</button>
            </div>
          </div>
        )}

        {booster && d.plan.boosterUntil && d.plan.boosterUntil > t && (
          <div className="card tint-green">
            <h3>Booster week: {booster.done} of {booster.target}</h3>
            <div className="progress" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, (booster.done / booster.target) * 100)}%` }} /></div>
          </div>
        )}

        {!checkedIn && !didToday && !locked && d.settings.checkinOn && (
          <div className="card" style={{ padding: '20px 16px 18px' }}>
            <div style={{ padding: '0 4px', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, lineHeight: '24px', margin: 0, fontWeight: 600 }}>How are your hands today?</h3>
              <p className="p" style={{ marginTop: 4 }}>One tap, five seconds.</p>
            </div>
            <div className="faces">
              {([1, 2, 3, 4] as SweatRating[]).map((r) => (
                <button key={r} className="face" onClick={() => { logCheckin(r); say(`Logged: hands ${sweatWords[r]}.`); }} aria-label={sweatWords[r]}>
                  <Face level={r} />
                  <span>{sweatWords[r]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="list plain">
          <Item
            icon={<IDrop size={28} />}
            title="Water Check"
            sub={lastWater ? `${age <= WATER.VALID_MIN ? zoneLabel[lastWater.zone] : 'Last: ' + zoneLabel[lastWater.zone]} · ${age < 1 ? 'just now' : age < 90 ? Math.round(age) + ' min ago' : fmtDay(lastWater.at)}` : 'Not checked yet'}
            onClick={() => nav.push('water')}
          />
          <Item icon={<IStetho size={28} />} title="Not working?" sub="Find out if it's the device, water, setup or schedule" onClick={() => nav.push('diagnosis')} />
          {d.travel.active ? (
            <Item icon={<IPlane size={28} />} title={`Traveling: ${d.travel.destination || 'on the road'}`} sub="Travel mode is on" onClick={() => nav.push('travel')} />
          ) : (
            <Item icon={<IPlane size={28} />} title="Traveling?" sub="Checklist, Comfort Insert and water tips" onClick={() => nav.push('travel')} />
          )}
          <Item icon={<IMic size={28} />} title="Control and voice" sub={`Using ${d.settings.controlStyle === 'both' ? 'voice and the tray panel' : d.settings.controlStyle === 'voice' ? 'voice' : 'the tray panel'}`} onClick={() => nav.push('settings')} />
        </div>
        <p className="disclaimer">Research prototype. Not an FDA-cleared medical device.</p>
      </div>
    </div>
  );
}

function greeting(t: number) {
  const h = new Date(t).getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

