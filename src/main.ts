import Phaser from 'phaser';
import { CatalogPreviewScene } from './scenes/CatalogPreviewScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 480,
  backgroundColor: '#101018',
  parent: 'app',
  scene: [CatalogPreviewScene],
});
