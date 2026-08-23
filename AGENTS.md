# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable product direction

Side A is evolving from a lyric-led player into a web-based pocket mixing console. The core promise is to let a person import music, speech, or a field recording and turn it into manipulable material through small, tactile modules. Preserve the reference language of black instrument panels, sparse technical readouts, waveform/meter feedback, and red/blue/gold/cream signal accents, but do not clone Teenage Engineering logos, proprietary layouts, or exact product identity.

The first strategy is a pleasure-first narrow wedge: one source, one shared timeline, a playful segment-capture gesture, and a rendered export that turns the interaction into a takeable artifact. Time, loop, tone, and mix gestures should make re-listening feel like playing an instrument. Optimize for a non-expert's delight and comprehension, not professional production throughput. Treat the eight behavior families in `mixer-console-execution-book.md` as the exploration map; do not build a full DAW until the first tactile loop and export ceremony prove useful.

### Current visual decision — Side Cartridge adaptation

The selected front-interface direction is the upper-right “Side Cartridge” concept: a wide black instrument enclosure with the primary screen on the left and a dedicated control/telemetry module on the right. Adapt this language to the existing Side A product rather than replacing its geometry or interaction flow. Keep the top-loading cassette composition, but use near-black grid surfaces, dark metal framing, warm cream waveform/readouts, and restrained orange, cobalt, and ochre signal accents. The lower front control bay remains part of the product; it should read as hardware controls, not a generic button dashboard.

The current audio test pass uses one local CC0 source (`Freeflow`) embedded in
the active cassette metadata. The front interface follows the reference
distribution: shared waveform/timeline on the left, signal/speed telemetry on
the right, and tactile transport/capture/loop controls below. This is a narrow
test loop, not the final mixer information architecture.

The front-stage product shell intentionally has a layered appearance, but the
front shell is the authoritative occluder: it must cover the rear transition
face at the front view. The wood stand attaches beneath that foremost shell,
not beneath the dark interface panel or the rear camera geometry.

### Current cassette interaction correction — v0.3

The Eject control is a physical control on the machine body, not a floating
stage affordance. The cassette hold state uses a cream-white/cobalt outline
around the cassette body only; its drop shadow is an isolated render layer and
must never be included in the focus/hold ring. The three source cassettes keep
the same mechanical footprint and receiver-hole geometry but use restrained
`ribbed`, `signal`, and `paper` anatomy so they remain distinguishable.

When one cassette is selected, the other two exit downwards from their HOME
positions. When Eject is triggered, those same two cassettes return from below
and travel upwards into HOME without a scale pop. Preserve pointer-capture
dragging, hole-to-receiver lock, lid/jaw order, and top-to-front continuity.

### Rendering boundary correction — v0.4

The coral grid background has one owner: `.graphic-stage` CSS. Do not redraw
the stage canvas or grid inside the SVG; the SVG remains transparent so the
product, cassette, and surrounding background share one continuous coordinate
space. The SVG may paint beyond the product frame for cassette exit/shadow
continuity; the document viewport is the final crop boundary, not the machine
frame.

### Next approved audio milestone — three-cassette library

The next staged milestone is governed by `THREE_CASSETTE_AUDIO_EXECUTION_BOOK.md`.
The fixed cassette/source mapping is: `ember` → Chill Lofi Inspired, `blue` →
Night Soul, and `cream` → Cathedral Dust. Built-in tracks must use stable
same-origin assets and keep their source/license metadata beside the library.
`CAPTURE` means mark-in / mark-out of the active track in this milestone, not
microphone recording. The active route has no functional pad/sequencer, so an
inactive decorative pad bank must not be presented as working functionality.

Landing guidance is a text-free upward arrow group between the source cassettes
and receiving bay. Eject must be a physical control integrated into the front
machine anatomy. Source-return motion must interpolate from immutable origins,
match the perceived pace of source exit, and arrive at exact HOME geometry
before the phase changes; do not use `restoreTapes()` as an end-of-animation
visual reset.

### Front seam token system — v1.1

The front reference panel now has a semantic seam hierarchy. Use these tokens
instead of inventing a raw border color in a new front component:

