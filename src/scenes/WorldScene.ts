import Phaser from 'phaser';
import {
  APPEARANCE_TINTS,
  CHARACTER_SHEET_URL,
  CHARACTER_TEXTURE_KEY,
  CHAR_FRAME_HEIGHT,
  CHAR_FRAME_WIDTH,
  FACING_FRAMES,
  type FacingDirection,
} from '../data/character';
import { PROPS, type PropId } from '../data/props';
import { ZONE_SPAWN_TABLES, type ZoneId } from '../data/spawnTables';
import { TILES, TILE_IDS, TILE_SIZE, type TileId } from '../data/tiles';
import { TRAINERS } from '../data/trainers';
import { generateWildFusion, rollForEncounter } from '../data/wildEncounters';
import { mulberry32, randomSeed } from '../genetics/rng';
import { touchControls } from '../input/touchControls';
import { healPlayerFully } from '../state/party';
import { getPlayerAppearance } from '../state/player';
import { concordRegistry } from '../state/registry';
import { UI_THEME } from '../ui/panel';
import { HEALING_SPOT, STARTING_ZONE_TRAINERS, ZONE_ID } from '../world/startingZone';
import { ZONES, type ZoneDef } from '../world/zones';
import type { ZoneSpawn } from '../world/zoneTypes';

/**
 * Data `this.scene.restart({ zoneId, spawn })` passes into `init()` for a
 * zone transition (TODO "Zone-transition system"). Both fields are
 * optional so a plain `this.scene.start('WorldScene')` / the initial boot
 * (no data at all) still falls back to the default zone/spawn below.
 */
interface WorldSceneInitData {
  zoneId?: ZoneId;
  spawn?: ZoneSpawn;
}

const MOVE_DURATION = 160;
const WALK_ANIM_FRAME_RATE = 8;

const DIRECTION_DELTA: Record<FacingDirection, { col: number; row: number }> = {
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
};

