# URL Scissors — Step 0 Spike Results

Date: 2026-11-04 · Chrome for Testing 153.0.8010.12
Environments: (1) `--headless=new`; (2) **headful on Xvfb :99 + openbox WM** — the
environment that actually exercises window focus, and therefore the one the 0-1
verdict rests on.
Harness: `spike/run-spike.js` `spike/run-a2.js` (tab-hosted), `spike/run-b.js`
(headless 0-1), **`spike/run-wm.js`** (headful 0-1 + real-popup perf),
**`spike/run-size.js`** (sizing).

> **Read this first.** The early runs used *tab-hosted* `popup.html`, not a real
> popup bubble. They were right about the conclusions but wrong about the surface.
> Every number that matters was re-measured in a **real popup** under a real WM;
> where the two disagree, the headful numbers win.

---

## 0-1 — Does the popup survive `chrome.tabs.update()`?

### Verdict: **SURVIVES** — settled under headful Chrome with a real window manager

Measured via a long-lived `chrome.runtime.connect()` port; the service worker's
`port.onDisconnect` is a reliable "this popup document died" signal.

| | result |
|---|---|
| Real popup opened | yes — `chrome.action.openPopup({windowId})` worked |
| Target tab | real `http://` tab, verified before seeding |
| Applied URL | `…/page?a=1&b=2&spike=applied` (genuinely different) |
| Navigation committed | yes — `tabs.onUpdated` fired, `tabs.get()` confirmed the new URL |
| **Popup disconnect across navigation** | **none** |
| Popup total lifetime | 5499ms — survived apply at ~619ms, died only when the next test case disturbed it |

### Instrument validity (this is why the verdict is trustworthy)

| control | expectation | result |
|---|---|---|
| C1: popup calls `window.close()` at 600ms | disconnect fires | **fires at 605ms** ✅ |
| T1 popup's eventual death | disconnect fires with `lastPhase=post-apply` | **fires, aliveMs=5499** ✅ |

Two things were learned the hard way and are baked into the harness:

- **Chrome refuses a second `openPopup()` while one is open** — it does not replace it.
  Every case must start from a dismissed state, or all later cases silently get 0 connects.
- `ctx.newPage()` lands in the *currently focused* window, so the trigger page must be
  created **before** the dedicated test window, and the target tab id passed explicitly.
  Otherwise the popup aims at the trigger page itself and the test measures nothing.

### Headful confirmation (this is what settles it)

`--headless=new` has no real window-focus semantics, so the headless result alone could
not rule out focus-driven dismissal. Re-run on **Xvfb + openbox**, with every action driven
from the service worker so no automation step could steal focus, and with each popup
carrying a unique `pid` so a disconnect attributes to a specific instance:

| | result |
|---|---|
| popup `p16` applied | `…&spike=applied` |
| navigation committed | yes (`tabs.onUpdated` + `tabs.get`) |
| **disconnect after navigation** | **none** |
| **GATE: switch tab in the same window** | **disconnect fires** — `msAfterApply=2857`, `lastPhase=post-apply`, same `pid` |

The gate is the point: the very same popup instance was demonstrably killable, was killed
by a tab switch, and was *not* killed by the navigation. Earlier headless runs failed this
gate (nothing dismissed the popup), which is why their verdict did not count.

Three traps the harness had to grow past, each of which had produced a false answer:

- **Chrome refuses a second `openPopup()` while one is open** — it does not replace it. Every
  case must start from a dismissed state or later cases silently record 0 connects.
- **`ctx.newPage()` lands in the currently focused window**, so a trigger page created after
  the target window became the active tab, and the popup aimed at the trigger page itself.
- **Under a real WM, any Playwright page interaction steals activation**, so
  `openPopup({windowId})` fails with *"Cannot show popup for an inactive window."*
  Driving everything from `sw.evaluate()` is the only sequence that holds.

**The state-restore path is still built regardless** — click-away, Esc and tab-switch all
destroy the popup (the gate above proves the tab-switch case directly).

---

## 0-3 — What does `chrome.tabs.query` cost, and is the `?u=` trick worth it?

Measured twice: tab-hosted first, then in a **real popup** (which is the number that counts).

**Real popup, headful + openbox, n=6:**

| variant | IPC before paint | doc start → rows painted |
|---|---|---|
| A — `tabs.query` + `windows.getCurrent` | 2.1ms p50 | **31.3ms p50** |
| C — zero IPC before paint (`?u=` + pre-seeded size) | 0 | **31.0ms p50** |

Tab-hosted (earlier, n=10): `tabs.query` 3.2ms p50; rows-painted 46.6 vs 45.9ms p50.

Both surfaces agree: removing **all** IPC from the critical path buys **~0.3ms**.

> One early real-popup sample showed `ipc 28.7ms` and briefly looked like it overturned
> this. Eight warm samples put it at 1.7–2.1ms p50 — that reading was the first cold open
> after extension load, not the steady state.

### Verdict: **drop the `?u=` trick. `activeTab` only, no `tabs` permission.**

