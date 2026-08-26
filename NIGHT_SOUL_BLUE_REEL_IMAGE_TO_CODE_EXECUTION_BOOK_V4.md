# Night Soul Blue Reel — Image-to-Code Production Execution Book v4.0

Status: planning authority; implementation has not started  
Date: 2026-08-26  
Scope: replace only the `blue` / `signal` cassette artwork mapped to `night-soul`  
Method: functional SVG geometry + pivot-local transparent PNG print + full-canvas material overlays  
Execution rule: execute exactly one Task per run and stop at its gate

## 0. Decision statement

The selected Blue Reel image is now the visual source of truth for Night Soul.
The production result must reproduce its composition, density, material,
typography and hierarchy while remaining one real cassette object in the
existing SPOOL lifecycle.

The selected image is not a runtime body texture. A single flattened PNG would
bake in a coral background, false hole interiors, static reel faces and a body
ratio that conflicts with the shared cassette chassis. The implementation is a
hybrid reconstruction:

```text
selected visual identity
  + shared product geometry
  + real negative-space holes
  + stateful reel faces
  + selective transparent assets
  = Night Soul production cassette
```

This book supersedes `NIGHT_SOUL_CASSETTE_HYBRID_EXECUTION_BOOK_V2_1.md` for
the Night Soul visual branch. The v2.1 book remains historical implementation
evidence. `SIDE_A_RULEBOOK.md` continues to control shared geometry, state,
motion and verification.

## 1. Selected source of truth

Workspace copy:

```text
artifacts/night-soul/ref-v4/night-soul-blue-reel-selected.png
```

Original generated source:

```text
/Users/fuyang/.codex/generated_images/01a02cce-c220-7252-8270-afd1c8c4471d/exec-3e45d1f5-6c78-4f96-b058-102be38d1a37.png
```

Reference metadata:

```text
canvas: 1412 × 1114 px
blue-shell scan bounds: approximately (41, 92) → (1368, 956)
SHA-256: 726696f70fb812e472c8f17a3314044dfa69f1cb45716716f8a7ecd4a6f3eb66
```

Visible source features:

- saturated transparent cyan/cobalt shell with darker internal navy media;
- two oversized warm-ivory reel plates as the primary graphic mass;
- three broad rounded apertures in each reel plate;
- true open centre holes showing the coral stage beneath;
- handwritten `Night` and `Soul` printed directly on the two reel plates;
- `02`, `SIDE B` and `STEREO` integrated into the circular plate information;
- `Lord` on a complete translucent torn strip in the upper-left;
- `wait on you` on a complete translucent torn strip over the lower-right
  mechanism;
- red-orange lower guide rollers, clear lower mechanics, cobalt electric glow,
  fogged plastic, scratches and restrained surface grain.

The coral grid belongs to `.graphic-stage` CSS and is not part of any cassette
asset.

## 2. Authority and frozen scope

Read in this order before executing any Task:

1. `SIDE_A_RULEBOOK.md`
2. `AGENTS.md`
3. this execution book
4. the selected workspace reference
5. the live `GraphicDeckStage.jsx` signal branch and its tests

### Frozen product invariants

```text
cassette footprint: 280 × 156 design units
outer silhouette radius: 11
reel / receiver centres: (-65, 0), (65, 0)
true receiver-hole radius: 20
drag hit surface: full shared cassette surface
parent transform: one translate / rotate / scale / opacity owner
HOME geometry, bay, receivers, jaws, lid and camera: unchanged
blue → night-soul source mapping: unchanged
Ember and Cathedral Dust artwork: unchanged
```

The current worktree contains user changes, including changes in
`GraphicDeckStage.jsx`. Every implementation Task must inspect the live diff
before editing and preserve unrelated work.

### Frozen visual content

The only visible copy is:

```text
Night
Soul
02
SIDE B
STEREO
Lord
wait on you
```

No commercial branding, URLs, logos or invented microcopy may enter the
production branch.

### Non-goals

This pass does not change audio, controls, source selection, insertion timing,
camera choreography, stage background, Ember, Cathedral Dust or front-console
design. It does not promote `src/deck3d` or replace the active renderer.

## 3. Meaning of “complete recreation”

The selected raster and production chassis have different visible body ratios.
Literal non-uniform pixel matching would turn circular reels into ellipses and
break receiver alignment. Complete recreation therefore means complete visual
identity under the shared physical geometry.

All five dimensions must pass:

