import { describe, expect, it } from 'vitest';
import { advanceMessageQueue, createMessageQueue, isMessageQueueEmpty } from './messageQueue';

describe('messageQueue', () => {
  it('advances through lines in order', () => {
    const queue = createMessageQueue(['first', 'second', 'third']);

    expect(advanceMessageQueue(queue)).toEqual({ done: false, line: 'first' });
    expect(advanceMessageQueue(queue)).toEqual({ done: false, line: 'second' });
    expect(advanceMessageQueue(queue)).toEqual({ done: false, line: 'third' });
  });

  it('reports done once every line has been shifted off', () => {
    const queue = createMessageQueue(['only']);

    expect(advanceMessageQueue(queue)).toEqual({ done: false, line: 'only' });
    expect(advanceMessageQueue(queue)).toEqual({ done: true });
    // Further advances stay done rather than throwing or wrapping around.
    expect(advanceMessageQueue(queue)).toEqual({ done: true });
  });

  it('reports done immediately for an empty queue', () => {
    const queue = createMessageQueue([]);
    expect(advanceMessageQueue(queue)).toEqual({ done: true });
  });

  it('does not mutate the array it was constructed from', () => {
    const source = ['a', 'b'];
    const queue = createMessageQueue(source);
    advanceMessageQueue(queue);
    expect(source).toEqual(['a', 'b']);
  });

  it('tracks emptiness independent of the terminal advance call', () => {
    const queue = createMessageQueue(['a']);
    expect(isMessageQueueEmpty(queue)).toBe(false);
    advanceMessageQueue(queue);
    expect(isMessageQueueEmpty(queue)).toBe(true);
  });
});
