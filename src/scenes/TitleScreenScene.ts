import Phaser from 'phaser';
import { touchControls } from '../input/touchControls';
import { hasSaveData, loadSaveBlob, restoreFromSaveBlob } from '../state/save';
import { drawPanel, UI_THEME } from '../ui/panel';

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 220;
const PANEL_X = 220;
const PANEL_Y = 140;
const OPTION_START_Y = PANEL_Y + 100;
const OPTION_SPACING = 34;

interface MenuOption {
  label: string;
  /**
   * false = present-but-disabled (see class doc comment for why CONTINUE
   * is disabled rather than omitted). Disabled options render dimmed,
   * can still be highlighted for discoverability, but do nothing on
   * confirm.
   */
  enabled: boolean;
  action: (scene: TitleScreenScene) => void;
}

const OPTIONS: MenuOption[] = [
  { label: 'NEW GAME', enabled: true, action: (scene) => scene.startNewGame() },
  // `enabled` is recomputed every `create()` from `hasSaveData()` (see
  // below) - the `false` here is just the pre-boot default before that
  // first check runs.
  { label: 'CONTINUE', enabled: false, action: (scene) => scene.continueGame() },
];

/**
 * Title screen / main menu: the very first scene shown, before
 * `CharacterCreationScene` (first in `src/main.ts`'s `scene` array so
 * Phaser auto-starts it). Same dark-panel/monospace UI language and `>`
 * cursor-list convention as `PauseMenuScene`/`CharacterCreationScene`
 * (Up/Down or the D-pad move the cursor, A/Enter/click confirms).
 *
 * NEW GAME starts `CharacterCreationScene`, which itself hands off to
 * `WorldScene` once the player confirms their appearance/name - the full
 * boot chain is Title -> CharacterCreation -> World.
 *
 * CONTINUE: real now that save/load exists (`src/state/save.ts`) - `create()`
 * checks `hasSaveData()` and sets `OPTIONS[1].enabled` accordingly every
 * time this scene starts, so it's dimmed/inert with a "No save data yet."
 * hint on a fresh boot and enabled once a save exists. Confirming it loads
 * the blob (`loadSaveBlob`/`restoreFromSaveBlob`) and starts `WorldScene`
 * directly at the saved zone/position, skipping `CharacterCreationScene`
 * since a loaded save already has an appearance/name.
 */
export class TitleScreenScene extends Phaser.Scene {
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private selector!: Phaser.GameObjects.Text;
  private selectedIndex = 0;

  constructor() {
    super('TitleScreenScene');
  }

  create(): void {
    // Real save/load check (TODO.md "Persistence & Platform") - see class
    // doc comment. Recomputed on every `create()` in case this scene is
    // ever revisited after a save happened elsewhere this session.
    OPTIONS[1].enabled = hasSaveData();

    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + PANEL_WIDTH / 2, PANEL_Y + 34, 'FUSIONMONSTERS', {
        fontSize: '26px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.add
      .text(PANEL_X + PANEL_WIDTH / 2, PANEL_Y + 64, 'a Concord field-handler sim', {
        fontSize: '11px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.selector = this.add
      .text(PANEL_X + PANEL_WIDTH / 2 - 90, OPTION_START_Y, '>', {
        fontSize: '15px',
        color: UI_THEME.highlight,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.optionTexts = OPTIONS.map((option, index) => {
      const y = OPTION_START_Y + index * OPTION_SPACING;
      const text = this.add
        .text(PANEL_X + PANEL_WIDTH / 2 - 70, y, option.label, {
          fontSize: '15px',
          color: option.enabled ? UI_THEME.text : UI_THEME.textDim,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201)
        .on('pointerover', () => this.setSelectedIndex(index))
        .on('pointerdown', () => {
          this.setSelectedIndex(index);
          this.confirmSelection();
        });
      if (option.enabled) {
        text.setInteractive({ useHandCursor: true });
      } else {
        text.setInteractive();
      }
      return text;
    });

    this.add
      .text(
        PANEL_X + PANEL_WIDTH / 2,
        OPTION_START_Y + OPTIONS.length * OPTION_SPACING + 8,
        OPTIONS[1].enabled ? '' : 'No save data yet.',
        {
          fontSize: '10px',
          color: UI_THEME.textDim,
          fontFamily: UI_THEME.fontFamily,
        },
      )
      .setOrigin(0.5)
      .setDepth(201);

    this.setSelectedIndex(0);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-UP', () => this.moveSelection(-1));
    keyboard.on('keydown-DOWN', () => this.moveSelection(1));
    keyboard.on('keydown-ENTER', () => this.confirmSelection());
    keyboard.on('keydown-Z', () => this.confirmSelection());

    touchControls.onDirectionPress = (direction) => {
      if (direction === 'up') this.moveSelection(-1);
      if (direction === 'down') this.moveSelection(1);
    };
    touchControls.onA = () => this.confirmSelection();
    this.events.once('shutdown', () => this.releaseTouchHandlers());
  }

  private setSelectedIndex(index: number): void {
    this.selectedIndex = index;
    this.optionTexts.forEach((text, i) => {
      const option = OPTIONS[i];
      if (!option.enabled) {
        text.setColor(UI_THEME.textDim);
        return;
      }
      text.setColor(i === index ? UI_THEME.highlight : UI_THEME.text);
    });
    this.selector.setY(OPTION_START_Y + index * OPTION_SPACING);
    this.selector.setAlpha(OPTIONS[index].enabled ? 1 : 0.5);
  }

  private moveSelection(delta: number): void {
    const next = (this.selectedIndex + delta + OPTIONS.length) % OPTIONS.length;
    this.setSelectedIndex(next);
  }

  private confirmSelection(): void {
    const option = OPTIONS[this.selectedIndex];
    // Disabled options (CONTINUE with no save yet) stay selectable for
    // discoverability but do nothing on confirm - see class doc comment.
    if (!option.enabled) return;
    option.action(this);
  }

  private releaseTouchHandlers(): void {
    touchControls.onDirectionPress = null;
    touchControls.onA = null;
  }

  startNewGame(): void {
    this.scene.start('CharacterCreationScene');
  }

  /**
   * Real load logic (TODO.md "Persistence & Platform"): loads the save
   * blob, restores every state module it covers (`restoreFromSaveBlob`),
   * and jumps straight into `WorldScene` at the saved zone/position -
   * skipping `CharacterCreationScene`, since a loaded save already has an
   * appearance/name. Defensive no-op if there's no valid save (shouldn't
   * happen since CONTINUE is disabled without one, but `hasSaveData`/
   * `loadSaveBlob` could theoretically disagree if `localStorage` changed
   * between this scene's `create()` and the confirm keypress).
   */
  continueGame(): void {
    const blob = loadSaveBlob();
    if (!blob) return;
    restoreFromSaveBlob(blob);
    // `position` is only `null` in the defensive edge case documented on
    // `SaveBlob` - WorldScene's own `init()` falls back to its zone's
    // default spawn when no data (or no `spawn`) is passed.
    this.scene.start('WorldScene', blob.position ? { zoneId: blob.position.zoneId, spawn: blob.position.spawn } : undefined);
  }
}
