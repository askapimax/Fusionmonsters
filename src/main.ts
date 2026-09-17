import Phaser from 'phaser';
import { attachTouchControls } from './input/touchControls';
import { BattleScene } from './scenes/BattleScene';
import { BreedingScene } from './scenes/BreedingScene';
import { CatalogPreviewScene } from './scenes/CatalogPreviewScene';
import { CharacterCreationScene } from './scenes/CharacterCreationScene';
import { ConcordRegistryScene } from './scenes/ConcordRegistryScene';
import { DialogueScene } from './scenes/DialogueScene';
import { InventoryScene } from './scenes/InventoryScene';
import { PauseMenuScene } from './scenes/PauseMenuScene';
import { StorageScene } from './scenes/StorageScene';
import { TitleScreenScene } from './scenes/TitleScreenScene';
import { WorldScene } from './scenes/WorldScene';

// Debug-only escape hatch: ?debug=catalog-preview boots straight into
// CatalogPreviewScene (a visual proof of the catalog/breeding/render
// pipeline) instead of the normal character-creation/world flow. Phaser
// only auto-starts a scene array's first entry, so putting
// CatalogPreviewScene there - instead of separately calling
// `scene.start(...)` after the game boots - avoids leaving the normal boot
// scene's DOM elements running underneath it. Nothing else references this
// scene, so it's otherwise inert to a normal player.
const debugCatalogPreview = new URLSearchParams(window.location.search).get('debug') === 'catalog-preview';

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
  // TitleScreenScene is normally first so Phaser auto-starts it instead of
  // WorldScene: NEW GAME starts CharacterCreationScene, which in turn hands
  // off to WorldScene (`this.scene.start('WorldScene')`) once the player
  // confirms their appearance/name. CatalogPreviewScene swaps into that
  // first slot only when the debug flag above is set.
  scene: debugCatalogPreview
    ? [
        CatalogPreviewScene,
        TitleScreenScene,
        CharacterCreationScene,
        WorldScene,
        PauseMenuScene,
        InventoryScene,
        ConcordRegistryScene,
        StorageScene,
        BreedingScene,
        BattleScene,
        DialogueScene,
      ]
    : [
        TitleScreenScene,
        CharacterCreationScene,
        WorldScene,
        PauseMenuScene,
        InventoryScene,
        ConcordRegistryScene,
        StorageScene,
        BreedingScene,
        BattleScene,
        DialogueScene,
        CatalogPreviewScene,
      ],
});

attachTouchControls('touch-controls');