- `--front-seam-strong`: the precise mechanical lock/seam, currently Play Dial.
- `--front-seam-control`: the edge of a physical control, currently Loop/Capture and related hardware edges.
- `--front-seam-soft`: the warm-gray product shell and fascia boundary.
- `--front-seam-screen`: the boundary of the recessed dark screen module.
- `--front-seam-divider`: a low-contrast layout hairline only.

Do not globally darken all seams, use `seam-strong` for chassis borders, or use
seam tokens for indicators, engraving, focus rings, accents, or shadows. The
compatibility aliases in `src/front-reference.css` remain valid, but new code
should call the semantic `--front-seam-*` names directly. The source of truth
and acceptance gates are in `FRONT_SEAM_TOKEN_SYSTEM_EXECUTION_BOOK.md`.

## Canonical execution authority

`SIDE_A_RULEBOOK.md` v2 is the canonical design and interaction authority for the cassette/player shell and the future audio playground. Read it before making visual or motion changes. It separates product invariants from renderer-specific implementation, defines world/interaction/screen spaces, and provides measurable geometry, state, motion, audio, and verification contracts. In conflicts, the Rulebook takes precedence over historical `motion-handoff.md`, screenshots, prior implementation details, and unpromoted experiments.

Current implementation status is explicit: `src/App.jsx` mounts `GraphicDeckStage`, while `src/deck3d` is a candidate model and is not active. Do not silently switch the entry point. Before promoting the candidate, reconcile its cassette/receiver anchor mismatch and its slide-lid comments versus hinge-rotation implementation, then pass the Rulebook gates.

The non-negotiable physical sequence is:

```text
three source cassettes
  → hover opens top-loading lid
  → release inside bay
  → magnetic hole-to-receiver alignment
  → short jaw lock
  → lift-slide lid closes above cassette
  → closed hold
  → front-view transition
```

Never use a fade, scale jump, or hidden element to stand in for a missing physical state. Fix the render order, clipping boundary, shared state, or camera continuity first.

## Phase 9 input QA correction — 2026-08-20

- At the time of this Phase 9 QA pass, the active `/?front=reference` route passed mouse cassette insertion for all three source mappings: `ember` → `can-be-so-beautiful`, `blue` → `night-soul`, and `cream` → `cathedral-dust`. Cassette 01 was later replaced by the duration-gated `chill-lofi-inspired-loop` asset; re-run the live browser insertion check after that replacement.
- Native range inputs in `src/components/front/ReferenceFrontConsole.jsx` use `onChange` plus an explicit Home/End/Arrow keyboard contract. This corrected the semantic input path without changing the reference visual geometry.
- Semantic buttons explicitly activate on Enter/Space. The keyboard Eject path now reaches `ejecting → standby`, clears the active source, and restores the three-cassette state.
- Motion observability attributes are read-only QA instrumentation: `data-view`, `data-bay-open`, `data-embed`, `data-lock`, and per-tape `data-tape-x/y/rotation/scale/visible`. They are not a second animation state.
- The in-app browser pointer driver hit-tested native range surfaces but did not surface value mutation for transparent range dragging. Cassette pointer dragging and native range keyboard/value paths passed. Repeat native range dragging on a physical mouse/touch device before production handoff; do not treat this harness limitation as a known product-state failure.

## Current product workflow correction — v0.5

The current milestone is a fixed three-cassette experience, not a user-upload flow. Each of the three physical cassettes carries its mapped built-in source. A valid cassette insertion creates an autoplay intent; when the shared machine reaches `FRONT_READY` and the source is ready, the product attempts to begin playback. Browser playback rejection must fall back honestly to a ready paused state with Play available—never fake RUN, meter, reel or playhead activity.

The authoritative editing sequence is now `Cue Needle → Loop Region → Effects → Capture → Export`. Cue Needle and Loop handles own source selection. `CAPTURE` no longer creates mark-in / mark-out points; it commits the already valid active Loop together with an immutable processing snapshot. Export is promoted from a deferred idea to a required takeable WAV artifact.

The v0.7 front action row is `PLAY/PAUSE`, `CAPTURE`. Cassette loading is completed by the existing select/drag-to-bay flow; there is no `INJECT` action or button. `LOOP` remains a parameter-zone function, and `STOP` no longer occupies a dedicated main key. `EJECT` remains the separate physical machine control for unloading, not a duplicate transport key. Export must use a distinct right-side material/output slot rather than another generic button.

