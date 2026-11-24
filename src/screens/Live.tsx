import { useEffect, useState } from 'react';
import { Btn } from '../components/kit';
import { IHand, IHangup, IPause, IPhone, IPlay, ILock } from '../components/Icons';
import { useDeviceView } from '../components/hooks';
import { data } from '../lib/data';
import { useStore } from '../lib/store';
import { ui } from '../lib/ui';
import { actions, callApi } from '../lib/controller';
import { mmss } from '../lib/clock';
import { FW, holdLevel, statusColor } from '../device/sim';

const HINTS = {
  voice: ["Say 'Hey Siri, pause DryTray'", "Say 'ouch' to turn it down", "Say 'Hey Siri, how much time is left?'"],
  panel: ['Press the Pause button on the tray', 'Press Down to turn it down', 'Press Up for a little more'],
  both: ["Say 'Hey Siri, pause DryTray'", 'Or press the Pause button on the tray', "Say 'ouch' or press Down to turn it down"],
};

export function Live() {
  const v = useDeviceView();
  const call = useStore(ui, (u) => u.call);
  const tooLong = useStore(ui, (u) => u.pauseTooLong);
  const style = useStore(data, (d) => d.settings.controlStyle);
  const [hint, setHint] = useState(0);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setHint((h) => h + 1), 6000);
    return () => window.clearInterval(id);
  }, []);

  const color = statusColor(v);
  const handOut = v.mode === 'safe' && v.pauseReason === 'hand_out';
  const safe = (v.mode === 'safe' && !handOut) || v.mode === 'complete';
  const hints = HINTS[style];
  const remaining = v.stale ? v.estRemaining : v.remainingSec;
  const max = 20;

  const label = (() => {
    switch (v.mode) {
      case 'armed': return 'Waiting for your hands';
      case 'ramping': return 'Starting gently';
      case 'running': return 'Running';
      case 'switching': return 'Switching direction';
      case 'hold': return call?.phase === 'answered' ? 'On a call · gentle level' : 'On hold for your call';
      case 'lowering': return 'Lowering…';
      case 'safe': return handOut ? 'Paused' : 'Safe to lift';
      default: return 'Running';
    }
  })();

  const lockBtn = (
    <button className="linkbtn" onClick={() => ui.set({ lockPreview: true })} aria-label="Preview lock screen view">
      <ILock size={14} /> Lock screen
    </button>
  );

  // ---- Safe to Lift (S11): one consistent signal, everywhere ----
  if (safe) {
    return (
      <div className="live green" role="status" aria-live="assertive">
        <div className="safe-big" style={{ marginTop: 40 }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#fff', margin: '0 auto', display: 'grid', placeItems: 'center', color: '#0d7a4d' }}>
            <IHand size={64} />
          </div>
          <h1>Safe to lift your hands</h1>
          <p>
            {v.pauseReason === 'call' ? 'Paused for your call. Pick up your phone normally.' : 'Current is off. Take your time.'}
          </p>
          <p style={{ fontSize: 17, opacity: 0.8 }}>
            {mmss(remaining)} left in your session
          </p>
        </div>
        <div className="live-actions">
          {tooLong && (
            <div className="note-pill" style={{ background: '#fff', color: '#03281a', margin: 0 }}>
              Paused for a while. Finish this session or continue?
            </div>
          )}
          <button className="bigbtn primary" onClick={() => actions.resume('app')}><IPlay /> Resume</button>
          <button className="bigbtn" onClick={() => actions.stop('app')}>Finish session</button>
          <div style={{ textAlign: 'center' }}>{lockBtn}</div>
        </div>
        {call && <CallCard />}
      </div>
    );
  }

  const pct = (x: number) => `${Math.min(100, (x / max) * 100)}%`;
  const noHands = !v.hands;

  return (
    <div className="live">
      <div className={`band ${color}`} role="status" aria-live="polite">
        <span className="dot" />
        <span>{label}</span>
      </div>

      {v.stale && (
        <div className="note-pill" style={{ background: '#f0a030', color: '#3a2500', margin: '12px 20px 0' }}>
          Bluetooth lost. Your tray keeps running safely and will finish on time. Time shown is an estimate.
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
        {v.mode === 'armed' ? (
          <div className="safe-big" style={{ marginTop: 32 }}>
            <div style={{ color: '#8fd3da' }}><IHand size={72} /></div>
            <h1 style={{ fontSize: 36 }}>Place your hands in the water</h1>
            <p>The tray will start gently as soon as it feels them.</p>
            <div style={{ marginTop: 22 }}>
              <span className="mock-note">PROTOTYPE</span>
              <div style={{ marginTop: 8 }}>
                <Btn variant="small" className="inline" onClick={() => actions.setHands(true)}>Simulate: hands in water</Btn>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="timer" aria-label={`${mmss(remaining)} left`}>{mmss(remaining)}</div>
            <div className="timer-sub">left</div>

            <div className="strength">
              <div className="lbl">
                <span>Strength</span>
                <span>{v.deliveredMa.toFixed(1)} of {v.setMa.toFixed(0)} mA</span>
              </div>
              <div className="sbar" role="img" aria-label={`Strength ${v.deliveredMa.toFixed(0)} of ${v.setMa} milliamps`}>
                <div className={`fill ${v.mode === 'hold' || v.mode === 'lowering' ? 'amber' : v.severe ? 'red' : ''}`} style={{ width: pct(v.deliveredMa) }} />
                <div className="cap" style={{ left: pct(v.comfortCap) }} title="Your comfort limit" />
                <div className="set" style={{ left: pct(v.setMa) }} />
              </div>
              <div className="row between small" style={{ color: 'rgba(255,255,255,.6)', marginTop: 6 }}>
                <span>White line: set</span><span>Faint line: your limit</span>
              </div>
            </div>

            {v.mode === 'switching' && <div className="note-pill">Switching direction. You may feel a brief change.</div>}
            {v.polaritySwitches > 0 && v.mode === 'running' && <div className="note-pill" style={{ opacity: 0.8 }}>Direction switched halfway ✓</div>}
            {v.notReaching && <div className="note-pill" style={{ background: v.severe ? '#ff7b7a' : undefined, color: v.severe ? '#2a0000' : undefined }}>Not reaching full strength. We'll look at this after the session.</div>}
            {v.mode === 'hold' && !call && <div className="note-pill">Holding at {holdLevel(v.setMa)} mA. Say 'resume' when you're ready.</div>}
            {handOut && (
              <div className="note-pill" style={{ background: '#f0a030', color: '#3a2500' }}>
                Paused. Put your hands back and press the button or say 'resume'.
              </div>
            )}
            {noHands && !handOut && v.mode !== 'safe' && <div className="note-pill">I can't feel your hands in the water.</div>}
            {(handOut || noHands) && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <span className="mock-note">PROTOTYPE</span>{' '}
                <Btn variant="small" className="inline" onClick={() => actions.setHands(true)}>Simulate: hands in water</Btn>
              </div>
            )}

            <div className="hint" aria-live="off">{hints[hint % hints.length]}</div>

            {details && (
              <div className="details">
                <dl>
                  <dt>Strength set</dt><dd>{v.setMa.toFixed(0)} mA</dd>
                  <dt>Strength delivered</dt><dd>{v.deliveredMa.toFixed(1)} mA</dd>
                  <dt>Your comfort limit</dt><dd>{v.comfortCap} mA</dd>
                  <dt>How hard the device is pushing</dt><dd>{v.voltage.toFixed(1)} V</dd>
                  <dt>Blocking the current</dt><dd>{v.resistance.toFixed(2)} kΩ</dd>
                  <dt>Direction</dt><dd>{v.polarity === 1 ? 'Forward' : 'Reversed'}</dd>
                  <dt>Tray battery</dt><dd>{Math.round(v.battery)}%</dd>
                  <dt>Safety cap (device)</dt><dd>{FW.MAX_MA} mA</dd>
                </dl>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'center', gap: 4 }}>
              <button className="linkbtn" onClick={() => setDetails((d) => !d)}>{details ? 'Hide details' : 'Details'}</button>
              {lockBtn}
            </div>
          </>
        )}
      </div>

      <div className="live-actions">
        {v.mode === 'armed' ? (
          <button className="bigbtn" onClick={() => actions.stop('app')}>Cancel</button>
        ) : v.mode === 'hold' && call?.phase === 'ended' ? (
          <>
            <button className="bigbtn primary" onClick={() => actions.resume('app')}><IPlay /> Resume session</button>
            <button className="bigbtn" onClick={() => actions.stop('app')}>Finish session</button>
          </>
        ) : v.mode === 'hold' && !call ? (
          <>
            <button className="bigbtn primary" onClick={() => actions.resume('app')}><IPlay /> Resume</button>
            <button className="bigbtn ouch" onClick={() => actions.down('app')}>Ouch · lower</button>
          </>
        ) : handOut ? (
          <>
            <button className="bigbtn primary" disabled={noHands} style={{ opacity: noHands ? 0.5 : 1 }} onClick={() => actions.resume('app')}><IPlay /> Resume</button>
            <button className="bigbtn" onClick={() => actions.stop('app')}>Finish session</button>
          </>
        ) : (
          <>
            <button className="bigbtn ouch" onClick={() => actions.down('app')} aria-label="Ouch, turn it down">Ouch · turn it down</button>
            <button className="bigbtn" onClick={() => actions.pause('app')}><IPause /> Pause</button>
          </>
        )}
      </div>

      {call && <CallCard />}
    </div>
  );
}

function CallCard() {
  const call = useStore(ui, (u) => u.call);
  if (!call) return null;
  if (call.phase === 'ringing') {
    return (
      <div className="callcard" role="alertdialog" aria-label={`Incoming call from ${call.caller}`}>
        <div className="row">
          <div className="ringico"><IPhone size={26} /></div>
          <div className="grow">
            <div className="small" style={{ fontWeight: 800 }}>INCOMING CALL{call.favorite ? ' · FAVORITE' : ''}</div>
            <div className="caller">{call.caller}</div>
          </div>
        </div>
        <p className="p" style={{ marginTop: 10 }}>Strength lowered to a gentle level. Keep your hands where they are.</p>
        <div className="opts">
          <button className="opt-answer" onClick={() => callApi.answer('app')}><IPhone size={24} />Answer</button>
          <button className="opt-decline" onClick={() => callApi.decline()}><IHangup size={24} />Decline</button>
          <button className="opt-pause" onClick={() => callApi.pause()}><IPause size={24} />Pause</button>
        </div>
        <p className="small center" style={{ marginTop: 10 }}>Or say “answer”, “decline” or “pause”.</p>
      </div>
    );
  }
  if (call.phase === 'answered') {
    return (
      <div className="callcard">
        <div className="row">
          <div className="ringico" style={{ animation: 'none' }}><IPhone size={26} /></div>
          <div className="grow">
            <div className="small" style={{ fontWeight: 800 }}>ON A CALL</div>
            <div className="caller">{call.caller}</div>
          </div>
        </div>
        <p className="p" style={{ marginTop: 10 }}>Your session is holding at a gentle level and the timer is paused.</p>
        <div className="btns two" style={{ marginTop: 12 }}>
          <Btn variant="danger" onClick={() => callApi.end()}>End call</Btn>
          <Btn variant="secondary" onClick={() => callApi.pause()}>Pause session</Btn>
        </div>
      </div>
    );
  }
  return (
    <div className="callcard">
      <div className="caller">Call ended</div>
      <p className="p" style={{ marginTop: 6 }}>Resume your session?</p>
      <div className="btns two" style={{ marginTop: 12 }}>
        <Btn onClick={() => actions.resume('app')}>Resume</Btn>
        <Btn variant="secondary" onClick={() => actions.stop('app')}>Finish</Btn>
      </div>
    </div>
  );
}

