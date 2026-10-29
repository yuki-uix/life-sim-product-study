/**
 * Presentation progress toward the next existing annual settlement.
 * This does not measure or settle time spent on a life focus.
 */
export function advanceClock(state = {}, elapsedMs = 0, speed = 1, yearMs = 30000) {
  const fraction = Number.isFinite(state.fraction)
    ? Math.min(1, Math.max(0, state.fraction)) : 0;
  // A minimized decision is still unanswered; it never removes this gate.
  const blocked = state.status !== 'living' || state.pending || state.needsPlan ||
    state.paused || state.hidden || state.modalOpen;
  if (blocked || fraction === 1) return { fraction, complete: false };

  const elapsed = Number.isNaN(Number(elapsedMs)) ? 0
    : Math.min(1000, Math.max(0, Number(elapsedMs)));
  const multiplier = [1, 2, 4, 8, 16].includes(speed) ? speed : 1;
  const duration = state.fastForward ? 1000
    : (Number.isFinite(yearMs) && yearMs > 0 ? yearMs : 30000) / multiplier;
  const next = Math.min(1, fraction + elapsed / duration);
  // Emit one crossing. The caller settles exactly one year, then resets to 0.
  return { fraction: next, complete: fraction < 1 && next === 1 };
}
