# DrySync App: Product Requirements Document (PRD)
**Companion app for the DryTray iontophoresis device**
**Tariq | UMSI Mastery Course | Draft v1, October 12, 2026**

This document describes what the DrySync app does, how each flow works, and what the app needs from the DryTray hardware. It is a design spec for the course prototype, written in plain language. Numbers marked **TBD** need engineering testing before they can be trusted. Background research is in **Iontophoresis Research.md**.

---

## 0. Context for the builder (read this first)

This section is for whoever builds the prototype, including Claude Code. It explains why the app exists and why the main decisions were made, so you can make sensible choices where the spec is silent.

### 0.1 What this project is
- A **class project** (University of Michigan School of Information, Mastery Course, fall 2026, final presentation in early December). Tariq is a UX designer. The goal is a **prototype to test with real people**, not a shipping medical product.
- The bigger idea: **open-source hardware** anyone can build cheaply, plus a **private app** whose smart features (insights, diagnosis) could later be a paid subscription.

### 0.2 The condition and the treatment, briefly
- **Hyperhidrosis** means sweating far more than needed. It affects about 1 in 20 Americans, often the hands and feet, and usually starts in childhood.
- **Tap-water iontophoresis** treats it: the user rests their hands in shallow trays of tap water while a device sends a weak current through the water for about 20 to 30 minutes, several times a week at first, then 1 to 3 times a week to keep results.
- **It works but people quit.** In one trial, sweat dropped about 92% on average. But in a 2026 study, 85% of people it helped relapsed within 6 months, mostly because they stopped doing sessions. The top reasons are lack of time, inconvenience, and confusion.
- **So the app's job is to make sticking with treatment easy.** It does not treat anyone by itself.

### 0.3 Why each big feature exists

