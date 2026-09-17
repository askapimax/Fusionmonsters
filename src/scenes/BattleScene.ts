import Phaser from 'phaser';
import { TYPES } from '../data/types';
import type { MoveDef } from '../data/moves';
import {
  applyDamage,
  applyMoveEffect,
  attemptCapture,
  computeDamage,
  createCombatant,
  determineTurnOrder,
  isFainted,
  resolveMoves,
  rollAccuracy,
  rollParalysisSkip,
  tickStatusDamage,
  type BattleCombatant,
} from '../battle/battleEngine';
import type { Fusion } from '../genetics/fusion';
import { mulberry32, pickRandom, randomSeed, type RNG } from '../genetics/rng';
import { buildCreatureSVG, svgToDataUrl } from '../render/compositeSprite';
import { touchControls } from '../input/touchControls';
import { addToRoster, getPlayerCurrentHp, getPlayerFusion, healPlayerFully, setPlayerCurrentHp } from '../state/party';
import { depositToStorage } from '../state/storage';
import type { TrainerDef } from '../data/trainers';
import { ITEMS_BY_ID } from '../data/items';
import { consumeItem, hasItem } from '../state/inventory';
import { drawPanel, UI_THEME } from '../ui/panel';

const SAMPLE_KIT_ITEM_ID = 'sample_kit';

/**
 * Launch data for BattleScene. Exactly one of `wildFusion`/`trainer` is
 * given:
 *  - `wildFusion`: the existing wild-encounter path (unchanged) - RUN AWAY
 *    is offered, and messages read "A wild Fusion appeared!".
 *  - `trainer`: trainer-battle mode (TODO.md "Battling" - Trainer-battle
 *    type) - no RUN AWAY (matching real trainer-battle conventions), and
 *    intro/outcome messages read as a trainer fight. Only `trainer.party[0]`
 *    is battled - multi-Fusion party switching is out of scope for now.
 *
 * `onDefeatedOrCaptured` (TODO.md "Spawns & Encounters" - Persistent
 * wild-Fusion world entities): an optional outcome signal back to whoever
 * launched this battle, called exactly once, only when the wild Fusion was
 * actually won against or successfully caught - never on a run or a loss,
 * both of which leave it exactly as it was. `WorldScene` passes this when
 * the wild Fusion being battled is a persistent placement (not a random
 * tall-grass encounter, which passes nothing here), so it can mark that
 * placement defeated and start its respawn timer. A live function works
 * fine through `scene.launch(key, data)` - Phaser passes launch data by
 * reference, not serialized.
 */
export interface WildBattleStartData {
  wildFusion: Fusion;
  trainer?: undefined;
  onDefeatedOrCaptured?: () => void;
}

export interface TrainerBattleStartData {
  trainer: TrainerDef;
  wildFusion?: undefined;
  onDefeatedOrCaptured?: () => void;
}

export type BattleStartData = WildBattleStartData | TrainerBattleStartData;

type BattlePhase = 'message' | 'menu' | 'busy';

interface HpBarRefs {
  graphics: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  width: number;
  height: number;
  maxHp: number;
  displayedHp: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 480;
const BOTTOM_PANEL_X = 10;
const BOTTOM_PANEL_Y = 356;
const BOTTOM_PANEL_WIDTH = 780;
const BOTTOM_PANEL_HEIGHT = 114;

function combatantLabel(fusion: Fusion, isPlayer: boolean): string {
  const p = fusion.phenotype;
  const typeName = p.secondaryType
    ? `${TYPES[p.primaryType].name}/${TYPES[p.secondaryType].name}`
    : TYPES[p.primaryType].name;
  return isPlayer ? `Your ${typeName} Fusion` : `Wild ${typeName} Fusion`;
}

/**
 * A single wild encounter's full turn-based battle, in the same dark-panel
 * pixel-art style as the rest of the UI - built as a full-screen scene
 * launched (and later stopped) on top of a paused WorldScene, exactly like
 * PauseMenuScene already does. Moves, damage, type effectiveness, status
 * effects and turn order all come from src/battle/battleEngine.ts; this
 * scene is just presentation + the message/menu flow on top of it.
 */
export class BattleScene extends Phaser.Scene {
  private wildFusionInput!: Fusion;
  /** Non-null in trainer-battle mode; null for the ordinary wild-encounter path. */
  private trainerInput: TrainerDef | null = null;
  /** See `WildBattleStartData.onDefeatedOrCaptured` above - null unless the
   * launcher passed one (only persistent wild-Fusion placements do). */
  private onDefeatedOrCaptured: (() => void) | null = null;
  private rng: RNG = mulberry32(randomSeed());