Execute future work from `SIDE_A_TASK_EXECUTION_BOOK_V0_7.md`, exactly one Task per run. v0.5 remains historical context; v0.6 remains the inherited baseline, while v0.7 overrides only the action architecture, control-input, engraved-surface, audio-duration, and reference-audit rules explicitly marked in that file. Do not begin the next Task until the current Task's gate passes and its evidence handoff is complete.

## Volume control correction — v0.8

- The volume capsule remains a compact visual control with a separate accessible hit area.
- Its left engraved mark is a small minus sign for lower volume; its right engraved mark is a small plus sign for higher volume.
- Both marks use the same restrained beige-gray recessed treatment and must leave visible breathing room inside their discs.
- Do not use speaker-wave glyphs inside this capsule; the control's low/high meaning is carried by minus/plus.

## Volume capsule containment correction — v0.9

- The capsule must fully contain both icon discs; the discs may not visually hang over the capsule edge.
- Keep the discs only slightly smaller (`r = 8.5` in design space) and extend the capsule to `68` design units so the control still feels substantial.
- The low-volume minus uses a longer, heavier engraved stroke than the plus so it remains legible at the product scale, but both marks share the same deep beige-gray engraving color.

## Loop / Capture reference correction — v1.0

- Loop and Capture now have a shared target: small circular hardware toggle keys, not the existing square transport-key shell.
- Their visible diameter is locked to approximately 60% of the Play Dial visual diameter; with the current `92` design-unit Play Dial, the execution target is `56` design units.
- Their visible bottom edges align with the Play Dial bottom edge; do not center-align them by reusing the Play y-coordinate.
- Both keys have the same anatomy: restrained contact shadow / dark sidewall, warm off-white circular face, replaceable center icon slot, and a small indicator above the face.
- OFF uses a neutral gray indicator; ON uses the existing signal orange. Active state must not change the key's geometry or position.
- Do not render visible `LOOP` or `CAPTURE` labels; preserve their meaning through the icon slot and semantic `aria-label` / `aria-pressed` contract.
- The two keys share one reusable component shell but keep separate real state owners: `repeat` for Loop and capture state for Capture. Eject and Play Dial remain separate controls.
- Execute from `LOOP_CAPTURE_REFERENCE_EXECUTION_BOOK.md` one task at a time. Do not replace the icons until this shell passes its geometry and state gates.

### Loop / Capture embossed icon correction — v1.1

- Loop and Capture share the same inset-engraving treatment: the mark is cut into the warm cream face and must not carry an external drop shadow.
- Loop keeps its circular arrows; Capture uses a restrained inset circular mark as the record/capture symbol. The orange indicator above the key remains the state signal.
- The icon treatment is shared, but the state owners remain separate: Loop toggles repeat playback; Capture commits an already-marked region and is not a record on/off switch.

## Top-surface industrial detail correction — v1.2

- The top brand recess carries the complete lowercase signature `spool.`; `SPO` is not a valid abbreviation. The visible mark uses a connected handwritten/sign-painter treatment derived from the supplied brand reference, with a warm-gray engraved finish rather than a generic printed UI font.
- Top-surface fasteners are recessed hardware anchored wholly inside the inset panel. No screw may sit on, interrupt or overlap a chassis seam.
- Every top boundary has one owner: one outer silhouette, one inset-panel seam and one lid seam. Do not create depth with translated duplicate outlines. In the closed state, the lid must physically occlude the bay rim before drawing its own visible seam.
- Execute and verify these constraints from `TOP_SURFACE_BRAND_FASTENER_SEAM_EXECUTION_BOOK.md` without changing the top footprint, cassette bay, lid motion or camera transition.

### Eject reference key correction — v1.0

