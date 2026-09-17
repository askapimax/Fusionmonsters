import Phaser from 'phaser';
import { touchControls } from '../input/touchControls';
import { drawPanel, UI_THEME } from '../ui/panel';
import { advanceMessageQueue, createMessageQueue, type MessageQueue } from '../ui/messageQueue';

export interface DialogueStartData {
  /** Shown one at a time, advanced on A/Enter/Z or a click/tap on the box. */
  lines: string[];
  /** Called once the last line has been advanced past and the scene has stopped itself. Optional - a caller can listen for the `dialogueDone` event instead (see below) if a live function reference is awkward to pass. */
  onDone?: () => void;
}

// Matches BattleScene's bottom-panel geometry (800x480 canvas) so the box
// lines up the same way whether this is launched on top of BattleScene,
// WorldScene, or standalone.
const PANEL_X = 10;
const PANEL_Y = 356;
const PANEL_WIDTH = 780;
const PANEL_HEIGHT = 114;

/**
 * Reusable scrolling text-box, factored out of `BattleScene`'s message-box
 * pattern (`say`/`advanceMessage`, see `src/scenes/BattleScene.ts`) so NPCs,
 * signs, and story beats can all show a queue of lines without each
 * rebuilding that logic. Same dark-panel/monospace look as the rest of the
 * UI (`src/ui/panel.ts`'s `drawPanel`/`UI_THEME`), same bottom-anchored
 * panel geometry as `BattleScene`'s box, and the same blinking `▼` +
 * full-panel interactive zone + A/Enter/Z-or-click-to-advance interaction.
 *
 * Intentionally paints only the bottom panel, not a full-screen background,
 * so it works both as its own scene and as a transparent overlay launched
 * on top of another scene (e.g. `WorldScene` for NPC/sign dialogue - see
 * TODO.md's "NPC entity system", not wired up yet) - whatever is running
 * underneath stays visible above the panel.
 *
 * Usage: `this.scene.launch('DialogueScene', { lines: [...], onDone: () => {...} })`.
 * `onDone` travels as a live function reference in the scene data object,
 * not JSON - Phaser 3's `scene.launch`/`scene.start` data is handed to the
 * target scene's `init`/`create` by reference, not serialized, so passing a
 * closure this way works (verified with a real headless-browser Playwright
 * run driving `game.scene.launch('DialogueScene', { lines, onDone })`
 * directly, not just assumed). If a caller would rather not hold a live
 * callback across a `scene.launch` call, this scene also emits a
 * `dialogueDone` event on itself right before `onDone` runs, so
 * `this.scene.get('DialogueScene').events.once('dialogueDone', ...)` works
 * as a drop-in alternative.
 */
export class DialogueScene extends Phaser.Scene {
  private queue: MessageQueue = createMessageQueue([]);
  private onDone?: () => void;

  private messageText!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;

  constructor() {
    super('DialogueScene');
  }

  init(data: DialogueStartData): void {
    this.queue = createMessageQueue(data.lines);
    this.onDone = data.onDone;
  }

  create(): void {
    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(20);

    this.messageText = this.add
      .text(PANEL_X + 20, PANEL_Y + 18, '', {
        fontSize: '15px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
        wordWrap: { width: PANEL_WIDTH - 40 },
      })
      .setDepth(21);

    this.prompt = this.add
      .text(PANEL_X + PANEL_WIDTH - 26, PANEL_Y + PANEL_HEIGHT - 22, '▼', {
        fontSize: '14px',
        color: UI_THEME.highlight,
      })
      .setDepth(21);
    this.tweens.add({ targets: this.prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.add
      .zone(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(22)
      .on('pointerdown', () => this.advance());

    this.bindInput();
    this.events.once('shutdown', () => this.releaseInput());

    this.advance();
  }

  // --- Input ---------------------------------------------------------------

  private bindInput(): void {
    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-Z', () => this.advance());
    keyboard.on('keydown-ENTER', () => this.advance());
    touchControls.onA = () => this.advance();
  }

  private releaseInput(): void {
    touchControls.onA = null;
  }

  // --- Message queue ---------------------------------------------------------

  private advance(): void {
    const result = advanceMessageQueue(this.queue);
    if (result.done) {
      this.finish();
      return;
    }
    this.messageText.setText(result.line);
  }

  private finish(): void {
    const onDone = this.onDone;
    this.events.emit('dialogueDone');
    this.scene.stop();
    onDone?.();
  }
}
