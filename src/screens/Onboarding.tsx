import { useEffect, useState } from 'react';
import { Btn, Disclaimer, Item, Seg, Toggle } from '../components/kit';
import { IBack, ICheckCircle, IDrop, IShield, IBell, IMic, IPhone } from '../components/Icons';
import { PanelMock } from '../components/PanelMock';
import { data, update } from '../lib/data';
import { useStore } from '../lib/store';
import { nav, ui } from '../lib/ui';
import { device } from '../device/sim';
import type { Area, CallMode } from '../types';
import { say } from '../lib/controller';

const QUESTIONS: { id: string; q: string; why: string }[] = [
  { id: 'pregnant', q: 'Are you pregnant?', why: 'Treatment with electric current has not been studied enough during pregnancy.' },
  { id: 'pacemaker', q: 'Do you have a pacemaker or an implanted defibrillator?', why: 'Electric current passing near these devices can interfere with them.' },
  { id: 'metal', q: 'Do you have metal implants in your hands or arms?', why: 'Metal can concentrate current and cause burns around the implant.' },
  { id: 'rhythm', q: 'Do you have heart rhythm problems?', why: 'Current passing through the body can affect heart rhythm in some people.' },
  { id: 'epilepsy', q: 'Do you have epilepsy?', why: 'A doctor should decide whether electric stimulation is safe for you.' },
  { id: 'wounds', q: 'Do you have open wounds on your hands or feet?', why: 'Current stings in broken skin and can make wounds worse. Small cuts can be covered; open wounds should heal first.' },
];

const STEPS = ['welcome', 'safety', 'area', 'pair', 'buttons', 'control', 'voice', 'calls', 'plan', 'ready'] as const;
type Step = (typeof STEPS)[number] | 'stop';