1. **Composition** — twin ivory plates dominate; shell and lower mechanism are
   supporting layers; stickers remain tertiary accents.
2. **Material** — the shell reads as thick transparent electric-blue
   polycarbonate, not a flat blue card.
3. **Mechanical truth** — holes are real negative space; reel faces rotate;
   lower mechanics remain functional-looking and aligned.
4. **Graphic fidelity** — the exact handwritten title relationship, circular
   information and torn strips remain recognisable at landing scale.
5. **Behavioral fidelity** — every layer follows the existing rigid cassette
   transform through hold, drag, insert, play, eject and HOME return.

Passing tests without passing the same-state visual comparison is incomplete.

## 4. Geometry reconciliation

Build a transparent `1120 × 624` production master at 4× runtime scale. The
master is a measurement and QA surface, not a runtime full-body image.

| Anchor | Runtime | 4× master | Owner |
| --- | ---: | ---: | --- |
| body | `280 × 156` | `1120 × 624` | `CASSETTE_SPEC` |
| body origin | `(-140, -78)` | `(0, 0)` | shared chassis |
| left reel centre | `(-65, 0)` | `(300, 312)` | `CASSETTE_SPEC` |
| right reel centre | `(65, 0)` | `(820, 312)` | `CASSETTE_SPEC` |
| receiver-hole radius | `20` | `80` | shared hole mask |
| reel-face target radius | `50` | `200` | Night Soul v4 token |
| left guide centre | `(-94, 49)` | `(184, 508)` | Night Soul v4 token |
| right guide centre | `(94, 49)` | `(936, 508)` | Night Soul v4 token |
| centre lock | `(0, 50)` | `(560, 512)` | Night Soul v4 token |

The reel face radius may move only within `49–51` after same-scale visual QA.
Reel centres and receiver-hole radius have zero tolerance.

Do not use runtime non-uniform scaling, `preserveAspectRatio="none"`, camera
crop or a changed cassette footprint to force the source ratio.

## 5. Layer ownership contract

| Visual layer | Production owner | Raster allowed | Gate |
| --- | --- | --- | --- |
| isolated shadow | existing SVG/filter layer | no | never enters hold ring |
| outer silhouette / shell thickness | SVG | no | exact `280 × 156`, radius 11 |
| electric cyan/cobalt transmission | SVG gradients and opacity | glow texture only | mechanics remain visible beneath |
| rear navy tape media | SVG circles/field | no | visible through plate apertures, absent from true holes |
| two large ivory reel faces | reusable SVG component | grain tile only | circles remain circular and pivot at `±65` |
| three plate apertures | SVG mask/path | no | identical geometry on both reels |
| centre holes | shared cassette mask | no | coral stage is truly visible |
| `Night` / `02` / `SIDE B` / ticks | left pivot-local PNG print | yes | rotates with left reel face |
| `Soul` / `STEREO` / ticks | right pivot-local PNG print | yes | rotates with right reel face |
| lower mechanism / arms / guides / lock | SVG | wear overlay only | no baked reference mechanics |
| `Lord` strip | existing clean transparent PNG | yes | top-left, complete, topmost, no hole collision |
| `wait on you` strip | existing clean transparent PNG | yes | lower-right, complete, topmost, no chassis overflow |
| shell fog / abrasion | full-master transparent PNG overlays | yes | alpha-only material evidence |
| electric soft-focus texture | transparent PNG + SVG blur | yes | no rectangular plate edge |
| final surface grain | one monochrome PNG tile | yes | one shared physical grain size |
| hit area / hold / lifecycle | existing state and SVG | no | no asset owns input or independent motion |

### Positive ownership rule

Code owns geometry, holes, pivots, motion and colour fields. Raster assets own
only irregular printed or material evidence that code cannot reproduce
faithfully. Every asset is pointer-disabled and inherits the single cassette
parent transform.

## 6. Runtime asset manifest

Create a new versioned directory:

```text
public/assets/night-soul/ref-v4/
```

Required new outputs:

| Asset | Canvas | Purpose |
| --- | ---: | --- |
| `manifest.json` | n/a | source hash, geometry, pivots, bounds, layer order |
| `left-reel-print.png` | `400 × 400` | `Night`, `02`, `SIDE B`, radial ticks; transparent ink only |
| `right-reel-print.png` | `400 × 400` | `Soul`, `STEREO`, radial ticks; transparent ink only |
| `reel-face-grain.png` | `128 × 128` | restrained ivory plate grain tile |
| `shell-fog-overlay.png` | `1120 × 624` | fogged-polycarbonate bloom; transparent background |
| `shell-edge-wear.png` | `1120 × 624` | edge scratches and pale abrasion only |
| `electric-glow-texture.png` | `1120 × 624` | irregular cobalt soft-focus energy; no hard rectangle |
| `surface-grain.png` | `64 × 64` | one monochrome global grain tile |

