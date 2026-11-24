# Milestone 4: Prototyping Results & Design Refinement (Wade)

## Where the project stands

Wade is a battery-powered tray for treating sweaty hands and feet (hyperhidrosis) with tap-water iontophoresis, paired with a phone app. My Milestone 3 survey of 13 users pointed to two problems. During a session, people get interrupted and reach for their phone or TV with wet hands, and 12 of 13 have felt a sting from lifting their hands out. Around the session, setup and cleanup wear people down, and 7 of the 9 who quit named them as a reason. For this round I wanted to learn whether someone can get through setup and a full session without help, whether the tray controls and the "Safe to Lift" signal make sense the first time, and whether the history, insights and settings screens are easy to find their way around.

The prototype is the Wade app running with a simulated tray. Onboarding covers a short health check, which areas you treat, pairing the tray and testing its four buttons (play/pause, call, and strength up and down), plus voice shortcuts, call filtering and a reminder time. Each session starts with a checklist and a water hardness check, then shows a large countdown that raises the strength slowly and lowers it before telling you it's safe to lift your hands. Sessions are logged to a History calendar, Insights tracks your treatment plan, and a More page holds travel mode, troubleshooting, a doctor report and voice settings.

Prototype link: [add link before submitting]

## How I tested it

I ran three in-person usability sessions with two classmates and my professor. Each person went through the whole app, from the first screen to ending a session and browsing History, Insights and More, while thinking out loud and pretending their hands were in the tray. Afterward I asked a few follow-up questions, such as whether History and Insights should be one page and whether any part felt like too much reading. My testers could tell me whether the app was clear and easy to move through, but not how a 40-minute session or the sting actually feels.

## What I learned

All three testers found the app clear and simple to look at, and liked being able to pause a show or handle a call without lifting their hands. Most of the problems came from how much the app asks of people up front, and from a few places where it explains too little.

### Onboarding is too long

One tester thought setup was over after the health questions, then hit a whole second part for the tray, and suggested grouping questions and showing two labeled parts. Two testers answered yes to the open-cuts question, one because they really had cuts, and the app blocked them from using the device with no way back. That contradicts the later checklist, which tells people to cover small cuts with petroleum jelly.

### The tray buttons are unclear

Nobody knew the up and down buttons change the strength until I told them, and one tester wasn't sure whether to tap the buttons on screen or on the tray. Voice shortcuts only mention Siri, so one tester asked what Android users would do, and another doesn't use Siri at all.

### Session setup is repetitive and missing a warning

The app asks people to fill the tray and then check the water again, which two testers called repetitive, and one pointed out that rings and watches should come off before filling. "Too soft" and "very hard" water meant nothing to one person, and another asked what to do when the water is wrong, which the app never says. One tester was surprised that lifting your hands out mid-session can sting and wanted a warning before starting. The lock screen also confused them, since unlocking a phone with wet hands is hard.

### The after-session questions are confusing

Asking how dry your hands are right after they've been in water will almost always get "damp," as one tester pointed out. The question should ask about sweating before the session or that day. Testers also didn't see why they'd keep notes in Wade instead of an app they already use.

### The menus are hard to navigate

The More page is one long list mixing travel mode, water check, voice control, troubleshooting and reminders, and two testers struggled to scan it. Testers weren't sure how History differs from Insights, and one wanted a last-session summary on the home screen. Travel mode gave no sign that it was on, and the strength control on Insights didn't respond.

Two testers offered ideas worth keeping. One suggested showing a streak only during the first month, when daily sessions matter, then switching to a maintenance view. The other suggested letting a partner, parent or doctor share the account, since someone with their hands in the tray may need help.

## Next steps

1. Split onboarding into two labeled parts, group the health questions, add a back button, and replace the open-cuts block with the petroleum jelly instruction.
2. Label up and down as strength, show a picture of the tray, and add a voice option for Android.
3. Put rings and watches first, merge filling and the water check into one step, explain water hardness in plain words, and warn about lifting hands before the first session.
4. Reword the after-session question, drop notes, group the More page, add a last-session summary to the home screen, show when travel mode is on, and fix the strength bug.
5. Move testing onto the 3D-printed tray and its rim buttons, then share the updated app with Reddit users who have hyperhidrosis, since only they can judge comfort and the sting.
