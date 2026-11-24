# DrySync prototype

Companion app prototype for the **DryTray** iontophoresis device (UMSI Mastery Course, PRD v1).
It is a **phone-shaped web app** talking to a **simulated DryTray**, with a hidden **researcher console** for
Wizard-of-Oz usability tests. **No electric current is ever delivered**: the tray is a software mockup (SR11).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

On a laptop you see a phone frame. On a real phone the app fills the screen.

## Researcher console (hidden from participants)

Open with **`~`** (backtick), by tapping the phone's clock **5 times**, or with `?console` in the URL. Close with `Esc`.

| Section | What it does |
|---|---|
| Scenario | Load Fresh install, **Maya** (new user), **Daniel** (lapsed, 8 weeks of history), or one of six scripted "Not working?" cases (device, water, schedule, too early, setup, doctor). `+1 day` / `+7 days` moves the app calendar. Sim speed up to 60× so a 20-minute session takes seconds. |
| Triggers | Incoming call (name, favorite), caller hangs up, hand lifted, strength can't be reached, water level drops, battery low, Bluetooth lost |
| Water | Too soft / Good / Very hard / level low. Drive these from a real ESP32 sensor later. |
| Device state | Self-test fails, direction fault, battery sags, dead Up button, worn electrodes, "phone can't answer by button", "hold time counts" (PRD open question 6) |
| Say something | Type or tap any voice phrase (PRD section 8); optional real microphone via the browser |
| Mock tray Control Panel | The four buttons (Pause/Play, Call, Down, Up). Hold Call to decline. Works with Bluetooth down, like the real panel. |
| Notifications | Fire any notification (bypasses the 2-a-day cap) |

## What is built (PRD feature IDs)

F1 onboarding and safety screening (any "yes" locks sessions) · F2 pairing and Control Panel test · F3 plan ·
F4 reminders with a simulated calendar · F5 Water Check (soft/good/hard, baking-soda flow, level) ·
F6 Live Session (huge timer, status band, strength bar, rotating hints, Details) · F7 voice ·
F8 Control Panel · F9 Call Guard · F10 "Ouch" quick-drop · F11 Safe to Lift ·
F12 automatic session log · F13 sweat and comfort rating · F14 daily check-in ·
F15 History (heatmap, list, per-session chart) · F16 Insights and relapse warning ·
F17 "Not working?" (self-test, water test, 3-week data review, six result types, 1-week follow-up) ·
F18 travel and Comfort Insert mode · F19 device health · F20 Privacy Center (CSV export, delete all) ·
F21 report (print to PDF) · F22 lock screen / Dynamic Island preview · F23 spoken progress.
Not built (P2): F24 manual mode for other brands, F25 community water insights.

## Where the safety rule lives

**The app asks; the device decides** (PRD 3.3). All limits are in `src/device/sim.ts`, never in the UI:
20 mA hard cap, gentle ramps, "down" always immediate, "up" one small step, rate-limited and capped at the comfort limit,
no numeric strength by voice, ramp-down before every Safe to Lift, and the tray keeps running if Bluetooth drops.
Control Panel Pause/Down/Up are handled by the device itself so they never need the phone.

## Code map

- `src/device/sim.ts` – simulated firmware + sensors (same commands and events a BLE device would use)
- `src/lib/controller.ts` – voice, Call Guard, session logging, notifications
- `src/lib/diagnosis.ts` – the rule engine for "Not working?" (all thresholds are marked TBD constants)
- `src/lib/water.ts`, `schedule.ts`, `insights.ts`, `seed.ts`, `report.ts`
- `src/screens/*`, `src/components/*`, `src/console/Console.tsx`

All numbers the PRD marks **TBD** (water zones, hold level, ramp times, thresholds) are constants at the top of those files.
Data stays in the browser (`localStorage`); nothing is sent anywhere.
