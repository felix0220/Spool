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

### Cassette drag hit-target correction — v0.4

Every interactive cassette must include one transparent full-surface SVG hit
rectangle inside the cassette's idle-drift group. This hit surface is separate
from the visual artwork so image-only branches cannot become inert when their
child layers opt out of pointer events. It must inherit the cassette parent
transform, stay outside the reel-hole mask, be enabled only for interactive
cassettes, and leave the shared footprint and visual layers unchanged.

### Three cassette visual system — v1.0

- Treat the landing cassettes as one shared mechanical mother chassis with
  three manufacturing editions, never as one template recolored three times.
- The `280 × 156` footprint, reel centers at `±65`, transparent receiver holes
  at radius `20`, insertion edge, HOME geometry and all motion are immutable.
- `ribbed` uses broad warm molded ribs, `signal` uses a smoked cobalt signal
  window with coarse meter blocks, and `paper` uses opaque molded vertical
  relief. These structural differences must remain legible in grayscale.
- At the real landing scale, primary identity strokes are at least `3` design
  units and titles are at least `10` design units. Do not use tiny waveforms,
  micro-grids or ornamental microtext as the edition identity.
- Titles use the canonical audio-library `labelLines` inside a protected title
  field. Keep all identity detail clear of reel rings and receiver holes.
- Execute and verify these rules from
  `THREE_CASSETTE_VISUAL_SYSTEM_EXECUTION_BOOK.md` without changing the bay,
  lid, jaws, camera, front interface or cassette lifecycle.

### First-cassette depth refinement — v1.1

- The v1.0 optical minimums are guardrails, not target weights. Do not make
  every title, frame and feature maximally bold merely because it survives at
  the landing scale.
- Refine one cassette at a time. The current pass changes only `ember`; the
  `blue` and `cream` cassette artwork stays frozen until Ember passes visual
  review.
- Ember adapts one transferable feature from the supplied cassette references:
  an asymmetrical wound-tape mass visible through a translucent tinted shell.
  It must read in five ordered layers: rear tape media, translucent shell,
  narrow index strip, reel/hole hardware, and restrained molded highlights.
- The track title is tertiary manufacturing information on the narrow index
  strip, never a central album-cover plaque. Large framing, broad decorative
  bars and arbitrary micro-graphics are not substitutes for physical depth.
- Internal depth uses low-contrast translucent surfaces and fine seams. Keep a
  strong line only where two mechanical parts actually meet. Preserve the
  shared footprint, receiver holes, insertion edge and all motion unchanged.
- Execute and verify this correction from
  `EMBER_CASSETTE_DEPTH_REFINEMENT_EXECUTION_BOOK.md` before applying the same
  method to another cassette.

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

### Top view corner-radius correction — v1.0

- The top projection carries the same rounded product language as the front view: the outer top shell and its inset panel/frame use shared rounded-quad geometry rather than sharp polygon corners.
- Corner ownership is limited to the product shell and inset frame. The bay opening, moving lid, brand wells, fasteners, and other pressed/embossed mechanical details retain their original hard geometry.

### Ember reference recreation — v1.1

- The selected Ember visual truth is the orange/amber transparent cassette reference: warm clear shell, deep-black internal reel media, orange reel hubs and lower guide knobs, a single narrow tape route through both lower guides, restrained segmented signal registration, and small `Chill Lo-fi` manufacturing information.
- Keep the shared 280 × 156 chassis, receiver holes, HOME geometry, and cassette interaction unchanged. Do not copy commercial branding, wording, or figurative artwork from any supplied cassette image.
- The cassette face must read as one transparent physical object. Use a small number of ordered SVG layers—media, tape route, lower mechanical panel, shell, seams, segmented signal/index marks, and hub hardware—rather than many decorative HTML details.
- The tape is a line, not a wide bridge. It must visibly route from the reels through the two lower guide knobs; the lower panel and shell texture remain restrained and material-bound.
- The visible Ember title is exactly `Chill Lo-fi`; do not reintroduce `SIDE A`, a second edition card, a broad signal bar or legacy printed-field copy.
- Execute and verify this direction from `EMBER_CASSETTE_REFERENCE_RECREATION_EXECUTION_BOOK.md` before applying any related visual method to another cassette.

### Ember Mechanical Index P0 correction — v1.2