- The front EJECT control follows `EJECT_REFERENCE_EXECUTION_BOOK.md`: reuse the A/B/Q small-key material language and restrained shadow, replace the circle with a vertical 2:3 rounded rectangle, and center the inset eject mark. Keep the control simple; do not reintroduce a layered rocker anatomy.
- Do not add a separate LED dot, visible EJECT label, sticker-like icon, or a new large shadow to this control. Reuse only the existing `reference-front-toggle-shadow` used by A/B/Q, with the same restrained scale.
- Pointer/keyboard press feedback keeps the simple rectangle intact and gives only the centered emboss mark a restrained upward response; the real `machine.eject` intent and cassette lifecycle remain the existing owners.

### Front screen hierarchy correction — v1.0

- The waveform header is one alignment system: take number, track title, A/B cue legend, and `STEREO` share one baseline. Do not position the A/B legend as a separate floating row above the header.
- The right screen rail uses its full effective column: status rows keep a stable left label and expose real state/readout values at the right edge; shuttle marks span the rail instead of clustering on the left and leaving an accidental empty half.
- Screen reel playback keeps the white reel disc and center hub static. Only the internal needle path may rotate clockwise from the black center pivot, and it must inherit the existing real `playing` state and reduced-motion contract.

### Industrial shell surface exploration — v0.1

- The current front interface, control positions, chassis ratio, top-loading bay dimensions, and cassette/lid motion are frozen during industrial-surface exploration.
- The Macintosh references are material and industrial-detail anchors only: warm ivory molded plastic, fine grain, restrained bevels, functional vents, recessed apertures, aligned fasteners, and an embedded plaque. Do not copy Apple/Macintosh identity, logos, wordmarks, silhouette, or exact vent layout.
- Explore two surfaces only: the front outer shell and the top/lid surface around the loading bay. Keep the bay cavity, receiver holes, lid seam, lift-slide path, and front interface unobstructed.
- Every new hole, slot, seam, fastener, or plaque needs a physical role and a stable spacing rhythm. Decorative random noise is not an approved direction.
- This phase is image-only until the user selects a visual direction. Do not modify `src/` from the PNG exploration alone. The execution authority is `INDUSTRIAL_SHELL_SURFACE_EXPLORATION_EXECUTION_BOOK.md`.
- After the paired closed/open PNG direction is explicitly approved, bridge those surface details into production code using `INDUSTRIAL_SHELL_IMAGE_TO_CODE_PRODUCTION_EXECUTION_BOOK.md`; its Task 00 gate must pass before any `src/` implementation begins.

### Industrial shell top-view correction — v0.2

- The latest top-view work is a surgical refinement of the user's two keyframes, not a redesign. Use the user's closed-lid and open-lid images as the source of truth.
- Both outputs must be true orthographic top views: no visible side face, front face, chassis thickness, perspective convergence, or stand. Show only the top plane and the two lid states.
- Closed and open states must preserve the same lid shape, bay, cavity, cassette/receiver geometry, orange edge logic, chassis ratio, and coral grid. Change only the lid state plus restrained industrial surface details.
- Allowed additions are sparse and functional: low-contrast vents or perforation rhythm, a few inset fasteners away from seams, one unbranded recessed plaque, shallow molded parting lines, fine molded-plastic grain, and restrained bevels.
- Any earlier exploration language that invited new front layouts, new product silhouettes, multiple views, or alternative machine structures is superseded for this top-view correction. Do not change `src/` until the paired closed/open PNGs are approved.

### Industrial shell top-surface implementation correction — v0.3

- The approved top-surface direction is implemented as a true orthographic state at `view=0`: chassis, inset panel, bay, and lid have parallel left/right edges and equal front/rear widths. Perspective convergence may begin only after the camera leaves the top view.
- Surface-local coordinates are image-oriented: `u=0` left, `u=1` right, `v=0` visual top/rear, and `v=1` visual bottom/front. The production quadrilateral point order must be adapted explicitly; never infer it from array indices.
- Fixed chassis details own the upper shoulder: two restrained inset fasteners, paired dark circular vent banks, and the recessed `SPO` plaque. These details do not move with the lid.
- The moving lid stays visually quiet and owns only its seam, restrained bevel/highlight, and molded-plastic grain. Do not place a chassis plaque, vent bank, or arbitrary decorative bars on the moving lid.
- Industrial detail hierarchy is functional voids first, seams/fasteners second, grain last. Vent cavities are darker than surface seams; grain remains low contrast and may not read as random dirt or a dotted UI pattern.
