# DrySync App: Product Requirements Document (PRD) v2
**Prototype screens edition. Companion app for the DryTray iontophoresis device**
**Tariq | UMSI Mastery Course | Draft v2, November 16, 2026**

This version replaces v1 (October 12) as the working spec for the next phase: a fully fleshed-out, clickable prototype. It keeps v1's product decisions (hands-free control, Call Guard, Safe to Lift, Water Check, "Not working?" diagnosis, private on-phone data) and adds what v1 left open: a **geometry and token system**, a **complete screen and state inventory**, **per-screen interaction specs**, and an **image prompt register** for generated artwork.

v1 stays in `docs/DrySync App PRD.md` for reference. Where v2 is silent, v1 applies.

---

## 0. Read this first

### 0.1 Sources this PRD is built from
| Source | Used for |
|---|---|
| `docs/DrySync App PRD.md` (v1) | Product scope, flows, safety rules, voice and Control Panel specs, diagnosis rules |
| Paper file **DrySync**, page **App screens (from code)** (48 artboards) | Current visual language, existing screens, gaps |
| Paper file **DrySync**, Page 1, Carbon variant of Today | The "sharp corner" reference |
| The coded prototype (`src/`, `README.md`) | What already works: simulated device, console, scenarios, thresholds |
| `ongoing conversations/2026-10-26_drysync-prd-and-paper.md` | Design decisions made so far |
| `nested-border-radius-guide.md` (Downloads) | Nested radius rules |
| Older notes (Obsidian "Iontophoresis Machine", case study) | Original device motivation: low cost, repairable, portable |

**Gap to close:** v1 refers to an *Iontophoresis Research.md* file. It is not in the project folder or Downloads, so I could not re-read it. v1 Section 0.2 and 0.3 are the only research summary used. If that file has findings that are not in v1, add them to Section 14 before the Paper build starts.

### 0.2 What the next phase is
- **Goal:** a prototype with working interactions that can be tested with real people and shown in the early December final presentation. Still no current through anyone (SR11).
- **Two artifacts, one source of truth:**
  1. **Paper** (new page, **Prototype v2**) holds every screen and every state as native, editable layers. This is the visual source of truth.
  2. **The coded app** (`src/`) makes it interactive, driven by the simulated DryTray and the researcher console. It is rebuilt or restyled to match Paper after each module is signed off.
- **Images are generated elsewhere.** Designers and builders never prompt for images. Every image has an entry in the **image manifest** (Section 11) with a prompt. A different LLM generates files from it. Until then, screens show labeled placeholders.

