import { useState } from 'react';
import { Btn, CheckRow, Header } from '../components/kit';
import { IDrop, IBandage, IWatch, IBolt } from '../components/Icons';
import { data } from '../lib/data';
import { useStore } from '../lib/store';
import { nav } from '../lib/ui';
import { requestStart } from '../lib/controller';

const CARDS = [
  { icon: <IDrop size={56} />, title: 'Fill to the line', body: 'Fill each tray with normal tap water up to the line. We\'ll check it in a moment.' },
  { icon: <IWatch size={56} />, title: 'Remove watches and rings', body: 'Metal can concentrate current. Take off watches, rings and bracelets before every session.' },
  { icon: <IBandage size={56} />, title: 'Cover small cuts', body: 'Dab a little petroleum jelly on any small cut or scratch. Open wounds should heal first.' },
  { icon: <IBolt size={56} />, title: 'We start low', body: 'Every minute we\'ll ask how it feels. Say “up a little” or “down”, or use the Up and Down buttons. We save your comfort limit.' },
];

export function Tutorial() {
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);
  const c = CARDS[i];
  const last = i === CARDS.length - 1;
  const locked = useStore(data, (d) => d.safetyPassed !== true);
  return (
    <div className="screen">
      <Header title="First session" />
      <div className="scroll" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="progress"><i style={{ width: `${((i + 1) / CARDS.length) * 100}%` }} /></div>
        <div className="card tint-brand center" style={{ marginTop: 20, padding: 24 }}>
          <div style={{ color: '#000' }}>{c.icon}</div>
          <h2 className="h2" style={{ marginTop: 10 }}>{c.title}</h2>
          <p className="p ink" style={{ fontSize: 18, lineHeight: '26px' }}>{c.body}</p>
        </div>
        {last && <div className="card flat" style={{ marginTop: 14 }}><CheckRow on={ok} onChange={setOk}>My watches and rings are off and the trays are filled to the line.</CheckRow></div>}
        <div style={{ marginTop: 'auto' }} className="btns">
          {last ? (
            <Btn disabled={!ok || locked} onClick={() => { nav.back(); requestStart('app'); }}>Continue to Water Check</Btn>
          ) : (
            <Btn onClick={() => setI(i + 1)}>Next</Btn>
          )}
          {i > 0 && <Btn variant="ghost" onClick={() => setI(i - 1)}>Back</Btn>}
        </div>
      </div>
    </div>
  );
}
