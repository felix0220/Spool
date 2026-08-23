/**
 * Brand badge geometry for the top surface.
 *
 * The mark and the wordmark each occupy their own pressed well, the way a
 * Macintosh badge separates the logo recess from the name recess. Both wells
 * share one v-span, so their top and bottom edges are literally the same
 * edges: the two halves are aligned by construction, and there is no vertical
 * offset in this file to tune. Keeping the numbers here rather than inside the
 * renderer is what lets that invariant be tested.
 */

export const BADGE_V0 = .072;
export const BADGE_V1 = .16;

// Widths in surface u, with the world-unit equivalent beside them. The surface
// runs about 688 world units per 1 u at the badge, and the wells are 23.6
// world units tall, so the mark well is very slightly narrower than it is
// high — an upright frame rather than a square one.
export const MARK_WELL_U = .0320;   // 22 world units
export const WELL_GAP_U = .0073;    //  5
export const WORD_WELL_U = .1206;   // 83 = the 67 wordmark plus 8 either side
export const BADGE_U = MARK_WELL_U + WELL_GAP_U + WORD_WELL_U;
export const BADGE_U0 = .5 - BADGE_U / 2;

export const WORDMARK_WIDTH = 67;

// The mark fills about two thirds of its well, which is what leaves the frame
// reading as a frame. Its authority comes from having a well of its own, not
// from matching the wordmark's mass: a small logo in its own recess carries
// equal weight to a long name in a long recess.
export const MARK_SIZE = 15;

// Baseline offset below the well centre, so the glyph mass — not the text box,
// which the p descender drags down — lands on the mark's centre line.
export const WORDMARK_BASELINE_OFFSET = 4.75;

// The reel mark, authored in the same 100 x 100 field as `public/mark.svg`.
// Both come from `scripts/build-identity.py`; if the geometry moves there,
// re-run it and paste the path back here so the pressed badge on the machine
// and the app icon never become two different marks.
export const SPOOL_MARK_PATH = 'M86.25 21.68A46.0 46.0 0 0 1 59.56 94.99L55.41 75.43A26.0 26.0 0 0 0 70.49 33.99Z '
  + 'M13.75 78.32A46.0 46.0 0 0 1 40.44 5.01L44.59 24.57A26.0 26.0 0 0 0 29.51 66.01Z '
  + 'M33.0 50.0a17.0 17.0 0 1 0 34.0 0a17.0 17.0 0 1 0 -34.0 0 '
  + 'M42.0 50.0a8.0 8.0 0 1 0 16.0 0a8.0 8.0 0 1 0 -16.0 0';

export function getBrandBadgeLayout() {
  const wordWellU0 = BADGE_U0 + MARK_WELL_U + WELL_GAP_U;
  return Object.freeze({
    v0: BADGE_V0,
    v1: BADGE_V1,
    midV: (BADGE_V0 + BADGE_V1) / 2,
    markWell: Object.freeze({ u0: BADGE_U0, u1: BADGE_U0 + MARK_WELL_U }),
    wordWell: Object.freeze({ u0: wordWellU0, u1: wordWellU0 + WORD_WELL_U }),
    markCenterU: BADGE_U0 + MARK_WELL_U / 2,
    wordCenterU: wordWellU0 + WORD_WELL_U / 2,
  });
}