### 0.3 Decisions made in this PRD (confirm or change)
| # | Decision | Why |
|---|---|---|
| D1 | **Confirmed by Tariq, Nov 16, 2026.** **Sharp geometry.** Every rectangular surface has a 0px radius. Only small, discrete indicators are fully round (Section 3.2) | The current screens mix 16, 8, 4, 24px and pills. Carbon's rectangular approach gives one simple rule, and nested-radius math becomes trivial |
| D2 | Keep the DrySync identity (Inter, purple #6A00FF, lavender, white) and borrow Carbon's **structure** (sharp edges, 1px borders, 48px controls, 8px grid), not its colors or IBM Plex | The Paper doc "DrySync" is the style reference. Carbon is the geometry reference. The Page 1 Carbon test used IBM Plex and blue, which would split the brand |
| D3 | **Session mode** (Live, Call Guard, Paused, Safe to Lift) keeps its dark theme, rebuilt with the same geometry and tokens | Readable from across the table; it is the signature experience |
| D4 | Milliamps move behind **Details** on the Live screen | v1 principle 5 says plain words first. The current Live screen shows "13.6 of 14 mA" up front |
| D5 | **Paper builds all states, code builds all interactions.** Paper hotspot annotations tell the coder where each tap goes | Avoids rebuilding the same logic twice |
| D6 | Safe to Lift never relies on color alone: green plus a check icon, the words "Safe to lift", a chime and a speech line | Accessibility, and it protects goal G2 |

---

## 1. What changed from v1

| Area | v1 | v2 |
|---|---|---|
| Screens | 21 listed (S1 to S21) | About 120 screens and states in 11 modules (Section 6), each with an ID, interactions and states |
| Visual rules | "Plain language, large type" | Full token set, component catalog, radius system, accessibility rules (Section 3) |
| Corner radii | Not specified | One rule: 0px rectangles, fully round for small indicators only |
| Control Panel | Hardware spec only | The tray's small screen is also designed (CP screens, Section 6.10) |
| Locked users | "Browse-only mode" in one line | Defined: what is visible, what is disabled, how to unlock (Section 6.1) |
| Booster week | Mentioned in relapse warning | Own flow and screens (HM-04) |
| System states | Not covered | Disconnected, permission denied, firmware required, loading, empty, error (Section 6.11) |
| Images | Not covered | Image manifest with prompts, sizes, alt text, placeholders (Section 11) |
| Testing | Success metrics | Eight scripted test tasks mapped to screens (Section 2) |
| Live screen | mA shown on main view | mA in Details; plain "Full strength / Reaching 80%" wording |
| Accessibility | Not covered | VoiceOver labels, Dynamic Type, reduced motion, contrast targets (Section 3.9) |

---

## 2. Test tasks the prototype must support

Every screen in Section 6 exists to serve one of these. If a screen serves none, cut it.

| Task | Participant is asked to | Screens | v1 goal |
|---|---|---|---|
| T1 | Start a session without touching the phone, then pause it | HM-01, SE-01 to SE-06, SE-10, SE-16 | G1 |
| T2 | Handle a phone call that arrives mid-session | SE-07 to SE-09 | G1 |
| T3 | Say when it is safe to lift your hands | SE-16, SE-17 | G2 |
| T4 | Log how your hands feel after a session, then on a day with no session | SE-22 to SE-24, HM-03 | G3 |
| T5 | Check your water and fix soft water | WC-01 to WC-07 | G4 |
| T6 | Work out why treatment seems to have stopped working, and say what you would do next | NW-01 to NW-06 | G4 |
| T7 | Find out where your data is stored and delete it | MO-09, MO-09a to MO-09c | G5 |
| T8 | Prepare something to show your doctor | MO-10 | G5 |

**Personas and seeded data.** Maya (new user) drives T1, T3, T4. Daniel (lapsed, travels, 8 weeks of history) drives T2, T5 to T8. Section 10 fixes the sample values so every Paper frame tells the same story.

---

## 3. Design system

### 3.1 Principles (add to v1 Section 4)
1. **One shape language.** If a surface is a rectangle, it has square corners. No exceptions for "friendliness".
2. **Borders, not shadows.** Separation comes from 1px lines, fills and spacing. No drop shadows anywhere.
3. **Fill means state.** Lavender = selected or highlighted. Amber = needs attention. Green = safe. Red = problem. Color never appears just for decoration.
4. **One primary action per screen.** It is purple, 48px tall (64px in session mode), at the bottom or inline with the content it acts on.
5. **Type carries hierarchy.** Size and weight, not boxes inside boxes. A card inside a card is a layout smell.

### 3.2 Geometry and corner radius (D1)

**The rule:** two shapes only.

| Shape | Radius | Used for |
|---|---|---|
| **Sharp** | **0px** | Cards, tiles, list groups, buttons, inputs, segmented controls, selection cards, banners, sheets, modals, toasts, progress bars, strength bar, chart bars, calendar cells, tab bar, images, illustration frames, checkboxes, app icon (iOS applies its own mask) |
| **Round** | **50% / pill** | Chips and tags, toggles, icon badges (44px), mood faces, status dots, avatars, radio buttons, the Safe to Lift check mark disc |

Nothing in between: no 2, 4, 8, 12, 16 or 24px.

**Nested radius:** with the sharp rule, `R_inner = R_outer − D` always resolves to 0, so the formula is satisfied without a floor. Round elements inside sharp containers (a chip inside a card) need no adjustment. Never put a rounded rectangle (anything with a 2 to 24px radius) anywhere. If a pill sits against a container edge, keep at least 8px between them so the curve does not read as a clipped corner.

**Focus ring:** 2px purple outline, 2px offset, square on sharp elements and round on round ones.

**Migration table (existing Paper and code values):**

| Current | Where | New |
|---|---|---|
| 16px | Cards, list groups, banners | 0 |
| 4px | Buttons, tiles, inputs, checkboxes, chart bars, calendar cells | 0 |
| 8px | Segmented control track and thumb | 0 |
| 24px | App icon tile on Welcome | 0 (square artwork; iOS masks it) |
| 16px top | Bottom sheet | 0 |
| Pill / 50% | Chips, toggles, badges, faces, progress track, strength bar | Chips, toggles, badges, faces, dots stay round. **Progress track and strength bar become 0** |

Phone frame corners and the Dynamic Island are device hardware, not UI, and are excluded.

**Audit rule (QA gate, Section 12):** after each build, list every node whose corner radius is not 0 and not full round. The list must be empty.

### 3.3 Color tokens

All colors are defined as Paper tokens and CSS variables. Targets: body text 4.5:1 or better, large text and UI borders 3:1 or better. Contrast values marked "verify" are computed in Paper before sign-off.

| Token | Value | Role |
|---|---|---|
| `--color-bg` | #FFFFFF | Screen background |
| `--color-ink` | #000000 | Primary text and outline icons |
| `--color-ink-muted` | rgba(0,0,0,0.60) | Secondary text (verify ≥ 4.5:1 on white and on lavender) |
| `--color-line` | rgba(0,0,0,0.12) | 1px borders and dividers. Raised from the current 0.05 because sharp, flat edges need a visible line |
| `--color-brand` | #6A00FF | Primary buttons, links, active tab, focus ring |
| `--color-brand-soft` | #E9EAFF | Selected fill, highlighted card, icon badge, progress track |
| `--color-amber` | #FFB900 (ink text) | Needs attention: booster, paused, low water |
| `--color-amber-soft` | #FFF1D9 | Amber card fill |
| `--color-green` | #17A56C (ink text, not white) | Safe, passed |
| `--color-green-soft` | #DCF5E9 | Success fill |
| `--color-red` | #C8312F (white text; darkened from #D6403F, verify) | Problem, destructive |
| `--color-red-soft` | #FDE4E3 | Error fill |
| `--color-blue` | #2A64F5 | Running status band (session mode), info banner |
| `--color-blue-soft` | #E5ECFF | Info fill |

**Session mode tokens** (D3): `--session-bg` #0A1A2A, `--session-surface` #12283D, `--session-line` rgba(255,255,255,0.16), `--session-ink` #FFFFFF, `--session-ink-muted` rgba(255,255,255,0.72), band colors reuse blue (running), amber (paused or hold), green (safe), red (problem). Primary session button: orange `#FF8A3D` with ink text (the "Ouch" button), 64px tall.

**Chart colors:** purple for the main series, `--color-ink-muted` for comparison, amber for planned-but-missed, red only for problems. Never rely on color alone: pair with labels or patterns.

### 3.4 Typography
Font: **Inter** (bundled). One family. Weights: 400, 500, 600, 700, 800 (timer only).

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Timer | 96 / 96 | 800 | Live countdown only |
| Display | 40 / 48 | 700 | Result headlines, big numbers |
| H1 | 32 / 40 | 600 | Screen titles |
| H2 | 20 / 28 | 600 | Card and section titles |
| Body | 16 / 24 | 400 | Default text |
| Body strong | 16 / 24 | 600 | Button labels, list titles |
| Small | 14 / 20 | 400 | Secondary text, helper text |
| Label | 14 / 20 | 500, purple | Section labels (sentence case) |
| Caption | 12 / 16 | 400 | Legal and chart axes only. Never for anything the user must act on |

Line heights are multiples of 4. Tracking: −0.01em on Display and H1, 0 elsewhere. Section labels are sentence case, not all caps (aligns with Carbon).

### 3.5 Spacing, grid, sizing
- 4px base unit, 8px working grid. Tokens: 4, 8, 12, 16, 24, 32, 48.
- Artboard: **390 × 844** (iPhone 14/15 class). Taller screens use `fit-content` height.
- Screen gutter 16px. Content max width 358px. Gap between stacked blocks 16 (related) or 24 (sections).
- Card padding 16. List row 64px min (two lines). Row divider 1px.
- Controls: 48px high (buttons, inputs, segmented control, toggles' hit area). **Session-critical controls 64px high.** Minimum touch target 44 × 44, preferred 48 × 48.
- Status bar 47px (use Paper's mobile status bar guide). Tab bar 56px + 34px home-indicator area. Top bar 56px.

### 3.6 Elevation and layering
No shadows. Layers are shown by fill and border:
- Bottom sheet: white, 1px top border, 32px × 4px grabber (this one rectangle is allowed to be a flat bar), scrim `rgba(0,0,0,0.4)`.
- Toast: ink fill, white text, 0 radius, bottom 88px above the tab bar.
- Modal dialog: white, 1px border, 0 radius, max width 326px, scrim as above.

### 3.7 Iconography
- **Phosphor, stroke-based duotone:** 1.5px black stroke, 20% brand-soft fill shape. Sizes 20, 24, 32. Raw SVG paths, editable in Paper.
- Icon badges: 44px circle, `--color-brand-soft`, icon 24px black.
- Status icons add a shape, not just a color: check (safe), pause bars (paused), warning triangle (problem), phone (call).
- Mood faces: four outline faces on pastel circles (dry green, mostly dry lime, damp amber, dripping red-soft), 60px.

### 3.8 Component catalog
Every component below is built once in Paper (as a reusable frame, cloned with `x-paper-clone`) and once in code. All have the states: default, pressed, focused, disabled where applicable.

| Component | Spec |
|---|---|
| Primary button | 48px, brand fill, white text, 16/24 semibold, 0 radius, full width by default. Pressed: darker 8%. Disabled: 40% opacity plus explanatory helper text, never silent |
| Secondary button | 48px, white fill, 1px ink border, ink text |
| Ghost button | 44px min, no fill, brand text. For tertiary links |
| Destructive button | 48px, red fill, white text. Only on confirmation dialogs |
| Amber action | 48px, amber fill, ink text (booster) |
| Session button | 64px, 18px semibold. Variants: Ouch (orange), Pause (session-surface with white text), Answer / Decline / Pause (Call Guard) |
| Tile button | Square, icon above label, 1px border, used in pairs inside a card (Booster, Not working?) |
| Input | 48px, 1px ink border, 16px padding, label above (Small), helper below. Error: red border and message with icon |
| Selection card | Full width, 1px line border, 16 padding. Selected: brand-soft fill, 2px brand border (padding drops to 15). Optional radio on the left |
| Segmented control | 48px, 1px border, equal segments, selected = brand fill and white text |
| Chip | 32px high, pill, brand-soft fill, brand text 14/20 medium. Filter chip on = brand fill, white text. Status chips: green, amber, red soft fills with dark text |
| Toggle | 52 × 32 pill, white thumb. On = brand |
| Checkbox | 24px square, 2px ink border. Checked = brand fill, white check |
| List row | 64px min, 44px icon badge slot (fixed width), title (body strong) and subtitle (small), trailing chevron slot 24px. 1px bottom divider. Groups sit in a 1px bordered container or directly on the screen |
| Card | 1px line border, 16 padding, transparent fill. Highlight card: brand-soft fill, no border. Warning card: amber-soft fill |
| Stat tile | Large number (H1), label (Small, brand) |
| Banner | Full width, 3px left border in status color, status-soft fill, icon, title, text, optional action. Replaces rounded alert boxes |
| Progress bar | 8px high, square, brand fill on brand-soft track |
| Strength bar | 24px high, square. Delivered = gradient-free fill, white tick for set level, faint tick for comfort limit |
| Heat-map cell | 40 × 40 square. Session = brand, check-in only = brand-soft, none = 4% ink |
| Tab bar | 4 tabs, icon 24 + label 12/16 medium, active = brand icon + label with 2px top indicator |
| Top bar | Back chevron (44 target), title H2 centered or left, optional trailing action |
| Bottom sheet, dialog, toast | See 3.6 |
| Stepper dots | 8px round dots |
| Illustration frame | Square, 1px line border or none. Contents from the image manifest. Placeholder = brand-soft fill with the image ID centered |

### 3.9 Accessibility (new)
- **Contrast:** see 3.3. Session mode text on dark is white or ink-muted at 72% minimum.
- **Dynamic Type:** body text scales to 130% without clipping. The timer scales down gracefully (96 → 72). Layouts use fit-content heights.
- **VoiceOver:** every icon button has a label; state changes (running, paused, safe to lift) are announced; decorative illustrations are marked hidden.
- **Reduced motion:** ramp animations, ripples and self-test sweeps become static progress changes.
- **Color independence:** every status pairs color with an icon and a word.
- **Wet-hands rule:** in session mode no control smaller than 64px is required to act; everything also works by voice or the Control Panel.
- **Reading level:** about grade 6 to 8. Sentence case, short sentences, no jargon on the default view (v1 glossary stays).

### 3.10 Motion
Durations 120ms (press), 200ms (state change), 320ms (screen push). Ease-out. Session ramps animate over the real simulated ramp time. Safe to Lift: the band fades from amber to green over 200ms, check mark draws over 320ms, chime plays. No bounces.

---

## 4. Information architecture

```
Launch
├─ First run: Onboarding (ON) → Tutorial → Today
└─ Returning: Today

Tab bar
├─ Today (HM)       → Water Check (WC), Session (SE), Not working? (NW), Booster, Check-in
├─ History (HI)     → Session detail, day detail
├─ Insights (IN)    → Insight detail, Relapse / Booster
└─ More (MO)        → Plan, Reminders, Notifications, Control and voice, Call handling,
                      Travel, Device health, Privacy Center, Report, About

Session mode (takes over the whole screen, no tab bar)
SE-01 Before you start → SE-03 Waiting for hands → SE-05 Running → SE-16 Lowering → SE-17 Safe to lift → SE-22 Session done → Today
```

Navigation rules:
- Tab bar is hidden in session mode, onboarding, tutorial, Not working? and sheets.
- Back chevron on every pushed screen. Android-style swipe-back is not needed.
- Session mode cannot be left by back. Leaving requires Pause or End session (SE-19).
- Deep links the researcher can open: `#/session`, `#/call`, `#/diagnosis/<cause>`, `#/water/<zone>`.

---

## 5. Prototype interaction model

### 5.1 How interactions are specified
- Every screen entry in Section 6 lists **Interactions** as `element → result`. Results are a destination screen ID, a state change, or a system effect (chime, speech, toast).
- In Paper, each artboard gets a text layer named `hotspots` placed outside the frame, to the right, listing the same arrows. The coder reads it with the Paper tools.
- Every screen lists **states** as separate artboards named `ID Name / state`.

### 5.2 Three input channels, always in parity
During a session, any action must be possible through voice, the Control Panel, or the phone screen where v1 allows. The **parity matrix**:

| Action | Voice | Control Panel | Phone screen |
|---|---|---|---|
| Start | "Start DryTray" | Pause/Play (hands detected) | Start button (before hands in) |
| Pause | "Pause DryTray" | Pause/Play | Pause (64px) |
| Resume | "Resume DryTray" | Pause/Play | Resume |
| Stop | "Stop DryTray" | Hold Pause/Play (to confirm in testing) | End session (with confirm) |
| Quick-drop | "Ouch", "It stings", "Turn it down" | Down | Ouch button |
| Small up | "Turn it up a little" | Up | Up a little (secondary) |
| Answer / decline call | "Answer", "Decline" (phone assistant) | Call / hold Call | Call Guard buttons |
| Time left | "How much time is left?" | Visible on panel screen | Timer |
| Log sweat | "My hands are dry" | not available | Four faces |

The device enforces all safety limits (v1 3.3). The prototype's simulated device does the same.

### 5.3 Simulation layer and console (existing, keep)
The coded app talks to a simulated DryTray (`src/device/sim.ts`) through the same commands a real device would receive. The researcher console triggers: incoming call, hand lifted, strength can't be reached, water level drop, battery low, Bluetooth lost, water zone, device faults, scenario load (Fresh, Maya, Daniel, six diagnosis cases), speed up to 60×. **New for v2:** console buttons for the new states: firmware update required, Bluetooth permission denied, notification permission denied, sensor not in water, first-session ramp.

The console is for researchers only and is not a Paper deliverable. It follows the same tokens and 0px radius.

### 5.4 Global behavior rules
- Taps give feedback within 100ms (pressed state), even when the result takes longer.
- Anything that waits (pairing, checking water, self-test) shows a determinate step or an indeterminate bar with a plain sentence, never a blank screen.
- Down is instant and silent of confirmation. Up and End ask or step (v1 principle 4).
- Errors say what happened, why, and what to do (v1 principle 7).
- Destructive actions (delete data, end session early, clear plan) use a dialog with the consequence named in the title and the button.
- Sheets close by scrim tap, close button or swipe down. Dialogs close only by their buttons.
- Time and dates: 12-hour with AM/PM, month names ("Oct 16"). Sim clock is the source of truth for all dates.

---

## 6. Screens

**Conventions.** ID = module prefix + number. Letters are states or sheets (`SE-07a`). **Paper** column shows the existing artboard to restyle (01 to 24, S1 to S24) or **New**. **P0/P1** follow v1 priorities. Every screen needs: default state, plus the states listed. Sizes: 390 × 844 unless `fit-content`.

### 6.1 Onboarding (ON) — F1, F2, F3

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| ON-01 | Welcome | 01 | P0 | App mark (square), "DrySync", one-line value, privacy card, Get started, prototype disclaimer | Get started → ON-02 | — |
| ON-02 | Safety question (1 of 6) | 02 | P0 | Progress, question, Yes / No selection cards, "Why we ask" link | No → next question; Yes → ON-03; Why we ask → ON-02a; Back → previous | Six variants: pregnant; pacemaker or defibrillator; metal implants in hands or arms; heart rhythm problems; epilepsy; open wounds. Selected |
| ON-02a | Why we ask (sheet) | New | P0 | Plain reason for this question, "Talk to your doctor" line | Close → ON-02 | Six texts |
| ON-03 | Safety stop | S1 | P0 | Stop illustration, plain reason (names the answered condition), "Share with a doctor" button, "Browse the app" link | Share → system share sheet; Browse → HM-01 locked state | Per condition |
| ON-04 | Areas | 03 | P0 | Hands / feet / both selection cards with illustrations | Select, Continue → ON-05 | Selected |
| ON-05 | Pair tray | 04 | P0 | Tray illustration, steps (turn on, hold phone close), Bluetooth permission notice | Start search → ON-05a; Skip pairing (browse mode) → ON-10 | idle, searching |
| ON-05a | Tray found | 05 | P0 | Found tray name, status light "blinks", Confirm it blinks | Yes → ON-06; No light → ON-05b | Found |
| ON-05b | Can't find tray | New | P0 | Troubleshooting list (charge, switch, distance), Try again | Try again → ON-05; Skip → ON-10 | — |
| ON-05c | Bluetooth permission primer | New | P1 | Why we need Bluetooth, Continue (system prompt mock), "Not now" | Continue → ON-05; Not now → ON-05b | Denied → SY-02 |
| ON-06 | Control Panel test | 06 | P0 | Tray illustration with 4 numbered buttons, "Press each button", per-button check list | Hardware or console button press ticks the row; all four → Continue enabled; Skip → ON-07 | waiting, 1/4, 2/4, 3/4, all passed, button not detected |
| ON-07 | Control style | 07 | P0 | Voice / Panel / Both cards, explainer line | Select, Continue → ON-08 (if voice or both) else ON-09 | Selected |
| ON-08 | Voice shortcuts | 08 | P0 | Five phrase rows each with Add to Siri button, added state | Add → system sheet mock → row checked; Continue → ON-09 | none added, partly, all added |
| ON-09 | Call handling | 09 | P0 | Call Guard explainer, three options (ask, pause, ignore), favorites toggle, phone-settings link | Select, Continue → ON-10 | Selected |
| ON-10 | Plan | 10 | P0 | "Starting phase" summary (4 sessions a week for about 3 weeks), days, time, edit | Edit → MO-02; Continue → ON-11 | Starting, maintenance |
| ON-11 | Reminders primer | New | P1 | Why reminders, "Remind me", "Not now" | Allow → system prompt mock → ON-12 | Denied → banner |
| ON-12 | Ready | 11 | P0 | Check-mark, "You're set up", next step, Start tutorial | → TU-01 | — |
| TU-01 to TU-05 | Tutorial: fill to the line; remove watches and rings; cover small cuts; we start low; confirmed | 12 to 16 | P0 | One illustration, one instruction, step dots | Next, Back, Skip tutorial → HM-01; TU-05 → HM-01 | 5 steps |

### 6.2 Home (HM) — F3, F4, F14

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| HM-01 | Today | 21 | P0 | Greeting, bell with unread dot, 3 stat tiles, Next session card, relapse card (conditional), check-in card, list (Water Check, Not working?, Traveling?, Control and voice), disclaimer, tab bar | Bell → HM-02; Start session → SE-01 (or water prompt); Start booster → HM-04; Not working → NW-01; Face tap → HM-03a; list rows → WC-01, NW-01, MO-07, MO-05 | **new user** (no sessions, tutorial prompt); **session due**; **done today**; **missed or lapsed**; **relapse warning**; **locked** (disabled Start with reason); **traveling** (banner); **battery low** (charge banner); **tray disconnected** (SY-01 banner); **booster active** |
| HM-02 | Notification center | New | P1 | Notifications grouped Today and Earlier, read and unread | Tap → relevant screen; Mark all read | empty, populated |
| HM-03 | Daily check-in | New | P1 | Sheet: four faces, optional tags (hot day, stressful day, new water, used insert), Done | Face → HM-03a; Done → toast | default |
| HM-03a | Check-in saved | New | P1 | Confirmation inside sheet, "Undo" for 5 seconds | Undo → HM-03 | — |
| HM-04 | Booster week | New | P1 | What a booster week is, 3 proposed days, Start, Not now | Start → plan updated, toast, HM-01 booster active; Not now → HM-01 | proposed, active, completed |
| HM-05 | Check-in notification | New | P1 | iOS notification mock with four face actions | Tap face → saved | collapsed, expanded |

### 6.3 Water Check (WC) — F5

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| WC-01 | Water Check start | 17 | P0 | Tray with water line illustration, "Fill both trays to the line", Check water | Check → WC-02; Close → previous | — |
| WC-02 | Checking | 18 | P0 | Three-step progress (minerals, temperature, level), "Checking your water…" | Auto, about 3 seconds → result by zone | step 1, 2, 3 |
| WC-03 | Good | 19 | P0 | Three-zone gauge with marker, "Water looks good", place tag chip, Continue to session | Continue → SE-01; Details → WC-09; Place tag → WC-10 | — |
| WC-04 | Too soft | New | P0 | Gauge in soft zone, "Your water is soft", baking soda instruction (about 1 teaspoon per tray), image, Check again | Check again → WC-02 (second reading, result good after soda per console) | first, soda added |
| WC-05 | Very hard | New | P0 | Gauge in hard zone, "Hard water is fine for treatment", Continue | Continue → SE-01 | — |
| WC-06 | Water level low | New | P0 | Level illustration, "Add a little more water, up to the line", Check again | Check again → WC-02 | — |
| WC-07 | Fixed | New | P0 | "Water is good now", "Saved baking soda tip for this place" toggle | Continue → SE-01 | — |
| WC-08 | Sensor can't read | New | P1 | "Hands out, tray in the water?" cause list, Try again | Try again → WC-02 | — |
| WC-09 | Details (sheet) | New | P1 | Conductivity (µS/cm), temperature, level, zone limits, "What this means" | Close | Zones |
| WC-10 | Place tag (sheet) | New | P1 | Place chips (Home, Hotel…), "New place" input, Save, tag-off note | Save → toast | Place tags off |

### 6.4 Session (SE) — F6 to F13, F22. Signature experience

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| SE-01 | Before you start | 20 | P0 | Checklist: watches and rings off, cuts covered, water at line, hands ready; short version after first sessions (SR8) | Continue → SE-02 or SE-03 | full, short |
| SE-02 | Water not checked (prompt) | New | P1 | "Water not checked", Check water / Start anyway | Check → WC-01; Start anyway → SE-03 | — |
| SE-03 | Waiting for hands | S2 | P0 | Session band (blue-grey "Waiting"), "Place your hands in the water", hint line, End | Console "hands in" or sim → SE-04; End → HM-01 | — |
| SE-04 | Ramping up | New | P0 | Band "Starting gently", timer ready, strength bar rising, hint | Auto → SE-05; Ouch → SE-11 | first session (low start) |
| SE-05 | Running | S3 | P0 | Blue band "Running", 96px timer, "left", strength bar (plain "Full strength"), rotating hint, Ouch (64) and Pause (64) | Pause → SE-16; Ouch → SE-11; Details → SE-15; Lock screen → SE-20; Call event → SE-07; Hand out → SE-10; time ends → SE-16 | normal, polarity switched (SE-05a banner), not reaching strength (SE-12), low water note |
| SE-06 | Polarity switch | New | P1 | In-session notice "Switching direction, you may feel a brief change" | Auto-dismiss | — |
| SE-07 | Call Guard incoming | S4 | P0 | Amber band "Call: strength lowered", caller name, **Answer / Decline / Pause** (64px each), countdown to fallback | Answer → SE-08; Decline → SE-05 (ramp up); Pause → SE-16; no response → SE-05 | Known contact, unknown number, favorites-only (silently ignored: toast "Call from Sam let through"), "phone can't answer by button" (Answer replaced by "Pause for call") |
| SE-08 | On a call | New | P0 | Hold-level status, call timer, session timer paused (or counting, per open question 6), "Press Call on the tray to hang up" | Caller hangs up (console) → SE-09 | hold time counts, hold time doesn't count |
| SE-09 | Call ended, resume? | New | P0 | "Call ended. Resume your session?", Resume / Finish | Resume → SE-05; Finish → SE-16 | — |
| SE-10 | Paused (hand lifted) | S5 | P0 | Amber band "Paused", "Put your hands back, then press the button or say 'resume'" | Hands back + Resume → SE-04; End → SE-19 | auto-paused (hand out), user-paused, paused long (SE-18) |
| SE-11 | Quick-drop done | New | P0 | Toast and bar drop: "Lowered. Say 'down' again to lower more, or 'pause' to stop." | Auto → SE-05 | one, three or more (suggest setup check at session end) |
| SE-12 | Not reaching strength | New | P0 | Notice "Not reaching full strength. We'll look at this after the session." | Dismiss | — |
| SE-13 | Battery low / Bluetooth lost | New | P1 | Notice band: "Battery low: about X minutes left" before start; "Phone link lost. Your tray is still running" | Auto when linked again: "Your session finished normally" | battery pre-start, battery mid, BT lost, BT restored |
| SE-15 | Details (sheet) | New | P1 | Set and delivered strength (mA), resistance, polarity, water result, pauses | Close | — |
| SE-16 | Lowering | New | P0 | Amber band "Lowering…", progress to zero, "Keep your hands in until the light turns green" | Auto → SE-17 | from pause, from end, from call |
| SE-17 | Safe to Lift | S6 | P0 | Full green, large check disc, **"Safe to lift your hands"**, chime, speech line, Resume / Done | Resume → SE-04; Done → SE-22 | after pause, after end, after partial |
| SE-18 | Paused too long | New | P1 | "Finish this session or continue?" | Continue → SE-10; Finish → SE-22 (partial) | — |
| SE-19 | End early (dialog) | New | P0 | "End this session now? It will be saved as partial." End session / Keep going | End → SE-16 → SE-17 → SE-22 | — |
| SE-20 | Lock screen | S7 | P1 | iOS lock screen with Live Activity: time left, status color | Tap → SE-05 | running, paused, safe to lift, call |
| SE-21 | Dynamic Island | New | P1 | Compact and expanded island mocks | — | running, paused, safe |
| SE-22 | Session done: sweat | S8 | P0 | "Session done", "How were your hands today?" four faces | Face → SE-23 | complete, partial |
| SE-23 | Comfort and tags | New | P0 | Comfort (comfortable, tingly, uncomfortable), tag chips, optional note | Done → SE-24 | — |
| SE-24 | Summary | New | P0 | Minutes, average strength (plain), water result, streak, "Next session Oct 18, 8 PM" | Done → HM-01 | normal, first session (comfort limit saved, "What to expect") |

### 6.5 History (HI) — F15

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| HI-01 | History | 22 | P0 | Segmented Calendar / List, month heat map, legend, selected-day summary | Day → HI-03 or HI-02; List row → HI-02; month arrows | calendar, list, empty (HI-04) |
| HI-02 | Session detail | S24 | P0 | Summary stats, strength-over-time chart with pauses marked, water, rating, tags | Edit rating → HI-05; Back | normal, partial, with call pause, with quick-drops |
| HI-03 | Day detail | New | P1 | Check-in only day: rating, tags | Edit → HI-05 | — |
| HI-04 | Empty history | New | P0 | Illustration, "Your first session will show up here" | Start → HM-01 | — |
| HI-05 | Edit rating (sheet) | New | P1 | Four faces, comfort, Save | Save → toast | — |

### 6.6 Insights (IN) — F16

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| IN-01 | Insights | 23 | P1 | Plain-sentence insights first, then charts: adherence bars, sweat score line, water by place; relapse card | Card → IN-02 or IN-03; Start booster → HM-04 | normal, relapse, doing well |
| IN-02 | Relapse detail | New | P1 | Why we think this, the trend, what helps, Start booster / Not working? | → HM-04 / NW-01 | — |
| IN-03 | Water by place detail | New | P1 | "Hotel water was soft on all 3 trips" list by place | Back | — |
| IN-04 | Not enough data | New | P1 | "Insights appear after about a week of sessions" | — | — |

### 6.7 Not working? (NW) — F17. Signature flow

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| NW-01 | What feels wrong | S9 | P0 | Step 1 of 5, four selection cards | Select → NW-02 | Four options |
| NW-02 | Device self-test | S10 | P0 | "Empty the tray and keep it dry", Start test, per-check list (output, polarity, battery, panel) | Start → running (about 30 sec sim) → NW-03 or result (device) | before, running, passed, failed |
| NW-03 | Water test | S11 | P0 | Fill and check | Auto → NW-04 | before, checking, done |
| NW-04 | Data review | S12 | P0 | Last 3 weeks: sessions vs plan, minutes, full-strength share, pauses, quick-drops | Auto → result | — |
| NW-05a | Result: device | New | P0 | Cause card (neutral amber), steps (clean electrodes, charge, update, re-run), Contact support, "Also check" chips | Re-run → NW-02; Done → NW-06 | — |
| NW-05b | Result: water | S13 | P0 | As built | Check water again → WC-01; Save tip | — |
| NW-05c | Result: setup | New | P0 | Steps: fill to line, rest palms, cover cuts, try Comfort Insert | Done → NW-06 | — |
| NW-05d | Result: schedule | New | P0 | "You've done 4 of 12 planned sessions…", adjust reminders, booster | Adjust → MO-03; Booster → HM-04 | — |
| NW-05e | Result: too early | New | P0 | "Usually takes several sessions", check again in a week | Done | — |
| NW-05f | Result: see a doctor | New | P0 | "Worth checking with a doctor", Export report | Export → MO-10 | — |
| NW-06 | Did the fix help? | S14 | P1 | Before and after, "Your sessions now reach full strength" | Yes / Not yet → NW-01 | improved, unchanged |
| NW-07 | Past diagnoses | New | P1 | List of earlier results | Row → result | empty |

### 6.8 More and settings (MO)

| ID | Screen | Paper | P | Contents | Interactions | States |
|---|---|---|---|---|---|---|
| MO-01 | More | 24 | P0 | Ten rows with icon badges | Rows → MO-02 … MO-10 | — |
| MO-02 | Treatment plan | S15 | P0 | Phase, sessions per week, length, comfort limit, days, time, Save | Edit fields; Save → toast; Reset comfort limit → dialog | starting, maintenance, booster |
| MO-03 | Reminders | S16 | P1 | Toggle, days, time, calendar-aware toggle | Toggles save | permission denied banner |
| MO-04 | Notifications | S17 | P1 | Seven types with toggles, 2-per-day note | Toggle | — |
| MO-05 | Control and voice | S18 | P0 | Control style, voice phrases and Siri status, panel status, spoken updates | Re-run panel test → ON-06 | — |
| MO-06 | Call handling | S19 | P0 | Ask / pause / ignore, favorites toggle and list, platform note | Select | "phone can't answer by button" note |
| MO-07 | Travel | S20 | P1 | Traveling toggle, destination, checklist (charge tray, pack insert, baking soda, basin), mode (tray or insert), places | Toggle, check items, Water Check with "New place" tag | not traveling, traveling, insert mode |
| MO-08 | Device health | S21 | P1 | Battery, firmware, electrode trend, panel status, insert age | Update firmware → MO-08a; Run self-test → NW-02; Cleaning guide → MO-08b | up to date, update available, needs attention |
| MO-08a | Firmware update | New | P1 | Progress, "Keep tray near phone", done | Auto | updating, done, failed |
| MO-08b | Clean electrodes guide | New | P1 | 3 steps with images | Done | — |
| MO-09 | Privacy Center | S22 | P0 | What is stored, where, who sees it, voice assistant note, toggles (place tags, community data), Export all, Delete all | Export → MO-09a; Delete → MO-09b | — |
| MO-09a | Export (sheet) | New | P0 | CSV or PDF choice, Share | Share → system sheet mock | — |
| MO-09b | Delete all (dialog) | New | P0 | "Delete all your data? This can't be undone." Delete (red) / Cancel | Delete → MO-09c | — |
| MO-09c | Deleted | New | P0 | Confirmation, returns to Welcome | → ON-01 | — |
| MO-10 | Doctor report | S23 | P1 | Date range, one-page preview, Share | Range → preview updates; Share → system sheet | 4, 8, 12 weeks |
| MO-11 | About and safety | New | P1 | Prototype disclaimer, SR10 text, version | — | — |

### 6.9 Settings: system states (SY)

| ID | Screen | P | Contents | Interactions |
|---|---|---|---|---|
| SY-01 | Tray disconnected banner and screen | P0 | "Can't reach your tray", reconnect steps, "A running session continues" | Reconnect → ON-05; Dismiss |
| SY-02 | Permission denied (Bluetooth / notifications) | P1 | What stops working, "Open Settings" | Open Settings (mock) |
| SY-03 | Firmware update required | P1 | Blocks sessions until updated | Update → MO-08a |
| SY-04 | Loading skeleton | P1 | Used by Insights, History | — |
| SY-05 | Generic error and retry | P1 | What happened, why, what to do, Try again | — |
| SY-06 | Locked (browse-only) overlay | P0 | Sessions locked reason chip on Today, Start disabled, "Why?" | Why → ON-03 |
| SY-07 | Toasts | P0 | Saved, Undo, Lowered, Added to Siri | Auto-dismiss 3 seconds |

### 6.10 Tray Control Panel screens (CP) — F8

The panel is a small waterproof screen with four buttons (v1 Section 9). Design it as a 240 × 160 mock inside a tray illustration. The same color logic as session mode, large type, no more than two lines of text.

| ID | State | Shows |
|---|---|---|
| CP-01 | Idle / ready | "Ready", battery, water OK |
| CP-02 | Waiting for hands | "Place hands in water" |
| CP-03 | Running | Time left, strength bar, blue band |
| CP-04 | Paused / hold | Amber band, "Paused" or "Call: hold" |
| CP-05 | Lowering | Amber, "Lowering…" |
| CP-06 | Safe to lift | Green, check, "Safe to lift" |
| CP-07 | Problem | Red, short reason, "Open the app" |
| CP-08 | Incoming call | Caller initial, "Press Call to answer" |

Each state is paired with a **button map**: which of Pause/Play, Call, Down, Up are active and what each does in that state. Disabled buttons are drawn dimmed.

### 6.11 Researcher console (RC), coded only
Not designed in Paper. Must use the same tokens, 0px radius, Inter and 48px controls. Adds buttons for new states (5.3).

### 6.12 Totals
About 120 artboards and states: Onboarding 30 (with variants), Home 14, Water 10, Session 40, History 8, Insights 5, Not working 12, More 20, System 7, Control Panel 8. **P0 is about 70.** Build P0 first (Section 12).

---

## 7. Signature flow specs

### 7.1 Session state machine
| State | Entry | Visible | Allowed actions | Exits |
|---|---|---|---|---|
| Idle | Open app | Today | Start | → Waiting |
| Waiting for hands | Start requested, hands not detected | Waiting band | Place hands, End | → Ramping up |
| Ramping up | Hands detected | "Starting gently" | Ouch, Pause | → Running |
| Running | Ramp complete | Blue band, timer, bar | Ouch, Down, Up (capped), Pause, Stop, Details | → Paused, Hold, Lowering |
| Hold (call) | Incoming call | Amber band, caller | Answer, Decline, Pause | → Running, Lowering |
| Paused | Pause or hand out | Amber band | Resume (hands back), End | → Ramping up, Lowering |
| Lowering | Pause, End or time up | Amber, "Lowering…" | none required | → Safe to lift |
| Safe to lift | Output at zero | Full green, chime, speech | Resume, Done | → Ramping up, Done |
| Done | Done tapped | Rating screens | Rate | → Today |

### 7.2 Call Guard
Triggered by the console or a real call event. Order: strength lowers to hold level first, then the Call Guard overlay shows (the lowering is never delayed by the overlay). If the platform cannot answer by button (console toggle), **Answer** is replaced by "Pause for call", which still gives the user a safe way to pick up the phone (v1 6.7 fallback).

### 7.3 Safe to Lift (D6)
Signals, all at once: tray light green, full-screen green, check disc, text "Safe to lift your hands", chime, phone speech. VoiceOver announces the text. The screen stays until the user taps Resume or Done, or says a voice command. It never times out.

### 7.4 Diagnosis result mapping
The six result screens (NW-05a to NW-05f) use one template: cause label ("Most likely: water"), headline, one explanation sentence, "What to do" checklist (checkable), primary action, secondary link, "Also check" chips, follow-up note (about 1 week). The cause card uses `--color-amber-soft` except see-a-doctor (red-soft) and too-early (blue-soft).

---

## 8. Copy rules
- Say "how hard the device has to push", not "impedance". Real numbers sit behind **Details**.
- Sentence case everywhere. Buttons are verbs: "Check my water", "Start session", "Pause".
- Every warning has three parts: what happened, why it matters, what to do.
- Never blame: "Your water reads soft", not "You used the wrong water".
- Numbers on the default view are limited to time, streak, session counts, battery. mA, µS/cm, kΩ live in Details.
- Voice lines (spoken by the phone) are short and mirror the on-screen text.
- Disclaimer on Welcome, Today and About: "Research prototype. Not an FDA-cleared medical device. No current flows through anyone in testing."

---

## 9. Data and state bindings
Screens read from the existing types in `src/types.ts` (SessionRecord, WaterRecord, DailyRecord, DeviceRecord, Plan, Settings, AppNotification, DiagnosisRecord, TravelState). No new storage is required for v2 except: `bakingSodaTipSaved` per place, `boosterWeek` (already `Plan.boosterUntil`), `readNotifications`, and `onboardingStep`. All TBD thresholds stay as constants (`WATER`, `DX`, `SIM`) so Paper states can be matched against code by changing one value.

---

## 10. Canonical sample data (so every frame agrees)

Scenario clock: **Friday, Oct 16, 2026, 6:42 PM**.

| Item | Maya (new) | Daniel (lapsed) |
|---|---|---|
| Name shown | "Maya" in greeting if used | "Daniel" |
| Greeting | "Good evening" | "Good evening" |
| Streak | 0 | 0 |
| This week | 0/4 (starting phase) | 0/2 (maintenance) |
| Battery | 86% | 86% |
| Next session | Today, 8:00 PM | Oct 16, 8:00 PM |
| Plan | Starting: 4 per week, 20 min | Maintenance: 2 per week, 20 min |
| Comfort limit | not set | 14 mA |
| Last water | none | Too soft, Sep 28 (Hotel Chicago) |
| Sweat trend | n/a | Rising over 10 days |
| Place | Home | Home |
| Caller (T2) | Sarah Chen (favorite) | Sarah Chen (favorite) |
| Sample times | Session 8:02 to 8:26 PM, 24 minutes with a 4-minute call pause | Same |

Use these values in every Paper frame. Invented numbers elsewhere must be listed in the artboard's `hotspots` layer so they can be traced.

---

## 11. Image manifest (generated by another LLM)

### 11.1 How it works
- The table in 11.4 is the source of truth for now. When the build starts it is exported to `docs/image-manifest.json` (not created yet), which the image-generation LLM reads. A separate image-generation LLM reads it and writes files to `public/generated/<id>.png` (or `.svg` for line art).
- Designers and builders **do not write image prompts in Paper or code**. They place a **placeholder** and reference the ID.
- **Paper placeholder:** a square frame, `--color-brand-soft` fill, 1px line border, layer named `IMG-<id>`, the ID centered in 14px. Size matches the manifest size.
- **Code placeholder:** the same box, rendered by an `<Illustration id="…" />` component that shows the generated file when it exists and the placeholder when it does not.
- After generation, a human approves the file (`status: approved`) and it replaces the placeholder in both Paper (as a fill image) and code.

### 11.2 Manifest schema
```json
{
  "id": "IMG-ON-01",
  "screen": ["ON-01"],
  "usage": "Hero on Welcome",
  "size": "358x240",
  "format": "svg-preferred",
  "prompt": "...",
  "negative": "...",
  "alt": "...",
  "decorative": false,
  "variants": ["skin-light", "skin-medium", "skin-deep"],
  "status": "pending | generated | approved",
  "placeholder": "#E9EAFF"
}
```

### 11.3 House style (prepended to every prompt)
> Flat editorial line illustration. Thin even black outlines (1.5px at 358px wide). Light lavender fill (#E9EAFF) for main shapes, a single accent of purple (#6A00FF), optional small amber (#FFB900) highlight. White background. Geometric, calm, plenty of empty space. No gradients, no shadows, no text or lettering, no faces, no logos. The DryTray is a sloped, hand-shaped tray with softly rounded edges, a water line, a drain, and a small control panel with four buttons near the fingertips. Water is shown as a flat, pale blue shape. No wires, sparks, lightning or electricity effects. Hands are shown simply, with no fingernails detail.

**Negative prompt (all images):** photorealistic, 3D render, glossy, drop shadow, gradient, text, watermark, face, medical gore, needles, syringes, sparks, lightning, wires on skin, brand logos.

**Skin tone:** any image with hands is generated in three tones (light, medium, deep). The app picks medium by default; this is a variant, not a separate entry.

### 11.4 Image list

| ID | Screens | Size | Prompt (after the house style) | Alt text |
|---|---|---|---|---|
| IMG-ON-01 | ON-01 | 358×240 | Three-quarter view of the DryTray with a shallow water layer and a soft purple highlight along the water line. Nothing else | A tray for your hands with water in it |
| IMG-ON-02 | ON-03 | 358×200 | A clipboard with a simple check list and a stethoscope laid across it. Calm and reassuring | A clipboard and stethoscope |
| IMG-ON-03 | ON-04 | 3 × 112×112 | Three separate icons-sized illustrations: two hands side by side; two feet side by side; hands and feet together. Each over a lavender circle | Hands, feet, or both |
| IMG-ON-04 | ON-05, ON-05a | 358×240 | The tray and a phone beside it with three concentric signal arcs between them. The tray's small panel light is purple | Your phone connecting to the tray |
| IMG-ON-05 | ON-05b | 358×200 | The tray with a small plug-in charging cable and a power switch highlighted in amber | Tray power and charging |
| IMG-ON-06 | ON-06 | 358×240 | Top-down view of the tray with the control panel enlarged near the fingertips: a small screen and four blank round buttons in a row, numbered positions only by shape (no numbers) | The control panel with four buttons |
| IMG-ON-07 | ON-08 | 358×160 | A phone with a soft sound-wave shape emerging from it toward the tray | Talking to your phone |
| IMG-ON-08 | ON-09 | 358×200 | A phone showing a ringing symbol (a simple phone handset) beside the tray, with two relaxed hands resting in it | A call coming in while hands rest in the tray |
| IMG-TU-01 | TU-01, WC-01 | 358×240 | Side view of a tray with water filled exactly to a visible line, a purple arrow pointing to the line | Water filled to the line |
| IMG-TU-02 | TU-02 | 358×240 | A wristwatch and a ring placed beside the tray on a flat surface, with a purple crossed circle drawn over them | Take off watches and rings |
| IMG-TU-03 | TU-03 | 358×240 | A hand with a small tub of petroleum jelly and a tiny dab on a fingertip, simple and clean | Cover small cuts with petroleum jelly |
| IMG-TU-04 | TU-04 | 358×240 | A simple low-to-high level indicator with the lowest notch highlighted in purple, next to the tray | We start at a low level |
| IMG-TU-05 | TU-05 | 358×240 | A calm check mark disc above the tray with two hands resting in it | You're ready |
| IMG-WC-01 | WC-04 | 358×200 | A teaspoon of white powder above one tray's water, with small dissolving ripples | Add baking soda to soft water |
| IMG-WC-02 | WC-06 | 358×200 | Side view of the tray with water below the line and a purple arrow showing where it should reach | Add water up to the line |
| IMG-WC-03 | WC-08 | 358×200 | A tray with no water and a small amber question mark shape | Check the tray is filled |
| IMG-HI-01 | HI-04 | 358×200 | An empty calendar grid with one cell outlined in purple | Your first session will appear here |
| IMG-IN-01 | IN-04 | 358×200 | A small chart axis with three dotted placeholder bars | Insights will appear soon |
| IMG-NW-01 | NW-05a | 358×200 | The tray with a small wrench and a magnifying glass, amber highlight on the electrode area | Your device may need attention |
| IMG-NW-02 | NW-05b | 358×200 | A tray with water and a baking soda teaspoon, small amber drop shape | Your water may be too soft |
| IMG-NW-03 | NW-05c | 358×200 | Two hands resting flat in the tray with a purple line showing palms fully covered | Small setup changes may help |
| IMG-NW-04 | NW-05d | 358×200 | A week calendar with several cells empty and a few filled in purple | Sessions have been missed |
| IMG-NW-05 | NW-05e | 358×200 | A plant sprout in a small pot beside the tray, very simple | Give it a little more time |
| IMG-NW-06 | NW-05f | 358×200 | A doctor's clipboard with a document and a stethoscope, soft red accent mark instead of amber | Worth checking with a doctor |
| IMG-TR-01 | MO-07 | 358×240 | A flat travel pouch with the folded tray, a small gel insert, and a baking soda sachet laid out neatly | Packing list for travel |
| IMG-TR-02 | MO-07 | 358×160 | The soft Comfort Insert, a thin rounded gel pad, seen from above inside the tray | The Comfort Insert |
| IMG-DH-01 | MO-08b | 3 × 358×200 | Three steps: a cloth wiping the tray's electrode plates; rinsing; drying. Each separately | Cleaning the electrodes |
| IMG-DH-02 | MO-08a | 358×160 | The tray and a phone with an upward arrow between them | Updating the tray |
| IMG-PV-01 | MO-09 | 358×200 | A phone with a padlock and a small shield, no cloud and no arrows going out | Your data stays on this phone |
| IMG-RP-01 | MO-10 | 358×200 | A one-page document with simple lines and a small chart, a paper clip in purple | A one-page report for your doctor |
| IMG-SY-01 | SY-01 | 358×200 | Tray and phone with a broken signal arc and an amber dot | Tray not connected |
| IMG-AP-01 | ON-01, app icon | 1024×1024 | A single solid water drop outline centered in white on a purple field, square (no rounded corners; iOS applies the mask) | DrySync app icon |

30 manifest entries; 2 are multi-asset. P0 images: ON-01 to ON-06, TU-01 to TU-05, WC-01 to WC-03, NW-01 to NW-06, HI-01, SY-01, AP-01.

**Not generated:** the Live session screens, Safe to Lift, Call Guard, charts, calendars, icons (Phosphor), and the Control Panel screen mocks. They are built from layers.

---

## 12. Paper build plan

### 12.1 Page and file structure
- New page **Prototype v2** in the DrySync Paper file. The existing **App screens (from code)** page stays as reference and is not edited further.
- Row-based layout by module, left to right in flow order, 80px between artboards, 240px between rows. Row labels (text layers) at the left: Onboarding, Home, Water, Session, History, Insights, Not working?, More, System, Control Panel.
- Artboard names: `ID Name / state`, e.g. `SE-07 Call Guard / unknown number`. Legacy numbers (01 to 24, S1 to S24) go in the artboard's `hotspots` layer.
- Layer names: components named by catalog (e.g. `Button / Primary`), images `IMG-<id>`, hotspot lists `hotspots`.
- Duplicate the existing artboard when a P0 screen already exists, then restyle to v2 tokens. Do not re-draw.

### 12.2 Tokens first
Before any screen: create Paper tokens for colors (3.3), type (3.4), spacing (3.5) and **radius** (`--radius-none: 0`, `--radius-full: 9999px`; no other radius tokens exist, which prevents drift). Components are built from tokens only. Hard-coded hex or radius values are a QA failure.

### 12.3 Build order (follows v1 6, with v2 additions)
1. Tokens, status bar, components (3.8)
2. SE-01 to SE-24 (session, call, safe to lift, done) and CP-01 to CP-08
3. WC-01 to WC-07
4. HM-01 and states
5. NW-01 to NW-06
6. HI-01, HI-02, HI-04
7. ON-01 to ON-12, TU-01 to TU-05
8. MO-02, MO-05, MO-06, MO-09 and sheets (privacy first, for T7)
9. P1 screens
10. System states

### 12.4 Tool budget
Paper's weekly MCP limit was hit during the last restyle. Reduce calls: write whole component groups, use `duplicate_nodes` plus `update_styles` for variants, avoid per-node edits, and take screenshots per row rather than per screen. Build P0 first so a limit hit leaves a testable prototype.

### 12.5 Schedule (final presentation early December)
| Week of | Work |
|---|---|
| Nov 16 | Confirm decisions D1 to D6; tokens; components; Session and Call Guard (SE, CP) |
| Nov 23 (Thanksgiving week) | Water, Today, Not working?, History; start code restyle for the finished modules |
| Nov 30 | Onboarding, Privacy, remaining P0; interaction pass in code; image generation; QA; usability tests |

### 12.6 Definition of done (per screen)
- Built from tokens and components only
- Radius audit empty (3.2); contrast checked (3.3); Dynamic Type 130% check
- Text sentences follow Section 8
- Every tap target is listed in `hotspots`
- Every image is a placeholder with a manifest ID
- Screenshot review of spacing, alignment, hierarchy

---

## 13. Success metrics (v1 Section 14 still applies)
Prototype tests (T1 to T8): at least 70% of tasks completed without help; 100% identify Safe to Lift (T3); logging in under 10 seconds (T4); participants explain a diagnosis in their own words (T6); most participants trust the privacy screen (T7).

---

## 14. Open questions

Carried from v1 (still open): 1 call handling today, 2 voice versus panel preference, 3 four buttons with wet fingers, 4 real call control on phones, 5 hold level strength, 6 does hold time count, 7 device-versus-water thresholds, 8 sessions before "too early", 9 trust in app diagnosis, 10 pricing.

New in v2:
11. **Confirm D1 (sharp geometry).** Do you want the app fully sharp, or sharp surfaces with the round indicator exception as written?
12. **Keep Inter, or switch to IBM Plex Sans** for a closer Carbon feel? (This PRD assumes Inter.)
13. **Does Page 1's Carbon blue variant** stay as an exploration only, or should its blue replace purple?
14. Missing **research file** (0.1): where is it?
15. Should the prototype include a **Today for Maya** (new user) as a full state set, or only Daniel's?
16. Should **mA ever appear** on the main Live screen for a clinical audience (D4)?
17. Who approves generated images, and what is the target resolution for the final presentation (the manifest assumes 358 px wide at 1x, generate at 3x)?

---

## 15. Risks
| Risk | Mitigation |
|---|---|
| Paper tool limit stalls the build | P0 first, batch edits (12.4) |
| Sharp restyle touches 48 existing artboards | Duplicate and restyle only the P0 ones; leave the old page as reference |
| Image generation delays | Placeholders are test-ready; only the tutorial and diagnosis images matter for tests |
| Design and code drift | Paper `hotspots` layers and a shared token file; QA compares after each module |
| Session mode looks like a different app | It reuses all tokens except the dark theme set, and the same geometry |