- This correction supersedes the former compound-label direction. Ember must no longer use a full orange banner, central cream title card, `SIDE A` sticker, waveform sticker, `LOW SIGNAL`, or `WARM TAPE` microcopy.
- Protect the reel rings with a radius-`29` exclusion zone around `(-65, 0)` and `(65, 0)`. Protect the lower guides with a radius-`18` exclusion zone around `(-94, 49)` and `(94, 49)`. Printed information may not enter those zones.
- Upper signal registration is three short orange segments at `y=-48`, not a continuous bar. The lower manufacturing index is one translucent rail at `x=-70`, `y=40`, `width=140`, `height=13`; it sits between the guide safe zones and above the centre tape route.
- The only visible Ember copy is left-aligned `Chill Lo-fi` and right-aligned `01` on the shared index baseline. They are tertiary manufacturing information, never the main visual.
- Preserve the transparent amber shell, wound-tape media, routed tape line, reel/hole hardware, guide knobs, shared footprint, interaction lifecycle, and Blue/Cream artwork.
- Execute and verify this correction from `EMBER_CASSETTE_P0_GEOMETRY_EXECUTION_BOOK.md`. Typography personality is deferred until this geometry gate passes.

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

### Brand mark — v2.0

The v1.0 mark — an S formed from two tangent locating holes — is withdrawn. It
failed on three counts worth recording so they are not repeated: its round caps
were a `stroke-linecap` default rather than a decision, and their radius related
to nothing else in the product; the two-hole construction was invisible in the
result, so the concept lived only in prose; and its tile radius was 18% of the
form where every radius in this product is 1–2%.

The mark is a reel seen head-on. Two annular sectors carry the wound tape, and
the hub is an annulus — never a filled dot. A filled centre inside a ring reads
as a pupil inside an iris; the eye reading is a proportion problem, and the
product's hub is a hole (`reelHoleRadius: 20`), so the mark draws a hole.

```
field 100 × 100, centre (50, 50)
tape sectors   outer r46, inner r26, spans -38°..78° and 142°..258°
hub ring       outer r17, inner r8
terminals      cut along the radius — they aim at the centre, which no
               loading spinner ever does
```

Everything below r15 was removed rather than scaled, so the mark is already its
own small-size reduction. Do not add a third concentric register, drive teeth,
or radial ticks: at 32px they fill in, and evenly spaced radial lines read as a
sun regardless of intent.

Material is m1 — the coral canvas the machine already sits on, given a light
source. Cream tile, coral gradient `#FF7A50 → #F04B31 → #CE3413` on the 20/0 →
80/100 axis, an inner shadow offset 2.2 blurred 2.2 in `#3A1006` at .5, and a
specular sweep falling to zero at 46%. The icon tile radius is 23% — platform
convention for the place the icon lives, deliberately not product language. The
hard geometry stays inside the tile.

Below about 32px that material disappears: the cream tile has no edge against a
light tab bar and the gradient collapses. So the small sizes invert into the
same family — coral tile, cream mark, flat, no filters. This is one system at
two scales, not two marks.

Every asset is generated by `scripts/build-identity.py`, which is the single
source of truth for both the SVG and the PNG output. Change the geometry or the
palette there and re-run it; never hand-edit `public/favicon.svg`,
`public/icon.svg`, `public/mark.svg`, or the rasters, or the vector and raster
forms will drift apart.

### Brand badge on the shell — v1.0

The mark and the wordmark do not share a plaque. Each occupies its own pressed
well, the way a Macintosh badge separates the logo recess from the name recess.
This is structural, not stylistic: both wells are built from one `BADGE_V0` /
`BADGE_V1` pair, so their top and bottom edges are the same edges and the two
halves cannot drift apart vertically. An earlier attempt put both inside a
single plaque and centred each by hand; the mark rode visibly high, and no
amount of tuning fixed it because nothing held the two to a common line.

The wells are recesses and their contents are raised. Surface light comes from
the upper left throughout this file, so a well takes shadow `#8B8D86` on its
top and left inner walls and highlight `#F1EEE5` at .68 on its bottom and
right, while the mark and the lettering keep the raised treatment — a light rim
offset `(-0.45, -0.55) × depth` under a `#85877F` face. The mark carries no
colour of its own; it is the same stamping operation as the wordmark.

Layout lives in `src/components/industrial/brand-badge-geometry.js` and is
covered by `tests/brand-badge-layout.test.mjs`, which asserts that the wells
share a v-span, that both halves sit on `midV`, that the badge centres on
u = .5, that each half centres in its own well, and that the pressed path still
equals `public/mark.svg`. Do not move these numbers back into the renderer —
the test checks for that too.

