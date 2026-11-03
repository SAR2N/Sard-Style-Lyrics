Sard Style Lyrics 0.2.2 update: the additional irregular dark patina is now clipped to lyric glyph ink only, with alpha strength reduced from 40% to 28%. The fullscreen patina rectangle is removed; background, vinyl and colored boxes are unaffected by this additional filter. Existing spray wear, vignette, subtle screen grain and animation remain. Browser checks verify glyph-only clipping and reduced opacity.

Sard Style Lyrics 0.2.2 update: additional transparent screen texture combines irregular seeded dark patches and fine grain, leaving clearer gaps across the screen. Existing subtle noise and vignette remain. Overlay opacity is 40% with a varying alpha mask; it does not intercept input. Browser integration verifies the new overlay and existing playback behavior.

Sard Style Lyrics 0.2.2 update: yellow rotating vinyl with readable track/artist label and a 64-spoke circular audio spectrum. The WASAPI stream feeds a volatile 64ms mono ring; Hann-windowed Goertzel analysis produces 32 logarithmic frequency bins (60Hz–7.6kHz), refreshed around 17 times per second and visually smoothed. No simulated spectrum and no audio saved. Stop/silence clears the ring. Validation: 49 frontend tests, native silence/tone-frequency tests, browser rotation/track-label/reactive-spectrum/pause checks.

Sard Style Lyrics 0.2.2 update: camera uses exact critically damped motion with gradual acceleration/deceleration and velocity preserved across fast lyric changes. Velocity-dependent blur is capped at 1.25px and clears completely at rest. Reduced-motion preferences disable movement and blur. Unit checks cover gentle startup, settling, retarget continuity and reduced motion; browser checks verify moving blur and sharp settled lyrics.

Sard Style Lyrics 0.2.2 update: technical timing/visualization/automatic labels removed from playback chrome, with only the version retained in the header. Title uses bold Sard, hollow white Style, and black Lyrics inside a yellow box. A black edge vignette and subtle 3.5% soft-light screen grain cover the display without intercepting pointer input. Existing lyric texture and animations remain.

Sard Style Lyrics 0.2.2 update: spray-residue texture replaces coarse plaster flakes. Fine seeded paint specks are modulated by a second low-frequency density layer, producing scattered droplets and irregular clusters on glyphs and colored boxes. Camera, phrase fades, timing and colors remain unchanged. Production build and browser integration verified.

Sard Style Lyrics 0.2.2 update: new coarse irregular plaster-wear texture replaces fine grain and applies to both glyphs and yellow/lime/red boxes. Featured glyphs are not filtered twice. Upcoming phrase fade-in is shortened to at most 0.65 seconds overall and 0.16 seconds per word; rapid immediate entrances remain.

Sard Style Lyrics 0.2.2 update: fixed procedural wall-wear texture adds black chips clipped to glyph ink, including outline strokes, while boxes remain clean. Lower-left upcoming placement is removed. Featured boxes use a seeded static per-phrase color: predominantly yellow, occasionally lime or red. Letters remain black. Existing camera and source-time fades remain.

Sard Style Lyrics 0.2.2 update: scene positions are frozen after placement, including previous and revealed next phrases; only the camera travels between them. Previous lyrics fade out over 2.2 seconds of playback. Next lyrics fade in word by word, completing by their timestamp. Rapid changes and occasional accents use immediate entrances. Fades follow pause and seek using source time. Black lettering and multicolor boxes remain.

Sard Style Lyrics 0.2.2 update: current, previous and revealed next phrases remain at full opacity and the same scale. Camera motion provides the transition without dimming or resizing phrases. Upward and upper-right upcoming directions are removed. Featured glyphs stay black; only their box and border cycle smoothly through yellow, red, lime, cyan, orange and violet. Two past phrases are retained.

Sard Style Lyrics 0.2.2 update: six seeded camera directions including up, upper-right and lower-left. Placement chooses free viewport space without phrase overlap. Letters drop individually with a small landing bounce when a phrase appears. Camera easing is slower and continuous; featured letters cycle through dark RGB hues inside the fixed yellow box. Reduced-motion preferences disable drop/color animation.

