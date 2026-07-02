import Phaser from 'phaser';
import { MusicSystem } from '../audio/MusicSystem.js';
import { showQuitConfirm } from '../ui/QuitConfirm.js';

// Universal "Game Paused" overlay. Launched over a gameplay scene (which is paused
// via scene.pause) with audio suspended. Resume unfreezes; Quit (after confirm)
// tears down all game scenes and returns to the title. Android Back = Resume.
export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  init(data) { this.pausedKey = data && data.pausedKey; }

  create() {
    const { width, height } = this.scale;

    // Dim, input-blocking backdrop.
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    const boxW = width - 80, boxH = 250, boxX = 40, boxY = height / 2 - boxH / 2;
    const box = this.add.graphics();
    box.fillStyle(0x0a0a22, 0.98);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 12);
    box.lineStyle(2, 0x4488cc, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 12);

    this.add.text(width / 2, boxY + 52, 'Game Paused', {
      fontSize: '40px', color: '#ccddff', fontFamily: 'serif'
    }).setOrigin(0.5);

    const bW = boxW - 80;
    this._button(width / 2, boxY + 128, bW, 'Resume', '#aaddff', 0x112244, 0x4488cc, 0x224488, 0x88ccff,
      () => this.resumeGame());
    this._button(width / 2, boxY + 196, bW, 'Quit',   '#ffaaaa', 0x331122, 0x663344, 0x552233, 0xcc6699,
      () => this.quitGame());
  }

  _button(cx, cy, w, label, color, fill, border, fillHover, borderHover, onClick) {
    const h = 56, x = cx - w / 2, y = cy - h / 2;
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? fillHover : fill, 1);
      bg.fillRoundedRect(x, y, w, h, 8);
      bg.lineStyle(2, hover ? borderHover : border, 1);
      bg.strokeRoundedRect(x, y, w, h, 8);
    };
    draw(false);
    const txt = this.add.text(cx, cy, label, {
      fontSize: '32px', color, fontFamily: 'serif'
    }).setOrigin(0.5);
    const hit = this.add.rectangle(cx, cy, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(true);  txt.setColor('#ffffff'); });
    hit.on('pointerout',  () => { draw(false); txt.setColor(color); });
    hit.on('pointerdown', onClick);
  }

  // Android Back while paused resumes (toggle), matching the in-battle behaviour.
  handleBackButton() { this.resumeGame(); }

  resumeGame() {
    MusicSystem.resume();
    if (this.pausedKey) this.scene.resume(this.pausedKey);
    this.scene.stop();
  }

  quitGame() {
    showQuitConfirm(this, () => {
      MusicSystem.resume();
      // Tear down every running/sleeping/paused game scene, then hand off to the title.
      this.scene.manager.getScenes(false).forEach((s) => {
        const k = s.sys.settings.key;
        if (k !== 'PauseScene' && k !== 'TitleScene' && k !== 'BootScene') this.scene.stop(k);
      });
      this.scene.start('TitleScene', {});
    });
  }
}
