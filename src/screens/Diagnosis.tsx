import { useEffect, useState } from 'react';
import { Btn, CheckRow, Header, Item } from '../components/kit';
import { IWrench, IDrop, ICheck, IClose } from '../components/Icons';
import { data, update, uid } from '../lib/data';
import { useStore } from '../lib/store';
import { nav, toast } from '../lib/ui';
import { device, runSelfTest } from '../device/sim';
import { DAY, fmtDay, now } from '../lib/clock';
import { causeCopy, diagnose, reviewData, symptomLabel, type DiagnosisResult, type Symptom } from '../lib/diagnosis';
import { performWaterCheck } from '../lib/controller';
import { zoneLabel } from '../lib/water';
import type { DiagCause, SelfTestResult, WaterRecord } from '../types';

type Step = 'symptom' | 'selftest' | 'water' | 'review' | 'result';
const STEPS: Step[] = ['symptom', 'selftest', 'water', 'review', 'result'];

export function Diagnosis({ followUp }: { followUp?: string }) {
  if (followUp) return <FollowUp id={followUp} />;
  return <Flow />;
}

function Flow() {
  const sessionActive = useStore(device, (d) => d.sessionActive);
  const [step, setStep] = useState<Step>('symptom');
  const [symptom, setSymptom] = useState<Symptom | null>(null);
  const [tried, setTried] = useState(false);
  const [skin, setSkin] = useState(false);
  const [st, setSt] = useState<SelfTestResult | null>(null);
  const [water, setWater] = useState<WaterRecord | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const idx = STEPS.indexOf(step);

  if (sessionActive) {
    return (
      <div className="screen"><Header title="Not working?" />
        <div className="scroll"><div className="card tint-amber"><h3>Finish your session first</h3><p className="p ink">The self-test needs an empty, dry tray.</p></div></div>
      </div>
    );
  }

  return (
    <div className="screen">
      <Header title="Not working?" onBack={() => (idx > 0 && step !== 'result' ? setStep(STEPS[idx - 1]) : nav.back())} />
      <div className="scroll stack">
        <div className="progress" aria-label={`Step ${idx + 1} of 5`}><i style={{ width: `${((idx + 1) / 5) * 100}%` }} /></div>
        <div className="small" style={{ fontWeight: 800 }}>STEP {idx + 1} OF 5</div>

        {step === 'symptom' && (
          <>
            <h2 className="h2">What feels wrong?</h2>
            <div className="stack">
              {(Object.keys(symptomLabel) as Symptom[]).map((k) => (
                <button key={k} className="card" style={{ width: '100%', textAlign: 'left', fontWeight: 700, border: symptom === k ? '3px solid var(--brand)' : '3px solid transparent' }} onClick={() => setSymptom(k)} aria-pressed={symptom === k}>
                  {symptomLabel[k]}
                </button>
              ))}
            </div>
            {symptom === 'stings' && (
              <div className="card flat">
                <CheckRow on={tried} onChange={setTried}>I've already tried the setup fixes (filled to the line, covered cuts, rested my palms)</CheckRow>
                <CheckRow on={skin} onChange={setSkin}>My skin looks damaged (blisters, raw patches)</CheckRow>
              </div>
            )}
            <Btn disabled={!symptom} onClick={() => setStep('selftest')}>Next</Btn>
          </>
        )}

        {step === 'selftest' && <SelfTestStep result={st} onDone={(r) => setSt(r)} onNext={() => setStep('water')} />}

        {step === 'water' && (
          <WaterStep
            rec={water}
            onDone={(w) => setWater(w)}
            onNext={() => setStep('review')}
          />
        )}

        {step === 'review' && symptom && st && water && (
          <ReviewStep
            onNext={() => {
              const review = reviewData(data.get(), now());
              const r = diagnose({ symptom, stingsTriedFixes: tried, skinDamage: skin, selfTest: st, water, review });
              const rec = {
                id: uid(), at: now(), symptom: symptomLabel[symptom], cause: r.cause, also: r.also,
                followUpAt: now() + 7 * DAY, fullStrengthBefore: review.fullShare, done: false,
              };
              update((d) => ({ diagnoses: [rec, ...d.diagnoses].slice(0, 20) }));
              setResult(r);
              setStep('result');
            }}
          />
        )}

        {step === 'result' && result && <ResultCard r={result} onAgain={() => { setStep('symptom'); setResult(null); }} />}
      </div>
    </div>
  );
}

