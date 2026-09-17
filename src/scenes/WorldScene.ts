import Phaser from 'phaser';
import {
  CHARACTER_SHEET_URL,
  CHARACTER_TEXTURE_KEY,
  CHAR_FRAME_HEIGHT,
  CHAR_FRAME_WIDTH,
  FACING_FRAMES,
  type FacingDirection,
} from '../data/character';
import { PROPS, type PropId } from '../data/props';
import { ZONE_SPAWN_TABLES } from '../data/spawnTables';
import { TILES, TILE_IDS, TILE_SIZE, type TileId } from '../data/tiles';
import { generateWildFusion, rollForEncounter } from '../data/wildEncounters';
import { TRAINERS } from '../data/trainers';
import { mulberry32, randomSeed } from '../genetics/rng';
import { touchControls } from '../input/touchControls';
import { concordRegistry } from '../state/registry';
import {
  MAP_COLS,
  MAP_ROWS,
  SPAWN,
  STARTING_ZONE_GROUND,
  STARTING_ZONE_PROPS,
  STARTING_ZONE_TRAINERS,
  ZONE_ID,
  ZONE_NAME,
} from '../world/startingZone';

const MOVE_DURATION = 160;
const WALK_ANIM_FRAME_RATE = 8;

const DIRECTION_DELTA: Record<FacingDirection, { col: number; row: number }> = {
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
};

