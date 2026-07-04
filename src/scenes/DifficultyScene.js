import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { pushBackModal, popBackModal } from '../ui/backHandler.js';

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
      { label: 'Easy',   id: 'easy',   mult: 0.85, color: 0x44cc44, textColor: '#88ff88' },
      { label: 'Normal', id: 'normal', mult: 1.5,  color: 0x4488cc, textColor: '#aaddff' },
      { label: 'Hard',   id: 'hard',   mult: 2.0,  color: 0xcc4444, textColor: '#ffaaaa' },
      // Insane: Hard's damage + the EXP gate (see GameState.expLevelCap) — heroes must
      // beat each boss at or below its recommended level (8/9/10) to keep leveling.
      { label: 'Insane', id: 'insane', mult: 2.0,  color: 0xcc22cc, textColor: '#ff66ff' }
    ];

    // 4 buttons × 62px spacing keeps the last one (bottom edge py+132) clear of the
    // Back button (top edge py+172).
    options.forEach(({ label, id, mult, color, textColor }, i) => {
      const by = py - 78 + i * 62;
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
      bg.on('pointerdown',  () => id === 'insane' ? this.showInsaneInfo(mult, id) : this.startNewGame(mult, id));
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

  // Tapping Insane explains the mode before starting (same dialog language as
  // QuitConfirm; hardware Back cancels via the back-modal stack).
  showInsaneInfo(mult, id) {
    const { width, height } = this.scale;
    const boxW = width - 60, boxH = 380, boxX = 30, boxY = height / 2 - boxH / 2;

    const overlay = this.add.graphics().setDepth(30);
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    const box = this.add.graphics().setDepth(31);
    box.fillStyle(0x0a0a22, 0.97);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 10);
    box.lineStyle(2, 0xcc22cc, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 10);

    const title = this.add.text(width / 2, boxY + 36, 'INSANE MODE', {
      fontSize: '30px', color: '#ff66ff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(32);

    const body = this.add.text(width / 2, boxY + 66,
      'Hard mode, PLUS:\n\n' +
      'Heroes stop earning experience points (EXP) when they reach the ' +
      'recommended level for fighting a boss until that boss is beaten.\n\n' +
      'Beat every boss at its recommended level!', {
        fontSize: '22px', color: '#ccddff', fontFamily: 'serif',
        wordWrap: { width: boxW - 44 }, align: 'center'
      }).setOrigin(0.5, 0).setDepth(32);

    const btnY = boxY + boxH - 40;
    const halfW = boxW / 2, btnH = 48;
    const noX = boxX + 16;          const noW = halfW - 28;
    const yesX = boxX + halfW + 12; const yesW = halfW - 28;

    let noBg, noLbl, noHit, yesBg, yesLbl, yesHit;
    const destroy = () => {
      popBackModal(this, destroy);
      overlay.destroy(); box.destroy(); title.destroy(); body.destroy();
      noBg.destroy(); noLbl.destroy(); noHit.destroy();
      yesBg.destroy(); yesLbl.destroy(); yesHit.destroy();
    };
    pushBackModal(this, destroy);

    noBg  = this.add.graphics().setDepth(32);
    noLbl = this.add.text(noX + noW / 2, btnY, 'Back', {
      fontSize: '28px', color: '#aaccff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(33);
    const drawNo = (hover) => {
      noBg.clear();
      noBg.fillStyle(hover ? 0x223355 : 0x111833, 1);
      noBg.fillRoundedRect(noX, btnY - btnH / 2, noW, btnH, 6);
      noBg.lineStyle(1.5, hover ? 0x6699cc : 0x334466, 1);
      noBg.strokeRoundedRect(noX, btnY - btnH / 2, noW, btnH, 6);
    };
    drawNo(false);
    noHit = this.add.rectangle(noX + noW / 2, btnY, noW, btnH)
      .setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });
    noHit.on('pointerover',  () => { drawNo(true);  noLbl.setColor('#ffffff'); });
    noHit.on('pointerout',   () => { drawNo(false); noLbl.setColor('#aaccff'); });
    noHit.on('pointerdown',  () => destroy());

    yesBg  = this.add.graphics().setDepth(32);
    yesLbl = this.add.text(yesX + yesW / 2, btnY, 'Bring it on!', {
      fontSize: '26px', color: '#ff66ff', fontFamily: 'serif'
    }).setOrigin(0.5).setDepth(33);
    const drawYes = (hover) => {
      yesBg.clear();
      yesBg.fillStyle(hover ? 0x551155 : 0x330833, 1);
      yesBg.fillRoundedRect(yesX, btnY - btnH / 2, yesW, btnH, 6);
      yesBg.lineStyle(1.5, hover ? 0xcc66cc : 0x663366, 1);
      yesBg.strokeRoundedRect(yesX, btnY - btnH / 2, yesW, btnH, 6);
    };
    drawYes(false);
    yesHit = this.add.rectangle(yesX + yesW / 2, btnY, yesW, btnH)
      .setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });
    yesHit.on('pointerover',  () => { drawYes(true);  yesLbl.setColor('#ffffff'); });
    yesHit.on('pointerout',   () => { drawYes(false); yesLbl.setColor('#ff66ff'); });
    yesHit.on('pointerdown',  () => { destroy(); this.startNewGame(mult, id); });
  }

  startNewGame(mult = 1.5, id) {
    GameState.init();
    GameState.setDifficulty(mult, id);
    this.scene.start('NameInputScene');
  }
}
