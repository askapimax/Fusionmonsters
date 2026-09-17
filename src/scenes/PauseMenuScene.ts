import Phaser from 'phaser';
import { touchControls } from '../input/touchControls';
import { drawPanel, UI_THEME } from '../ui/panel';

const PANEL_X = 560;
const PANEL_Y = 40;
const PANEL_WIDTH = 200;
const PANEL_HEIGHT = 184;
const OPTION_START_Y = PANEL_Y + 28;
const OPTION_SPACING = 34;

interface MenuOption {
  label: string;
  action: (scene: PauseMenuScene) => void;
}

const OPTIONS: MenuOption[] = [
  { label: 'INVENTORY', action: (scene) => scene.openInventory() },
  { label: 'REGISTRY', action: (scene) => scene.openRegistry() },
  { label: 'SAVE', action: (scene) => scene.showSaveNotice() },
  { label: 'CLOSE', action: (scene) => scene.closeMenu() },
];

/**
 * The Game Boy-style Start menu: launched on top of (and pausing)
 * WorldScene. Navigable like the real thing: Up/Down (arrow keys or the
 * D-pad) move a "> " cursor between options, A (Z key or the on-screen A
 * button) confirms the highlighted one, B (X key or the on-screen B
 * button) backs out and closes the menu. Mouse/touch-on-the-label still
 * works directly too - hovering a label also moves the cursor there, so
 * the two input styles never fall out of sync.
 */
export class PauseMenuScene extends Phaser.Scene {
  private saveNoticeText?: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private selector!: Phaser.GameObjects.Text;
  private selectedIndex = 0;

  constructor() {
    super('PauseMenuScene');
  }

  create(): void {
    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.selector = this.add
      .text(PANEL_X + 16, OPTION_START_Y, '>', {
        fontSize: '15px',
        color: UI_THEME.highlight,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.optionTexts = OPTIONS.map((option, index) => {
      const y = OPTION_START_Y + index * OPTION_SPACING;
      return this.add
        .text(PANEL_X + 36, y, option.label, {
          fontSize: '15px',
          color: UI_THEME.text,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.setSelectedIndex(index))
        .on('pointerdown', () => {
          this.setSelectedIndex(index);
          this.confirmSelection();
        });
    });

    this.setSelectedIndex(0);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-UP', () => this.moveSelection(-1));
    keyboard.on('keydown-DOWN', () => this.moveSelection(1));
    keyboard.on('keydown-ENTER', () => this.confirmSelection());
    keyboard.on('keydown-Z', () => this.confirmSelection());
    keyboard.on('keydown-ESC', () => this.closeMenu());
    keyboard.on('keydown-X', () => this.closeMenu());

    touchControls.onDirectionPress = (direction) => {
      if (direction === 'up') this.moveSelection(-1);
      if (direction === 'down') this.moveSelection(1);
    };
    touchControls.onA = () => this.confirmSelection();
    touchControls.onB = () => this.closeMenu();
    this.events.once('shutdown', () => this.releaseTouchHandlers());
  }

  private setSelectedIndex(index: number): void {
    this.selectedIndex = index;
    this.optionTexts.forEach((text, i) => text.setColor(i === index ? UI_THEME.highlight : UI_THEME.text));
    this.selector.setY(OPTION_START_Y + index * OPTION_SPACING);
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
    touchControls.onB = null;
  }

  openInventory(): void {
    this.scene.stop();
    this.scene.launch('InventoryScene');
  }

  openRegistry(): void {
    this.scene.stop();
    this.scene.launch('ConcordRegistryScene');
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
