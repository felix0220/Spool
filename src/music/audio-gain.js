export const OUTPUT_GAIN_TIME_CONSTANT = 0.03;

export function clampGain(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function scheduleGainTarget(
  parameter,
  value,
  now,
  timeConstant = OUTPUT_GAIN_TIME_CONSTANT,
) {
  const target = clampGain(value);
  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(target, now, timeConstant);
  return target;
}

export function scheduleGainRamp(parameter, value, now, durationMs) {
  const target = clampGain(value);
  const durationSeconds = Math.max(0, durationMs) / 1000;
  parameter.cancelScheduledValues(now);
  parameter.setValueAtTime(parameter.value, now);
  parameter.linearRampToValueAtTime(target, now + durationSeconds);
  return target;
}
