import type { ReactNode } from 'react';

const Svg = ({ children, size = 24, sw = 2 }: { children: ReactNode; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
type P = { size?: number; sw?: number };

/** Duotone, stroke-based icons (Phosphor style): a 20% tint shape plus a round-cap outline. */
const Duo = ({ children, size = 24 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const tint = { fill: 'currentColor', fillOpacity: 0.2 } as const;

export const IHome = (p: P) => <Svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Svg>;
export const ICal = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></Svg>;
export const IChart = (p: P) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
export const IMenu = (p: P) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IBack = (p: P) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const IChev = (p: P) => <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>;
export const IClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const ICheck = (p: P) => <Svg {...p} sw={3}><path d="M5 12l5 5 9-10" /></Svg>;
export const IPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IMinus = (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const IPlay = (p: P) => <Svg {...p}><path d="M7 4l13 8-13 8z" fill="currentColor" /></Svg>;
export const IPause = (p: P) => <Svg {...p}><path d="M8 4v16M16 4v16" strokeWidth={4} /></Svg>;
export const IDown = (p: P) => <Svg {...p} sw={3}><path d="M5 9l7 7 7-7" /></Svg>;
export const IUp = (p: P) => <Svg {...p} sw={3}><path d="M5 15l7-7 7 7" /></Svg>;
export const IHangup = (p: P) => <Svg {...p}><path d="M3 14c5-5 13-5 18 0l-3 3-3-2v-2a10 10 0 0 0-6 0v2l-3 2z" /></Svg>;
export const IInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.500v.01" /></Svg>;
export const ILock = (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
export const IGear = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></Svg>;
export const IPhone = (p: P) => <Svg {...p} sw={1.5}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" {...tint} /></Svg>;

export const IDrop = (p: P) => <Duo {...p}><path d="M208,144a80,80,0,0,1-160,0c0-72,80-128,80-128S208,72,208,144Z" {...tint} /><path d="M168,152a40,40,0,0,1-32,32" /></Duo>;
export const IBolt = (p: P) => <Duo {...p}><path d="M144,24L56,144h64l-8,88,88-120H136Z" {...tint} /></Duo>;
export const IBattery = (p: P) => <Duo {...p}><rect x="24" y="88" width="192" height="80" rx="16" {...tint} /><path d="M240,116v24" /></Duo>;
export const IShield = (p: P) => <Duo {...p}><path d="M128,24L216,56V120c0,56-36,96-88,112C76,216,40,176,40,120V56Z" {...tint} /><path d="M92,128l28,28,44-48" /></Duo>;
export const IPlane = (p: P) => <Duo {...p}><path d="M209,81l-33,31,32,88-24,24-48-72-24,24v24L88,224,72,184,32,168l24-24H80l24-24L32,72,56,48l88,32,31-33A24,24,0,0,1,209,81Z" {...tint} /></Duo>;
export const IDoc = (p: P) => <Duo {...p}><path d="M200,224H56a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96l56,56V216A8,8,0,0,1,200,224Z" {...tint} /><path d="M152,32V88h56M96,136h64M96,168h64" /></Duo>;
export const IBell = (p: P) => <Duo {...p}><path d="M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,139.81,56,104a72,72,0,0,1,144,0c0,35.82,8.3,64.6,14.9,76A8,8,0,0,1,208,192Z" {...tint} /><path d="M96,192a32,32,0,0,0,64,0" /></Duo>;
export const IMic = (p: P) => <Duo {...p}><path d="M168,64v64a40,40,0,0,1-40,40h0a40,40,0,0,1-40-40V64a40,40,0,0,1,40-40h0A40,40,0,0,1,168,64Z" {...tint} /><path d="M56,128a72,72,0,0,0,144,0M128,200v40" /></Duo>;
export const IStetho = (p: P) => <Duo {...p}><circle cx="208" cy="160" r="32" {...tint} /><path d="M72,40H48V88a56,56,0,0,0,112,0V40H136M104,144v48a40,40,0,0,0,40,40h24a40,40,0,0,0,40-40" /></Duo>;
export const IWrench = IStetho;
export const IBandage = (p: P) => <Duo {...p}><g transform="rotate(-45 128 128)"><rect x="24" y="88" width="208" height="80" rx="40" {...tint} /><path d="M96,88V168M160,88V168" /></g></Duo>;
export const IHand = (p: P) => <Svg {...p}><path d="M8 13V5a1.500 1.500 0 0 1 3 0v6M11 11V3.500a1.500 1.500 0 0 1 3 0V11M14 11V5a1.500 1.500 0 0 1 3 0v8M8 13l-2-2a1.500 1.500 0 0 0-2 2l4 7h8a4 4 0 0 0 4-4v-3" /></Svg>;
export const IWatch = (p: P) => <Duo {...p}><rect x="64" y="72" width="128" height="112" rx="28" {...tint} /><path d="M88,72L96,32H160L168,72M88,184L96,224H160L168,184M128,104V128L144,140" /></Duo>;
export const ICheckCircle = (p: P) => <Duo {...p}><circle cx="128" cy="128" r="96" {...tint} /><path d="M88,136l32,32,48-64" /></Duo>;
/** Calendar with a bolt: start a booster week */
export const IBooster = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="4" y="6" width="24" height="22" rx="3" fill="currentColor" fillOpacity="0.2" strokeLinejoin="round" />
    <path d="M4 12h24M10 3v5M22 3v5" strokeLinecap="round" />
    <path d="M17.5 14L12 21h4l-1 5.500L21 18.500h-4z" fill="#fff" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
/** Magnifier with a pulse line: diagnose */
export const IDiag = ({ size = 32 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="14" cy="14" r="10" fill="currentColor" fillOpacity="0.2" />
    <path d="M21.500 21.500L28 28" strokeLinecap="round" />
    <path d="M8 14h3l2-4 3 8 2-4h2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PASTEL = ['#ddf3e4', '#eaf4cc', '#ffebc2', '#ffd9d2'];
const MOUTH = ['M11 19c2.500 3 7.500 3 10 0', 'M12 20c2.500 1.500 5.500 1.500 8 0', 'M12 21h8', 'M11 23c2.500-3 7.500-3 10 0'];
/** Outline face on a pastel circle (badge), or the bare outline when `plain`. */
export const Face = ({ level, size = 36, plain }: { level: 1 | 2 | 3 | 4; size?: number; plain?: boolean }) => {
  const icon = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="#000" aria-hidden="true">
      <circle cx="16" cy="16" r="12" />
      <circle cx="12" cy="13.500" r="1.200" fill="#000" stroke="none" />
      <circle cx="20" cy="13.500" r="1.200" fill="#000" stroke="none" />
      <path d={MOUTH[level - 1]} strokeLinecap="round" />
    </svg>
  );
  return plain ? icon : <span className="facebadge" style={{ background: PASTEL[level - 1] }}>{icon}</span>;
};
