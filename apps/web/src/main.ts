import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#172638',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 600
  },
  scene: [WorldScene],
  render: { pixelArt: true, antialias: false }
};

new Phaser.Game(config);