### Ember sticker production lock — v1.0

- The selected Ember visual source is `design-reference-ember-stickers-position-v1.png`.
- Ember now uses the real transparent assets `public/assets/ember-stickers/chill-lofi-moon-star.png` and `public/assets/ember-stickers/northern-star.png` as fixed surface-sticker layers. Do not recreate these as HTML text or approximate CSS/SVG drawings.
- The Chill Lo-fi sticker keeps the approved wordmark and material treatment, with only two graphic-letter refinements: the leading `C` carries a subtle crescent-moon opening, and the final `i` dot is a small four-point star. Keep both changes subordinate to the wordmark; no extra celestial icons or copy.
- The old translucent lower title rail, old small `Chill Lo-fi`, `01`, `LOW SIGNAL`, and `WARM TAPE` copy are superseded and must not return.
- Sticker coordinates are cassette-local and immutable: `Chill Lo-fi` `x=-70, y=25, width=140, height=38.5`; northern star `x=-101, y=-39, width=20, height=20.43`.
- Stickers inherit the cassette's single parent transform and must never own an independent translate, rotate, scale, pointer handler, or drag state. Drag, insert, and eject move the complete cassette rigidly.
- The sticker layer sits above the decorative lower panel and below guide/reel hardware. Protect reel holes at radius `20` and lower guide holes at radius `18`; physical hardware must remain readable.
- Execute and verify this direction from `EMBER_CASSETTE_STICKER_PRODUCTION_EXECUTION_BOOK.md`.

### Ember surface completion lock — v1.0

- The selected surface-completion draft is now the Ember production direction:
  replace the middle orange registration segment with a shallow upper-center
  mechanical index plate, keep the left/right orange segments, add sparse
  alignment ticks, and add one restrained upper-right `01` badge. The badge is
  a real transparent PNG asset, not JSX `rect`/`path`/`text` geometry.
- Reduce Ember shell transparency from `.16` to `.20` opacity and add a warmer
  `.18` inner field so the stage grid is visibly subdued inside the cassette;
  keep the outer shell edge lighter.
- Keep all new geometry in `CASSETTE_VISUAL_TOKENS.emberReference` and inside
  `data-cassette-depth-layer="surface-completion"`. Do not restore the old lower
  mechanical index, title rail, or legacy manufacturing copy.
- Preserve the shared `280 × 156` footprint, sticker coordinates, reel/guide
  clearances, parent transform, cassette lifecycle, and Blue/Cream artwork.
- The `01` badge remains a fixed `18 × 26` transparent PNG, but its final
  cassette-local position is `x=93, y=-34`: below/right of the upper orange
  registration and clear of the white wave line. Do not move or resize the
  other Ember stickers or mechanical layers with this correction.
- Execute and verify this direction from
  `EMBER_CASSETTE_STICKER_PRODUCTION_EXECUTION_BOOK.md`.

### Cassette insert listening variation — v1.0

- Every successful cassette insertion generates a fresh Tone / Space / Texture preset when the cassette reaches the physical `INSERT_TIMING.lockEnd` boundary.
- The three values are integer percentages in the safe `8–92%` window and are pairwise distinct, so a new cassette never arrives with the same three-shape profile by accident.
- Tone reuses the existing `400–20,000 Hz` mapping; Space and Texture continue to bind to their existing normalized audio-processing parameters.
- Invalid drops and cancelled loading motions do not update the preset. Eject does not randomize by itself; the next successful insertion owns the change.
- Keep the generator in `src/music/tape-variation.js` and preserve the lifecycle seam tests in `tests/tape-variation.test.mjs`.

### Night Soul hybrid reference lock — v2.1

- The direct full-body PNG experiment is superseded. The execution authority is
  `NIGHT_SOUL_CASSETTE_HYBRID_EXECUTION_BOOK_V2_1.md`.
- Use the latest reference image selectively: clean transparent PNG assets may
  carry `NIGHT`, handwritten `soul`, `Lord`, `wait on you`, fog, and abrasion.
  Do not render the full cassette PNG as the signal body.
- Preserve the shared 280 × 156 chassis, reel centres ±65, receiver-hole
  radius 20, HOME geometry, insertion edge, pointer capture, and all cassette
  lifecycle motion. This remains a signal-branch artwork change only.
