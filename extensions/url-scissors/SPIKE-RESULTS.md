# URL Scissors — Step 0 Spike Results

Date: 2026-11-04 · Chrome for Testing 153.0.8010.12 · Linux container, `--headless=new`
Harness: `spike/run-spike.js` (0-2/0-3), `spike/run-b.js` (0-1 with controls), `spike/run-a2.js` (0-2 decomposition)

---

## 0-1 — Does the popup survive `chrome.tabs.update()`?

### Verdict: **SURVIVES** (with validated instrument, headless caveat below)

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

### ⚠️ Caveat that must be closed on real hardware

`--headless=new` has no real window-focus semantics. Direct evidence: focusing another
window did **not** dismiss the popup, which on a desktop it would. Focus moving to the
navigating web contents is exactly the mechanism most likely to close a popup for real.

So this result proves **nothing in Chrome's navigation machinery kills the popup**, but it
cannot rule out focus-driven dismissal on a desktop. → run `LOCAL-TEST.md` (2 minutes).

**Either way, the state-restore path is still built** — it is needed anyway for click-away,
Esc, and tab-switch-and-return.

---

## 0-3 — What does `chrome.tabs.query` cost, and is the `?u=` trick worth it?

| metric | pre-seeded `?u=` (sync render) | via `chrome.tabs.query` (await first) |
|---|---|---|
| `chrome.tabs.query` | 3.2ms p50 / 4.1ms p90 | 3.2ms p50 / 4.9ms p90 |
| doc start → rows painted | **46.6ms p50** | **45.9ms p50** |
| first-contentful-paint | 40ms p50 | 32ms p50 |

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

| page | doc start → painted (p50) | our marginal cost |
|---|---|---|
| `blank.html` — floor | 46.5ms | — |
| `popup.html`, 0 params | 46.8ms | **~0.3ms** |
| `popup.html`, 7 params | 47.5ms | **~1.0ms** |
| `popup.html`, 40 params | 48.9ms | **~2.4ms** |

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
