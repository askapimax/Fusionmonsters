import Phaser from 'phaser';
import { touchControls } from '../input/touchControls';
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
  { label: 'CONTINUE', enabled: false, action: () => {} },
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
 * CONTINUE: there is no save/load system yet (a separate, not-yet-built
 * TODO item), so there is never a save to load. Per this task's own
 * wording ("only enabled/shown when one exists"), CONTINUE is kept
 * *present but disabled* rather than omitted entirely - dimmed, not
 * cursor-selectable-to-confirm (confirming it is a no-op), with a small
 * "No save data yet." hint - so the menu's final shape (both options
 * visible) doesn't need to change again once save/load lands; only the
 * `enabled` flag above and a real load call need to change then.
 */
export class TitleScreenScene extends Phaser.Scene {
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private selector!: Phaser.GameObjects.Text;
  private selectedIndex = 0;

  constructor() {
    super('TitleScreenScene');
  }

  create(): void {
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
      .text(PANEL_X + PANEL_WIDTH / 2, OPTION_START_Y + OPTIONS.length * OPTION_SPACING + 8, 'No save data yet.', {
        fontSize: '10px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
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
    OPTIONS[this.selectedIndex].action(this);
  }

  private releaseTouchHandlers(): void {
    touchControls.onDirectionPress = null;
    touchControls.onA = null;
  }

  startNewGame(): void {
    this.scene.start('CharacterCreationScene');
  }
}
