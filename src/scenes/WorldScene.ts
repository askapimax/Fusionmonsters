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
import { NPCS } from '../data/npcs';
import { PROPS, type PropId } from '../data/props';
import { ZONE_SPAWN_TABLES, type ZoneId } from '../data/spawnTables';
import { TILES, TILE_IDS, TILE_SIZE, type TileId } from '../data/tiles';
import { TRAINERS } from '../data/trainers';
import { generateWildFusion, rollForEncounter } from '../data/wildEncounters';
import type { Fusion } from '../genetics/fusion';
import { mulberry32, randomSeed } from '../genetics/rng';
import { touchControls } from '../input/touchControls';
import { buildCreatureSVG, svgToDataUrl } from '../render/compositeSprite';
import { healPlayerFully } from '../state/party';
import { getPlayerAppearance } from '../state/player';
import { concordRegistry } from '../state/registry';
import { setWorldPosition } from '../state/worldPosition';
import { UI_THEME } from '../ui/panel';
import type { BattleStartData } from './BattleScene';
import type { DialogueStartData } from './DialogueScene';
import {
  FIELD_OFFICE_INTERIOR_NPCS,
  HEALING_SPOT as INTERIOR_HEALING_SPOT,
  ZONE_ID as FIELD_OFFICE_INTERIOR_ZONE_ID,
} from '../world/fieldOfficeInterior';
import {
  STARTING_ZONE_NPCS,
  STARTING_ZONE_TRAINERS,
  STARTING_ZONE_WILD_FUSIONS,
  ZONE_ID,
  type NpcPlacement,
  type WildFusionPlacement,
} from '../world/startingZone';
import {
  getWildFusionRespawnDelayMs,
  getWildFusionState,
  isWildFusionAlive,
  markWildFusionDefeated,
} from '../world/wildFusionState';
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
  /** Live map sprite for each currently-alive persistent wild-Fusion
   * placement (`STARTING_ZONE_WILD_FUSIONS`), keyed by placement id - see
   * `buildWildFusions`/`handleWildFusionDefeated` and
   * `src/world/wildFusionState.ts`. Absent entries are either defeated
   * (mid-respawn cooldown) or not yet spawned this `create()`. */
  private wildFusionSprites = new Map<string, Phaser.GameObjects.Image>();
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
   * so the scene isn't hardcoded to a single map. The trainer trigger below
   * is still Fernbrook-specific content, gated on
   * `this.zoneDef.zoneId === ZONE_ID` rather than being part of the generic
   * `ZoneDef` shape. The healing marker and NPC placements are gated the
   * same way, just per-zone (Fernbrook's NPC, the field-office interior's
   * healing marker + NPC - see `create()`). */
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
    // Save/load (TODO.md "Persistence & Platform"): publish the spawn
    // position so a save taken before the player's first step still has
    // something to restore - see `src/state/worldPosition.ts`.
    setWorldPosition(this.zoneDef.zoneId, this.gridCol, this.gridRow);
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
    // The healing marker/NPC placements below aren't part of the generic
    // `ZoneDef` shape yet, so each zone that wants either is still gated by
    // its own `zoneId` check (see the class-level comment on `zoneDef`).
    // The field-office interior (TODO "Make the Concord field office
    // enterable") is the second zone to need this, alongside Fernbrook.
    if (this.zoneDef.zoneId === ZONE_ID) {
      this.buildNpcs(STARTING_ZONE_NPCS);
      this.buildWildFusions();
    } else if (this.zoneDef.zoneId === FIELD_OFFICE_INTERIOR_ZONE_ID) {
      this.buildHealingSpot(INTERIOR_HEALING_SPOT);
      this.buildNpcs(FIELD_OFFICE_INTERIOR_NPCS);
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
   * for other object-less UI) placed at `spot`. Blocks its own tile so the
   * player has to approach and face it, the same interaction shape NPCs
   * use. Originally stood just outside the field office's door
   * (Fernbrook-only) before the interior existed; now placed inside it
   * instead (see `HEALING_SPOT` in `../world/fieldOfficeInterior.ts`) -
   * only called when `this.zoneDef.zoneId === FIELD_OFFICE_INTERIOR_ZONE_ID`. */
  private buildHealingSpot(spot: ZoneSpawn): void {
    const x = this.tileCenterX(spot.col);
    const y = spot.row * TILE_SIZE + TILE_SIZE / 2;
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

    this.blockedTiles.add(`${spot.col},${spot.row}`);
  }

  /** NPC entity system (TODO.md "World & Exploration"): renders each entry
   * in `placements` as a static sprite (a single idle frame from the
   * shared player spritesheet, tinted per `NpcDef.tint` - see
   * `src/data/npcs.ts` for why there's no dedicated NPC art) posed facing
   * `NpcDef.facing`, and blocks its tile so the player has to approach and
   * face it, the same footprint-blocking shape `markFootprintBlocked`/
   * `buildHealingSpot` already use. Called once per zone that has NPC
   * placements (currently Fernbrook and the field-office interior - see
   * the `zoneId` gating in `create()`), each passing its own placement
   * list (`STARTING_ZONE_NPCS`/`FIELD_OFFICE_INTERIOR_NPCS`). */
  private buildNpcs(placements: NpcPlacement[]): void {
    for (const placement of placements) {
      const npc = NPCS[placement.npcId];
      const sprite = this.add
        .sprite(
          this.tileCenterX(placement.col),
          this.tileFloorY(placement.row),
          CHARACTER_TEXTURE_KEY,
          FACING_FRAMES[npc.facing].idle,
        )
        .setOrigin(0.5, 1)
        .setDepth(4);
      if (npc.tint !== null) {
        sprite.setTint(npc.tint);
      }
      this.blockedTiles.add(`${placement.col},${placement.row}`);
    }
  }

  /** Persistent wild-Fusion world entities + their 2-minute respawn timer
   * (TODO.md "Spawns & Encounters"). For each `STARTING_ZONE_WILD_FUSIONS`
   * placement: if it's currently alive (per the wall-clock state in
   * `src/world/wildFusionState.ts`, which is what actually survives a zone
   * transition - see that file's doc comment), spawn its map sprite now; if
   * it's mid-cooldown, schedule a real Phaser timer (`this.time.delayedCall`)
   * for exactly the *remaining* delay so it flips back to alive and
   * reappears at the right wall-clock moment even if some of its 2 minutes
   * already elapsed while the player was in a different zone. Fernbrook-only
   * - only called when `this.zoneDef.zoneId === ZONE_ID`. Unlike
   * `buildNpcs`/`buildHealingSpot`, placements here don't block their tile:
   * stepping onto one is the trigger (see `maybeTriggerWildFusionBattle`),
   * the same step-on shape `STARTING_ZONE_TRAINERS` already uses, chosen
   * over facing+interact since a wild creature standing in the open reads
   * closer to "walk up and it fights you" than an NPC you deliberately talk
   * to. */
  private buildWildFusions(): void {
    this.wildFusionSprites.forEach((sprite) => sprite.destroy());
    this.wildFusionSprites.clear();

    const spawnTable = ZONE_SPAWN_TABLES[this.zoneDef.zoneId];
    for (const placement of STARTING_ZONE_WILD_FUSIONS) {
      if (isWildFusionAlive(placement.id, spawnTable)) {
        const { fusion } = getWildFusionState(placement.id, spawnTable);
        this.spawnWildFusionSprite(placement, fusion);
      } else {
        const delay = getWildFusionRespawnDelayMs(placement.id);
        this.time.delayedCall(delay, () => this.respawnWildFusion(placement));
      }
    }
  }

  /** Same on-demand-texture-generation approach `BattleScene.ensureFusionTexture`
   * uses for battle sprites (cached by `fusion-${genome.id}`, so a Fusion
   * already seen in battle or elsewhere on the map reuses the same texture) -
   * duplicated here in miniature rather than shared, to keep the BattleScene
   * diff this round minimal (see TODO.md task notes). */
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

  private spawnWildFusionSprite(placement: WildFusionPlacement, fusion: Fusion): void {
    this.ensureFusionTexture(fusion, (key) => {
      // The texture loads asynchronously - guard against the sprite having
      // been re-defeated (unlikely, but possible) or this scene already
      // having moved on (a zone transition) by the time it's ready.
      if (!this.scene.isActive() && !this.scene.isPaused()) return;
      if (this.wildFusionSprites.has(placement.id)) return;
      const sprite = this.add
        .image(this.tileCenterX(placement.col), this.tileFloorY(placement.row) - TILE_SIZE / 4, key)
        .setOrigin(0.5, 1)
        .setDisplaySize(TILE_SIZE * 1.5, TILE_SIZE * 1.5)
        .setDepth(4);
      this.wildFusionSprites.set(placement.id, sprite);
    });
  }

  /** Called (via the timer `buildWildFusions` schedules) once a defeated
   * placement's cooldown has actually elapsed - re-checks `isWildFusionAlive`
   * (rather than assuming the timer firing means it's alive) since it's the
   * single source of truth, then re-spawns its sprite. */
  private respawnWildFusion(placement: WildFusionPlacement): void {
    if (this.zoneDef.zoneId !== ZONE_ID) return;
    const spawnTable = ZONE_SPAWN_TABLES[this.zoneDef.zoneId];
    if (!isWildFusionAlive(placement.id, spawnTable)) return;
    const { fusion } = getWildFusionState(placement.id, spawnTable);
    this.spawnWildFusionSprite(placement, fusion);
  }

  /** Stepping onto a placement's tile while it's alive starts a battle
   * against that specific placement's Fusion (not a freshly-rolled one),
   * with an outcome callback wired back to `handleWildFusionDefeated` - see
   * `BattleScene`'s `WildBattleStartData.onDefeatedOrCaptured`. Sibling
   * check to `maybeTriggerEncounter`/`maybeTriggerTrainerBattle`, same call
   * site (the movement tween's `onComplete`). Fernbrook-only. */
  private maybeTriggerWildFusionBattle(col: number, row: number): void {
    if (this.scene.isActive('BattleScene') || this.zoneDef.zoneId !== ZONE_ID) return;
    const placement = STARTING_ZONE_WILD_FUSIONS.find((p) => p.col === col && p.row === row);
    if (!placement) return;
    if (!this.wildFusionSprites.has(placement.id)) return; // already defeated / mid-cooldown

    const spawnTable = ZONE_SPAWN_TABLES[this.zoneDef.zoneId];
    const { fusion } = getWildFusionState(placement.id, spawnTable);
    concordRegistry.register(fusion.genome, fusion.phenotype);
    this.scene.pause();
    this.scene.launch('BattleScene', {
      wildFusion: fusion,
      onDefeatedOrCaptured: () => this.handleWildFusionDefeated(placement),
    } satisfies BattleStartData);
  }

  /** Outcome callback for a persistent wild-Fusion placement's battle - only
   * ever invoked on a win or a successful capture (see
   * `WildBattleStartData.onDefeatedOrCaptured`'s doc comment), never a run
   * or a loss. Removes its map sprite immediately and starts its 2-minute
   * respawn window (`markWildFusionDefeated`), scheduling this scene's own
   * Phaser timer to bring it back if the player is still around to see it. */
  private handleWildFusionDefeated(placement: WildFusionPlacement): void {
    markWildFusionDefeated(placement.id);
    this.wildFusionSprites.get(placement.id)?.destroy();
    this.wildFusionSprites.delete(placement.id);
    this.time.delayedCall(getWildFusionRespawnDelayMs(placement.id), () => this.respawnWildFusion(placement));
  }

  /** Faces the tile the player is currently facing and, if it's the healing
   * marker (interior zone only), fully restores the active Fusion's HP
   * (see `healPlayerFully`) with a brief on-screen confirmation; otherwise,
   * if it's a placed NPC, starts that NPC's dialogue (see
   * `maybeTalkToNpc`). Gated to the zones that currently have either
   * (Fernbrook for its NPC, the field-office interior for both - see the
   * matching `zoneId` gating in `create()`/`buildHealingSpot`/`buildNpcs`),
   * since neither is part of the generic `ZoneDef` shape yet. */
  private checkInteraction(): void {
    if (this.scene.isPaused() || this.moving) return;
    if (this.zoneDef.zoneId !== ZONE_ID && this.zoneDef.zoneId !== FIELD_OFFICE_INTERIOR_ZONE_ID) return;

    const { col: deltaCol, row: deltaRow } = DIRECTION_DELTA[this.facing];
    const facedCol = this.gridCol + deltaCol;
    const facedRow = this.gridRow + deltaRow;

    if (
      this.zoneDef.zoneId === FIELD_OFFICE_INTERIOR_ZONE_ID &&
      facedCol === INTERIOR_HEALING_SPOT.col &&
      facedRow === INTERIOR_HEALING_SPOT.row
    ) {
      healPlayerFully();
      this.showHealNotice();
      return;
    }

    const npcPlacements = this.zoneDef.zoneId === ZONE_ID ? STARTING_ZONE_NPCS : FIELD_OFFICE_INTERIOR_NPCS;
    this.maybeTalkToNpc(facedCol, facedRow, npcPlacements);
  }

  /** NPC entity system (TODO.md "World & Exploration"): if `(col, row)` has
   * a placed NPC in `placements`, pauses this scene and launches
   * `DialogueScene` with that NPC's lines, matching the documented caller
   * convention in `DialogueScene.ts` (pause first, so the underlying
   * scene's own input bindings - e.g. this scene's Enter-opens-pause-menu -
   * don't also react to the same keypress). Resumes this scene, and
   * re-binds `touchControls.onA` back to `checkInteraction` (see the
   * `resume` listener in `create()`), once the dialogue box closes. Only
   * ever called from `checkInteraction`, which picks the right placement
   * list for the current zone. */
  private maybeTalkToNpc(col: number, row: number, placements: NpcPlacement[]): void {
    const placement = placements.find((npc) => npc.col === col && npc.row === row);
    if (!placement) return;
    const npc = NPCS[placement.npcId];

    this.scene.pause();
    this.scene.launch('DialogueScene', {
      lines: npc.lines,
      onDone: () => this.scene.resume(),
    } satisfies DialogueStartData);
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
    // Save/load: keep the published position current on every step - see
    // `src/state/worldPosition.ts` / the `init()` call above.
    setWorldPosition(this.zoneDef.zoneId, this.gridCol, this.gridRow);
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
        this.maybeTriggerWildFusionBattle(targetCol, targetRow);
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