- Rebuild the upper field, non-uniform blue-to-transparent gradient, cobalt
  shell, mist, abrasion, lower tape route, guides, and centre lock as real
  cassette-local SVG/material layers.
- Rebuild signal reel/gear hardware at the existing receiver centres. It must
  remain rendered for signal, bind to loading/playing/paused/ejecting state, and
  never be hidden by `display="none"`.
- The real cassette hole and drag target own geometry and interaction. Decals
  inherit the parent transform and may not define their own pointer state.
- The ref-v2 title, mist, abrasion, and torn-strip assets live under
  `public/assets/night-soul/ref-v2/`; transparent pixels must be genuinely
  empty, and lower wear may not contain guide or centre-lock geometry.
- Ember and Cream stay frozen and outside this Night Soul hybrid pass.

### Night Soul visual audit correction — v2.2

This historical correction is superseded by the v2.3 audit contract below.

- Keep the `wait on you` strip below the reel-hole exclusion zone; it may cover
  lower shell components but must never
  override either true hole or its functional gear.
- The torn-strip extractor must remove source blue/reel fragments and leave a
  genuinely transparent, irregular edge. Do not reuse a crop that still reads
  as a screenshot fragment.
- `NIGHT`, `02`, `SIDE B`, and `STEREO` use one distressed warm-print asset
  treatment. Do not mix distressed PNG title lettering with clean SVG header
  typography on the same reference surface.
- Signal reel holes keep the real mask and stateful hardware, but the visible
  interior is intentionally simple: two opposing marks and a centre annulus;
  no cardinal tick cage or ornamental over-detail.

### Night Soul reference audit correction — v2.3

- Treat the A–F screenshot audit as the current visual acceptance contract:
  clear the lower arc residue, align the two lower guide holes, preserve their
  real functional geometry, and use one horizontal reference line only when a
  lower structural line is needed.
- Generate the centre window with a boolean mask: its dark side cutouts use
  the same outer radius as the signal reel ring, and the window keeps a 4px
  radius. Move the centre lock down so it has at least 12px of clean space
  below the upper field.
- Render the 02/STEREO capsules through one mirrored `SignalCounterCapsule`
  component. Their 1px header rules share one y baseline and leave the same
  optical gap around NIGHT; keep the capsules subdued gray-blue rather than
  pure white.
- Apply one fixed-size print distress mask to NIGHT, soul, 02, SIDE B and
  STEREO. The smaller text receives lower opacity, not a smaller grain size.
  Surface noise comes from one final global monochrome grain layer; remove
  branch-specific signal grain so the cassette reads as one printed object.
- Keep the torn strips selective and genuinely transparent. The lower-right
  strip may cover the lower shell and lower-right components, but its complete
  extracted artwork must remain inside the valid cassette-local footprint.
  Add a restrained y+2 / blur 4 / black 8% sticker shadow and keep the strips
  above reel and lower-mechanism layers so their alpha reveals the hardware
  underneath without cropping the strip.

### Night Soul edge containment and soft-focus correction — v2.4

- Torn stickers must remain fully inside the shared cassette outer silhouette;
  never solve overflow by letting a PNG paint beyond the cassette body. This
  v2.4 clipping/clearance treatment is superseded by v2.5: fit the complete
  strip through valid local geometry, then let its alpha cover components.
- The signal field and centre window keep the left-to-right blue direction,
  but their darkest value sits slightly inside the field rather than at a hard
  edge. Use a broad blurred radial transition at the perimeter and a restrained
  dark-centre soft-focus layer; do not flatten the material into a single
  linear gradient. v2.5 adds the dedicated `soft-focus-texture.png` material
  layer while keeping the gradient and blur as separate owners.
- Preserve the 280 × 156 footprint, true holes, functional reel hardware,
  cassette lifecycle, and the approved decal/material ownership while making
  this polish pass.

### Night Soul torn-strip and material-texture correction — v2.5

- The lower-right `wait on you` strip is a complete cassette-local decal at
  `y=28`. Keep its valid geometry inside the cassette footprint; do not crop,
  clearance-mask, or boolean-cut the strip against reel or guide openings.
- Render torn strips in a final top sticker layer above lower mechanics and
  reel hardware. Their extracted alpha plus restrained `.84` opacity lets the
  components beneath remain faintly visible while the strip still covers
  them as a physical translucent material.
- Keep the field's left-to-right blue gradient and soft-focus falloff, but add
  the real `soft-focus-texture.png` image layer to the field and centre window.
  The texture is material evidence; it does not replace the SVG gradient,
  structured blur, or final global grain.