  private player!: BattleCombatant;
  private wild!: BattleCombatant;
  private playerMoves: MoveDef[] = [];

  private playerSprite!: Phaser.GameObjects.Image;
  private wildSprite!: Phaser.GameObjects.Image;
  private playerBar!: HpBarRefs;
  private wildBar!: HpBarRefs;

  private messageText!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private menuItems: string[] = [];
  private selectedIndex = 0;
  /** Index of 'SAMPLE KIT'/'RUN AWAY' within `menuItems` for the current
   * menu, or `null` when that option isn't offered this menu (trainer mode
   * for both, or no Sample Kit held). Set in `openMoveMenu`, read in
   * `confirmMenuSelection` - see the "Capture flow" addition below. */
  private sampleKitIndex: number | null = null;
  private runAwayIndex: number | null = null;

  private phase: BattlePhase = 'message';
  private messageQueue: string[] = [];
  private onQueueDone: (() => void) | null = null;

  constructor() {
    super('BattleScene');
  }

  init(data: BattleStartData): void {
    this.trainerInput = data.trainer ?? null;
    // In trainer mode the opponent's combatant is the trainer's first (and,
    // for now, only-battled) Fusion; everything downstream keeps treating
    // it as "the wild side" so the existing wild-encounter path is
    // untouched when trainerInput is null.
    this.wildFusionInput = this.trainerInput ? this.trainerInput.party[0] : (data.wildFusion as Fusion);
    this.onDefeatedOrCaptured = data.onDefeatedOrCaptured ?? null;
  }

  create(): void {
    this.rng = mulberry32(randomSeed());
    this.player = createCombatant(getPlayerFusion(), combatantLabel(getPlayerFusion(), true), getPlayerCurrentHp());
    this.wild = createCombatant(this.wildFusionInput, this.opponentLabel());

    this.buildBackground();
    this.buildHud();
    this.buildBottomPanel();
    this.bindInput();

    // Sprite textures are generated from the genome asynchronously (see
    // ensureFusionTexture below), so the intro message - and everything
    // that follows it - only starts once both are actually on screen.
    this.buildCombatantSprites(() => {
      this.say(this.introLines(), () => this.openMoveMenu());
    });

    this.events.once('shutdown', () => this.releaseInput());
  }

  /** The opponent's HUD label: "Wild <Type> Fusion" normally, "<Trainer>'s <Type> Fusion" in trainer mode. */
  private opponentLabel(): string {
    if (this.trainerInput) {
      const p = this.wildFusionInput.phenotype;
      const typeName = p.secondaryType
        ? `${TYPES[p.primaryType].name}/${TYPES[p.secondaryType].name}`
        : TYPES[p.primaryType].name;
      return `${this.trainerInput.name}'s ${typeName} Fusion`;
    }
    return combatantLabel(this.wildFusionInput, false);
  }

  /** Intro message lines: unchanged "A wild Fusion appeared!" for the wild path, a trainer-fight greeting otherwise. */
  private introLines(): string[] {
    const typeName = TYPES[this.wild.fusion.phenotype.primaryType].name;
    if (this.trainerInput) {
      return [`${this.trainerInput.name} wants to battle!`, `${this.trainerInput.name} sent out a ${typeName} type!`];
    }
    return [`A wild Fusion appeared!`, `It's a ${typeName} type!`];
  }

  // --- Scene setup -------------------------------------------------------

  private buildBackground(): void {
    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x18261c).setOrigin(0, 0).setDepth(0);
    this.add.tileSprite(0, 240, CANVAS_WIDTH, 240, 'tile-grass').setOrigin(0, 0).setDepth(1);
    this.add.ellipse(600, 210, 170, 48, 0x0f1a12, 0.55).setDepth(2);
    this.add.ellipse(210, 380, 200, 56, 0x0f1a12, 0.55).setDepth(2);
  }