Reuse these clean assets without recropping unless visual QA proves a mismatch:

```text
public/assets/night-soul/ref-v2/lord-strip.png
public/assets/night-soul/ref-v2/wait-on-you-strip.png
public/assets/night-soul/ref-v2/print-distress-mask.png
```

Fully transparent pixels must be `(0, 0, 0, 0)`. No exported PNG may contain
coral stage pixels, full reel geometry, receiver-hole fills, neighbouring text
or hidden dark-blue rectangular residue.

## 7. Runtime anatomy and visual tokens

Add a versioned `blueReelReference` object under
`CASSETTE_VISUAL_TOKENS.signalReference`. Do not scatter values through JSX.

Initial measured targets:

```text
version: ref-v4
bodyClip: x -140, y -78, width 280, height 156, rx 11
reelFaceRadius: 50
reelHoleRadius: 20
reelPlateFill: #EEECE5
reelPlateInk: #123A80
rearMedia: #03122F
shellCyan: #00A9E8
shellCobalt: #0750C7
shellDeep: #04256F
shellOpacity: 0.76–0.84
guideCentres: (-94, 49), (94, 49)
guideOuterRadius: 13
centreLock: (0, 50), radius 7
```

Initial decal boxes, subject to Task 01 master confirmation:

```text
leftReelPrint:  x -115, y -50, width 100, height 100, pivot (-65, 0)
rightReelPrint: x 15,   y -50, width 100, height 100, pivot (65, 0)
lordStrip:      x -127, y -66, width 72, height 30
waitOnYouStrip: x 12,   y 37,  width 113, height 38
```

The complete sticker alpha must stay inside the body. The `Lord` strip may
overlap the upper-left edge of the left ivory face, as shown in the selected
image, but must remain clear of the true centre hole. The lower strip may cover
the lower-right mechanism; transparency must reveal that mechanism faintly.

## 8. Reel-face component contract

Create one reusable `NightSoulReelFace` component with left/right instances.
It owns:

```text
rear media reveal
→ ivory annular face
→ three identical rounded apertures
→ inner mechanical ring
→ pivot-local printed PNG
→ restrained face grain
```

The entire plate and its printed information rotate as one physical assembly.
The true hole remains a cut-out and never receives a fill. Preserve existing
state observability:

```text
data-cassette-functional-layer="functional-reel-hardware"
data-cassette-element="reel-gear"
data-reel-pivot="receiver-centre"
data-reel-motion="signal"
data-reel-state="idle|moving|playing"
```

State behavior:

| State | Result |
| --- | --- |
| HOME / paused | reference orientation is readable |
| drag / loading | existing `reelTurn` interpolation rotates the full face |
| playing | full face and its print rotate from real playing state |
| reduced motion | continuous animation stops; geometry stays correct |
| eject | existing reverse lifecycle remains visible |

The component may not own audio, a second timer or independent translation.

## 9. Canonical render stack

The Night Soul branch renders in this order:

```text
isolated cassette shadow
< rear navy media
< lower mechanical substrate
< cyan/cobalt translucent shell field
< electric glow and fog inside the shell
< molded shell seams / corners / fasteners
< left and right functional reel-face groups
< lower guide and centre-lock hardware
< shell wear overlays
< Lord and wait-on-you top stickers + restrained contact shadows
< one final global grain layer
< hold indicator when active
```

The shared receiver-hole mask applies to body/material layers. Reel faces use a
separate face mask that removes the true centre and three apertures. Top
stickers are positioned to fit; they are not clipped or boolean-cut to solve a
bad placement.

## 10. Deterministic asset pipeline

Create:

```text
scripts/build-night-soul-ref-v4-assets.py
```

The script must:

1. verify the selected source hash before extraction;
2. create the `1120 × 624` transparent production master coordinate system;
3. isolate the two dark-blue print systems from the ivory faces;
4. export pivot-local `400 × 400` print assets with a declared `(200, 200)`
   pivot;
5. generate or extract shell fog, edge wear, electric glow and grain as
   material-only alpha layers;
