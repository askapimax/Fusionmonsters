import Phaser from 'phaser';
import {
  APPEARANCE_TINTS,
  CHARACTER_SHEET_URL,
  CHARACTER_TEXTURE_KEY,
  CHAR_FRAME_HEIGHT,
  CHAR_FRAME_WIDTH,
  FACING_FRAMES,
} from '../data/character';
import { touchControls } from '../input/touchControls';
import { getPlayerAppearance, setPlayerAppearance, setPlayerName, type PlayerAppearance } from '../state/player';
import { drawPanel, drawSlot, UI_THEME } from '../ui/panel';

const PANEL_X = 160;
const PANEL_Y = 50;
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 380;

const APPEARANCE_OPTIONS: PlayerAppearance[] = ['male', 'female'];
const APPEARANCE_LABELS: Record<PlayerAppearance, string> = {
  male: 'MALE',
  female: 'FEMALE',
};

/**
 * Character creation: pick an appearance and a name, shown once before
 * `WorldScene` boots - it's first in `src/main.ts`'s `scene` array so
 * Phaser auto-starts it instead of `WorldScene`. Confirming writes both
 * choices into `src/state/player.ts` and starts `WorldScene`.
 *
 * The appearance picker follows the same `>` cursor + selection convention
 * `PauseMenuScene`/`InventoryScene` use (here moved with Left/Right, since
 * the two options sit side by side), with a live preview sprite showing
 * the tint each appearance maps to - see `src/data/character.ts` for why a
 * tint stands in for a second sprite sheet (no such art asset exists yet).
 *
 * Name entry is a real DOM `<input>` overlaid on the canvas via Phaser's
 * DOM Element game object (`this.add.dom`, enabled through `dom.
 * createContainer` in `src/main.ts`) - the simplest robust way to get real
 * text entry, including a native mobile keyboard on touch, inside a Phaser
 * scene, following the same "overlay a real DOM element next to/over the
 * canvas" precedent `index.html`/`src/input/touchControls.ts` already set
 * for the D-pad/buttons. The input owns its own keydown handling (via
 * `stopPropagation`) so typing doesn't leak into this scene's Left/Right/
 * Enter shortcuts; Enter while the field is focused still confirms.
 */
export class CharacterCreationScene extends Phaser.Scene {
  private appearanceIndex = 0;
  private previewSprite!: Phaser.GameObjects.Sprite;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private selector!: Phaser.GameObjects.Text;
  private nameInput!: Phaser.GameObjects.DOMElement;

  constructor() {
    super('CharacterCreationScene');
  }

  preload(): void {
    if (!this.textures.exists(CHARACTER_TEXTURE_KEY)) {
      this.load.spritesheet(CHARACTER_TEXTURE_KEY, CHARACTER_SHEET_URL, {
        frameWidth: CHAR_FRAME_WIDTH,
        frameHeight: CHAR_FRAME_HEIGHT,
      });
    }
  }

