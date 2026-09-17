/**
 * Pure line-queue-advance logic, factored out of the shift-and-check pattern
 * `BattleScene`'s `say`/`advanceMessage` already uses for its message box
 * (see `src/scenes/BattleScene.ts`). Kept Phaser-free so it's trivially unit
 * testable (see `messageQueue.test.ts`) and so any scene that wants a
 * "show these lines one at a time, then call onDone" box - `DialogueScene`
 * today, `BattleScene` if it's ever refactored to share this - can reuse the
 * exact same advance semantics instead of reimplementing them.
 */
export interface MessageQueue {
  lines: string[];
}

export type AdvanceResult = { done: false; line: string } | { done: true };

/** Copies `lines` so the caller's array is never mutated out from under it. */
export function createMessageQueue(lines: string[]): MessageQueue {
  return { lines: [...lines] };
}

/**
 * Mutates `queue`, shifting off and returning the next line, or reporting
 * that the queue is now empty (mirrors `BattleScene.advanceMessage`: a
 * `shift()` that returns `undefined` once exhausted).
 */
export function advanceMessageQueue(queue: MessageQueue): AdvanceResult {
  const next = queue.lines.shift();
  if (next === undefined) return { done: true };
  return { done: false, line: next };
}

/** True once every line has been shifted off (before the terminal `advance` call that reports `done`). */
export function isMessageQueueEmpty(queue: MessageQueue): boolean {
  return queue.lines.length === 0;
}
