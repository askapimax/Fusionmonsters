import Phaser from 'phaser';
import { CHARACTER_SPRITES } from '../data/character';
import { TILES, TILE_IDS, TILE_SIZE, type TileId } from '../data/tiles';
import { svgToDataUrl } from '../render/compositeSprite';
import { MAP_COLS, MAP_ROWS, SPAWN, STARTING_ZONE_MAP, ZONE_NAME } from '../world/startingZone';

type Direction = 'down' | 'up' | 'left' | 'right';

const MOVE_DURATION = 160;

/**
 * The first playable zone. No character creation yet (name/appearance) -
 * this scene just drops a default player character into Fernbrook Outpost
 * and lets them walk around, so world graphics/tuning can be iterated on
 * before character creation gets built on top of it.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private facing: Direction = 'down';
  private gridCol = SPAWN.col;
  private gridRow = SPAWN.row;
  private moving = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    Promise.all(this.registerTextures()).then(() => this.buildWorld());
  }

  private registerTextures(): Promise<void>[] {
    const pending: Promise<void>[] = [];
    const addTexture = (key: string, svg: string): void => {
      pending.push(
        new Promise<void>((resolve) => {
          this.textures.once(`addtexture-${key}`, () => resolve());
          this.textures.addBase64(key, svgToDataUrl(svg));
        }),
      );
    };
    for (const id of TILE_IDS) {
      addTexture(`tile-${id}`, TILES[id].svg);
    }
    for (const [direction, svg] of Object.entries(CHARACTER_SPRITES)) {
      addTexture(`player-${direction}`, svg);
    }
    return pending;
  }

  private buildWorld(): void {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileId = STARTING_ZONE_MAP[row][col];
        this.add.image(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, `tile-${tileId}`);
      }
    }

    this.player = this.add
      .image(this.tileCenterX(this.gridCol), this.tileFloorY(this.gridRow), 'player-down')
      .setOrigin(0.5, 1)
      .setDepth(10);

    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setZoom(1.6);

    this.add
      .text(8, 8, `${ZONE_NAME}\nArrow keys / WASD to move`, { fontSize: '11px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyW = this.input.keyboard!.addKey('W');
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyS = this.input.keyboard!.addKey('S');
    this.keyD = this.input.keyboard!.addKey('D');
  }

  update(): void {
    if (!this.player || this.moving) return;

    let deltaCol = 0;
    let deltaRow = 0;
    let direction: Direction | null = null;

    if (this.cursors.left.isDown || this.keyA.isDown) {
      deltaCol = -1;
      direction = 'left';
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      deltaCol = 1;
      direction = 'right';
    } else if (this.cursors.up.isDown || this.keyW.isDown) {
      deltaRow = -1;
      direction = 'up';
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      deltaRow = 1;
      direction = 'down';
    }

    if (!direction) return;

    this.facing = direction;
    this.applyFacingTexture();

    const targetCol = this.gridCol + deltaCol;
    const targetRow = this.gridRow + deltaRow;
    if (!this.isWalkable(targetCol, targetRow)) return;

    this.moving = true;
    this.gridCol = targetCol;
    this.gridRow = targetRow;
    this.tweens.add({
      targets: this.player,
      x: this.tileCenterX(targetCol),
      y: this.tileFloorY(targetRow),
      duration: MOVE_DURATION,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  private applyFacingTexture(): void {
    const key = this.facing === 'left' || this.facing === 'right' ? 'player-side' : `player-${this.facing}`;
    this.player.setTexture(key);
    this.player.setFlipX(this.facing === 'right');
  }

  private isWalkable(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return false;
    const tileId: TileId = STARTING_ZONE_MAP[row][col];
    return !TILES[tileId].solid;
  }

  private tileCenterX(col: number): number {
    return col * TILE_SIZE + TILE_SIZE / 2;
  }

  private tileFloorY(row: number): number {
    return row * TILE_SIZE + TILE_SIZE;
  }
}