| Feature | Why |
|---|---|
| Hands-free control (voice and the tray's buttons) | During a session the hands are wet and part of the electrical circuit. Pulling a hand out mid-session can cause a small shock. Touching the phone is not an option |
| Call Guard | Phone calls are the most common real-life interruption. Today users either miss the call or yank a hand out |
| "Safe to lift" signal | Users need one clear, unmistakable sign that the current is off before they move their hands |
| Automatic logging from sensors | Typing logs is a chore people skip. The tray measures real numbers, so the app can log without effort |
| Water Check | The treatment depends on minerals in the water to carry current. Users do not know if their water is "soft," and it changes when they travel. A teaspoon of baking soda often fixes soft water |
| "Not working?" diagnosis | When results fade, users cannot tell if the cause is the device, the water, their setup, or missed sessions, so they give up |
| The device enforces safety, not the app | Apps crash, Bluetooth drops, voice assistants mishear. Safety cannot depend on any of them |
| Private, on-phone data | This is health data. US rules (the FTC Health Breach Notification Rule) cover health apps, and trust is a selling point |
| Tray first, not the glove | Water trays have the strongest proof. Gel-only designs sting in spots and dry out. The glove is a separate comparison concept and is out of scope here |
| Plain language everywhere | Users are not technical. Say "how hard the device has to push," not "impedance." Real numbers live behind a "Details" tap |

### 0.4 The hardware the app talks to
See **sketch-tray.png** (Tariq's sketch). The DryTray has: a sloped, hand-shaped bed so the wrist stays relaxed; a water level line and a drain; a **waterproof control panel built into the tray near the fingertips, with a small screen and four buttons**; a built-in rechargeable battery; soft, rounded edges; and a flat packing shape for travel. Inside are sensors for current, voltage, water minerals, water temperature, and water level (Section 3.2). An optional soft gel **Comfort Insert** can sit in the tray for comfort and travel. The glove (sketch-glove.png) is not part of this app.

### 0.5 What is real and what is simulated in the prototype
- **No electric current ever goes through anyone's skin.** The tray in testing is a mockup.
- **Water readings may be real** (a small ESP32 board with water mineral, temperature, and level sensors) or simulated.
- **Everything else is simulated:** current readings, phone calls, diagnosis results, battery.
- **Build a "simulated device" layer** that sends and receives the same commands and readings as the real device would (Section 13), so a real device could replace it later.
- **Add a hidden test console** for the researcher to trigger events during usability tests: incoming call, hand lifted, water too soft, strength cannot be reached, self-test fails, battery low, Bluetooth lost. This is how "Wizard of Oz" testing works in code.
- **Platform:** confirm with Tariq before starting. If nothing is specified, a sensible default is a web app laid out like a phone screen (easy to run on any laptop or phone during tests), with iPhone-only features such as Siri and call detection simulated through the test console.

### 0.6 Build order
1. Live Session, Safe to Lift, and Call Guard (the signature experience)
2. Water Check
3. End of session logging and the sweat rating
4. History
5. "Not working?" diagnosis (with three scripted cases: device, water, schedule)
6. Onboarding and safety screening
7. Privacy Center
8. Then the P1 features in Section 5

---

## 1. Overview

### 1.1 The problem in one paragraph
Tap-water iontophoresis works well in studies, but people quit. They quit because sessions take 20 to 40 minutes with their hands stuck in water, because they do not know the right settings or whether their water is good enough, and because when results fade they cannot tell why. Today's devices give almost no feedback, cannot be controlled without lifting your hands, and ignore what happens when your phone rings.

### 1.2 What DrySync does
DrySync is a phone app that pairs with the DryTray. The tray measures real numbers during every session. The app turns those numbers into:
1. **Hands-free control** (voice and the tray's built-in waterproof control panel) so the user never has to pull a wet hand out mid-session.
2. **Automatic, effortless logging** of every session and simple daily check-ins.
3. **Plain-language guidance** about water, strength, and schedule.
4. **Self-diagnosis** that tells the user whether a problem is the device, the water, their setup, their schedule, or just too early.

### 1.3 Goals
| # | Goal | How we will know (course prototype) |
|---|---|---|
| G1 | A user can run a full session without touching their phone | Usability test: start, pause, handle a call, and finish using only voice or the Control Panel |
| G2 | A user always knows when it is safe to lift their hands | 100% of test participants correctly identify the "safe to lift" state |
| G3 | Logging takes under 10 seconds a day | Timed task in usability test |
| G4 | A user who says "it's not working" leaves with a clear next step | Participants can explain the diagnosis result in their own words |
| G5 | Users trust how their data is handled | Desirability cards and interview responses about privacy |

### 1.4 Non-goals (for this version)
- The app does **not** decide medical treatment or replace a doctor.
- The app does **not** control the safety limits of the device. The device enforces them on its own.
- No social feed, sharing of photos, or ads.
- No support for other brands' devices yet (planned as a later "manual mode").
- No glove support in v1 (the glove is a separate comparison concept).

---

## 2. Users and key scenarios

| Persona | Situation | What they need from the app |
|---|---|---|
| **Maya** (20, student, new user) | Starting treatment, on a budget, studies during sessions | Clear setup, safety check, plan, and a session screen she can glance at while reading |
| **Daniel** (34, travels for work, lapsed user) | Wants to restart; travels with soft hotel water; cannot miss work calls | Call handling, voice control, water check, travel mode, and a reason when it stops working |

### Top scenarios the app must handle
1. **First session ever:** safety screening, pairing, water check, guided first session at a low strength.
2. **Regular evening session at home:** reminder, quick water check, start by voice, finish, log.
3. **Phone rings mid-session:** strength lowers automatically, user answers or declines without lifting hands, or pauses and lifts safely.
4. **It stings:** user says "ouch" or presses the button and strength drops right away.
5. **Hotel room with soft water and the Comfort Insert:** travel mode, baking soda advice, location note.
6. **"It's not working anymore":** guided diagnosis with a clear result.
7. **Day with no session:** 5-second sweat check-in so trends stay accurate.
8. **Doctor visit:** export a one-page report.

---

## 3. System overview

### 3.1 The pieces

| Piece | What it is | Talks to |
|---|---|---|
| **DryTray controller** | Built into one tray. Battery, current control, sensors, status light, buzzer | App (Bluetooth Low Energy, BLE) and Control Panel |
| **Trays** | Contoured beds with electrodes and a soft rim | Controller (wired) |
| **Comfort Insert** | Soft conductive gel layer for comfort and travel | Detected by the controller as a "mode" (TBD how: user selects it, or a sensing contact) |
| **Control Panel** | Waterproof panel built into the tray near the fingertips: a small screen plus four buttons (see sketch-tray.png). Pressable under water | Controller (wired, so no Bluetooth-through-water problem) |
| **DrySync app** | iPhone first for the prototype, Android later | Controller, the phone's voice assistant, calendar, notifications |

### 3.2 What the tray measures (plain language)

| Reading | Plain meaning | How often |
|---|---|---|
| **Strength set (mA)** | What the user asked for | When changed |
| **Strength delivered (mA)** | What actually reached the skin | About once per second |
| **Push needed (voltage)** | How hard the device is working | About once per second |
| **Resistance** | Push needed divided by strength delivered. High resistance means something is blocking the current (soft water, worn electrodes, poor contact) | Calculated live |
| **Water minerals (TDS / conductivity)** | How well the water can carry current | Before each session |
| **Water temperature** | Used to correct the mineral reading; also a comfort note | Before and during |
| **Water level** | Whether the palms are covered | Before and during |
| **Hand contact** | Whether hands are in the water (from the current reading) | Live |
| **Polarity** | Which direction the current flows (switches partway through) | When it switches |
| **Battery level** | Charge left | Live |
| **Self-test result** | Whether the device's output matches a built-in test load | On demand |

### 3.3 Safety rule that shapes everything
**The app asks; the device decides.** All safety limits (maximum strength, ramp speed, automatic shut-off, kill switch) live in the device's firmware and hardware. The app can only send requests. If the app crashes, Bluetooth drops, or a voice command is misheard, the session must stay safe.

---

## 4. Design principles

1. **Hands-free by default.** During a session the user's hands are wet and in a circuit. Every action needed during a session must work by voice or by the Control Panel. The phone screen is for glancing, not touching.
2. **Readable from across the table.** The live session screen uses very large type, a single status color, and no small buttons that matter.
3. **Always know when it is safe to lift your hands.** One consistent signal everywhere: green light on the tray, green screen in the app, a short chime, and the spoken phrase "safe to lift."
4. **Down is easy, up is careful.** Lowering strength is instant and needs no confirmation. Raising strength happens in small steps and never above the user's saved comfort limit.
5. **Plain words, real numbers on request.** Default view: "Water is too soft." Tap for details: "Conductivity reading, temperature, what it means."
6. **Log without typing.** Everything the tray can measure is saved automatically. The user only adds how they feel, in one tap or one spoken phrase.
7. **Explain, do not just alert.** Every warning says what happened, why it matters, and what to do.
8. **Private by design.** Data stays on the phone unless the user chooses otherwise.

---

## 5. Feature list and priority

**P0** = needed for the course prototype's core story. **P1** = important, shown in prototype if time allows. **P2** = later.

| ID | Feature | Priority | Short description |
|---|---|---|---|
| F1 | Onboarding and safety screening | P0 | Contraindication questions, plain stop screen if unsafe |
| F2 | Device pairing and setup | P0 | Pair tray, name it, test the Control Panel buttons and the status light |
| F3 | Treatment plan | P0 | Starting phase then maintenance; editable |
| F4 | Reminders and calendar sync | P1 | Session reminders that respect the user's calendar |
| F5 | Pre-session Water Check | P0 | Minerals, temperature, level, with plain advice |
| F6 | Live Session screen (across-the-room view) | P0 | Big timer, strength bar, status color, hints for voice |
| F7 | Voice control | P0 | Start, pause, resume, stop, time left, turn down, small turn up, log |
| F8 | Control Panel | P0 | Built-in panel: four buttons (pause/resume, call, down, up) and a small screen |
| F9 | Call Guard | P0 | Detect incoming call, lower strength, offer answer, decline, or pause |
| F10 | "Ouch" quick-drop | P0 | Instant strength drop by voice, button, or screen |
| F11 | Safe to Lift state | P0 | Consistent signal after ramp-down |
| F12 | Automatic session log | P0 | All measured data saved per session |
| F13 | Post-session rating | P0 | Sweat 1 to 4 and comfort, by tap or voice |
| F14 | Daily check-in | P1 | 5-second sweat rating on non-session days |
| F15 | History (calendar) | P0 | Calendar heatmap and session list |
| F16 | Insights | P1 | Trends, streaks, water by place, relapse warning |
| F17 | "Not working?" self-diagnosis | P0 | Guided check with device self-test and data review |
| F18 | Travel mode and Comfort Insert mode | P1 | Travel checklist, insert mode, place tags |
| F19 | Device health | P1 | Battery, firmware, electrode trend, Control Panel status, insert age |
| F20 | Privacy Center | P0 | What is stored, where, export, delete |
| F21 | Doctor or insurer report | P1 | One-page PDF summary |
| F22 | Lock screen and Dynamic Island live view | P1 | Session timer outside the app |
| F23 | Spoken progress updates | P2 | Optional voice updates every few minutes |
| F24 | Manual mode for other brands | P2 | Self-reported logs for Dermadry, Fischer, Hidrex |
| F25 | Anonymous community water insights | P2 | Opt-in, "people in your area often add baking soda" |

---

## 6. User flows

Flows are written as "boxes and arrows." Decision points are in **(parentheses)**.

### 6.1 Onboarding and safety (F1, F2, F3)
[Welcome: what DrySync does, privacy promise in one line] → [Safety questions: pregnant? pacemaker or implanted defibrillator? metal implants in hands or arms? heart rhythm problems? epilepsy? open wounds?] → **(any "yes")** → [Stop screen: "Please talk to a doctor before using DryTray," with reasons and a link to share with a doctor; user can still browse the app but cannot start sessions] → **(all "no")** → [Which areas? hands / feet / both] → [Pair tray: turn on, hold phone nearby, confirm light blinks] → [Button test: press each Control Panel button] → [Choose control style: voice, Control Panel, both] → [Set up voice shortcuts (iPhone: add Siri phrases)] → [Call handling setup: explains Call Guard; links to phone settings such as Siri call announcements] → [Plan: "Starting phase: 4 sessions a week for about 3 weeks"] → [Reminders] → [First session tutorial]

### 6.2 First session (guided)
[Video or step cards: fill to line, remove watches and rings, cover small cuts with petroleum jelly] → [Water Check (6.3)] → [Place hands: device detects contact] → [Start at a low strength] → [Every minute: "How does it feel? Say 'up a little' or 'down'"] → [Save the highest comfortable strength as the user's comfort limit] → [Finish] → [Explain what to expect: "Most people need several sessions before they notice a change"]

### 6.3 Pre-session Water Check (F5)
[User fills trays] → [App: "Checking your water..."] → [Reads minerals with temperature correction, and level] →
- **(level low)** → "Add a little more water, up to the line."
- **(minerals too soft, threshold TBD)** → "Your water is soft. Add about 1 teaspoon of baking soda to each tray, stir, and check again." → [Recheck button]
- **(very hard)** → "Your water is hard. This is fine for treatment."
- **(good)** → "Water looks good."
→ [Save reading with place tag if allowed] → [Ready to start]

Notes: the reading is grouped into Too soft / Good / Very hard. Exact numbers show only when the user taps "Details." The ±10% accuracy of a cheap sensor is fine for groups, not for exact values.

### 6.4 Start a session
Three ways, all leading to the same state:
- **Voice:** "Hey Siri, start DryTray."
- **Control Panel:** press Pause/Play when hands are in place.
- **App:** big Start button (before hands go in).

[Start request] → **(water check older than TBD minutes or never done)** → [Spoken prompt: "Water not checked. Starting anyway at your usual strength. Say 'check water' to test."] → **(hands not detected)** → [Wait; spoken "Place your hands in the water when ready"] → [Ramp up gently to the plan strength over about TBD seconds] → [Live Session]

### 6.5 Live Session (F6)
**Screen layout (across-the-room view):**
- Huge countdown (for example "14:32 left")
- Status color band: blue = running, amber = paused or hold, green = safe to lift, red = problem
- Strength bar showing delivered strength vs. set strength
- One line of hint text, rotating: "Say 'Hey Siri, pause DryTray'" / "Press the button to pause"
- Small "Polarity switched" note when it happens

**Events during a session:**

| Event | What the device does | What the app shows and says |
|---|---|---|
| Polarity switch (halfway) | Ramps down, switches, ramps up | "Switching direction, you may feel a brief change" |
| Hand leaves water | Detects drop in current, ramps to zero, pauses | Amber: "Paused. Put your hands back and press the button or say 'resume'" |
| Strength can't reach set level | Delivers as much as safely possible | Small note: "Not reaching full strength. We'll look at this after the session." Logged for diagnosis |
| Water level drops | Keeps running if contact is fine | "Water is getting low" after the session |
| Battery low | Finishes the session if there is enough charge; otherwise ramps down safely | "Battery low: about X minutes left" before start, never a surprise stop mid-session |
| Bluetooth lost | Keeps running on its own, ends at planned time | When reconnected: "Your session finished normally" and the log syncs |

### 6.6 Pause, resume, and Safe to Lift (F11)
[Pause by voice, Control Panel, or app] → [Device ramps down to zero over about TBD seconds] → [Amber "Lowering..."] → [Green: tray light, full-screen green, chime, spoken "Safe to lift your hands"] → [Session timer pauses; time is added back] → [Resume by voice or Control Panel once hands are back] → [Gentle ramp up] → [Running]

If paused longer than TBD minutes: "Do you want to finish this session or continue?" The log records partial sessions honestly.

### 6.7 Call Guard: phone rings mid-session (F9)
This is a signature flow.

[Incoming call detected by the app] → [App tells the device to lower strength to a gentle "hold" level, TBD] → [Screen shows caller name and three options; phone speaks "Call from Sarah. Say answer, decline, or pause"] →
- **(Answer)** → [Answered by the phone's own voice feature or the Control Panel's Call button acting like a headset button, where supported] → [Session stays at hold level during the call; timer pauses] → [Call ends] → [Spoken: "Resume your session?"] → [Resume by voice or button; gentle ramp up]
- **(Decline)** → [Call declined where supported] → [Ramp back up to the set strength] → [Continue]
- **(Pause)** → [Full ramp-down] → [Safe to Lift] → [User picks up the phone normally] → [Later, resume]
- **(No response for TBD seconds)** → [Stay at hold level; the call goes to voicemail as usual] → [Ramp back up]

**User settings:** what to do on a call (always ask / always pause / ignore calls during sessions); which contacts are allowed through ("Favorites only" option, similar to Focus modes).

**What the app can and cannot do (needs testing):**
| Platform | Detect a call is ringing | Answer or decline the call |
|---|---|---|
| iPhone | Generally possible while the app is active or running in the background with the paired device (to confirm in testing) | Regular apps cannot answer or decline cellular calls themselves. Options: the user's own Siri call announcements ("answer" / "decline" by voice, a phone setting), the Auto-Answer accessibility setting, or the Control Panel acting like a Bluetooth headset button (to test) |
| Android | Possible with phone-state permission | Apps can request permission to answer calls; declining support varies by version (to confirm) |

**Design fallback:** even if answering by button is not possible on a phone, Call Guard still lowers the strength and offers a calm, safe pause, which already solves the "jolt when grabbing the phone" problem.

### 6.8 "Ouch" quick-drop (F10)
Triggers: saying "ouch," "it stings," or "turn it down"; pressing and holding the on-screen button; or pressing the Down button on the Control Panel.
[Trigger] → [Device lowers strength right away by a set step, TBD] → [Spoken: "Lowered. Say 'down' again to lower more, or 'pause' to stop."] → [Logged as a comfort event; three or more in one session suggests a check of setup (contact, cuts, water)]

### 6.9 End of session and logging (F12, F13)
[Timer ends] → [Ramp down] → [Safe to Lift] → [Spoken: "Session done. How were your hands today? Say dry, mostly dry, damp, or dripping."] → [User answers by voice or taps a face] → [Optional comfort rating and tags: hot day, stressful day, new water, used Comfort Insert] → [Summary card: minutes, average strength delivered, water result, streak] → [Saved]

### 6.10 Daily check-in on non-session days (F14)
[One notification at a time the user chooses] → [Four faces, one tap, or tap-and-hold on the notification] → [Done]. Skippable; the app never nags more than once a day.

### 6.11 History and Insights (F15, F16)
- **History:** calendar heatmap (session days filled), list view with each session's key numbers, tap for the full session chart (strength over time, pauses marked).
- **Insights (plain sentences first, charts second):**
  - "You did 3 of 4 planned sessions this week."
  - "Your dry days went from 2 to 5 a week since you started."
  - "Your sessions reached full strength 90% of the time."
  - "Hotel water was soft on all 3 trips. Pack baking soda."
  - **Relapse warning:** "Your sweat scores have crept up over the last 10 days. A booster week (3 sessions) often helps." (Rule TBD, based on rating trend and missed sessions.)

### 6.12 "Not working?" self-diagnosis (F17)
A signature flow. Starts from a "Not working?" button on the home screen, or the app suggests it when sweat scores rise or sessions keep falling short of full strength.

**Step 1: What feels wrong?** (one choice)
- Still sweaty / getting sweatier
- Tingle feels weaker than before
- Stings or burns
- Device will not start or keeps stopping

**Step 2: Device self-test** (empty, dry tray, about 30 seconds)
The device runs current through its built-in test load and checks: output accuracy, polarity switching, battery under load, and the Control Panel buttons and screen.

**Step 3: Water test** (fill normally, about 20 seconds)
Minerals, temperature, level.

**Step 4: Data review** (automatic, last 3 weeks)
Sessions per week vs. plan, average minutes, strength delivered vs. set, resistance trend, number of pauses and quick-drops, and current phase (starting or maintenance).

**Step 5: Result card** (one main cause, with up to two "also check" items)

| Result | Signs the app looks for | What the user sees |
|---|---|---|
| **Device** | Self-test fails; or strength falls short even with good water and a steadily rising resistance across weeks (possible electrode wear); or battery sags under load | "Your device may need attention." Steps: clean electrodes, charge fully, update firmware, re-run test; then "Contact support / open-source repair guide" |
| **Water** | Self-test passes; water reads too soft; strength often falls short; resistance high mainly in certain places (e.g., hotel) | "Your water is likely too soft to carry enough current." Steps: add baking soda, re-check, save tip for this place |
| **Setup or technique** | Device and water fine; frequent hand-out pauses, many quick-drops, very low comfort limit, or low water level readings | "Small setup changes may help." Steps: fill to line, rest palms fully, cover cuts with petroleum jelly, try the Comfort Insert, increase strength slowly over sessions |
| **Schedule** | Device and water fine; sessions per week well below plan or long gaps | "You've done 4 of 12 planned sessions. Results fade without regular sessions." Steps: adjust reminders, booster week |
| **Too early** | Everything fine; fewer than about TBD sessions so far in the starting phase | "It usually takes several sessions before people notice a change. Keep going; we'll check again in a week." |
| **See a doctor** | Stinging or burns that continue after setup fixes; skin damage reported; everything else normal but no change after a full starting phase | "This is worth checking with a doctor." Option to export the report |

**Step 6: Follow-up** → [App schedules a check in about one week] → [Shows before and after: "Your sessions now reach full strength"]

Notes: thresholds for "falls short," "rising resistance," and "too soft" are **TBD from engineering testing**. In the course prototype, results are faked through Wizard of Oz to test whether people understand and trust them.

### 6.13 Travel mode and Comfort Insert mode (F18)
[User taps "Traveling" or the app notices a new place (opt-in)] → [Travel checklist: charge tray, pack insert, pack baking soda, pack travel basin] → [At destination: Water Check with "New place" tag] → [Mode: Full tray / Comfort Insert] → **(Comfort Insert)** → [Plan suggests a maintenance-style session; app notes this mode is less tested] → [Session] → [Log with place and mode]

### 6.14 Device health (F19)
Battery and charge cycles; firmware version and updates; electrode trend (resistance in self-tests over time, "may need cleaning"); Control Panel buttons and screen; Comfort Insert age (sessions since first use, "replace after TBD sessions").

### 6.15 Privacy Center (F20)
Plain list: what is stored (sessions, ratings, water, optional places), where (on this phone; optional encrypted backup), who can see it (only you unless you share), what voice assistants receive (only the command, never health data), plus buttons: Export all (CSV and PDF), Delete all, Turn off place tags, Turn off community data.

### 6.16 Doctor or insurer report (F21)
[Choose date range] → [Preview one page: sessions per week, average minutes, average strength, sweat scores over time, side effects reported, device used] → [Share as PDF]. Nothing leaves the phone until the user taps Share.

---

## 7. Screen inventory

| # | Screen | Key elements |
|---|---|---|
| S1 | Welcome | Value in one line, privacy line, Get started |
| S2 | Safety questions | One question per screen, yes/no, "Why we ask" |
| S3 | Stop screen | Plain reason, share with doctor, browse-only mode |
| S4 | Pair tray / Control Panel | Animated tray, light confirmation, troubleshooting tips |
| S5 | Control style and voice setup | Voice / button / both, "Add to Siri" buttons, call handling explainer |
| S6 | Plan | Phase, sessions per week, edit |
| S7 | Today (home) | Next session, streak, battery, last water result, "Not working?" link, Start |
| S8 | Water Check | Three-zone gauge, temperature, level, tip, details |
| S9 | Live Session | Countdown, status band, strength bar, rotating hint |
| S10 | Call Guard overlay | Caller, "Strength lowered," Answer / Decline / Pause |
| S11 | Safe to Lift | Full green, large text, chime |
| S12 | Session done / log | Four faces, comfort, tags, summary |
| S13 | Daily check-in | Four faces |
| S14 | History | Calendar heatmap, list, session detail chart |
| S15 | Insights | Plain sentences, trend chart, relapse warning card |
| S16 | Not working? (steps 1 to 5) | Step progress, self-test animation, result card |
| S17 | Travel | Checklist, mode, places list |
| S18 | Device health | Battery, firmware, electrodes, Control Panel, insert |
| S19 | Privacy Center | What, where, who, export, delete |
| S20 | Report | Date range, preview, share |
| S21 | Lock screen / Dynamic Island live view | Time left, status color |

---

## 8. Voice command spec (F7)

On iPhone these are built as Siri Shortcuts and App Intents, so they usually include the app or device name ("Hey Siri, pause DryTray"). On Android, Google Assistant App Actions or shortcuts. Exact phrasing rules depend on the platform and must be checked.

| Say | Action | Safety rule |
|---|---|---|
| "Start DryTray" | Start session (after checks) | Only if hands are detected; ramps gently |
| "Pause DryTray" | Pause with ramp-down | Always allowed |
| "Resume DryTray" | Resume with ramp-up | Only if hands are detected |
| "Stop DryTray" / "End session" | Finish early with ramp-down | Always allowed; logged as partial |
| "How much time is left?" | Speaks time left | None |
| "Turn it down" / "Ouch" / "It stings" | Lower strength by one step | Always allowed, no confirmation |
| "Turn it up a little" | Raise strength by one small step (TBD) | Only up to the saved comfort limit; at most one step per TBD seconds; spoken confirmation |
| "Set strength to [number]" | Not supported | Avoids misheard numbers causing big jumps |
| "Check my water" | Runs Water Check and speaks the result | Not during a running session (water may be mid-treatment) |
| "My hands are [dry / mostly dry / damp / dripping]" | Logs sweat rating | None |
| "Answer" / "Decline" (during a call) | Handled by the phone's own assistant where enabled, not the app | App only manages strength |

Notes:
- If a voice command fails or is misheard, nothing unsafe happens; the device keeps its current state.
- Voice must work with the phone on a table nearby. Test in quiet and noisy rooms.
- Some users will not want to speak (shared rooms, privacy). Every voice action has a Control Panel or screen equivalent.

---

## 9. Control Panel spec (F8)

Based on Tariq's tray sketch (sketch-tray.png): a waterproof panel built into the tray, near where the fingertips rest, with a small screen and four buttons. Because it is wired to the tray's controller, it does not need its own Bluetooth or battery, and it keeps working if the phone disconnects.

| Item | Requirement |
|---|---|
| Placement | Built into the tray near the fingertips. The user presses buttons with a fingertip without lifting the palm |
| Casing | Fully sealed, waterproof, non-conductive surface, no exposed metal |
| Screen | Shows time left, strength, and status color (running, paused or hold, safe to lift, problem), so the user does not need to look at the phone. Mirrors the app's Live Session screen |
| Button 1: Pause / Play | Press: pause with ramp-down, or resume with ramp-up |
| Button 2: Call | Press: answer or hang up (where the phone allows). Hold: decline. If calls cannot be controlled on that phone, press means "pause for call" |
| Button 3: Down | Lower strength by one step right away (the "ouch" button). Always allowed |
| Button 4: Up | Raise strength by one small step, only up to the saved comfort limit, at most one step per TBD seconds |
| Press force | Light enough for one fingertip (value TBD from testing) |
| Feedback | Click feel, screen change, tray light, and a spoken confirmation from the phone |
| Failure | If a button stops working, voice and the phone screen still work. Safety never depends on the panel |

Proposed button layout is a starting point. Test whether four buttons are easy to tell apart with wet fingers, and whether raised shapes or symbols help.

---

## 10. Data model (what gets saved)

### 10.1 Session record
| Field | Example | Source |
|---|---|---|
| Session ID | auto | App |
| Start and end time | Oct 14, 8:02 to 8:26 pm | Device |
| Planned minutes / actual minutes | 20 / 20 | App and device |
| Area treated | Hands | User setting |
| Mode | Full tray / Comfort Insert | User or device |
| Strength set (mA) | 16 | Device |
| Strength delivered: average and lowest (mA) | 15.4 / 12.0 | Device |
| Share of time at full strength | 92% | Calculated |
| Resistance: average and trend within session | value | Calculated |
| Polarity switches | 1 | Device |
| Pauses (count, reason, length) | 1, call, 2 min | Device and app |
| Quick-drops | 0 | Device and app |
| Water minerals, temperature, level | "Good," 24°C, OK | Device |
| Baking soda added | Yes / No | User |
| Place tag (opt-in) | "Hotel Chicago" | App |
| Sweat rating (1 to 4) | 2 | User |
| Comfort rating | Comfortable | User |
| Tags and note | hot day | User |
| Firmware version | 0.3.1 | Device |

### 10.2 Daily record
Date, sweat rating (1 to 4), optional tags, whether a session happened.

### 10.3 Device record
Device ID, firmware, battery cycles, self-test history (date, pass/fail, output check, resistance on test load), Control Panel status, Comfort Insert sessions count.

### 10.4 Plan record
Phase (starting / maintenance), sessions per week, session length, comfort limit, start date, reminder times.

### 10.5 What we do not store
No medical records, no photos, no exact location unless the user turns on place tags (and then only a name the user chooses), no voice recordings (voice is handled by the phone's assistant).

---

## 11. Notifications

| Notification | When | Example text |
|---|---|---|
| Session reminder | Plan schedule | "Session tonight at 8? Takes about 25 minutes." |
| Smart reschedule | Missed session | "Missed today. Tomorrow at 8 instead?" |
| Daily check-in | Non-session days, user-chosen time | "How are your hands today?" |
| Water tip | New place detected (opt-in) | "New place. Check your water before your next session." |
| Charge reminder | Before a planned session, low battery | "Charge your DryTray before tonight's session." |
| Relapse warning | Rising scores | "Your hands have been sweatier lately. Try a booster week?" |
| Diagnosis follow-up | One week after diagnosis | "Let's see if the fix helped." |

Rule: at most two notifications per day, all can be turned off individually.

---

## 12. Safety requirements

| ID | Requirement |
|---|---|
| SR1 | Device firmware enforces maximum strength, ramp speed, and automatic shut-off regardless of app commands |
| SR2 | A hardware kill switch on the tray works with no app and no Bluetooth |
| SR3 | Lowering strength is always allowed and immediate; raising is stepwise and capped at the user's comfort limit |
| SR4 | Voice cannot set a specific number; only small relative steps |
| SR5 | Every pause and stop ramps down before the "Safe to Lift" signal |
| SR6 | If Bluetooth drops, the device continues safely and ends at the planned time |
| SR7 | Sessions cannot start for users who answered "yes" to any safety question |
| SR8 | The app reminds users to remove watches and rings before every session (can be shortened after the first few) |
| SR9 | The Control Panel is sealed, non-conductive, and never required for safety |
| SR10 | Clear disclaimer: research prototype, not an FDA-cleared medical device |
| SR11 | For this course, no prototype sends current through a participant |

---

## 13. Technical notes (for the prototype and a future build)

These are planning notes, not final engineering decisions.

| Area | Plan | Notes and limits |
|---|---|---|
| Platform | Real product: iPhone first (Siri, Live Activities), Android later | Course prototype: Figma click-through and/or a coded phone-shaped web app with a simulated device and test console (Section 0.5) |
| Device connection | Bluetooth Low Energy (BLE) from the ESP32 controller | Custom service with: session control (start, pause, resume, stop, step up, step down), live readings (about once per second), device status (battery, firmware, errors), water check, self-test, Control Panel events |
| Background use | App keeps the BLE link while the screen is off | iPhone allows this for paired accessories with the right background mode; behavior must be tested |
| Voice | iPhone: App Intents and Siri Shortcuts. Android: Assistant App Actions or shortcuts | Phrases usually need the app or device name |
| Call detection | iPhone: system call observer. Android: phone-state permission | Answering and declining calls by app is limited; see 6.7 |
| Lock screen | Live Activity / Dynamic Island on iPhone; ongoing notification on Android | Shows time left and status color |
| Storage | On-device, encrypted | Optional encrypted backup the user turns on |
| Export | CSV (all data) and PDF (report) | |
| Open parts | Publish the BLE protocol, data format, and safety logic | Keeps the open-source promise while prediction and diagnosis models stay in the paid tier |
| Sensors (demo) | DFRobot TDS sensor (±10% of full scale), waterproof temperature probe, XKC-Y25 non-contact level sensor | Good enough for Too soft / Good / Very hard groups after temperature correction |
| Diagnosis logic | Simple rules first (Section 6.12), no machine learning in v1 | Thresholds TBD from bench testing |

---

## 14. Success metrics

### For the course prototype (usability testing)
- At least 70% of tasks completed without help (start by voice, handle a call, log, run a diagnosis).
- 100% of participants correctly identify "safe to lift."
- Participants can explain a diagnosis result in their own words.
- Logging a session takes under 10 seconds.
- Stated trust in privacy: majority positive on desirability cards.

### For a real product (later)
- Share of planned sessions completed per week (adherence).
- Share of users still doing maintenance sessions after 3 and 6 months.
- Share of diagnosis results followed by improvement within 2 weeks.
- Share of sessions reaching full strength.
- Interruptions handled without a full stop (calls handled via Call Guard).

---

## 15. Open questions

1. How do people currently handle calls and messages during sessions? (Interviews will tell.)
2. Voice, Control Panel, or both: which do people actually prefer, and in which settings (home alone, shared room, hotel)?
3. Are four buttons easy to tell apart and press with wet fingertips, or is that too many?
4. What exactly can the Control Panel do with calls on real iPhones and Android phones?
5. What hold-level strength during calls is still comfortable but not wasted time?
6. Should time spent at hold level count toward the session?
7. What thresholds reliably separate device problems from water problems? (Needs bench data.)
8. How many sessions before "too early" stops being the answer?
9. Do people trust a diagnosis from an app, or do they want to see the numbers?
10. What subscription price feels fair, and which features belong in the free tier? (Suggested free: control, logging, water check. Suggested paid: insights, diagnosis, relapse warnings, reports. To test.)

---

## 16. Prototype plan for the course

| Feature | How it will be shown | Test method |
|---|---|---|
| Onboarding, safety, plan | Figma click-through | Usability test |
| Water Check | Figma, fed with real readings from the ESP32 sensor demo | Usability test plus sensor demo |
| Live Session, Safe to Lift | Figma on a phone propped up next to a mock tray | Usability test |
| Voice control | Wizard of Oz: researcher triggers screens when the participant speaks | Scenario test |
| Control Panel | Foam or 3D-printed tray with four real buttons and a printed screen; button presses trigger app screens through Wizard of Oz or a simple Bluetooth board | Scenario test (dry hands in the mock tray, no current) |
| Call Guard | Researcher calls the test phone mid-scenario; screens triggered manually | Scenario test |
| Session log and history | Figma with sample data | Usability test |
| "Not working?" diagnosis | Figma with three scripted cases (device, water, schedule) | Comprehension test: "What would you do next?" |
| Privacy Center | Figma | Desirability cards and interview |
