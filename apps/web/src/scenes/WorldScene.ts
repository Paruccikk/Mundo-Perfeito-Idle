import Phaser from 'phaser';

export class WorldScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private elapsed = 0;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x172638);

    // Grade isométrica provisória para validar escala e composição.
    const tileW = 96;
    const tileH = 48;
    const cols = 9;
    const rows = 7;
    const originX = width / 2;
    const originY = height / 2 - 40;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = originX + (col - row) * tileW / 2;
        const y = originY + (col + row) * tileH / 2;
        const tile = this.add.polygon(x, y, [
          0, -tileH / 2, tileW / 2, 0, 0, tileH / 2, -tileW / 2, 0
        ], (row + col) % 2 === 0 ? 0x315b4b : 0x294d42);
        tile.setStrokeStyle(1, 0x426b58, 0.8);
      }
    }

    // Formas temporárias: serão substituídas por sprites originais.
    this.add.circle(originX - 25, originY + 40, 15, 0x69b7ff);
    this.add.text(originX - 25, originY + 63, 'Aventureiro', {
      fontFamily: 'Arial', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.circle(originX + 100, originY + 90, 17, 0x8fc65b);
    this.add.text(originX + 100, originY + 114, 'Slime', {
      fontFamily: 'Arial', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(20, 18, 'MUNDO PERFEITO', {
      fontFamily: 'Arial', fontSize: '22px', color: '#f4d58d',
      fontStyle: 'bold'
    });

    this.statusText = this.add.text(20, 52, 'Protótipo visual — combate ainda não conectado à API', {
      fontFamily: 'Arial', fontSize: '13px', color: '#d9e4ef'
    });

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.resize(gameSize.width, gameSize.height);
    });
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta;
    if (this.elapsed >= 1000) {
      this.elapsed = 0;
      // Apenas demonstração visual. Não concede XP nem itens no cliente.
      this.statusText.setText('Mundo de teste carregado • recompensas serão calculadas pelo servidor');
    }
  }
}