- Preserve the 280 × 156 footprint, true holes, functional reel hardware,
  cassette lifecycle, and all unrelated cassette branches.

### Tone dial external-value feedback — v1.0

- The Tone progress arc is value-driven, not input-event-driven. A non-zero external Tone preset must show its orange progress immediately, including randomized cassette insertion values.
- Keep `data-value-feedback` as interaction observability only; it must not gate `data-progress-visible`.

### Cathedral Dust hybrid reference lock — v1.0

- The selected visual source is `/Users/fuyang/.codex/generated_images/01a01306-6710-7bf0-b2cb-79fc36ce1d69/exec-5c02149d-b766-4be0-9e8d-9eaae2a34451.png`, SHA-256 `c0a1bb096f555df3bc365014cf49186363752d063ffe2b36d58d847341b41ffe`. It replaces only the `cream` / former `paper` artwork mapped to `cathedral-dust`.
- Preserve the shared `280 × 156` chassis, reel centres at `±65`, true receiver-hole radius `20`, HOME geometry, pointer capture, bay alignment, lid/jaw/camera sequence, front state and eject lifecycle. Ember and Night Soul remain frozen.
- Use a hybrid renderer: transparent PNG assets own the warm ivory shell material, black wound media, pale aqua reel surfaces, handwritten `Cathedral Dust` engraving, lower clear mechanism, scratches and wear; SVG/code owns the silhouette, true holes, reel pivots and rotation, parent transform, interaction, masks, hold ring and separate shadow.
- Build a transparent `1120 × 624` production master before JSX integration. Reconcile the source/prototype ratio by content-aware horizontal material extension; never use runtime non-uniform stretching or `preserveAspectRatio="none"`.
- The upper-right shell carries the official SPOOL reel mark using exact geometry from `public/mark.svg`, adapted as a restrained same-material engraving. Do not ship the generated approximation, the `spool.` wordmark or a filled-centre substitute.
- All visual layers inherit one cassette parent transform. Texture, title, mark and wear may not own independent stage-space transforms, pointer handlers, visibility timing or lifecycle state.
- The former paper ribs, generic central title card, visible `03` and bottom decorative strip are superseded, but remove them only after the exact-ratio production master and Cathedral hybrid branch pass their gates.
- Execute one task at a time from `CATHEDRAL_DUST_CASSETTE_IMAGE_TO_CODE_PRODUCTION_EXECUTION_BOOK_V1.md`. Same-state visual comparison is required; passing tests cannot substitute for a visibly correct result.

### Cathedral Dust lower-right edition engraving — v1.2

- The latest Cathedral Dust refinement adds one small engraved `03` at the
  lower-right of the cassette face, matching the connected handwritten style
  and the same `cathedral-engraving-emboss` treatment used by `Cathedral Dust`.
- The number is a transparent raster asset at
  `public/assets/cathedral-dust/ref-v1/edition-03-engraving.png`; the browser
  must not depend on a locally installed handwriting font.
- Its cassette-local box is `x=101, y=22, width=28, height=16`. It remains
  inside the shared `280 × 156` body, outside the reel and lower-guide
  clearance zones, and inherits the single cassette parent transform.
- This latest request supersedes the earlier Cathedral rule that removed all
  visible `03` copy. Do not restore the old central title-card or decorative
  strip treatment; the lower-right engraving is the only permitted number.

### Night Soul sticker composition correction — v2.6

- The supplied Night/Soul sticker is the visual authority for this local logo
  replacement. Keep its architecture: one large fuzzy blue/ivory `Night`
  mark above, with a separate small dark slanted `Soul` patch at lower-left.
  Do not place `Soul` on top of, inside, or directly beneath the centre of
  `Night`.
- `Soul` must continue to use the existing handwritten asset at
  `public/assets/night-soul/ref-v2/soul-script.png`; only its label container
  and relative placement change. The label is a separate cassette-local
  surface, not a replacement font rendered as generic text.
- `Night` uses the generated `ref-v3/night-glow.png` asset. Its blue fog may
  remain soft and low-alpha, but the bright parts of the lettering must carry
  a visible warm-ivory negative form so the word remains legible against the
  cobalt signal cassette.
- Keep soft-focus as a local material atmosphere around the logo and existing
  signal field. Do not add a full rectangular blue plate, global blur, new
  sticker architecture, or changes to the cassette footprint, reels, holes,
  drag, insertion, eject, or animation lifecycle.

