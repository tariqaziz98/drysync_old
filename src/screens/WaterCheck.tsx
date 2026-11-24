import { useCallback, useEffect, useRef, useState } from 'react';
import { Btn, Header, Item } from '../components/kit';
import { IDrop, IInfo } from '../components/Icons';
import { data, update } from '../lib/data';
import { useStore } from '../lib/store';
import { nav, ui } from '../lib/ui';
import { markBakingSoda, performWaterCheck, requestStart, speakWaterResult } from '../lib/controller';
import { device, sim } from '../device/sim';
import { zoneAdvice, zoneLabel } from '../lib/water';
import type { WaterRecord } from '../types';
import { fmtTime } from '../lib/clock';

const markerPos = (us: number) => {
  // Map conductivity onto the three-zone gauge (soft | good | hard)
  if (us < 200) return (us / 200) * 28;
  if (us <= 1000) return 28 + ((us - 200) / 800) * 46;
  return Math.min(98, 74 + ((us - 1000) / 1500) * 24);
};

export function WaterCheck({ auto }: { auto?: boolean }) {
  const [rec, setRec] = useState<WaterRecord | null>(null);
  const [busy, setBusy] = useState(() => !!auto && !device.get().sessionActive);
  const [details, setDetails] = useState(false);
  const places = useStore(data, (d) => d.places);
  const placeTags = useStore(data, (d) => d.settings.placeTags);
  const place = useStore(data, (d) => d.currentPlace);
  const sessionActive = useStore(device, (d) => d.sessionActive);
  const startAfter = useStore(ui, (u) => u.autoStartAfterWater);
  const timer = useRef<number | undefined>(undefined);
  const speakResult = useRef(!!auto);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = performWaterCheck();
      setRec(r);
      setBusy(false);
      if (speakResult.current) speakWaterResult(r);
    }, 1800);
  }, []);
  const run = useCallback(() => {
    setBusy(true);
    schedule();
  }, [schedule]);

  useEffect(() => {
    if (auto && !device.get().sessionActive) schedule();
    return () => window.clearTimeout(timer.current);
  }, [auto, schedule]);

  const ok = rec && rec.levelOk && rec.zone !== 'soft';

  const addSoda = () => {
    sim.addBakingSoda();
    markBakingSoda();
    speakResult.current = true;
    run();
  };
  const addWater = () => {
    sim.addWater();
    speakResult.current = true;
    run();
  };

  return (
    <div className="screen">
      <Header title="Water Check" onBack={() => { ui.set({ autoStartAfterWater: false }); nav.back(); }} />
      <div className="scroll stack">
        {sessionActive ? (
          <div className="card tint-amber">
            <h3>Not during a session</h3>
            <p className="p ink">Your water may be mid-treatment. Check it before your next session.</p>
          </div>
        ) : !rec && !busy ? (
          <>
            <div className="card tint-brand center" style={{ padding: 24 }}>
              <div style={{ color: '#000' }}><IDrop size={56} /></div>
              <h2 className="h2">Fill your trays</h2>
              <p className="p">Fill to the line with normal tap water, then check. It takes a few seconds.</p>
            </div>
            <Btn onClick={() => { speakResult.current = false; run(); }}>Check my water</Btn>
          </>
        ) : busy ? (
          <div className="card tint-brand center" style={{ padding: '40px 24px' }}>
            <div className="spinner" />
            <h2 className="h2" style={{ marginTop: 18 }}>Checking your water…</h2>
            <p className="p">Reading minerals, temperature and level.</p>
          </div>
        ) : rec ? (
          <>
            <div className={`card ${rec.zone === 'good' && rec.levelOk ? 'tint-green' : rec.zone === 'soft' || !rec.levelOk ? 'tint-amber' : 'tint-blue'}`} aria-live="polite">
              <div className="small" style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>Your water</div>
              <h2 style={{ fontSize: 32, lineHeight: '40px', fontWeight: 600, margin: '2px 0 6px' }}>
                {!rec.levelOk ? 'Add water' : zoneLabel[rec.zone]}
              </h2>
              <p className="p ink">{zoneAdvice(rec.zone, rec.levelOk)}</p>
            </div>

            <div className="card">
              <div className="gauge" role="img" aria-label={`Water is ${zoneLabel[rec.zone]}`}>
                <i className="z1" /><i className="z2" /><i className="z3" />
                <span className="gauge-marker" style={{ left: `${markerPos(rec.us)}%` }} />
              </div>
              <div className="row between small" style={{ marginTop: 8, fontWeight: 700 }}>
                <span>Too soft</span><span>Good</span><span>Very hard</span>
              </div>
            </div>

            {!rec.levelOk && <Btn variant="amber" onClick={addWater}>I added water. Check again</Btn>}
            {ok && <Btn variant="ghost" onClick={() => { speakResult.current = false; run(); }}>Check again</Btn>}
            {rec.zone === 'soft' && rec.levelOk && <Btn variant="amber" onClick={addSoda}>I added baking soda. Check again</Btn>}

            <button className="linkbtn" style={{ color: 'var(--brand)', fontWeight: 600, opacity: 1 }} onClick={() => setDetails((d) => !d)}>
              {details ? 'Hide details' : 'Details'}
            </button>
            {details && (
              <div className="list">
                <Item title="Conductivity" sub="How well your water carries current (corrected to 25 °C)" right={<b>{rec.us} µS/cm</b>} />
                <Item title="Water temperature" sub="Used to correct the mineral reading" right={<b>{rec.tempC.toFixed(1)} °C</b>} />
                <Item title="Water level" sub="Whether the palms are covered" right={<b>{rec.levelOk ? 'OK' : 'Low'}</b>} />
                <Item title="Checked" right={<b>{fmtTime(rec.at)}</b>} />
              </div>
            )}
            {details && (
              <p className="small row" style={{ gap: 6 }}><IInfo size={16} />A low-cost sensor is about ±10%. That's fine for groups, not exact values.</p>
            )}

            {placeTags && (
              <div className="card flat">
                <div className="small" style={{ fontWeight: 500, color: 'var(--brand)', marginBottom: 8 }}>Place tag</div>
                <div className="chips">
                  {places.map((p) => (
                    <button key={p} className={`chip ${place === p ? 'on' : ''}`} onClick={() => update(() => ({ currentPlace: p }))}>{p}</button>
                  ))}
                </div>
              </div>
            )}

            {ok && startAfter ? (
              <Btn onClick={() => requestStart('app', { skipWater: true })}>Ready. Start session</Btn>
            ) : ok ? (
              <Btn onClick={() => nav.back()}>Done</Btn>
            ) : startAfter ? (
              <Btn variant="secondary" onClick={() => requestStart('app', { skipWater: true })}>Start anyway</Btn>
            ) : (
              <Btn variant="secondary" onClick={() => nav.back()}>Done</Btn>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