6. clear RGB values under zero alpha;
7. write `manifest.json` containing source metadata, runtime boxes, pivots,
   opacities and render order;
8. produce identical output hashes when rerun from the same source.

Asset review is performed on white, black, cobalt and coral checkerboards.
Hidden source rectangles, accidental plate fills and stage contamination are
P0 failures.

## 11. Execution tasks

### Task 00 — Baseline and authority lock

Objective: record the exact starting state before any source or asset change.

Actions:

1. Verify the workspace reference hash.
2. Inspect `git status --short` and the existing diff in
   `GraphicDeckStage.jsx` and `tests/cassette-visual-system.test.mjs`.
3. Capture the current blue cassette at `/?front=reference` in HOME, HOLD and
   FRONT_READY states.
4. Record current DOM layer order, cassette transform and reel-state metadata.
5. Confirm Ember and Cathedral Dust baselines.

Gate 00: source hash, dirty-worktree inventory, three Night Soul screenshots,
two unaffected-cassette screenshots and DOM evidence exist. No `src/` file has
changed.

### Task 01 — Production master and measured map

Objective: reconcile the selected raster with the immutable chassis.

Actions:

1. Create the transparent `1120 × 624` master grid.
2. Plot body bounds, reel centres, hole circles, face radius, lower guides and
   centre lock.
3. Place reference crops without non-uniform scaling.
4. Create a side-by-side source/master comparison and record every deliberate
   geometry adaptation.
5. Finalise decal boxes and plate aperture geometry.

Gate 01: all circles remain circular, reel/hole centres equal the shared
anchors, and the master visibly preserves the selected image's hierarchy.

### Task 02 — Clean asset build

Objective: create only the raster layers named in Section 6.

Actions:

1. Implement and run `build-night-soul-ref-v4-assets.py`.
2. Inspect each alpha edge and transparent RGB channel.
3. Preview pivot-local print assets around their declared pivots.
4. Verify material overlays contain no geometry or text.
5. Rerun and confirm deterministic hashes.

Gate 02: manifest and every required asset exist; no full-body runtime PNG is
created; all assets pass four-background transparency inspection.

### Task 03 — Versioned tokens and component shell

Objective: establish one code-owned contract before changing visible artwork.

Actions:

1. Add `ref-v4` asset and geometry tokens under `signalReference`.
2. Add `NightSoulReelFace` with left/right props and no visual duplication.
3. Add stable `data-*` layer and pivot observability.
4. Add failing tests for v4 assets, pivots, hole ownership and layer order.

Gate 03: tests fail for missing v4 implementation rather than syntax or path
errors; Ember and Cathedral contracts remain untouched.

### Task 04 — Shell, media and light field

Objective: reproduce the transparent electric-blue material without flattening
the cassette.

Actions:

1. Replace the old signal field and centre-window composition with the v4
   transparent shell stack.
2. Rebuild thick cyan edge transmission, cobalt seams and dark corner depth.
3. Add rear navy media behind both reel faces.
4. Mount electric glow and fog inside the shell stack.
5. Keep shell texture outside the true hole interiors.

Gate 04: the body reads as transparent blue polycarbonate; lower mechanics and
rear media are visible; coral is visible only through real negative spaces.

### Task 05 — Oversized functional reel faces

Objective: make the two ivory plates the dominant visual and functional reel
assembly.

Actions:

1. Build the annular face and three aperture mask once.
2. Render left/right instances at the shared centres.
3. Mount pivot-local print and face-grain assets inside each rotating group.
4. Preserve existing `reelTurn`, playing and reduced-motion ownership.
5. Remove the superseded small signal ring only after the new functional face
   passes its state gate.

Gate 05: idle matches the reference orientation; drag/loading/play/eject move
the full faces correctly; true holes remain open; no duplicate reel is visible.

### Task 06 — Lower mechanical reconstruction

Objective: match the selected clear lower bay with real code-owned structure.

Actions:

1. Rebuild the shallow trapezoid panel, angular tape-path arms and central
   pivot using shared local coordinates.
2. Preserve guide centres at `±94,49` and centre lock at `0,50`.
3. Use red-orange only for the two lower guide rollers.
4. Keep the lower mechanism behind the top sticker layer.

Gate 06: the lower assembly is symmetrical and mechanically legible without
the stickers, and no guide, pivot or arm pixel is baked into a PNG.

### Task 07 — Print, stickers and material finish

Objective: complete the selected graphic hierarchy.

Actions:

