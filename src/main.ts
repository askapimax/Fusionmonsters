import Phaser from 'phaser';
import { attachTouchControls } from './input/touchControls';
import { BattleScene } from './scenes/BattleScene';
import { CharacterCreationScene } from './scenes/CharacterCreationScene';
import { ConcordRegistryScene } from './scenes/ConcordRegistryScene';
import { DialogueScene } from './scenes/DialogueScene';
import { InventoryScene } from './scenes/InventoryScene';
import { PauseMenuScene } from './scenes/PauseMenuScene';
import { StorageScene } from './scenes/StorageScene';
import { WorldScene } from './scenes/WorldScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 480,
  backgroundColor: '#101018',
  parent: 'app',
  pixelArt: true,
  // Enables Phaser's DOM Element game objects (`this.add.dom(...)`), used
  // by CharacterCreationScene for real text-input name entry.
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    // Center only horizontally - on tall/narrow screens FIT leaves extra
    // vertical space, and top-aligning keeps that gap next to the control
    // bar below instead of splitting it above and below the game view.
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    width: 800,
    height: 480,
  },
  // CharacterCreationScene is first so Phaser auto-starts it instead of
  // WorldScene - it hands off to WorldScene itself (`this.scene.start
  // ('WorldScene')`) once the player confirms their appearance/name.
  scene: [CharacterCreationScene, WorldScene, PauseMenuScene, InventoryScene, ConcordRegistryScene, StorageScene, BattleScene, DialogueScene],
});

attachTouchControls('touch-controls');
