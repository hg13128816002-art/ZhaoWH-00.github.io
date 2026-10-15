// Original soundtrack: 90 BPM, 60 fps, 40 frames per beat.
// Begin on the final collage shot and hold its open composition a little longer.
// The contraction, Z formation and all subsequent motion retain their original speed.
const SOURCE_START_FRAME = 640;
const SOURCE_HOLD_FRAME = 660;
const EXTRA_HOLD_FRAMES = 20;
const SOURCE_REVEAL_FRAME = 1190;
const SOURCE_END_FRAME = 1220;
const FPS = 60;

export const OPENING_TIMING = {
  revealStart: (SOURCE_REVEAL_FRAME - SOURCE_START_FRAME + EXTRA_HOLD_FRAMES) / FPS,
  visualEnd: (SOURCE_END_FRAME - SOURCE_START_FRAME + EXTRA_HOLD_FRAMES) / FPS,
};

export function openingSourceTime(milliseconds) {
  const elapsed = Math.max(0, Math.min(OPENING_TIMING.visualEnd * 1000, milliseconds));
  const holdAt = (SOURCE_HOLD_FRAME - SOURCE_START_FRAME) / FPS * 1000;
  const hold = Math.min(EXTRA_HOLD_FRAMES / FPS * 1000, Math.max(0, elapsed - holdAt));
  return SOURCE_START_FRAME / FPS * 1000 + elapsed - hold;
}