function SelfTestStep({ result, onDone, onNext }: { result: SelfTestResult | null; onDone: (r: SelfTestResult) => void; onNext: () => void }) {
  const prog = useStore(device, (d) => d.selfTest);
  const run = async () => {
    try {
      const r = await runSelfTest();
      update((d) => ({ device: { ...d.device, selfTests: [r, ...d.device.selfTests].slice(0, 30), panelStatus: r.checks[3].ok ? 'ok' : 'check' } }));
      onDone(r);
    } catch {
      toast('The tray is busy');
    }
  };
  return (
    <>
      <h2 className="h2">Device self-test</h2>
      <p className="p">Empty and dry the tray. The device runs current through a built-in test load. It takes about 30 seconds.</p>
      {!prog.running && !result && <Btn onClick={run}><IWrench size={20} /> Run self-test</Btn>}
      {prog.running && (
        <div className="card center" style={{ padding: 28 }}>
          <div className="spinner" />
          <p className="p ink" style={{ marginTop: 14, fontWeight: 700 }}>Testing output, direction, battery and buttons…</p>
          <div className="progress" style={{ marginTop: 12 }}><i style={{ width: `${prog.progress * 100}%` }} /></div>
        </div>
      )}
      {result && !prog.running && (
        <>
          <div className={`card ${result.pass ? 'tint-green' : 'tint-red'}`}><h3>{result.pass ? 'Device passed' : 'Device did not pass'}</h3></div>
          <div className="list">
            {result.checks.map((c) => (
              <Item key={c.name} icon={c.ok ? <ICheck size={18} /> : <IClose size={18} />} title={c.name} sub={c.detail} />
            ))}
          </div>
          <Btn onClick={onNext}>Next</Btn>
          <Btn variant="ghost" onClick={run}>Run it again</Btn>
        </>
      )}
    </>
  );
}

function WaterStep({ rec, onDone, onNext }: { rec: WaterRecord | null; onDone: (w: WaterRecord) => void; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = () => {
    setBusy(true);
    window.setTimeout(() => { onDone(performWaterCheck()); setBusy(false); }, 2000);
  };
  return (
    <>
      <h2 className="h2">Water test</h2>
      <p className="p">Fill the trays the way you normally do. About 20 seconds.</p>
      {!busy && !rec && <Btn onClick={run}><IDrop size={20} /> Check my water</Btn>}
      {busy && <div className="card center" style={{ padding: 28 }}><div className="spinner" /><p className="p ink" style={{ marginTop: 14, fontWeight: 700 }}>Checking minerals, temperature and level…</p></div>}
      {rec && !busy && (
        <>
          <div className={`card ${rec.zone === 'soft' || !rec.levelOk ? 'tint-amber' : 'tint-green'}`}>
            <h3>{!rec.levelOk ? 'Water level is low' : `Water is ${zoneLabel[rec.zone].toLowerCase()}`}</h3>
            <p className="small">{rec.us} µS/cm at {rec.tempC.toFixed(1)} °C</p>
          </div>
          <Btn onClick={onNext}>Next</Btn>
        </>
      )}
    </>
  );
}

function ReviewStep({ onNext }: { onNext: () => void }) {
  const [shown, setShown] = useState(0);
  const r = reviewData(data.get(), now());
  const rows: [string, string][] = [
    ['Sessions vs. plan', `${r.sessions} of ${r.planned} planned`],
    ['Average length', r.sessions ? `${r.avgMin.toFixed(0)} min` : '—'],
    ['Strength delivered vs. set', r.sessions ? `${r.avgDeliveredMa.toFixed(1)} of ${r.avgSetMa.toFixed(1)} mA` : '—'],
    ['Time at full strength', r.fullShare !== null ? `${Math.round(r.fullShare * 100)}%` : '—'],
    ['Resistance trend', r.sessions >= 3 ? `${r.rSlopePerWeek >= 0 ? '+' : ''}${r.rSlopePerWeek.toFixed(2)} kΩ a week` : 'Not enough data'],
    ['Pauses and turn-downs', `${r.pauses} pauses · ${r.quickDrops} turn-downs`],
    ['Current phase', r.phase === 'starting' ? 'Starting phase' : 'Maintenance'],
  ];
  useEffect(() => {
    if (shown >= rows.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), 380);
    return () => window.clearTimeout(id);
  }, [shown, rows.length]);
  return (
    <>
      <h2 className="h2">Reviewing your last 3 weeks</h2>
      <div className="list">
        {rows.slice(0, shown).map(([a, b]) => <Item key={a} title={a} right={<b>{b}</b>} />)}
      </div>
      {shown < rows.length && <div className="spinner" />}
      <Btn disabled={shown < rows.length} onClick={onNext}>See what we found</Btn>
    </>
  );
}

