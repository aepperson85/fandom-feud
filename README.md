# Fandom Feud

Family Feud-style game show built for 2D Con, run entirely in the browser and synced live over Firebase. No installs, no laptop tethering required once it's set up — control it from a phone while it displays on any screen.

## Pages in this repo

| File | What it is | Where it's used |
|---|---|---|
| `control.html` | The control panel. Reveal answers, add strikes, award points, switch questions. Mobile-friendly. | Run this on your phone/laptop to actually operate the game. |
| `index.html` | Audience display, **centered layout** (question/answers centered, no reserved camera space). | Convention / any venue without a live camera overlay. |
| `display.html` | Audience display, **camera-space layout** (question/answers pushed to one side, left ~65% left empty for a live camera feed). | Mall of America setup, where a production team overlays a live camera feed via OBS. |
| `test.html` | Sandbox copy for trying changes safely before they go live in `index.html`/`display.html`. | Development only — not meant to be used at an event. |

All three display-type pages (`index.html`, `display.html`, `test.html`) read from the same Firebase project, and `control.html` writes to it. Any combination of these pages open on different devices will stay in sync in real time.

## Running an event

1. Load `control.html` on the device you'll operate from (phone works great).
2. Load whichever display page fits the venue on the screen/TV:
   - `index.html` for a plain centered display
   - `display.html` if there's a live camera feed being composited on top
3. Use the dropdown in the control panel to pick a question, hit Reveal on answers as teams guess, use Add Strike for wrong guesses, and Award to Team when a round ends.
4. "Reset All" clears scores/strikes/pot back to zero if you need a fresh start mid-event.

## Editing questions

The question editor (desktop view of `control.html` only — hidden on mobile to keep the phone view simple) lets you rewrite the current question and its answers. Format for answers is one per line: `Answer text, Points`.

## Background video

Both `index.html` and `display.html` use `MOA-Screens-Bottom-LoopVid.mp4` (must live in the repo root alongside the HTML files) as an animated background, with a still-frame fallback baked in if the video ever fails to load.

## Firebase

Game state (current question, scores, strikes, revealed answers) lives in a Firebase Realtime Database. The config is embedded directly in `control.html`, `index.html`, and `display.html` — no separate setup needed to run the game, only if you ever need to change which Firebase project it points to.
