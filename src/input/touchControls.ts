import type { FacingDirection } from '../data/character';

/**
 * On-screen movement + Start buttons (index.html's #touch-controls).
 * Rendered as plain HTML/CSS, not Phaser UI, so they get real touch-target
 * sizing and behave identically to clicking with a mouse - shown on both
 * mobile and desktop, alongside keyboard input, not instead of it.
 */
class TouchControlsState {
  direction: FacingDirection | null = null;
  /** Set by whoever owns the pause menu (WorldScene); called once per Start press. */
  onStart: (() => void) | null = null;
}

export const touchControls = new TouchControlsState();

export function attachTouchControls(rootId: string): void {
  const root = document.getElementById(rootId);
  if (!root) return;

  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-dir]');
  buttons.forEach((button) => {
    const direction = button.dataset.dir as FacingDirection;

    const press = (event: Event): void => {
      event.preventDefault();
      touchControls.direction = direction;
      button.classList.add('is-pressed');
    };
    const release = (event: Event): void => {
      event.preventDefault();
      if (touchControls.direction === direction) {
        touchControls.direction = null;
      }
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
  });

  const startButton = root.querySelector<HTMLButtonElement>('#start-btn');
  startButton?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startButton.classList.add('is-pressed');
    touchControls.onStart?.();
  });
  startButton?.addEventListener('pointerup', () => startButton.classList.remove('is-pressed'));
  startButton?.addEventListener('pointerleave', () => startButton.classList.remove('is-pressed'));
}
