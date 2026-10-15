# QueueCare — Live Clinic Queue Prototype

A working prototype of the hospital/clinic queue & appointment idea:
patients see their live position and wait time, and when a doctor runs
late or has an emergency, every waiting patient's estimate updates
automatically.

## What's built

- **Patient side** (`/patient`): login, book an appointment with any
  doctor, see live queue position + estimated wait time (auto-refreshes
  every 5s), view past visit history and prescriptions.
- **Clinic/doctor side** (`/clinic`): pick a doctor, see their waiting
  list, mark a patient "in consult" / "complete" / "no-show", flag a
  delay (custom minutes) or an emergency (+30 min default), leave a
  note for patients ("In surgery, back by 3pm"), and send a
  prescription/diagnosis that instantly appears in the patient's
  history.
- **Core logic** (`lib/queue.ts`): whenever a doctor's status changes
  or a patient's appointment advances, every waiting patient's
  estimated time is recalculated from the doctor's current delay +
  average consult time + queue position.

## Tech stack

- Next.js 16 (App Router, TypeScript, Tailwind)
- SQLite (better-sqlite3) — real database, file-based, no setup needed
- No external services — runs fully locally

## Running it

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:3000`. The database auto-seeds on first
load with 2 clinics, 3 doctors, and 4 demo patients.

**Demo patient logins** (password is `demo1234` for all):
- 9876500001 — Aadav Mehta
- 9876500002 — Nandini Gupta
- 9876500003 — Rakesh Verma
- 9876500004 — Priya Shah

For the clinic side, just go to `/clinic` and pick any doctor — no
login needed in this prototype.

## Try the live-update flow

1. Open `/patient`, log in as Aadav Mehta (9876500001), go to "My
   Queue" — note his estimated time.
2. In another tab/window, open `/clinic`, pick **Dr. Rohan
   Deshpande**, hit "Emergency (+30m)".
3. Go back to the patient tab (or wait 5s for auto-refresh) — the
   estimated time has jumped by 30 minutes and the doctor's status
   badge now shows "emergency" with the note.
4. Back on the clinic side, click "Call in" on the first waiting
   patient, then "Complete" — the queue advances and the next
   patient's wait time drops.

## What's a shortcut for this prototype (vs. production)

- **Auth** is plaintext phone+password matching, no sessions/JWTs —
  fine for a demo, not for real patient data.
- **No SMS/push notifications** — the "1 hour before" notify idea from
  the brainstorm would need a notification service (Twilio/FCM) wired
  to the recalculation logic; the recalculation itself is already
  here and ready to hook into one.
- **Single-day queues** — appointments are scoped to "today"; a real
  version would need multi-day scheduling.
- **No doctor auth** — anyone can open any doctor's dashboard at
  `/clinic/dashboard/[doctorId]`. Needs a login layer for real use.
- **File uploads** are schema-ready (`file_name`/`file_data` columns)
  but the UI doesn't yet have a file picker for prescriptions — only
  typed notes/diagnosis.

## Natural next steps

1. Add doctor login + multi-day scheduling if this is going further.
2. Wire SMS/WhatsApp notifications (Twilio or Gupshup, since you're
   already looking at WhatsApp automation for other projects) for the
   "notify 1 hour before" piece.
3. Add a super-admin view across clinics (the original idea had
   "see appointments across different places" — this prototype is
   single-tenant per clinic login, multi-tenant aggregation is the
   next layer).