function ResultCard({ r, onAgain }: { r: DiagnosisResult; onAgain: () => void }) {
  const c = causeCopy[r.cause];
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const tint = { red: 'tint-red', amber: 'tint-amber', blue: 'tint-blue', green: 'tint-green' }[c.tone];
  const settings = useStore(data, (d) => d.settings);
  return (
    <>
      <div className={`card ${tint}`} aria-live="polite">
        <div className="small" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Most likely: {c.title}</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.01em', margin: '4px 0 6px' }}>{c.headline}</h2>
        {r.reasons.map((x) => <p key={x} className="p ink">{x}</p>)}
      </div>
      <div className="card">
        <h3>What to do</h3>
        {c.steps.map((s, i) => <CheckRow key={i} on={!!checked[i]} onChange={(v) => setChecked((c) => ({ ...c, [i]: v }))}>{s}</CheckRow>)}
      </div>
      <Actions cause={r.cause} />
      {r.also.length > 0 && (
        <div className="card flat">
          <h3>Also check</h3>
          <div className="chips">{r.also.map((a) => <span key={a} className="chip warn">{causeCopy[a].alsoLabel}</span>)}</div>
        </div>
      )}
      <div className="warnbar blue">We'll check in again in about a week to see if the fix helped{settings.notifOn.followup ? '' : ' (follow-up notifications are off)'}.</div>
      <Btn variant="secondary" onClick={() => nav.back()}>Done</Btn>
      <Btn variant="ghost" onClick={onAgain}>Start over</Btn>
    </>
  );
}

function Actions({ cause }: { cause: DiagCause }) {
  const d = useStore(data, (x) => x);
  switch (cause) {
    case 'device':
      return <div className="btns"><Btn variant="secondary" onClick={() => nav.push('deviceHealth')}>Open device health</Btn><Btn variant="ghost" onClick={() => toast('Prototype: would open the repair guide')}>Open-source repair guide</Btn></div>;
    case 'water':
      return <div className="btns"><Btn onClick={() => nav.push('water')}>Check my water again</Btn><Btn variant="ghost" onClick={() => toast('Saved: baking soda tip for this place')}>Save tip for this place</Btn></div>;
    case 'setup':
      return <Btn variant="secondary" onClick={() => { update(() => ({ mode: 'insert' })); toast('Comfort Insert mode is on'); }}>{d.mode === 'insert' ? 'Comfort Insert mode is on ✓' : 'Try the Comfort Insert'}</Btn>;
    case 'schedule':
      return <div className="btns two"><Btn variant="secondary" onClick={() => nav.push('reminders')}>Adjust reminders</Btn><Btn variant="amber" onClick={() => update((x) => ({ plan: { ...x.plan, boosterUntil: now() + 7 * DAY } }))}>Booster week</Btn></div>;
    case 'doctor':
      return <Btn onClick={() => nav.push('report')}>Export a report for my doctor</Btn>;
    default:
      return null;
  }
}

function FollowUp({ id }: { id: string }) {
  const dx = useStore(data, (d) => d.diagnoses.find((x) => x.id === id));
  const sessions = useStore(data, (d) => d.sessions);
  if (!dx) return <div className="screen"><Header title="Follow-up" /></div>;
  const after = sessions.filter((s) => s.start > dx.at);
  const afterShare = after.length ? after.reduce((a, s) => a + s.fullStrengthShare, 0) / after.length : null;
  const c = causeCopy[dx.cause];
  return (
    <div className="screen">
      <Header title="Did the fix help?" />
      <div className="scroll stack">
        <div className="card">
          <div className="small" style={{ fontWeight: 800 }}>{fmtDay(dx.at).toUpperCase()} · {c.title.toUpperCase()}</div>
          <p className="p ink" style={{ marginTop: 4 }}>{c.headline}</p>
        </div>
        <div className="stat" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div><b>{dx.fullStrengthBefore !== null ? Math.round(dx.fullStrengthBefore * 100) + '%' : '—'}</b><span>full strength before</span></div>
          <div><b>{afterShare !== null ? Math.round(afterShare * 100) + '%' : '—'}</b><span>since ({after.length} session{after.length === 1 ? '' : 's'})</span></div>
        </div>
        {afterShare !== null && dx.fullStrengthBefore !== null && afterShare > dx.fullStrengthBefore + 0.05 && (
          <div className="warnbar green">Your sessions now reach full strength more often. The fix is working.</div>
        )}
        {afterShare === null && <div className="warnbar">No sessions since the check yet. Do one or two, then look again.</div>}
        <Btn onClick={() => { update((d) => ({ diagnoses: d.diagnoses.map((x) => (x.id === id ? { ...x, done: true } : x)) })); nav.back(); }}>Mark as done</Btn>
        <Btn variant="secondary" onClick={() => nav.push('diagnosis')}>Run “Not working?” again</Btn>
      </div>
    </div>
  );
}
