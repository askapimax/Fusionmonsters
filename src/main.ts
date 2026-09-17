import Phaser from 'phaser';
import { attachTouchControls } from './input/touchControls';
import { BattleScene } from './scenes/BattleScene';
import { ConcordRegistryScene } from './scenes/ConcordRegistryScene';
import { InventoryScene } from './scenes/InventoryScene';
import { PauseMenuScene } from './scenes/PauseMenuScene';
import { WorldScene } from './scenes/WorldScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 480,
  backgroundColor: '#101018',
  parent: 'app',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    // Center only horizontally - on tall/narrow screens FIT leaves extra
    // vertical space, and top-aligning keeps that gap next to the control
    // bar below instead of splitting it above and below the game view.
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    width: 800,
    height: 480,
  },
  scene: [WorldScene, PauseMenuScene, InventoryScene, ConcordRegistryScene, BattleScene],
});

attachTouchControls('touch-controls');
