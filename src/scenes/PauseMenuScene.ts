import Phaser from 'phaser';
import { drawPanel, UI_THEME } from '../ui/panel';

const PANEL_X = 560;
const PANEL_Y = 40;
const PANEL_WIDTH = 200;
const PANEL_HEIGHT = 150;
const OPTION_START_Y = PANEL_Y + 28;
const OPTION_SPACING = 34;

interface MenuOption {
  label: string;
  action: (scene: PauseMenuScene) => void;
}

const OPTIONS: MenuOption[] = [
  { label: 'INVENTORY', action: (scene) => scene.openInventory() },
  { label: 'SAVE', action: (scene) => scene.showSaveNotice() },
  { label: 'CLOSE', action: (scene) => scene.closeMenu() },
];

/**
 * The Game Boy-style Start menu: launched on top of (and pausing)
 * WorldScene. Options are directly clickable/tappable rather than
 * requiring D-pad navigation + a confirm button, since there's no "A"
 * button in this game yet - see TODO.md.
 */
export class PauseMenuScene extends Phaser.Scene {
  private saveNoticeText?: Phaser.GameObjects.Text;

  constructor() {
    super('PauseMenuScene');
  }

  create(): void {
    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    OPTIONS.forEach((option, index) => {
      const y = OPTION_START_Y + index * OPTION_SPACING;
      this.add
        .text(PANEL_X + 24, y, option.label, {
          fontSize: '15px',
          color: UI_THEME.text,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) {
          this.setColor(UI_THEME.highlight);
        })
        .on('pointerout', function (this: Phaser.GameObjects.Text) {
          this.setColor(UI_THEME.text);
        })
        .on('pointerdown', () => option.action(this));
    });

    this.input.keyboard!.on('keydown-ESC', () => this.closeMenu());
    this.input.keyboard!.on('keydown-ENTER', () => this.closeMenu());
  }

  openInventory(): void {
    this.scene.stop();
    this.scene.launch('InventoryScene');
  }

  showSaveNotice(): void {
    this.saveNoticeText?.destroy();
    this.saveNoticeText = this.add
      .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 26, 'Not available yet.', {
        fontSize: '11px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);
    this.time.delayedCall(1400, () => {
      this.saveNoticeText?.destroy();
      this.saveNoticeText = undefined;
    });
  }

  closeMenu(): void {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
