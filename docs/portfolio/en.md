# Flamme Rouge

**Live race control for road cycling.**

> Terminology note: the vehicle names used here — *lead car*, *closing car*,
> *broom wagon* — are the ones the product itself uses in English. Keep them
> consistent with the interface, not with a literal translation of the
> Portuguese.

---

## Short card

Race control system for road cycling. Every support vehicle becomes a point on
the map using the driver's own phone — no app to install, no hardware to buy.
The system measures the window between the lead car and the closing car as
observed time, computes distance **along the road** rather than as the crow
flies, and dispatches the right help by itself when someone raises an alert.

Next.js 15, TypeScript and Supabase. Six languages, 325 automated tests,
field-tested on a real race.

---

## Summary

A road race runs on the radio. Race control asks where the closing car is and
gets an estimate; the road is reopened on the strength of that estimate — along
with the closure window agreed with the traffic authority, met or missed.

Flamme Rouge replaces the estimate with a measurement. Each support vehicle gets
a 6-character code printed on the briefing sheet, with a QR code beside it. The
driver points the camera, and their phone becomes that vehicle's tracker — no
app store, no account, no hardware to buy, charge, hand out and collect at the
end of the day.

From there race control sees everything on one map: who is where, at which
kilometre of the race, how old each reading is, and how much time separates the
front of the convoy from the back.

---

## What it solves

### The lead ↔ closing car window stops being guesswork

The system records what time the lead car passed each point of the course. When
the closing car reaches km 42, the window is the difference between two observed
times — the same arithmetic as a timing split. When there is not enough history
yet, the screen says "projected" and gives the reason, instead of faking
precision.

### Distance along the road, not as the crow flies

On an out-and-back course, two vehicles can be tens of metres apart and tens of
kilometres away along the road, on opposite legs. A system comparing coordinates
sends the wrong vehicle. This one projects each position onto the indexed course
and compares along it — including the cost paid by a vehicle that has already
passed the point and has to turn back against the flow.

### An alert never fails in silence

A call for help jumps the queue ahead of any GPS point and is retried until the
server confirms it — even if that means a queue that will not empty. And the
right help is dispatched by category: a crash calls the ambulance, a mechanical
calls the mechanic, with explicit and recorded escalation when no vehicle of the
right speciality is available.

### It works with no signal

Nothing is sent before it is written to the device, and nothing leaves the queue
before the server confirms receipt. In a two-minute test with no coverage, the
stored points all arrived — complete, in order and without duplicates — as soon
as the signal returned.

### Six languages, a single link

The language is not in the URL — the device negotiates it. The same QR code
gives Portuguese to the Brazilian driver and German to the Austrian, with race
control managing nothing.

---

## Engineering decisions

**The dictionary is typed, so missing text does not compile.** All six languages
derive from the same type; a key missing in German breaks the build instead of
showing up as a raw string on an Austrian driver's screen on race day.

**A dispatch justification is stored in pieces.** It is written once, at the
moment of the decision, and read by up to three people in different languages —
race control, the dispatched driver, and whoever reviews the incident later.
Storing a finished sentence would be wrong for two of them, so the database
stores keys and numbers, and the sentence is assembled on read.

**Security by absence of policy.** Tables holding sensitive data — binding
attempts, contact requests — carry no RLS policy at all: Postgres denies by
default, and only the service role, which lives exclusively in server routes,
can see them.

**Degradation is designed, not accidental.** An unavailable map key falls back
to the default basemap on its own; a database outage does not become a locked
door on a form; a failed email does not reject a request already saved.

---

## Stack

**Next.js 15** (App Router, Server Components) · **TypeScript** · **Supabase**
(Postgres, Realtime, Auth, RLS) · **Vercel** · **MapLibre GL** with CARTO and
MapTiler · **Tailwind v4** · **Vitest**

| | |
|---|---|
| Code | ~35,300 lines across 143 files |
| Tests | 325 automated, 26 files |
| Database | 16 tables, 22 RLS policies, 17 functions and triggers, 12 migrations |
| Languages | 6, checked at compile time |
| Vehicle roles | 9 |

---

## Status

Technically in production, no paying customer yet. Field-tested on a real race
with two phones and three simultaneous roles — lead car, closing car and
ambulance — including a crash alert with confirmation and automatic dispatch.