- Rows-painted is **statistically indistinguishable** (46.6 vs 45.9 p50) — the trick buys ~3ms.
- FCP is *later* when pre-seeded, because more work happens before first paint; the query
  path paints an empty shell sooner and fills it after. Comparable metric is rows-painted.
- ~3ms is not worth the "Read your browsing history" install warning that `tabs` triggers,
  especially when the competitor advertises minimal permissions.

---

## 0-2 — Where does the open cost actually go?

`blank.html` (doctype + 2 CSS lines + a 6-line script) establishes the document-creation
and paint floor. Everything above it is ours. 20 iterations each.

| page (tab-hosted, n=20) | doc start → painted (p50) | our marginal cost |
|---|---|---|
| `blank.html` — floor | 46.5ms | — |
| `popup.html`, 0 params | 46.8ms | **~0.3ms** |
| `popup.html`, 7 params | 47.5ms | **~1.0ms** |
| `popup.html`, 40 params | 48.9ms | **~2.4ms** |

Real popup for comparison: doc start → rows painted **31.0–31.3ms p50** regardless of how
much IPC is removed, i.e. the same picture — a fixed floor we do not control, with our own
work lost in the noise.

### Verdict: **~98% of the open cost is renderer/document creation we cannot touch.**

Our entire CSS + JS + URL parse + DOM build for a typical URL is **~1ms of ~47ms**.
Scaling to 40 params adds only ~1.4ms more.

**This invalidates the premise of the original Phase A optimisation list.** The `< 10ms`
budget was already met ~10× over before any optimisation was applied. Further
micro-optimisation of the render path has no measurable payoff.

### What this means for the plan

| original plan item | revised status |
|---|---|
| zero framework, single file, no bundler | **keep** — free, and keeps the 1ms at 1ms. Not a win to chase further |
| inline critical CSS, no web fonts | **keep** — free hygiene |
| `<template>` cloning, `DocumentFragment`, event delegation | **keep** — free, and matters for the *interaction* path, not open cost |
| `contain: layout style`, `field-sizing: content` | **keep** — free, engine-side |
| `?u=` + `setPopup` pre-seed | **drop** — measured, not worth the permission |
| "compress our JS to shave open latency" | **abandon** — there is nothing left to shave |
| **perceived performance** (no white flash, no popup resize, focus ready to type, single-stage paint) | **promote to primary** — this is the only remaining lever |
| keeping the extension renderer process warm (offscreen doc) | **the only thing that could move the 46ms floor** — Web Store review risk, measure before considering |

---

## Caveats on all numbers

- Linux container, `--headless=new`, no GPU. **Absolute values are not desktop-representative.**
- Run A/A2 pages are **tab-hosted**, not real popup bubbles: they exclude Chrome's
  popup-window cost and include tab-creation cost. The *ratio* (ours ≈ 1ms vs floor ≈ 46ms)
  is the robust finding and is what drives the decisions above.
- The extension process was warm (service worker alive) in every iteration, so the floor
  is a warm-process figure. A genuinely cold first open will be higher.
- Steady-state interaction cost (keystroke → repaint, drag) was **not** measured — headless
  paint timing is not trustworthy for this. Needs a real device.

## Reproducing

```bash
cd extensions/url-scissors/spike
node run-spike.js      # 0-2 + 0-3, both render paths
node run-b.js          # 0-1 with negative controls
ITER=20 node run-a2.js # 0-2 decomposition against the blank floor
```

---

## Sizing behaviour (verified headful + openbox, `spike/run-size.js`)

Requirements: anchor under the toolbar button, inner scroll past the container height,
a minimum width/height, and never exceed the browser window beyond that minimum.

Implementation: `MIN 360×320`, preferred width 480, Chrome's hard cap 800×600, vertical
reserve 112px for toolbar + tabstrip. Computed from `chrome.windows.getCurrent()` **before
the first render**, so there is exactly one paint and no post-paint window resize.

| browser window | params | computed | popup box | behaviour |
|---|---|---|---|---|
| 1200×820 | 28 | w=480 maxh=600 | **480×600** | grows to the 600 cap, rows scroll |
| **900×430** | 28 | w=480 **maxh=320** | **480×320** | **clamped to the short window**, floored at MIN_H |
| 508×760 | 28 | w=480 maxh=600 | 480×600 | width still fits a narrow window |
| 1200×820 | **1** | w=480 maxh=600 | **480×320** | **minimum height enforced** |

All four fit inside their window. Screenshot `31-short-28.png` shows the clamped case:
popup anchored under the toolbar icon, only two rows visible with a scrollbar, header and
footer pinned, nothing spilling past the window edge.

The ~2ms the two pre-render IPC calls cost is affordable precisely because of the 0-2
finding — the open cost is ~31ms of which our work is noise, so paying 2ms to get the size
right on the first paint is strictly better than a visible resize afterwards.

## Not measured

- Steady-state interaction cost (keystroke → repaint). Headless/Xvfb paint timing without a
  GPU is not trustworthy for this; needs a real device. Covered in Step 4.
- Cold-process first open (no extension renderer at all). Every sample here had a warm
  extension process.
- Absolute values throughout are container figures; the **ratios** are the robust findings.
