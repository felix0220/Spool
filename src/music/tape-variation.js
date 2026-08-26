export const TAPE_VARIATION_MIN = 8;
export const TAPE_VARIATION_MAX = 92;
const TONE_MIN_CUTOFF = 400;
const TONE_MAX_CUTOFF = 20000;

const boundedRandomUnit = (random) => {
  const sample = Number(random());
  if (!Number.isFinite(sample)) return 0;
  return Math.min(.999999, Math.max(0, sample));
};

const randomPercent = (random) => TAPE_VARIATION_MIN + Math.floor(
  boundedRandomUnit(random) * (TAPE_VARIATION_MAX - TAPE_VARIATION_MIN + 1),
);

export const toneCutoffFromPercent = (percent) => (
  TONE_MIN_CUTOFF + (percent / 100) * (TONE_MAX_CUTOFF - TONE_MIN_CUTOFF)
);

export function createRandomTapeVariation(random = Math.random) {
  const percentages = [];
  let attempts = 0;
  while (percentages.length < 3 && attempts < 1000) {
    const next = randomPercent(random);
    if (!percentages.includes(next)) percentages.push(next);
    attempts += 1;
  }
  if (percentages.length < 3) {
    throw new Error('Unable to generate three distinct tape variation values');
  }

  const [tonePercent, spacePercent, texturePercent] = percentages;
  return {
    tonePercent,
    spacePercent,
    texturePercent,
    toneCutoff: toneCutoffFromPercent(tonePercent),
    space: spacePercent / 100,
    texture: texturePercent / 100,
  };
}