export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [qi, setQi] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const idx = STEPS.indexOf(step as (typeof STEPS)[number]);
  const back = () => {
    if (step === 'safety' && qi > 0) return setQi(qi - 1);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };
  const header = step !== 'welcome' && step !== 'stop' && (
    <div className="hdr">
      <button className="iconbtn" aria-label="Back" onClick={back}><IBack /></button>
      <div className="progress grow" aria-label={`Setup step ${idx + 1} of ${STEPS.length}`}><i style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} /></div>
      <span style={{ width: 12 }} />
    </div>
  );

  return (
    <div className="screen">
      {header}
      {step === 'welcome' && (
        <div className="scroll" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="center" style={{ marginTop: 48 }}>
            <div style={{ width: 96, height: 96, borderRadius: 24, background: 'var(--brand)', display: 'grid', placeItems: 'center', margin: '0 auto', color: '#fff' }}><IDrop size={54} /></div>
            <h1 style={{ fontSize: 40, lineHeight: '48px', fontWeight: 600, letterSpacing: '-.01em', margin: '22px 0 8px' }}>DrySync</h1>
            <p className="p ink" style={{ fontSize: 18, lineHeight: '26px' }}>Keeps your DryTray sessions easy, so the treatment keeps working.</p>
          </div>
          <div className="card tint-brand" style={{ marginTop: 28 }}>
            <div className="row" style={{ alignItems: 'center', gap: 12 }}><IShield size={28} /><p className="p ink"><b>Private by design.</b> Your health data stays on this phone unless you choose to share it.</p></div>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <Btn onClick={() => setStep('safety')}>Get started</Btn>
            <Disclaimer />
          </div>
        </div>
      )}

      {step === 'safety' && (
        <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="eyebrow">Safety question {qi + 1} of {QUESTIONS.length}</div>
          <h2 className="title">{QUESTIONS[qi].q}</h2>
          <details className="card flat"><summary style={{ fontWeight: 600, cursor: 'pointer' }}>Why we ask</summary><p className="p" style={{ marginTop: 8 }}>{QUESTIONS[qi].why}</p></details>
          <div style={{ marginTop: 'auto' }} className="btns two">
            {(['No', 'Yes'] as const).map((a) => (
              <Btn key={a} variant={a === 'Yes' ? 'secondary' : undefined} onClick={() => {
                const nf = a === 'Yes' ? [...flags, QUESTIONS[qi].id] : flags;
                setFlags(nf);
                if (qi < QUESTIONS.length - 1) setQi(qi + 1);
                else if (nf.length) { update(() => ({ safetyPassed: false, safetyFlags: nf, onboarded: true })); setStep('stop'); }
                else { update(() => ({ safetyPassed: true, safetyFlags: [] })); setStep('area'); }
              }}>{a}</Btn>
            ))}
          </div>
        </div>
      )}

      {step === 'stop' && <StopScreen flags={flags} />}

      {step === 'area' && <AreaStep onNext={() => setStep('pair')} />}
      {step === 'pair' && <PairStep onNext={() => setStep('buttons')} />}
      {step === 'buttons' && <ButtonTest onNext={() => setStep('control')} />}
      {step === 'control' && <ControlStep onNext={(v) => (v === 'panel' ? setStep('calls') : setStep('voice'))} />}
      {step === 'voice' && <VoiceStep onNext={() => setStep('calls')} />}
      {step === 'calls' && <CallsStep onNext={() => setStep('plan')} />}
      {step === 'plan' && <PlanStep onNext={() => setStep('ready')} />}
      {step === 'ready' && (
        <div className="scroll" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="center" style={{ marginTop: 40 }}>
            <div className="bigcheck"><ICheckCircle size={48} /></div>
            <h2 className="title" style={{ marginTop: 16 }}>You're set up</h2>
            <p className="p" style={{ fontSize: 18, lineHeight: '26px', marginTop: 8 }}>Your first session is gentle and guided. We'll find the strength that's comfortable for you.</p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <Btn onClick={() => { update(() => ({ onboarded: true })); ui.set({ tab: 'today', stack: [] }); nav.push('tutorial'); }}>Start my first session</Btn>
            <Btn variant="ghost" onClick={() => update(() => ({ onboarded: true }))}>Maybe later</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function StopScreen({ flags }: { flags: string[] }) {
  const labels = QUESTIONS.filter((q) => flags.includes(q.id));
  return (
    <div className="scroll stack">
      <div className="card tint-amber" style={{ marginTop: 24 }}>
        <h2 className="h2">Please talk to a doctor before using DryTray</h2>
        <p className="p ink">Based on your answers, sessions are locked for now. This keeps you safe.</p>
      </div>
      <div className="card">
        <h3>Why</h3>
        <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{labels.map((l) => <li key={l.id} style={{ marginBottom: 8 }}><b>{l.q.replace('?', '')}.</b> <span className="p">{l.why}</span></li>)}</ul>
      </div>
      <Btn variant="secondary" onClick={() => { const text = `I'd like to try tap-water iontophoresis for hyperhidrosis (a DryTray research prototype). I answered yes to: ${labels.map((l) => l.q).join(' ')} Is this safe for me?`; navigator.clipboard?.writeText(text).catch(() => {}); say('Copied a note you can share with your doctor.'); }}>Copy a note to share with my doctor</Btn>
      <Btn onClick={() => { ui.set({ tab: 'today', stack: [] }); }}>Browse the app</Btn>
      <p className="small center">You can browse the app, but you can't start sessions.</p>
    </div>
  );
}

function AreaStep({ onNext }: { onNext: () => void }) {
  const area = useStore(data, (d) => d.area);
  const opts: { v: Area; l: string }[] = [{ v: 'hands', l: 'Hands' }, { v: 'feet', l: 'Feet' }, { v: 'both', l: 'Both' }];
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">Which areas do you treat?</h2>
      <div className="stack">{opts.map((o) => (
        <button key={o.v} className="card opt" aria-pressed={area === o.v} onClick={() => update(() => ({ area: o.v }))}><span className="t">{o.l}</span></button>
      ))}</div>
      <div style={{ marginTop: 'auto' }}><Btn onClick={onNext}>Next</Btn></div>
    </div>
  );
}

function PairStep({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'found' | 'paired'>('idle');
  const dev = useStore(data, (d) => d.device);
  const scan = () => {
    setPhase('scanning');
    window.setTimeout(() => setPhase('found'), 1800);
  };
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">Pair your tray</h2>
      <p className="p">Turn on the tray and hold your phone close. The light on the tray will blink.</p>
      <div className="card center" style={{ padding: 26 }}>
        <TrayArt blinking={phase === 'scanning' || phase === 'found'} />
        {phase === 'scanning' && <p className="p ink" style={{ fontWeight: 600, marginTop: 10 }}>Looking for your tray…</p>}
        {phase === 'found' && <p className="p ink" style={{ fontWeight: 600, marginTop: 10 }}>Found DryTray {dev.id}. Is the light blinking?</p>}
        {phase === 'paired' && <p className="p ink" style={{ fontWeight: 600, marginTop: 10 }}>Paired ✓</p>}
      </div>
      {phase === 'found' && (
        <div className="field"><label htmlFor="nm">Name your tray</label><input id="nm" defaultValue={dev.name} onChange={(e) => update((d) => ({ device: { ...d.device, name: e.target.value } }))} /></div>
      )}
      <details className="card flat"><summary style={{ fontWeight: 600, cursor: 'pointer' }}>Can't find it?</summary><ul className="p" style={{ paddingLeft: 18 }}><li>Hold the power button for 3 seconds.</li><li>Charge the tray if the light stays off.</li><li>Turn Bluetooth on for DrySync in phone settings.</li></ul></details>
      <div style={{ marginTop: 'auto' }}>
        {phase === 'idle' && <Btn onClick={scan}>Look for my tray</Btn>}
        {phase === 'scanning' && <Btn disabled>Looking…</Btn>}
        {phase === 'found' && <Btn onClick={() => { update((d) => ({ device: { ...d.device, paired: true } })); setPhase('paired'); window.setTimeout(onNext, 500); }}>Yes, pair it</Btn>}
      </div>
    </div>
  );
}

function TrayArt({ blinking }: { blinking: boolean }) {
  return (
    <svg viewBox="0 0 240 130" width="220" aria-hidden="true">
      <rect x="10" y="30" width="220" height="86" rx="34" fill="#e9eaff" stroke="#000" strokeWidth="2.500" />
      <path d="M40 60c30-14 110-14 150 0v30c-40 14-120 14-150 0z" fill="#fff" stroke="#000" strokeWidth="2.500" strokeLinejoin="round" />
      <rect x="170" y="96" width="46" height="14" rx="6" fill="#6a00ff" />
      <circle cx="40" cy="102" r="7" fill={blinking ? '#ffb900' : '#000'} fillOpacity={blinking ? 1 : 0.3} stroke={blinking ? '#000' : 'none'} strokeWidth="1.500" style={blinking ? { animation: 'blink 0.8s infinite' } : undefined} />
    </svg>
  );
}

function ButtonTest({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(
    () =>
      device.subscribe(() => {
        const f = device.get().panelFlash;
        if (f) setDone((d) => (d[f.button] ? d : { ...d, [f.button]: true }));
      }),
    [],
  );
  const names: [string, string][] = [['play', 'Pause / Play'], ['call', 'Call'], ['down', 'Down'], ['up', 'Up']];
  const all = names.every(([k]) => done[k]);
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">Test the Control Panel</h2>
      <p className="p">Press each of the four buttons on the tray, near your fingertips. Each one lights up here when it works.</p>
      <PanelMock />
      <div className="list">
        {names.map(([k, n]) => <Item key={k} title={n} right={done[k] ? <span className="chip good">✓ Works</span> : <span className="chip">Press it</span>} />)}
      </div>
      <span className="mock-note">PROTOTYPE: tap the buttons above, or use the mock tray</span>
      <div style={{ marginTop: 'auto' }}>
        <Btn disabled={!all} onClick={onNext}>{all ? 'Next' : 'Press all four buttons'}</Btn>
        <Btn variant="ghost" onClick={onNext}>Skip for now</Btn>
      </div>
    </div>
  );
}

function ControlStep({ onNext }: { onNext: (v: 'voice' | 'panel' | 'both') => void }) {
  const v = useStore(data, (d) => d.settings.controlStyle);
  const opts: { v: 'voice' | 'panel' | 'both'; l: string; s: string }[] = [
    { v: 'voice', l: 'Voice', s: 'Say “Hey Siri, pause DryTray”' },
    { v: 'panel', l: 'Tray buttons', s: 'Press the Control Panel with a fingertip' },
    { v: 'both', l: 'Both', s: 'Use whichever is easier at the time' },
  ];
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">How do you want to control sessions?</h2>
      <p className="p">Your hands are wet during a session, so you won't need to touch your phone.</p>
      {opts.map((o) => (
        <button key={o.v} className="card opt" aria-pressed={v === o.v} onClick={() => update((d) => ({ settings: { ...d.settings, controlStyle: o.v } }))}>
          <div className="t">{o.l}</div><div className="s">{o.s}</div>
        </button>
      ))}
      <div style={{ marginTop: 'auto' }}><Btn onClick={() => onNext(v)}>Next</Btn></div>
    </div>
  );
}

const SIRI = ['Start DryTray', 'Pause DryTray', 'Resume DryTray', 'Stop DryTray'];
function VoiceStep({ onNext }: { onNext: () => void }) {
  const added = useStore(data, (d) => d.siriAdded);
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">Set up voice shortcuts</h2>
      <p className="p">Add these phrases to Siri. Say them with your phone nearby on a table.</p>
      <div className="list">
        {SIRI.map((p) => (
          <Item key={p} icon={<IMic size={24} />} title={`“Hey Siri, ${p.toLowerCase()}”`} right={added.includes(p) ? <span className="chip good">Added</span> : <Btn variant="small" onClick={() => update((d) => ({ siriAdded: [...d.siriAdded, p] }))}>Add to Siri</Btn>} />
        ))}
      </div>
      <p className="small">“Ouch”, “turn it down” and “turn it up a little” work once a session is running. You can't set an exact number by voice.</p>
      <div style={{ marginTop: 'auto' }}>
        <Btn onClick={() => { update((d) => ({ siriAdded: [...new Set([...d.siriAdded, ...SIRI])] })); onNext(); }}>{added.length >= 4 ? 'Next' : 'Add all and continue'}</Btn>
      </div>
    </div>
  );
}

