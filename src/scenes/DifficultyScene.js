import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { MusicSystem } from '../audio/MusicSystem.js';

// Difficulty selection as its own scene (previously an overlay dialog on TitleScene).
// Being a real scene gives it clean, reliable Back handling: Back → TitleScene, exactly
// like NameInputScene / SaveLoadScene. Flow: Title (NEW GAME) → DifficultyScene → NameInput.
export class DifficultyScene extends Phaser.Scene {
  constructor() { super('DifficultyScene'); }

  create() {
    const { width, height } = this.scale;
    const px = width / 2, py = height / 2;

    // Solid dark background — matches the old opaque overlay the panel used to sit on.
    this.add.rectangle(px, py, width, height, 0x000011, 1);

    MusicSystem.play('title'); // no-op if the title track is already playing

    // Panel
    const panelW = 300, panelH = 460;
    const panel = this.add.graphics().setDepth(11);
    panel.fillStyle(0x0a1833, 1);
    panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, 0x4488cc, 1);
    panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 12);

    this.add.text(px, py - 130, 'Select Difficulty', {
      fontSize: '28px', color: '#aaddff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(12);

    const options = [
      { label: 'Easy',   mult: 0.85, color: 0x44cc44, textColor: '#88ff88' },
      { label: 'Normal', mult: 1.5,  color: 0x4488cc, textColor: '#aaddff' },
      { label: 'Hard',   mult: 2.0,  color: 0xcc4444, textColor: '#ffaaaa' }
    ];

    options.forEach(({ label, mult, color, textColor }, i) => {
      const by = py - 60 + i * 72;
      const bg = this.add.graphics().setDepth(12);
      const draw = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? color : 0x112244, hover ? 0.9 : 0.8);
        bg.fillRoundedRect(px - 100, by - 24, 200, 48, 8);
        bg.lineStyle(2, color, 1);
        bg.strokeRoundedRect(px - 100, by - 24, 200, 48, 8);
      };
      draw(false);
      const txt = this.add.text(px, by, label, {
        fontSize: '32px', color: textColor, fontFamily: 'serif'
      }).setOrigin(0.5).setDepth(13);
      bg.setInteractive(new Phaser.Geom.Rectangle(px - 100, by - 24, 200, 48), Phaser.Geom.Rectangle.Contains);
      bg.on('pointerover',  () => { draw(true);  txt.setColor('#ffffff'); });
      bg.on('pointerout',   () => { draw(false); txt.setColor(textColor); });
      bg.on('pointerdown',  () => this.startNewGame(mult));
    });

    // Back button — inside the panel, away from the OS home indicator / nav bar
    const backY = py + panelH / 2 - 36;
    const backBg = this.add.graphics().setDepth(12);
    const drawBack = (hover) => {
      backBg.clear();
      backBg.fillStyle(hover ? 0x334466 : 0x1a2233, hover ? 1 : 0.9);
      backBg.fillRoundedRect(px - 80, backY - 22, 160, 44, 8);
      backBg.lineStyle(2, 0x6688aa, 1);
      backBg.strokeRoundedRect(px - 80, backY - 22, 160, 44, 8);
    };
    drawBack(false);
    const backTxt = this.add.text(px, backY, 'Back', {
      fontSize: '28px', color: '#99bbdd', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(13);
    backBg.setInteractive(new Phaser.Geom.Rectangle(px - 80, backY - 22, 160, 44), Phaser.Geom.Rectangle.Contains);
    backBg.on('pointerover',  () => { drawBack(true);  backTxt.setColor('#ffffff'); });
    backBg.on('pointerout',   () => { drawBack(false); backTxt.setColor('#99bbdd'); });
    backBg.on('pointerdown',  () => this.goBack());
  }

  // Android Back → return to the title screen (same as the on-screen Back button).
  handleBackButton() { this.goBack(); }

  goBack() { this.scene.start('TitleScene', {}); }

  startNewGame(mult = 1.5) {
    GameState.init();
    GameState.setDifficulty(mult);
    this.scene.start('NameInputScene');
  }
}
