import Phaser from 'phaser';
import { attachTouchControls } from './input/touchControls';
import { BattleScene } from './scenes/BattleScene';
import { CharacterCreationScene } from './scenes/CharacterCreationScene';
import { ConcordRegistryScene } from './scenes/ConcordRegistryScene';
import { DialogueScene } from './scenes/DialogueScene';
import { InventoryScene } from './scenes/InventoryScene';
import { PauseMenuScene } from './scenes/PauseMenuScene';
import { TitleScreenScene } from './scenes/TitleScreenScene';
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
  // TitleScreenScene is first so Phaser auto-starts it instead of
  // WorldScene: NEW GAME starts CharacterCreationScene, which in turn
  // hands off to WorldScene (`this.scene.start('WorldScene')`) once the
  // player confirms their appearance/name.
  scene: [TitleScreenScene, CharacterCreationScene, WorldScene, PauseMenuScene, InventoryScene, ConcordRegistryScene, BattleScene, DialogueScene],
});

attachTouchControls('touch-controls');