  private ensureFusionTexture(fusion: Fusion, onReady: (key: string) => void): void {
    const key = `fusion-${fusion.genome.id}`;
    if (this.textures.exists(key)) {
      onReady(key);
      return;
    }
    this.textures.once(`addtexture-${key}`, () => onReady(key));
    const svg = buildCreatureSVG(fusion.phenotype, fusion.genome.visualSeed);
    this.textures.addBase64(key, svgToDataUrl(svg));
  }

  private buildCombatantSprites(onBothReady: () => void): void {
    let readyCount = 0;
    const markReady = (): void => {
      readyCount++;
      if (readyCount === 2) onBothReady();
    };

    this.ensureFusionTexture(this.wild.fusion, (key) => {
      this.wildSprite = this.add.image(600, 190, key).setDisplaySize(120, 120).setDepth(3).setAlpha(0);
      this.tweens.add({ targets: this.wildSprite, alpha: 1, duration: 300, delay: 100 });
      markReady();
    });
    this.ensureFusionTexture(this.player.fusion, (key) => {
      this.playerSprite = this.add.image(210, 320, key).setDisplaySize(150, 150).setDepth(3).setFlipX(true);
      markReady();
    });
  }

  private buildHud(): void {
    this.wildBar = this.buildInfoPanel(440, 20, this.wild);
    this.playerBar = this.buildInfoPanel(40, 226, this.player);
  }

  private buildInfoPanel(x: number, y: number, combatant: BattleCombatant): HpBarRefs {
    drawPanel(this, x, y, 320, 64).setDepth(10);
    this.add
      .text(x + 14, y + 8, combatant.label, { fontSize: '12px', color: UI_THEME.text, fontFamily: UI_THEME.fontFamily })
      .setDepth(11);

    const barX = x + 14;
    const barY = y + 32;
    const barWidth = 220;
    const barHeight = 10;
    const graphics = this.add.graphics().setDepth(11);
    const text = this.add
      .text(x + 250, y + 30, '', { fontSize: '11px', color: UI_THEME.textDim, fontFamily: UI_THEME.fontFamily })
      .setDepth(11);

    const bar: HpBarRefs = {
      graphics,
      text,
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
      maxHp: combatant.maxHp,
      displayedHp: combatant.currentHp,
    };
    this.drawHpBar(bar, bar.displayedHp);
    return bar;
  }

  private drawHpBar(bar: HpBarRefs, hp: number): void {
    const pct = Math.max(0, Math.min(1, hp / bar.maxHp));
    const color = pct > 0.5 ? 0x8fd6bd : pct > 0.2 ? 0xe0c14a : 0xe05a5a;
    bar.graphics.clear();
    bar.graphics.fillStyle(0x23232e, 1);
    bar.graphics.fillRoundedRect(bar.x, bar.y, bar.width, bar.height, 3);
    bar.graphics.fillStyle(color, 1);
    bar.graphics.fillRoundedRect(bar.x, bar.y, Math.max(0, bar.width * pct), bar.height, 3);
    bar.graphics.lineStyle(1, UI_THEME.slotBorder, 1);
    bar.graphics.strokeRoundedRect(bar.x, bar.y, bar.width, bar.height, 3);
    bar.text.setText(`${Math.max(0, Math.round(hp))}/${bar.maxHp}`);
  }

  private tweenHpBar(combatant: BattleCombatant): void {
    const bar = combatant === this.player ? this.playerBar : this.wildBar;
    const from = bar.displayedHp;
    const to = combatant.currentHp;
    if (from === to) return;
    this.tweens.addCounter({
      from,
      to,
      duration: 450,
      onUpdate: (tween) => {
        const value = tween.getValue() ?? to;
        bar.displayedHp = value;
        this.drawHpBar(bar, value);
      },
    });
  }

