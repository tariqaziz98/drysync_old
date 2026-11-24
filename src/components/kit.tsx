import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IBack, IChev } from './Icons';
import { nav } from '../lib/ui';

export const Btn = ({
  variant,
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'secondary' | 'ghost' | 'danger' | 'amber' | 'green' | 'small' | 'inline' }) => (
  <button className={`btn ${variant ?? ''} ${className}`} {...p} />
);

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button role="switch" aria-checked={on} aria-label={label} className="toggle" onClick={() => onChange(!on)} />
);

export const Seg = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="seg" role="group">
    {options.map((o) => (
      <button key={o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
        {o.label}
      </button>
    ))}
  </div>
);

export const Header = ({ title, back = true, right, onBack }: { title: string; back?: boolean; right?: ReactNode; onBack?: () => void }) => (
  <div className="hdr">
    {back ? (
      <button className="iconbtn" aria-label="Back" onClick={onBack ?? nav.back}>
        <IBack />
      </button>
    ) : (
      <span style={{ width: 12 }} />
    )}
    <h1>{title}</h1>
    {right}
  </div>
);

export const Item = ({
  icon,
  title,
  sub,
  right,
  onClick,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) => {
  const body = (
    <>
      {icon && <span className="ico">{icon}</span>}
      <span className="grow">
        <div className="t">{title}</div>
        {sub && <div className="s">{sub}</div>}
      </span>
      {right}
      {onClick && !right && (
        <span className="chev">
          <IChev size={18} />
        </span>
      )}
    </>
  );
  return onClick ? (
    <button className="item" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="item">{body}</div>
  );
};

export const Sheet = ({ children, onClose }: { children: ReactNode; onClose?: () => void }) => (
  <div className="sheet-wrap" onClick={onClose}>
    <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export const CheckRow = ({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) => (
  <button role="checkbox" aria-checked={on} className="check" onClick={() => onChange(!on)}>
    <span className="box">{on && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.500" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
    <span className="grow" style={{ fontWeight: 600 }}>{children}</span>
  </button>
);

export const Disclaimer = () => (
  <p className="disclaimer">Research prototype. Not an FDA-cleared medical device. No current flows through anyone in testing.</p>
);
