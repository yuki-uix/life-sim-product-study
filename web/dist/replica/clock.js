import { DAYS_PER_YEAR } from './engine.js?v=3';

/** Convert active wall time to whole simulation days; the engine owns all progress. */
export function elapsedDays(state = {}, elapsedMs = 0, speed = 1, yearMs = 30000) {
  const carry = Number.isFinite(state.carry) ? Math.max(0, Math.min(.999999999, state.carry)) : 0;
  if (state.status !== 'living' || state.pending || state.needsPlan || state.paused || state.hidden || state.modalOpen) {
    return { days: 0, carry };
  }
  const elapsed = Number.isNaN(Number(elapsedMs)) ? 0 : Math.max(0, Math.min(1000, Number(elapsedMs)));
  const multiplier = [1, 2, 4, 8, 16].includes(speed) ? speed : 1;
  const duration = state.fastForward ? 1000 : (Number.isFinite(yearMs) && yearMs > 0 ? yearMs : 30000) / multiplier;
  const total = carry + elapsed * DAYS_PER_YEAR / duration;
  const days = Math.floor(total + 1e-9);
  return { days, carry: Math.max(0, total - days) };
}