Sard Style Lyrics: continuous camera easing; tightly packed seeded directions (right, down, diagonal); next phrase reveals 1.2 seconds before its timestamp. No slogan/start screen. Version remains 0.2.2.

# Sard Style Lyrics 0.2.2 — validation

In-place update: neighboring phrases are packed with a 6px gap measured from word bounds, stepping downward to the right. The camera follows both axes; previous phrases sit above-left and upcoming phrases below-right. Browser integration checks close ink spacing, diagonal placement and camera centering.

Previous styling: subtle circular charcoal-to-black gradient, thicker hollow white outlines (2–5px), and a persistent horizontal lyric scene. Camera movement eases continuously, including seeks, and reduced-motion preferences disable transitions. Browser checks verify preview placement, retained phrase nodes and final camera centering.

Previous styling: fixed full-phrase brightness, 64px base size, stronger alternating large/small neighbors (including consecutive short words), compact word padding/spaces and reduced row leading. All prior decorative choices remain.

Previous styling: fixed appearance without settings, side-by-side lyric panels with a moving camera, real layout compression for wide words, sparse hollow white outlines, and alternative-timing lookup excluding already tried timestamps. Existing static typography remains.

## Current behavior

The application starts listening on launch and automatically connects detected song metadata to LRCLIB lookup, parsing and playback-driven typography. The public demo, manual song search, lyric import and independent clock controls have been removed. The app follows the external player's timeline; when it is unavailable, synchronization waits rather than simulating progress.

## Passed checks

- TypeScript type checking, Vite production build and Windows Rust executable build.
- Native Windows launch, automatic WASAPI capture (without an explicit start command from the test), fullscreen entry/exit and absence of demo/manual-song controls. Captured a nonzero real output level.
- **49 core tests** for LRC/enhanced-word/Lyricsfile parsing, metadata normalization, matching, missing lyrics, offline cache, network retry/cancellation, playback drift/rate/pause/resume/seek/track change, approximation labels, deterministic motion, single-letter exclusion, reproducible decorative placement, sparse underlines, neighboring height variation and repeatable bold/italic choices.
- Automatic browser integration: opening the app starts capture, retrieves lyrics and renders without clicks; external pause/resume and seek update the lyric timeline; track changes retrieve new lyrics; stale lookups cannot replace a newer song; missing timelines hide the visualizer; temporary service failure recovers automatically; legacy settings are ignored; alternate lyrics can replace the current record and exhausted alternatives retain the current lyrics; no demo/manual flow is present.
- Real LRCLIB lookup using the screenshot metadata `Eminem - Lose Yourself / EminemMusic / 327 seconds`. The application normalized the metadata, fetched real timed lyrics and entered visualization automatically, with no start/search/demo click. Metadata was injected to reproduce the user's session; the HTTPS response was live and no third-party lyric text was saved as a sample.

The WASAPI service is unchanged from the hardware-tested implementation: its quiet-signal loopback test previously passed. Native automatic startup is checked separately by `scripts/smoke-native.mjs`, which does not invoke `start_capture` itself.

## Limits

The development execution environment returns access denied (0x80070005) for Windows Global System Media Transport Controls. Actual metadata access is therefore not claimed as verified there; the user demonstrated it in their ordinary desktop session. Player-to-player compatibility and physical output-device hot swaps still require hardware validation. Gateway recognition requires configuration and has no supplied credentials. Exact word alignment is not claimed for interpolated word timing.

The supplied portable app is an unsigned development executable with production frontend assets, not a signed release installer.

## Reproduce

```powershell
npm ci
npm test
npm run build
npm run test:ui
npm run tauri build -- --debug --no-bundle
node scripts/smoke-native.mjs
```

Current update: real Windows WASAPI loopback hardware test passed with generated quiet output after adding the frequency analyzer.

Vinyl and spectrum remain visible when playback chrome auto-hides; browser integration verifies this immersive behavior.