/**
 * The first playable zone (of possibly several - see `../world/zones.ts`).
 * Spawns the player character (with the appearance chosen in
 * `CharacterCreationScene`, see `src/state/player.ts`) into whichever zone
 * `init()` loads (Fernbrook Outpost by default) and lets them walk around.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private facing: FacingDirection = 'down';
  private gridCol!: number;
  private gridRow!: number;
  private moving = false;
  private blockedTiles = new Set<string>();
  /** Trainer-battle placements (`STARTING_ZONE_TRAINERS`) already triggered this session - a one-time deterministic trigger, unlike wild encounters which re-roll every step. */
  private triggeredTrainerBattles = new Set<string>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private healNoticeText?: Phaser.GameObjects.Text;
  /** The zone currently loaded - see `../world/zones.ts`. Set in `init()`
   * so `this.scene.restart({ zoneId, spawn })` can swap it for a zone
   * transition (TODO "Zone-transition system"); everything below that used
   * to read `startingZone.ts`'s constants directly now reads this instead,
   * so the scene isn't hardcoded to a single map. The healing marker and
   * trainer trigger below are still Fernbrook-specific content, so they're
   * gated on `this.zoneDef.zoneId === ZONE_ID` rather than being part of
   * the generic `ZoneDef` shape. */
  private zoneDef!: ZoneDef;

  constructor() {
    super('WorldScene');
  }

  init(data: WorldSceneInitData = {}): void {
    this.zoneDef = ZONES[data.zoneId ?? ZONE_ID];
    const spawn = data.spawn ?? this.zoneDef.spawn;
    this.gridCol = spawn.col;
    this.gridRow = spawn.row;
    this.facing = 'down';
    this.moving = false;
    this.blockedTiles = new Set<string>();
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
    if (this.zoneDef.zoneId === ZONE_ID) {
      this.buildHealingSpot();
    }
    this.createPlayerAnimations();

    this.player = this.add
      .sprite(this.tileCenterX(this.gridCol), this.tileFloorY(this.gridRow), CHARACTER_TEXTURE_KEY, FACING_FRAMES.down.idle)
      .setOrigin(0.5, 1)
      .setDepth(10);
    // Cosmetic-only appearance choice from character creation - see
    // src/data/character.ts for why a tint stands in for a second sprite.
    const appearanceTint = APPEARANCE_TINTS[getPlayerAppearance()];
    if (appearanceTint !== null) {
      this.player.setTint(appearanceTint);
    }

    const worldWidth = this.zoneDef.cols * TILE_SIZE;
    const worldHeight = this.zoneDef.rows * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    const cameraZoom = 3;
    this.cameras.main.setZoom(cameraZoom);

    // `setScrollFactor(0)` only cancels the main camera's *scroll* - a
    // screen-space-fixed object is still run through the camera's zoom
    // transform, which Phaser anchors on the camera's *center*
    // (`centerX`/`centerY`), not its top-left corner (see
    // `Camera.preRender`: it builds the render matrix via
    // `applyITRS(centerX, centerY, ..., zoom, zoom)` then translates back
    // by `-centerX/-centerY`). So at zoom 3 this text was rendering 3x too
    // large and displaced far off the top-left of the canvas - not simply
    // "3x too far from the origin", since the origin the zoom scales
    // around isn't (0, 0) (see TODO.md "Battling" - HUD text invisible
    // under zoom). `hudPoint` inverts exactly that transform: solving
    // `screen = center + (world - center) * zoom` for `world` gives the
    // position that lands back on the intended on-screen pixel once the
    // real camera zoom is applied, and scaling the text by `1 / cameraZoom`
    // cancels the zoom back out of its rendered size. Chosen over a second
    // unzoomed UI camera to keep this fix contained to this one block while
    // an unrelated zone-content change is also landing in `WorldScene.ts`
    // this round.
    const camera = this.cameras.main;
    const hudPoint = (screenX: number, screenY: number) => ({
      x: camera.centerX + (screenX - camera.centerX) / cameraZoom,
      y: camera.centerY + (screenY - camera.centerY) / cameraZoom,
    });
    const hudPos = hudPoint(8, 8);
    this.add
      .text(
        hudPos.x,
        hudPos.y,
        `${this.zoneDef.zoneName}\nArrow keys / WASD, or the on-screen D-pad, to move\nEnter or Start to open the menu`,
        { fontSize: '11px', color: '#ffffff' },
      )
      .setScrollFactor(0)
      .setScale(1 / cameraZoom)
      .setDepth(100);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyW = this.input.keyboard!.addKey('W');
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyS = this.input.keyboard!.addKey('S');
    this.keyD = this.input.keyboard!.addKey('D');
    // A zone transition can restart this scene while a direction key is
    // still physically held (e.g. walking straight through an exit tile);
    // resetKeys() clears any stale isDown state on these freshly-created
    // Key objects so movement doesn't keep going in the new zone until the
    // player actually presses something again.
    this.input.keyboard!.resetKeys();

    touchControls.onStart = () => this.openMenu();
    this.input.keyboard!.on('keydown-ENTER', () => this.openMenu());

    // Interact-with-facing-tile binding (e.g. the healing marker below).
    // Z/on-screen-A match the convention menus already use for "confirm"
    // (see PauseMenuScene/InventoryScene/BattleScene). `touchControls.onA`
    // gets reclaimed by whichever menu/battle scene is on top while it's
    // open, so it's re-bound here on every WorldScene resume too.
    this.input.keyboard!.on('keydown-Z', () => this.checkInteraction());
    touchControls.onA = () => this.checkInteraction();
    this.events.on('resume', () => {
      touchControls.onA = () => this.checkInteraction();
    });
  }

  /** A small Graphics-drawn healing marker (no real pixel-art asset exists
   * for this yet, matching the plain-shape approach `src/ui/panel.ts` uses
   * for other object-less UI) placed just outside the field office's door -
   * see `HEALING_SPOT` in startingZone.ts for why it's outdoors for now.
   * Blocks its own tile so the player has to approach and face it, the
   * same interaction shape planned for NPCs (see TODO.md). Fernbrook-only -
   * only called when `this.zoneDef.zoneId === ZONE_ID`. */
  private buildHealingSpot(): void {
    const x = this.tileCenterX(HEALING_SPOT.col);
    const y = HEALING_SPOT.row * TILE_SIZE + TILE_SIZE / 2;
    const radius = TILE_SIZE * 0.4;

    const marker = this.add.graphics().setDepth(4);
    marker.fillStyle(0x2a6f8f, 1);
    marker.fillCircle(x, y, radius);
    marker.lineStyle(2, UI_THEME.border, 1);
    marker.strokeCircle(x, y, radius);
    // A simple plus/cross "heal" icon inside the marker.
    marker.fillStyle(UI_THEME.border, 1);
    const armLength = radius * 1.1;
    const armThickness = radius * 0.35;
    marker.fillRect(x - armThickness / 2, y - armLength / 2, armThickness, armLength);
    marker.fillRect(x - armLength / 2, y - armThickness / 2, armLength, armThickness);

    this.blockedTiles.add(`${HEALING_SPOT.col},${HEALING_SPOT.row}`);
  }

  /** Faces the tile the player is currently facing and, if it's the healing
   * marker, fully restores the active Fusion's HP (see `healPlayerFully`)
   * with a brief on-screen confirmation. This stands in for a real "Fusion
   * Center" NPC until the field office has an interior to put one in.
   * Fernbrook-only, matching `buildHealingSpot`. */
  private checkInteraction(): void {
    if (this.scene.isPaused() || this.moving || this.zoneDef.zoneId !== ZONE_ID) return;

    const { col: deltaCol, row: deltaRow } = DIRECTION_DELTA[this.facing];
    const facedCol = this.gridCol + deltaCol;
    const facedRow = this.gridRow + deltaRow;

    if (facedCol === HEALING_SPOT.col && facedRow === HEALING_SPOT.row) {
      healPlayerFully();
      this.showHealNotice();
    }
  }

  /** Rendered in world-space above the player (not `scrollFactor(0)` HUD
   * text) so it scales and positions correctly under the 3x-zoomed world
   * camera - a fixed-screen-space text here would be thrown off by the
   * camera zoom the same way `WorldScene`'s top-left instructions text
   * already is. */
  private showHealNotice(): void {
    this.healNoticeText?.destroy();
    this.healNoticeText = this.add
      .text(this.player.x, this.player.y - CHAR_FRAME_HEIGHT - 6, 'Fully healed!', {
        fontSize: '8px',
        color: UI_THEME.highlight,
        fontFamily: UI_THEME.fontFamily,
        backgroundColor: '#14141c',
        padding: { x: 3, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50);
    this.time.delayedCall(1600, () => {
      this.healNoticeText?.destroy();
      this.healNoticeText = undefined;
    });
  }

  private openMenu(): void {
    if (this.scene.isActive('PauseMenuScene')) return;
    this.scene.pause();
    this.scene.launch('PauseMenuScene');
  }

  private buildGroundLayer(): void {
    for (let row = 0; row < this.zoneDef.rows; row++) {
      for (let col = 0; col < this.zoneDef.cols; col++) {
        const tileId = this.zoneDef.ground[row][col];
        this.add.image(col * TILE_SIZE, row * TILE_SIZE, TILES[tileId].textureKey).setOrigin(0, 0);
      }
    }
  }

  private buildProps(): void {
    for (const placement of this.zoneDef.props) {
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
    // `this.anims` is the game-level AnimationManager, shared across scene
    // restarts - guard against re-creating the same keys when a zone
    // transition restarts this scene (see `init()`/`maybeTriggerZoneTransition`).
    for (const [direction, frames] of Object.entries(FACING_FRAMES) as [FacingDirection, typeof FACING_FRAMES.down][]) {
      if (this.anims.exists(`walk-${direction}`)) continue;
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
        // --- zone-transition check (TODO "Zone-transition system") ---
        // Sibling check to maybeTriggerEncounter/maybeTriggerTrainerBattle
        // below, same call site. Bails out of the rest of onComplete if it
        // fires, since the scene (and this whole instance's state) is about
        // to be torn down and rebuilt for the new zone by scene.restart().
        if (this.maybeTriggerZoneTransition(targetCol, targetRow)) return;
        // --- end zone-transition check ---
        this.maybeTriggerEncounter(targetCol, targetRow);
        this.maybeTriggerTrainerBattle(targetCol, targetRow);
      },
    });
  }

  /** Zone-transition system (TODO "Zone-transition system" - mechanism
   * only): if the tile the player just stepped onto is one of the current
   * zone's declared `ZONE_EXITS`, restart this scene into the target zone
   * at its target spawn tile. `scene.restart()` re-runs `init()`/
   * `preload()`/`create()` cleanly, so movement state, blocked tiles, and
   * ground/props all rebuild fresh for the new zone. Returns whether a
   * transition fired, so the caller can skip other on-step checks. */
  private maybeTriggerZoneTransition(col: number, row: number): boolean {
    const exit = this.zoneDef.exits.find((candidate) => candidate.col === col && candidate.row === row);
    if (!exit) return false;
    this.scene.restart({ zoneId: exit.targetZoneId, spawn: exit.targetSpawn } satisfies WorldSceneInitData);
    return true;
  }

  /** Pokemon-style random encounter: each step onto a tall-grass tile
   * (`TILES[...].encounterZone`) has a flat chance to start a wild battle
   * against a Fusion whose type is biased by this zone's spawn table.
   * See src/data/wildEncounters.ts and src/data/spawnTables.ts. */
  private maybeTriggerEncounter(col: number, row: number): void {
    const tileId: TileId = this.zoneDef.ground[row][col];
    if (!TILES[tileId].encounterZone) return;
    if (!rollForEncounter(mulberry32(randomSeed()))) return;

    const wildFusion = generateWildFusion(mulberry32(randomSeed()), ZONE_SPAWN_TABLES[this.zoneDef.zoneId]);
    concordRegistry.register(wildFusion.genome, wildFusion.phenotype);
    this.scene.pause();
    this.scene.launch('BattleScene', { wildFusion });
  }

  /** Trainer-battle trigger (TODO.md "Battling" - Trainer-battle type): stepping onto a
   * `STARTING_ZONE_TRAINERS` tile starts a trainer battle exactly once, deterministically
   * (no random roll, unlike `maybeTriggerEncounter`), via `BattleScene`'s trainer mode.
   * A standalone stand-in for the not-yet-built NPC-interaction system - see
   * src/world/startingZone.ts and src/data/trainers.ts. Fernbrook-only for now, same as
   * the healing marker, since `STARTING_ZONE_TRAINERS` isn't part of the generic `ZoneDef`
   * shape yet. */
  private maybeTriggerTrainerBattle(col: number, row: number): void {
    if (this.scene.isActive('BattleScene') || this.zoneDef.zoneId !== ZONE_ID) return;
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
    if (col < 0 || row < 0 || col >= this.zoneDef.cols || row >= this.zoneDef.rows) return false;
    if (this.blockedTiles.has(`${col},${row}`)) return false;
    const tileId: TileId = this.zoneDef.ground[row][col];
    return !TILES[tileId].solid;
  }

  private tileCenterX(col: number): number {
    return col * TILE_SIZE + TILE_SIZE / 2;
  }

  private tileFloorY(row: number): number {
    return row * TILE_SIZE + TILE_SIZE;
  }
}