function CallsStep({ onNext }: { onNext: () => void }) {
  const mode = useStore(data, (d) => d.settings.callMode);
  const fav = useStore(data, (d) => d.settings.favoritesOnly);
  const set = (p: Partial<{ callMode: CallMode; favoritesOnly: boolean }>) => update((d) => ({ settings: { ...d.settings, ...p } }));
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">When your phone rings</h2>
      <div className="card tint-brand"><div className="row" style={{ alignItems: 'flex-start' }}><IPhone size={28} /><p className="p ink"><b>Call Guard</b> lowers your strength to a gentle level the moment a call comes in. You can answer, decline or pause without lifting your hands.</p></div></div>
      <Seg<CallMode> value={mode} onChange={(v) => set({ callMode: v })} options={[{ v: 'ask', label: 'Always ask' }, { v: 'pause', label: 'Always pause' }, { v: 'ignore', label: 'Ignore' }]} />
      <div className="list"><Item title="Favorites only" sub="Like a Focus mode: only chosen people interrupt" right={<Toggle on={fav} onChange={(v) => set({ favoritesOnly: v })} label="Favorites only" />} /></div>
      <p className="small">To answer or decline by voice, turn on <b>Announce Calls</b> in your phone's Siri settings. DrySync only manages your strength.</p>
      <div style={{ marginTop: 'auto' }}><Btn onClick={onNext}>Next</Btn></div>
    </div>
  );
}

function PlanStep({ onNext }: { onNext: () => void }) {
  const plan = useStore(data, (d) => d.plan);
  const s = useStore(data, (d) => d.settings);
  return (
    <div className="scroll stack" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="title">Your plan</h2>
      <div className="hero"><div className="big sm">Starting phase</div><p className="p">4 sessions a week for about 3 weeks. Then 1 to 3 a week to keep results.</p></div>
      <div className="field"><label htmlFor="ot">Usual time</label><input id="ot" type="time" value={plan.time} onChange={(e) => update((d) => ({ plan: { ...d.plan, time: e.target.value } }))} /></div>
      <div className="list">
        <Item icon={<IBell size={24} />} title="Remind me" sub="Respects your calendar. Two a day at most." right={<Toggle on={s.remindersOn} onChange={(v) => update((d) => ({ settings: { ...d.settings, remindersOn: v } }))} label="Reminders" />} />
      </div>
      <div style={{ marginTop: 'auto' }}><Btn onClick={onNext}>Next</Btn></div>
    </div>
  );
}