/**
 * The first playable zone. No character creation yet (name/appearance) -
 * this scene just drops a default player character into Fernbrook Outpost
 * and lets them walk around, so world graphics/tuning can be iterated on
 * before character creation gets built on top of it.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private facing: FacingDirection = 'down';
  private gridCol = SPAWN.col;
  private gridRow = SPAWN.row;
  private moving = false;
  private blockedTiles = new Set<string>();
  /** Trainer-battle placements (`STARTING_ZONE_TRAINERS`) already triggered this session - a one-time deterministic trigger, unlike wild encounters which re-roll every step. */
  private triggeredTrainerBattles = new Set<string>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('WorldScene');
  }

  preload(): void {
    for (const id of TILE_IDS) {
      const tile = TILES[id];
      this.load.image(tile.textureKey, tile.url);
    }
    for (const prop of Object.values(PROPS)) {
      this.load.image(prop.textureKey, prop.url);
    }
    this.load.spritesheet(CHARACTER_TEXTURE_KEY, CHARACTER_SHEET_URL, {
      frameWidth: CHAR_FRAME_WIDTH,
      frameHeight: CHAR_FRAME_HEIGHT,
    });
  }

  create(): void {
    this.buildGroundLayer();
    this.buildProps();
    this.createPlayerAnimations();

    this.player = this.add
      .sprite(this.tileCenterX(this.gridCol), this.tileFloorY(this.gridRow), CHARACTER_TEXTURE_KEY, FACING_FRAMES.down.idle)
      .setOrigin(0.5, 1)
      .setDepth(10);

    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setZoom(3);

    this.add
      .text(
        8,
        8,
        `${ZONE_NAME}\nArrow keys / WASD, or the on-screen D-pad, to move\nEnter or Start to open the menu`,
        { fontSize: '11px', color: '#ffffff' },
      )
      .setScrollFactor(0)
      .setDepth(100);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyW = this.input.keyboard!.addKey('W');
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyS = this.input.keyboard!.addKey('S');
    this.keyD = this.input.keyboard!.addKey('D');

    touchControls.onStart = () => this.openMenu();
    this.input.keyboard!.on('keydown-ENTER', () => this.openMenu());
  }

  private openMenu(): void {
    if (this.scene.isActive('PauseMenuScene')) return;
    this.scene.pause();
    this.scene.launch('PauseMenuScene');
  }

  private buildGroundLayer(): void {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileId = STARTING_ZONE_GROUND[row][col];
        this.add.image(col * TILE_SIZE, row * TILE_SIZE, TILES[tileId].textureKey).setOrigin(0, 0);
      }
    }
  }

  private buildProps(): void {
    for (const placement of STARTING_ZONE_PROPS) {
      const def = PROPS[placement.type];
      this.add
        .image(placement.col * TILE_SIZE, placement.row * TILE_SIZE, def.textureKey)
        .setOrigin(0, 0)
        .setDepth(5);
      this.markFootprintBlocked(placement.type, placement.col, placement.row);
    }
  }

  private markFootprintBlocked(type: PropId, originCol: number, originRow: number): void {
    const def = PROPS[type];
    for (let dr = 0; dr < def.footprintRows; dr++) {
      for (let dc = 0; dc < def.footprintCols; dc++) {
        this.blockedTiles.add(`${originCol + dc},${originRow + dr}`);
      }
    }
  }

  private createPlayerAnimations(): void {
    for (const [direction, frames] of Object.entries(FACING_FRAMES) as [FacingDirection, typeof FACING_FRAMES.down][]) {
      this.anims.create({
        key: `walk-${direction}`,
        frames: [
          { key: CHARACTER_TEXTURE_KEY, frame: frames.idle },
          { key: CHARACTER_TEXTURE_KEY, frame: frames.walk1 },
          { key: CHARACTER_TEXTURE_KEY, frame: frames.idle },
          { key: CHARACTER_TEXTURE_KEY, frame: frames.walk2 },
        ],
        frameRate: WALK_ANIM_FRAME_RATE,
        repeat: -1,
      });
    }
  }

  update(): void {
    if (!this.player || this.moving) return;

    const direction = this.getInputDirection();
    if (!direction) {
      this.player.anims.stop();
      this.player.setFrame(FACING_FRAMES[this.facing].idle);
      return;
    }

    this.facing = direction;

    const { col: deltaCol, row: deltaRow } = DIRECTION_DELTA[direction];
    const targetCol = this.gridCol + deltaCol;
    const targetRow = this.gridRow + deltaRow;
    if (!this.isWalkable(targetCol, targetRow)) {
      this.player.anims.stop();
      this.player.setFrame(FACING_FRAMES[direction].idle);
      return;
    }

    this.moving = true;
    this.gridCol = targetCol;
    this.gridRow = targetRow;
    this.player.play(`walk-${direction}`);
    this.tweens.add({
      targets: this.player,
      x: this.tileCenterX(targetCol),
      y: this.tileFloorY(targetRow),
      duration: MOVE_DURATION,
      onComplete: () => {
        this.moving = false;
        this.player.anims.stop();
        this.player.setFrame(FACING_FRAMES[this.facing].idle);
        this.maybeTriggerEncounter(targetCol, targetRow);
        this.maybeTriggerTrainerBattle(targetCol, targetRow);
      },
    });
  }

  /** Pokemon-style random encounter: each step onto a tall-grass tile
   * (`TILES[...].encounterZone`) has a flat chance to start a wild battle
   * against a Fusion whose type is biased by this zone's spawn table.
   * See src/data/wildEncounters.ts and src/data/spawnTables.ts. */
  private maybeTriggerEncounter(col: number, row: number): void {
    const tileId: TileId = STARTING_ZONE_GROUND[row][col];
    if (!TILES[tileId].encounterZone) return;
    if (!rollForEncounter(mulberry32(randomSeed()))) return;

    const wildFusion = generateWildFusion(mulberry32(randomSeed()), ZONE_SPAWN_TABLES[ZONE_ID]);
    concordRegistry.register(wildFusion.genome, wildFusion.phenotype);
    this.scene.pause();
    this.scene.launch('BattleScene', { wildFusion });
  }

  /** Trainer-battle trigger (TODO.md "Battling" - Trainer-battle type): stepping onto a
   * `STARTING_ZONE_TRAINERS` tile starts a trainer battle exactly once, deterministically
   * (no random roll, unlike `maybeTriggerEncounter`), via `BattleScene`'s trainer mode.
   * A standalone stand-in for the not-yet-built NPC-interaction system - see
   * src/world/startingZone.ts and src/data/trainers.ts. */
  private maybeTriggerTrainerBattle(col: number, row: number): void {
    if (this.scene.isActive('BattleScene')) return;
    const placement = STARTING_ZONE_TRAINERS.find((t) => t.col === col && t.row === row);
    if (!placement) return;
    const key = `${placement.col},${placement.row}`;
    if (this.triggeredTrainerBattles.has(key)) return;
    this.triggeredTrainerBattles.add(key);

    const trainer = TRAINERS[placement.trainerId];
    concordRegistry.register(trainer.party[0].genome, trainer.party[0].phenotype);
    this.scene.pause();
    this.scene.launch('BattleScene', { trainer });
  }

  private getInputDirection(): FacingDirection | null {
    if (this.cursors.left.isDown || this.keyA.isDown) return 'left';
    if (this.cursors.right.isDown || this.keyD.isDown) return 'right';
    if (this.cursors.up.isDown || this.keyW.isDown) return 'up';
    if (this.cursors.down.isDown || this.keyS.isDown) return 'down';
    return touchControls.direction;
  }

  private isWalkable(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return false;
    if (this.blockedTiles.has(`${col},${row}`)) return false;
    const tileId: TileId = STARTING_ZONE_GROUND[row][col];
    return !TILES[tileId].solid;
  }

  private tileCenterX(col: number): number {
    return col * TILE_SIZE + TILE_SIZE / 2;
  }

  private tileFloorY(row: number): number {
    return row * TILE_SIZE + TILE_SIZE;
  }
}