1. Mount left/right pivot-local print assets inside reel groups.
2. Position the complete `Lord` strip at upper-left.
3. Position the complete `wait on you` strip over lower-right mechanics.
4. Add a shared `y+2 / blur 4 / black 8%` contact shadow to both strips.
5. Mount edge wear, shell fog and one final monochrome grain layer.

Gate 07: all exact text is readable at landing scale; both sticker silhouettes
remain inside the body; neither true hole is covered; mechanics remain faintly
visible through the lower strip.

### Task 08 — Lifecycle and interaction regression

Objective: prove the new visual remains one physical cassette.

Required sequence:

```text
HOME
→ HOLD
→ pointer drag
→ bay hover / lid open
→ release / magnetic alignment
→ jaw lock
→ lid close
→ FRONT_READY
→ play / pause
→ EJECT
→ exact HOME
```

Gate 08: no child-layer drift, late texture pop, fake spin, clipping, scale
jump or reset frame occurs. The full cassette moves rigidly and returns to its
immutable HOME transform.

### Task 09 — Automated contracts

Add or update tests for:

1. selected source hash and `ref-v4` manifest schema;
2. required asset existence, dimensions and alpha;
3. shared `280 × 156`, `±65`, radius `20` geometry;
4. two functional reel-face instances and pivot-local print bounds;
5. exact visible copy and absence of commercial reference text;
6. complete sticker bounds inside the body;
7. render order: shell < reel faces < lower hardware < top stickers < grain;
8. no full-body Night Soul `<image>`;
9. no `preserveAspectRatio="none"`;
10. Ember and Cathedral branches remain unchanged.

Gate 09: targeted asset/visual tests and the full project test suite pass.

### Task 10 — Same-state visual QA

Objective: judge the visible result against the selected image.

Compare at the real landing scale and at 4× master scale:

```text
selected source
production master
runtime HOME capture
50% alignment overlay
side-by-side material comparison
```

Inspect these anchors:

- body silhouette and cyan edge transmission;
- both reel centres, outer radii, three apertures and true holes;
- handwritten Night/Soul relationship;
- `02`, `SIDE B`, `STEREO` circular placement;
- Lord upper-left and wait-on-you lower-right placement;
- lower guide rollers, central mechanism and electric glow;
- fog, scratches, edge wear and grain density.

Severity:

- `P0`: fake/blocked hole, wrong centre, wrong silhouette, missing dominant
  reel face, full screenshot layer, broken lifecycle.
- `P1`: visibly wrong plate size, shell material, title/sticker placement,
  lower mechanism or hierarchy.
- `P2`: small opacity, wear, colour or texture mismatch.

Gate 10: zero P0, zero P1, and every remaining P2 is either fixed or explicitly
accepted by the user. `design-qa.md` must say `final result: passed`.

### Task 11 — Build, Sites packaging and evidence handoff

Actions:

1. Run the targeted cassette asset and visual tests.
2. Run the full project tests.
3. Run `npm run build`.
4. Run `npm run test:sites`.
5. Confirm `dist/client/index.html`, `dist/server/index.js` and
   `dist/.openai/hosting.json`.
6. Inspect browser console at HOME, FRONT_READY, PLAYING and after EJECT.
7. Review the final diff and list unrelated user changes that were preserved.

Gate 11: build and packaging pass, console is clean, lifecycle evidence is
complete, and the final handoff includes source hash, manifest, screenshots,
tests, changed files and any accepted P2.

## 12. Final acceptance checklist

- [ ] Selected source hash is locked and reproduced in `manifest.json`.
- [ ] Night Soul reads immediately as the selected transparent blue dual-reel
      reference at landing scale.
- [ ] Two ivory reel faces are the dominant visual mass.
- [ ] Night and Soul share the same handwritten print character.
- [ ] Lord is complete at upper-left; wait on you is complete at lower-right.
- [ ] Both true holes expose the stage and align to the receivers.
- [ ] Reel faces and their print rotate from real state.
- [ ] Lower mechanics remain code-owned and visible through the shell.
- [ ] No full-body screenshot or hidden source background enters runtime.
- [ ] All assets inherit one cassette transform and own no input state.
- [ ] Ember, Cathedral Dust, bay, lid, camera, controls and audio do not regress.
- [ ] Same-state visual QA passes before production handoff.

## 13. Next-run instruction

The next implementation run starts with **Task 00 only**. Do not generate
runtime assets or edit `src/` until Gate 00 is complete and the dirty-worktree
baseline has been recorded.
