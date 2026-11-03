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

# Sard Style Lyrics 0.2.2

In-place update: neighboring phrases are packed with a 6px gap measured from word bounds, stepping downward to the right. The camera follows both axes; previous phrases sit above-left and upcoming phrases below-right. Browser integration checks close ink spacing, diagonal placement and camera centering.

Previous styling: subtle circular charcoal-to-black gradient, thicker hollow white outlines (2–5px), and a persistent horizontal lyric scene. Camera movement eases continuously, including seeks, and reduced-motion preferences disable transitions. Browser checks verify preview placement, retained phrase nodes and final camera centering.

Previous styling: all words are fully bright throughout the phrase, with no word-by-word lighting. The base size is 64px (previously 88px), neighboring words alternate strongly between large and small sizes, and word/row spacing is tighter. Single letters remain capped at the base size. Existing decorations are preserved.

Previous styling: wide words are horizontally condensed with smaller layout width; occasional words use hollow white outlines. Bold, italic, varied heights, fixed yellow highlights and sparse underlines remain. The active phrase is centered, the next phrase appears at its right, and previous phrases move left as the camera pans. Appearance is fixed and saved settings are ignored. The button «Οι στίχοι δεν συγχρονίζονται» tries distinct synchronized timestamps for the same song; if none remain, the current lyrics stay visible with a notice.

A Windows application with one automatic flow: **launch → detect the playing song → fetch synchronized lyrics → display live typography following the player's timeline**.

Listening starts automatically. The app follows pauses, resumes, seeks and song changes. There is no demo, song-search screen, manual lyric selection, audio import, or separate visualization clock in the application. Play music in your usual player and keep Sard Style Lyrics open.

## Run the portable build

Extract the Windows ZIP and run `Sard Style Lyrics.exe`. Keep `WebView2Loader.dll` in the same folder. Windows 10 1809+/11 and Microsoft Edge WebView2 Runtime are required; Node and Rust are not needed to run the executable. The header and window title identify **0.2.2**.

The app listens to the system output using WASAPI loopback; it never opens the microphone. No raw audio is saved by default. The optional recognition gateway described below only receives audio if explicitly configured.

Move the pointer to reveal controls. **F** toggles fullscreen; **Escape** exits fullscreen. **Pause listening** temporarily stops the app's capture/tracking; it does not pause your external music player. Launching the app again always starts listening automatically.

## Synchronization

Windows Global System Media Transport Controls supplies track metadata and playback position when the player supports it. A monotonic clock follows the source timeline between 500 ms polls. Pauses freeze the lyric clock, large seeks snap to the new position, and song changes cancel obsolete lyric requests. A missing/stale playback timeline hides the visualizer and shows a synchronization status rather than inventing a position.

The initial lyric source is LRCLIB. LRC line timing, enhanced LRC word tags, and Lyricsfile 1.0 word timing are supported. When only line timing is available, word emphasis is interpolated and visibly labeled **approximate word timing**. Source timestamps and player positions do not guarantee exact vocal alignment. The synchronization button searches alternative timestamped records.

YouTube titles such as `Eminem - Lose Yourself` with channel metadata `EminemMusic` are normalized when the artist prefix and channel name corroborate each other. Matching still checks artist, title and duration; live/remix qualifiers are preserved. The user's 5:27 example was verified against a real LRCLIB record.

Network failures retry automatically with server cooldowns. After unsuccessful transient retries, the app checks again automatically after at least a minute. Missing timed lyrics are checked again after five minutes; instrumental tracks are identified as having no lyrics. Successfully matched lyrics and metadata are cached locally (up to 100 entries, 30-day expiry). A new song is looked up immediately. Cached matches work offline.

## Fixed appearance

There is no settings interface. The default Windows output is followed automatically. Reduced-motion system preferences are respected.

## Develop and build

