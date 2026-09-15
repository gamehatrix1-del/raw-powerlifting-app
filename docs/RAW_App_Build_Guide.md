# RAW@ Powerlifting Academy App — End-to-End Build Guide & Development Roadmap

*Working document — this is what we build against. Update it as decisions change.*

---

## 1. What We're Building

A coaching platform with two faces on one codebase:

- **Athlete app** — intake, weekly programs, workout logging, progress, membership & payments.
- **Coach/Admin view** — program builder, member management, payments, reporting.

**Budget-driven architecture call:** the original spec called for a separate web-based admin dashboard. At a ₹20,000 development budget, building two front ends (mobile app + separate web app) isn't realistic. Instead: **one React Native app, two experiences, gated by role.** Rajat logs in and sees the coach view; athletes see the athlete view. Same codebase, same backend, half the build time. If the business outgrows this later, the coach view can be split into its own web dashboard without touching the athlete app or database.

---

## 2. Confirmed Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Mobile app | **React Native + Expo** | One codebase for iOS + Android, free, huge ecosystem |
| Backend | **Supabase** (Postgres + Auth + Storage) | Free tier covers single-gym scale; gives DB, login, and file storage out of the box |
| Payments | **Razorpay** | Required regardless of build approach; subscription billing + webhooks |
| Build/Release | **EAS Build** (Expo) | Cloud-compiles iOS/Android binaries without needing a Mac |
| Version control | **GitHub** | Free, standard |
| Design reference | **Figma** (optional) | Sketch screens before building so Claude Code has a visual target |
| Coding | **Claude Code** | Writes and iterates on the actual app code |

---

## 3. High-Level Flow (Build → Deploy)

```
[Design screens] → [Build with Claude Code against Supabase]
        ↓
[Auth + Database schema live on Supabase]
        ↓
[Athlete & Coach screens built + wired to data]
        ↓
[Razorpay checkout + webhook wired to Supabase Edge Function]
        ↓
[Internal testing via Expo Go — real athletes, real coach]
        ↓
[EAS Build → production iOS/Android binaries]
        ↓
[App Store + Play Store submission]
        ↓
[Live app] → [3-month bug-fix window] → [Phase 2 features]
```

---

## 4. Screen-by-Screen Design Ideas

Pulled from patterns in well-known training/coaching apps (Strong, Hevy, TrueCoach, Trainerize, JuggernautAI, Whoop, Fitbod) — adapted to RAW@'s style, not copied.

### Athlete App

1. **Onboarding & Intake** — *inspired by Whoop/Future's guided setup.* Multi-step form with a progress bar, not one long page: lifts & PRs → injuries/recovery notes → equipment access → squat style. Feeds every program after.
2. **Home / Dashboard** — *inspired by Hevy/Strong.* Today's session front and center as a single tappable card ("Day 2 — Deadlift & Posterior Chain"), plus a streak indicator and this-week snapshot (sessions done / planned).
3. **Weekly Program View** — *inspired by TrueCoach/JuggernautAI.* Day tabs across the top (Day 1–5 + rest day), each exercise as a card: name, sets×reps, load, target RPE, tempo/technique note — matching the printed program format we already built.
4. **Active Workout / Logging Screen** — *inspired by Strong/Hevy.* Large tap targets for weight and reps, an RPE slider (not a text field), a rest timer, and a "last time" reference line so athletes see what they lifted the previous week at a glance.
5. **Exercise Library** — *inspired by Fitbod.* Searchable/filterable list (strength, cardio, mobility), each with a demo video thumbnail and cue text ("stay upright," "pause 2s off the floor").
6. **Progress & Analytics** — *inspired by Whoop/Strava.* Simple line chart of estimated 1RM over time per lift, plus a PR badge when a lift hits a new best.
7. **Membership & Payments** — *inspired by ClassPass/Mindbody.* Plan card with renewal date, payment history list, "Pay Now" via Razorpay checkout, and a clear failed-payment banner if one occurs.
8. **Profile & Settings** — account info, notification toggles, logout.

### Coach / Admin View (same app, role-gated)

1. **Coach Dashboard** — *inspired by Trainerize's coach app.* Athlete list with status chips: "Needs next week's program," "Payment overdue," "New PR this week."
2. **Program Builder** — *inspired by JuggernautAI/TrueCoach.* Pick an athlete → build the week day-by-day from the exercise library → "copy last week" button to speed up repeat structure → assign.
3. **Athlete Detail** — profile, current program, full workout history, coach notes.
4. **Payments Overview** — transaction list, failed payments flagged in red, manual refund action.
5. **Exercise Library Management** — add/edit exercises and demo videos used across all programs.
6. **Reporting** — active members, this month's revenue, most-assigned lifts — kept simple, not a full BI dashboard.

---

## 5. Development Roadmap (Phased)

| Phase | Weeks | Focus |
|---|---|---|
| **0 — Setup** | Week 0 | Create accounts (Supabase, GitHub, Expo, Razorpay); scaffold the Expo app; draft the database schema |
| **1 — Core Build** | Weeks 1–4 | Auth + roles; athlete intake; program builder (coach) + weekly program view (athlete); workout logging; dashboard |
| **2 — Payments** | Weeks 5–6 | Razorpay checkout integration; webhook handling via Supabase Edge Function; membership plan screens |
| **3 — Testing & Polish** | Week 7 | Real-world testing via Expo Go with Rajat and a few athletes; fix rough edges, empty states, error handling |
| **4 — Store Submission** | Week 8 | EAS production builds; store listing assets (screenshots, description); submit to Apple + Google; handle first review cycle |
| **5 — Post-Launch** | Ongoing | 3-month bug-fix window (already budgeted); collect real feedback; scope Phase 2 |

This assumes focused part-time building alongside Claude Code — treat weeks as a guide, not a hard deadline.

---

## 6. End-to-End Build Checklist

1. **Accounts & repo** — Supabase project, GitHub repo, Expo account, Razorpay account (test mode keys first).
2. **Database schema** — tables for `users`, `athlete_profiles`, `programs`, `program_days`, `exercises`, `workout_logs`, `plans`, `payments`.
3. **Auth** — signup/login, role field (athlete vs coach) controlling navigation.
4. **Navigation shell** — role-based tab layout, built once, reused everywhere.
5. **Screens, in build order**: intake → coach program builder → athlete program view → workout logging → dashboard → payments → reporting.
6. **Razorpay** — start in test mode, verify webhook signature server-side before trusting any payment event.
7. **Internal testing** — Expo Go on real phones (Rajat + 2–3 athletes) before spending anything on store accounts.
8. **Production build & submit** — EAS Build, then Apple Developer Program + Google Play Console registration, then submission.
9. **Go live** — monitor Supabase logs and Razorpay dashboard for the first two weeks closely.

---

## 7. Definition of "Done" Per Phase

- **Phase 1 done when:** a coach can build a week's program and an athlete can see it and log a full workout.
- **Phase 2 done when:** an athlete can pay for a plan end-to-end and the coach sees it reflected instantly.
- **Phase 3 done when:** a real athlete has completed one full week in the app with no blocking bugs.
- **Phase 4 done when:** the app is live and installable from both stores.

---

## 8. Explicitly Out of Scope (For Now)

- Form-check video upload/review loop — removed from this build per earlier decision.
- Separate web-based admin dashboard — deferred; coach view lives inside the same app.
- Push notifications, full staff-role permissions, advanced reporting — Phase 2/later, once real usage tells us what's actually needed.

---

## 9. Next Decision Point

Once this roadmap is agreed, the next concrete step is Phase 0: standing up the Supabase project and the Expo scaffold, and drafting the exact database schema together.
