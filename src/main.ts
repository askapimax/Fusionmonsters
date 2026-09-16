import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 480,
  backgroundColor: '#101018',
  parent: 'app',
  pixelArt: true,
  scene: [WorldScene],
});