Install Node.js 22.12+ (24 LTS recommended), Rust stable with the Windows MSVC target, Visual Studio C++ Build Tools and a Windows SDK, and WebView2 Runtime. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
npm ci
npm run tauri dev
```

In the supplied workspace, `powershell -ExecutionPolicy Bypass -File .\Run-Desktop.ps1` can also use the downloaded portable toolchain in `../../work/toolchain`. A normal Rust/MSVC installation is sufficient outside this workspace.

```powershell
npm test
npm run build
npm run test:ui
npm run tauri build
```

`test:ui` uses Chrome and starts/closes its own production-preview server. It injects original test metadata and lyrics to verify the automatic application flow without accounts or music playback. These fixtures are test code, not a demo mode in the application. Set `KINETIC_TEST_BROWSER=msedge` for Edge. `node scripts/smoke-native.mjs` verifies native launch, **automatic** capture, absence of demo/manual screens, and fullscreen. It uses an isolated WebView2 profile and closes the processes it starts.

Release binaries and NSIS installers are produced under `src-tauri/target/release/` and `src-tauri/target/release/bundle/nsis/`. The supplied portable executable is an unsigned development build with an embedded production frontend. No signed release installer is included.

## Services and extension points

LRCLIB requests are sequential, spaced, time-limited and respect `Retry-After`. Set `VITE_LRCLIB_CONTACT` for browser builds and the native process variable `KINETIC_LRCLIB_CONTACT` to your real project homepage/contact before distribution. Defaults identify local development. See [LRCLIB API conditions](https://lrclib.net/docs). Retrieval does not grant public-display or redistribution rights.

If Windows metadata is unavailable, the optional JSON recognition gateway can participate in the same automatic flow. Set process variables **before launch**:

```powershell
$env:KINETIC_RECOGNITION_URL='https://your-gateway.example/recognize'
$env:KINETIC_RECOGNITION_TOKEN='your-secret'
npm run tauri dev
```

No gateway or credentials are supplied. HTTPS is required except `http://127.0.0.1:PORT`. When configured, the native adapter keeps a bounded 12-second mono 16 kHz float window in RAM and posts `{"sampleRate":16000,"channels":1,"samples":[...]}`. It accepts a response shaped as `{"track":{"id":"stable-id","title":"Song","artist":"Artist","album":null,"duration":200},"position":null,"confidence":0.9}`, or 204/404 for no match. A supplied position must refer to response-time playback and is labeled estimated. If the gateway supplies no position, the application waits for a usable timeline rather than starting a fabricated clock. Tokens remain in the native environment; never use a `VITE_` variable for secrets. Samples are cleared on stop/reconnection and are not written to disk.

## Architecture

| Component | Location |
| --- | --- |
| Automatic orchestration, source lifecycle and cancellation | `src/hooks/useLiveSession.ts` |
| WASAPI loopback worker, bounded window and meter | `src-tauri/src/audio.rs` |
| Windows media-session metadata/timeline | `src-tauri/src/media.rs` |
| Recognition gateway | `src-tauri/src/recognition.rs` |
| LRCLIB matching, retries and persistent cache | `src/services/lyrics.ts`, `src-tauri/src/lyrics.rs` |
| YouTube metadata normalization | `src/lyrics/metadata.ts` |
| LRC/Lyricsfile parsers | `src/lyrics/parser.ts`, `src/lyrics/record.ts` |
| Monotonic clock and deterministic motion | `src/engine/clock.ts`, `src/engine/motion.ts` |
| Animation-frame renderer | `src/Visualizer.tsx` |
| Settings/cache and typed native bridge | `src/services/storage.ts`, `src/services/native.ts` |

Animation frames update DOM styles without per-frame React rendering. Amplitude has a bounded secondary effect on scale. Real-time capture stays off the UI thread; only meter snapshots cross IPC. The 60 FPS target depends on hardware.

## Troubleshooting

- If the player shares no metadata or usable position, automatic synchronization cannot proceed. The app shows the missing source and keeps listening. Some players/tabs require media-session integration to be enabled.
- Windows returned media-session access denied (0x80070005) inside the development execution environment. Automatic metadata/timeline orchestration was verified with controlled session fixtures and live lyric responses; normal interactive desktop validation is required for each actual player. The user's desktop already demonstrated successful metadata detection.
- Protected/exclusive playback or audio on another output endpoint may produce silence. The output worker retries device faults. Silence alone does not pause a valid player timeline.
- Lyrics depend on database coverage and service availability. Missing timestamps are not silently converted into supposedly exact timing.
- Metadata can describe a different player than the system output mix. The app cannot prove that they are the same source, and fingerprint recognition alone does not guarantee a current playback position.