  private buildBottomPanel(): void {
    drawPanel(this, BOTTOM_PANEL_X, BOTTOM_PANEL_Y, BOTTOM_PANEL_WIDTH, BOTTOM_PANEL_HEIGHT).setDepth(20);
    this.messageText = this.add
      .text(BOTTOM_PANEL_X + 20, BOTTOM_PANEL_Y + 18, '', {
        fontSize: '15px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
        wordWrap: { width: BOTTOM_PANEL_WIDTH - 40 },
      })
      .setDepth(21);
    this.prompt = this.add
      .text(BOTTOM_PANEL_X + BOTTOM_PANEL_WIDTH - 26, BOTTOM_PANEL_Y + BOTTOM_PANEL_HEIGHT - 22, '▼', {
        fontSize: '14px',
        color: UI_THEME.highlight,
      })
      .setDepth(21)
      .setVisible(false);
    this.tweens.add({ targets: this.prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.add
      .zone(BOTTOM_PANEL_X, BOTTOM_PANEL_Y, BOTTOM_PANEL_WIDTH, BOTTOM_PANEL_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(22)
      .on('pointerdown', () => {
        if (this.phase === 'message') this.advanceMessage();
      });
  }

  // --- Input ---------------------------------------------------------------

  private bindInput(): void {
    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-UP', () => this.moveCursor(-1));
    keyboard.on('keydown-DOWN', () => this.moveCursor(1));
    keyboard.on('keydown-LEFT', () => this.moveCursor(-1));
    keyboard.on('keydown-RIGHT', () => this.moveCursor(1));
    keyboard.on('keydown-Z', () => this.pressA());
    keyboard.on('keydown-ENTER', () => this.pressA());
    keyboard.on('keydown-X', () => this.pressB());
    keyboard.on('keydown-ESC', () => this.pressB());

    touchControls.onDirectionPress = (direction) => {
      if (direction === 'up' || direction === 'left') this.moveCursor(-1);
      if (direction === 'down' || direction === 'right') this.moveCursor(1);
    };
    touchControls.onA = () => this.pressA();
    touchControls.onB = () => this.pressB();
  }

  private releaseInput(): void {
    touchControls.onDirectionPress = null;
    touchControls.onA = null;
    touchControls.onB = null;
  }

  private pressA(): void {
    if (this.phase === 'message') this.advanceMessage();
    else if (this.phase === 'menu') this.confirmMenuSelection();
  }

  private pressB(): void {
    if (this.phase === 'message') this.advanceMessage();
  }

  private moveCursor(delta: number): void {
    if (this.phase !== 'menu' || this.menuItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.menuItems.length) % this.menuItems.length;
    this.refreshMenuHighlight();
  }

  // --- Messages --------------------------------------------------------

  private say(lines: string[], onDone: () => void): void {
    this.phase = 'message';
    this.messageQueue = lines;
    this.onQueueDone = onDone;
    this.prompt.setVisible(true);
    this.advanceMessage();
  }

  private advanceMessage(): void {
    const next = this.messageQueue.shift();
    if (next === undefined) {
      const done = this.onQueueDone;
      this.onQueueDone = null;
      this.prompt.setVisible(false);
      done?.();
      return;
    }
    this.messageText.setText(next);
  }

  // --- Move menu ---------------------------------------------------------

  private openMoveMenu(): void {
    this.phase = 'menu';
    this.messageText.setText('');
    this.playerMoves = resolveMoves(this.player.fusion);
    this.menuItems = [...this.playerMoves.map((m) => m.name)];
    this.sampleKitIndex = null;
    this.runAwayIndex = null;
    // Trainer battles don't offer SAMPLE KIT (you can't sample-kit a
    // trainer's Fusion) or RUN AWAY (matching real trainer-battle
    // conventions, per TODO.md) - the wild-encounter path is unchanged,
    // except SAMPLE KIT is now also omitted when the player has none.
    if (!this.trainerInput) {
      if (hasItem(SAMPLE_KIT_ITEM_ID)) {
        this.sampleKitIndex = this.menuItems.length;
        this.menuItems.push('SAMPLE KIT');
      }
      this.runAwayIndex = this.menuItems.length;
      this.menuItems.push('RUN AWAY');
    }
    this.selectedIndex = 0;
    this.renderMenuItems();
  }

  private renderMenuItems(): void {
    this.clearMenuItems();
    const startX = BOTTOM_PANEL_X + 24;
    const startY = BOTTOM_PANEL_Y + 14;
    const colWidth = 280;
    const rowHeight = 26;

    this.menuItems.forEach((label, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * colWidth;
      const y = startY + row * rowHeight;
      const text = this.add
        .text(x, y, label, { fontSize: '14px', color: UI_THEME.text, fontFamily: UI_THEME.fontFamily })
        .setDepth(23)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          this.selectedIndex = index;
          this.refreshMenuHighlight();
        })
        .on('pointerdown', () => {
          this.selectedIndex = index;
          this.confirmMenuSelection();
        });
      this.menuTexts.push(text);
    });
    this.refreshMenuHighlight();
  }

  private refreshMenuHighlight(): void {
    this.menuTexts.forEach((text, index) => {
      text.setColor(index === this.selectedIndex ? UI_THEME.highlight : UI_THEME.text);
      text.setText((index === this.selectedIndex ? '> ' : '  ') + this.menuItems[index]);
    });
  }

  private clearMenuItems(): void {
    this.menuTexts.forEach((text) => text.destroy());
    this.menuTexts = [];
  }

  private confirmMenuSelection(): void {
    const index = this.selectedIndex;
    this.phase = 'busy';
    this.clearMenuItems();

    if (this.sampleKitIndex !== null && index === this.sampleKitIndex) {
      this.attemptSampleKit();
      return;
    }
    if (this.runAwayIndex !== null && index === this.runAwayIndex) {
      this.attemptRun();
      return;
    }
    this.resolveTurn(this.playerMoves[index]);
  }

  private attemptRun(): void {
    // Wild encounters are low-stakes with no capture/party system yet, so
    // fleeing always succeeds rather than risking a frustrating dead end.
    this.say(['Got away safely!'], () => this.endBattle());
  }

  // --- Capture flow (TODO.md "Spawns & Encounters" - Capture flow) ---------
  //
  // A clearly-delimited addition on top of the existing move/RUN AWAY
  // handling above rather than a restructuring of it: SAMPLE KIT slots into
  // the same menu/index machinery via `sampleKitIndex`, and everything below
  // is new. Only reachable in wild encounters (never trainer mode, see
  // `openMoveMenu`) and only when the player actually holds a kit.

  /** Uses one Sample Kit: consumes it, rolls the catch, and branches on the
   * result. A successful catch adds the wild Fusion to the roster and ends
   * the battle (or, if the roster is already full, degrades gracefully -
   * see `addToRoster`'s doc comment - by reporting the roster is full and
   * letting the battle continue rather than crashing or silently discarding
   * the Fusion; a real "release one?" prompt is future Fusion-storage work).
   * A failed catch ("It broke free!") gives the wild Fusion one free turn
   * (chosen over just reopening the move menu, since the wild Fusion
   * otherwise gets a completely free defensive action whenever the player
   * throws a kit, which would make spamming SAMPLE KIT strictly safer than
   * attacking - `giveWildFreeTurn` below reuses the exact same
   * `executeMove`/`runEndOfTurnStatus` pipeline a normal move turn uses, so
   * status damage/paralysis/fainting all behave identically to a real turn). */
  private attemptSampleKit(): void {
    const kit = ITEMS_BY_ID[SAMPLE_KIT_ITEM_ID];
    const kitStrength = kit && kit.effect.kind === 'capture' ? kit.effect.strength : 1;
    consumeItem(SAMPLE_KIT_ITEM_ID);

    this.say(['You used a Sample Kit!'], () => {
      const caught = attemptCapture(this.wild, kitStrength, this.rng);
      if (!caught) {
        this.say(['It broke free!'], () => this.giveWildFreeTurn());
        return;
      }

      this.onDefeatedOrCaptured?.();
      const added = addToRoster(this.wild.fusion);
      if (added) {
        this.say([`Gotcha! ${this.wild.label} was added to your roster!`], () => this.endBattle());
      } else {
        // Roster is already at MAX_ROSTER_SIZE (src/state/party.ts) - send
        // the catch to the Fusion-storage box instead of dropping it.
        depositToStorage(this.wild.fusion);
        this.say(
          [`Gotcha! ${this.wild.label} was caught!`, 'Your roster is full, so it was sent to storage.'],
          () => this.endBattle(),
        );
      }
    });
  }

  /** Gives the wild Fusion one action using the same move-execution and
   * end-of-turn-status pipeline `resolveTurn` uses for a normal exchange,
   * just without a matching player move (the player's "turn" was spent on
   * the failed capture attempt instead). */
  private giveWildFreeTurn(): void {
    const wildMoves = resolveMoves(this.wild.fusion);
    const wildMove = pickRandom(wildMoves, this.rng);
    this.executeMove(this.wild, this.player, wildMove, () => this.runEndOfTurnStatus());
  }

  // --- Turn resolution -----------------------------------------------------

  private resolveTurn(playerMove: MoveDef): void {
    const wildMoves = resolveMoves(this.wild.fusion);
    const wildMove = pickRandom(wildMoves, this.rng);
    const [first, second] = determineTurnOrder(this.player, this.wild, this.rng);
    const firstMove = first === this.player ? playerMove : wildMove;
    const secondMove = second === this.player ? playerMove : wildMove;

    this.executeMove(first, second, firstMove, () => {
      if (isFainted(first) || isFainted(second)) {
        this.checkOutcomeOrContinue();
        return;
      }
      this.executeMove(second, first, secondMove, () => this.runEndOfTurnStatus());
    });
  }

  private executeMove(user: BattleCombatant, target: BattleCombatant, move: MoveDef, onDone: () => void): void {
    if (rollParalysisSkip(user, this.rng)) {
      this.say([`${user.label} is fully paralyzed! It can't move!`], onDone);
      return;
    }

    this.playAttackAnimation(user, () => {
      if (!rollAccuracy(move, this.rng)) {
        this.say([`${user.label} used ${move.name}!`, 'But it missed!'], onDone);
        return;
      }

      const lines = [`${user.label} used ${move.name}!`];
      if (move.power > 0) {
        const result = computeDamage(user, target, move, this.rng);
        applyDamage(target, result.damage);
        this.flashHit(target);
        this.tweenHpBar(target);
        if (result.effectiveness > 1) lines.push("It's super effective!");
        else if (result.effectiveness < 1) lines.push("It's not very effective...");
      } else {
        lines.push(...applyMoveEffect(move, user, target, this.rng));
        this.tweenHpBar(user);
      }

      this.say(lines, () => {
        if (isFainted(target)) {
          this.say([`${target.label} fainted!`], onDone);
        } else {
          onDone();
        }
      });
    });
  }

  private runEndOfTurnStatus(): void {
    if (isFainted(this.player) || isFainted(this.wild)) {
      this.checkOutcomeOrContinue();
      return;
    }
    this.tickStatusSequence([this.player, this.wild], 0, () => this.checkOutcomeOrContinue());
  }

  private tickStatusSequence(list: BattleCombatant[], index: number, onDone: () => void): void {
    if (index >= list.length) {
      onDone();
      return;
    }
    const combatant = list[index];
    const result = tickStatusDamage(combatant);
    if (result.message) {
      this.tweenHpBar(combatant);
      this.say([result.message], () => {
        if (isFainted(combatant)) {
          this.say([`${combatant.label} fainted!`], () => this.tickStatusSequence(list, index + 1, onDone));
        } else {
          this.tickStatusSequence(list, index + 1, onDone);
        }
      });
    } else {
      this.tickStatusSequence(list, index + 1, onDone);
    }
  }

  private checkOutcomeOrContinue(): void {
    if (isFainted(this.wild)) {
      this.winBattle();
    } else if (isFainted(this.player)) {
      this.loseBattle();
    } else {
      this.openMoveMenu();
    }
  }

  private winBattle(): void {
    setPlayerCurrentHp(this.player.currentHp);
    this.onDefeatedOrCaptured?.();
    const message = this.trainerInput ? `You defeated ${this.trainerInput.name}!` : 'You won the battle!';
    this.say([message], () => this.endBattle());
  }

  private loseBattle(): void {
    // No Fusion Center / healing economy exists yet (see TODO.md), so a
    // loss can't be a dead end - the player's Fusion is healed and they're
    // returned to the field rather than getting stuck.
    healPlayerFully();
    const lines = this.trainerInput
      ? [`${this.trainerInput.name} defeated you!`, 'Your Fusion has no energy left...', 'You retreat and recover.']
      : ['Your Fusion has no energy left...', 'You retreat and recover.'];
    this.say(lines, () => this.endBattle());
  }

  private endBattle(): void {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }

  // --- Animations ----------------------------------------------------------

  private playAttackAnimation(user: BattleCombatant, onDone: () => void): void {
    const sprite = user === this.player ? this.playerSprite : this.wildSprite;
    const dx = user === this.player ? 24 : -24;
    this.tweens.add({
      targets: sprite,
      x: sprite.x + dx,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => onDone(),
    });
  }

  private flashHit(target: BattleCombatant): void {
    const sprite = target === this.player ? this.playerSprite : this.wildSprite;
    this.cameras.main.shake(120, 0.004);
    sprite.setTintFill(0xffffff);
    this.time.delayedCall(80, () => sprite.clearTint());
  }
}