### Night Soul open layout exploration — v3.0

- This phase deliberately releases the former upper-centred title layout.
  `Night`, `Soul`, `02`, `SIDE B`, `STEREO`, negative space, light direction,
  and information rails may be recomposed after a generated direction is
  explicitly selected.
- The emotional target is a quiet midnight field opened by one electric-cobalt
  soft-focus light event: intimate, weightless, melancholic and releasing.
  Avoid generic cyberpunk neon, busy poster density and decorative microcopy.
- The immutable visual/physical anchors are the shared cassette silhouette,
  true receiver holes, reel centres and hardware, lower guides, centre lock,
  cassette lifecycle, plus the existing complete `Lord` and `wait on you`
  translucent torn stickers in their approved cassette-local positions.
- Torn stickers remain topmost surface layers and may reveal mechanics through
  alpha. They may not be cropped, rewritten or moved to solve a composition.
- Every candidate must remain image-to-code feasible: identity typography and
  torn strips may become transparent PNG decals; gradients, light fields,
  mist, contour texture and grain should retain separate SVG/material owners.
- The current ImageGen explorations are preview directions only: `Middle
  Signal`, `Quiet Offset`, and `Blue Column`. Do not modify `src/` or promote
  one as production truth until the user chooses an exact image.

### Night Soul Blue Column material-density correction — v3.1

- The selected exploration is `Blue Column`, but its central electric-blue
  light field must read as one damaged translucent blue adhesive-tape decal,
  not as a smooth rectangular gradient or a generic glow placed on the shell.
- Keep that strip in the safe central zone between the two fixed reels. Its
  material vocabulary is torn fibres, irregular missing bites, broken corners,
  wrinkles, trapped-air bubbles, glue bloom, rubbed ink, fine scratches,
  partial transparency and a restrained contact shadow. `Night` and `Soul`
  remain part of this central tape composition and stay clearly legible.
- Increase visual density through purposeful, code-rebuildable mechanical
  registration: inset rails, alignment ticks, paired capsule windows, molded
  ribs, recessed fasteners, bracket seams, interrupted rules and coarse signal
  blocks. Do not substitute arbitrary sci-fi microcopy or move the real holes.
- Maintain hybrid layer ownership. The damaged blue tape, title printing and
  the two existing torn stickers may be transparent PNG decals; the shell,
  true receiver holes, reel hardware, lower guides, centre lock, rails and
  seams remain SVG/code; fog, wear and global grain remain separate overlays.
- Preserve the shared cassette silhouette, fixed reel/hole geometry, complete
  topmost `Lord` and `wait on you` stickers, and the full interaction lifecycle.
  This remains an image-only visual anchor until explicitly approved; do not
  modify `src/` from the exploration alone.

### Night Soul Blue Reel production lock — v4.0

- The selected Night Soul visual source is
  `artifacts/night-soul/ref-v4/night-soul-blue-reel-selected.png`, SHA-256
  `726696f70fb812e472c8f17a3314044dfa69f1cb45716716f8a7ecd4a6f3eb66`.
  It promotes the transparent electric-blue shell, two oversized ivory reel
  faces, handwritten `Night` / `Soul`, upper-left `Lord` strip and lower-right
  `wait on you` strip from exploration into the next production direction.
- Execute this direction one Task at a time from
  `NIGHT_SOUL_BLUE_REEL_IMAGE_TO_CODE_EXECUTION_BOOK_V4.md`. Start with Task 00
  and record the dirty-worktree baseline before editing `src/` or generating
  runtime assets.
- Preserve the shared `280 × 156` cassette, reel centres at `±65`, true
  receiver-hole radius `20`, one parent transform, drag/insert/eject lifecycle,
  and the Ember/Cathedral branches. Reconcile the selected raster to these
  anchors; never non-uniformly stretch a full cassette image.
- Use a hybrid renderer. SVG/code owns shell geometry, real holes, oversized
  rotating reel faces, the three face apertures, lower mechanics, guides,
  centre lock, colour fields and motion. Pivot-local transparent PNGs own the
  irregular reel printing; transparent overlays own fog, wear and grain; the
  two complete torn strips remain topmost decals.
- The visible reel print is exactly `Night`, `Soul`, `02`, `SIDE B` and
  `STEREO`. Both handwritten titles are physically attached to their reel
  faces and rotate with them. No commercial branding, URLs or invented
  microcopy may enter the production branch.