  create(): void {
    this.appearanceIndex = Math.max(0, APPEARANCE_OPTIONS.indexOf(getPlayerAppearance()));

    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 16, 'CREATE YOUR SPLICER', {
        fontSize: '18px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 58, 'APPEARANCE', {
        fontSize: '12px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.previewSprite = this.add
      .sprite(PANEL_X + 80, PANEL_Y + 170, CHARACTER_TEXTURE_KEY, FACING_FRAMES.down.idle)
      .setDepth(201)
      .setScale(3);

    const optionStartX = PANEL_X + 190;
    const optionY = PANEL_Y + 90;
    const optionSpacingX = 130;

    this.selector = this.add
      .text(optionStartX - 20, optionY, '>', {
        fontSize: '15px',
        color: UI_THEME.highlight,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.optionTexts = APPEARANCE_OPTIONS.map((appearance, index) => {
      const x = optionStartX + index * optionSpacingX;
      return this.add
        .text(x, optionY, APPEARANCE_LABELS[appearance], {
          fontSize: '15px',
          color: UI_THEME.text,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.setAppearanceIndex(index))
        .on('pointerdown', () => this.setAppearanceIndex(index));
    });

    this.add
      .text(PANEL_X + 24, PANEL_Y + 230, 'NAME', {
        fontSize: '12px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    const nameSlotY = PANEL_Y + 250;
    const nameSlotWidth = PANEL_WIDTH - 48;
    drawSlot(this, PANEL_X + 24, nameSlotY, nameSlotWidth, 36).setDepth(201);
    this.nameInput = this.createNameInput(PANEL_X + 24 + nameSlotWidth / 2, nameSlotY + 18);

    this.add
      .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 60, 'Left/Right to choose - tap the name box to type', {
        fontSize: '10px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
        wordWrap: { width: PANEL_WIDTH - 48 },
      })
      .setDepth(201);

    this.add
      .text(PANEL_X + PANEL_WIDTH / 2, PANEL_Y + PANEL_HEIGHT - 32, '[ CONFIRM ]', {
        fontSize: '15px',
        color: UI_THEME.highlight,
        fontFamily: UI_THEME.fontFamily,
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setColor('#ffffff');
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setColor(UI_THEME.highlight);
      })
      .on('pointerdown', () => this.confirmAndStart());

    this.setAppearanceIndex(this.appearanceIndex);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-LEFT', () => this.moveAppearance(-1));
    keyboard.on('keydown-RIGHT', () => this.moveAppearance(1));
    keyboard.on('keydown-ENTER', () => this.confirmAndStart());

    touchControls.onDirectionPress = (direction) => {
      if (direction === 'left') this.moveAppearance(-1);
      if (direction === 'right') this.moveAppearance(1);
    };
    touchControls.onA = () => this.confirmAndStart();
    this.events.once('shutdown', () => this.releaseTouchHandlers());
  }

  private createNameInput(centerX: number, centerY: number): Phaser.GameObjects.DOMElement {
    const style =
      'width: 260px; text-align: center; background: transparent; border: none; outline: none; ' +
      `color: ${UI_THEME.text}; font-family: ${UI_THEME.fontFamily}; font-size: 15px;`;
    const dom = this.add.dom(centerX, centerY).createElement('input', style).setDepth(202);

    const inputEl = dom.node as HTMLInputElement;
    inputEl.type = 'text';
    inputEl.maxLength = 16;
    inputEl.placeholder = 'Your name';
    inputEl.autocomplete = 'off';

    // The field owns its own key handling so typing doesn't leak into this
    // scene's Left/Right/Enter shortcuts (see class doc comment) - Enter
    // still confirms, it's just handled here instead of bubbling up.
    inputEl.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        this.confirmAndStart();
      }
    });
    inputEl.addEventListener('keyup', (event) => event.stopPropagation());

    return dom;
  }

  private setAppearanceIndex(index: number): void {
    this.appearanceIndex = index;
    const appearance = APPEARANCE_OPTIONS[index];
    this.optionTexts.forEach((text, i) => text.setColor(i === index ? UI_THEME.highlight : UI_THEME.text));
    this.selector.setX(this.optionTexts[index].x - 20);
    const tint = APPEARANCE_TINTS[appearance];
    if (tint === null) {
      this.previewSprite.clearTint();
    } else {
      this.previewSprite.setTint(tint);
    }
  }

  private moveAppearance(delta: number): void {
    const next = (this.appearanceIndex + delta + APPEARANCE_OPTIONS.length) % APPEARANCE_OPTIONS.length;
    this.setAppearanceIndex(next);
  }

  private confirmAndStart(): void {
    setPlayerAppearance(APPEARANCE_OPTIONS[this.appearanceIndex]);
    const inputEl = this.nameInput.node as HTMLInputElement;
    setPlayerName(inputEl.value);
    this.scene.start('WorldScene');
  }

  private releaseTouchHandlers(): void {
    touchControls.onDirectionPress = null;
    touchControls.onA = null;
  }
}
