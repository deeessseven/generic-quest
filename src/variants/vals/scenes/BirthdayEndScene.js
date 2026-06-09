import Phaser from 'phaser';
import { GT, resolveStory } from '../../../data/GameText.js';
import { GameState } from '../../../GameState.js';

const PALETTE = [0xff3399, 0xff9900, 0xffee00, 0x00cc88, 0x3399ff, 0xcc44ff, 0xff6666];

// Victory celebration scene (after the final boss). All text editable via gametext.txt.
export class BirthdayEndScene extends Phaser.Scene {
  constructor() { super('BirthdayEndScene'); }

  _t(key) { return resolveStory(GT[key] || '', GameState.party || []); }

  create() {
    const { width: W, height: H } = this.scale;

    // ── Warm gradient background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x330011, 0x110033, 0x220022, 0x001133, 1);
    bg.fillRect(0, 0, W, H);

    // ── Balloons ──────────────────────────────────────────────────────────
    const balloonData = [
      { x: W * 0.12, col: 0xff3399 }, { x: W * 0.28, col: 0xff9900 },
      { x: W * 0.45, col: 0xffee00 }, { x: W * 0.62, col: 0x00cc88 },
      { x: W * 0.78, col: 0x3399ff }, { x: W * 0.92, col: 0xcc44ff },
    ];
    balloonData.forEach(({ x, col }, i) => {
      const startY = H * 0.55 + Phaser.Math.Between(-40, 40);
      const g = this.add.graphics();
      g.lineStyle(1, 0xffffff, 0.5);
      g.lineBetween(x, startY + 36, x + Phaser.Math.Between(-10, 10), H);
      g.fillStyle(col, 1); g.fillEllipse(x, startY, 44, 54);
      g.fillStyle(0xffffff, 0.3); g.fillEllipse(x - 8, startY - 10, 12, 18);
      g.fillStyle(col, 1); g.fillTriangle(x - 4, startY + 27, x + 4, startY + 27, x, startY + 35);
      this.tweens.add({ targets: g, y: `-=${Phaser.Math.Between(12, 22)}`, yoyo: true, repeat: -1, duration: 1400 + i * 200, ease: 'Sine.easeInOut' });
    });

    // ── Confetti rain ─────────────────────────────────────────────────────
    for (let i = 0; i < 45; i++) {
      const g = this.add.graphics();
      const col = PALETTE[i % PALETTE.length];
      const sz = Phaser.Math.Between(5, 10);
      g.fillStyle(col, 1);
      if (i % 3 === 0) g.fillRect(0, 0, sz, sz * 0.5);
      else if (i % 3 === 1) g.fillCircle(sz / 2, sz / 2, sz / 2);
      else g.fillTriangle(sz / 2, 0, 0, sz, sz, sz);
      g.x = Phaser.Math.Between(0, W);
      g.y = Phaser.Math.Between(-H, H * 0.5);
      g.rotation = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: g, y: H + 20, x: g.x + Phaser.Math.Between(-50, 50),
        rotation: g.rotation + Phaser.Math.Between(-5, 5),
        duration: Phaser.Math.Between(2500, 6000), ease: 'Linear', repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => { g.x = Phaser.Math.Between(0, W); g.y = -20; }
      });
    }

    // ── Sparkles ──────────────────────────────────────────────────────────
    ['✦', '✧', '★', '✨', '🌟'].forEach((sym, i) => {
      const s = this.add.text(
        Phaser.Math.Between(20, W - 20), Phaser.Math.Between(20, H * 0.4),
        sym, { fontSize: `${Phaser.Math.Between(18, 32)}px` }
      ).setOrigin(0.5).setAlpha(0);
      this.tweens.add({
        targets: s, alpha: { from: 0, to: 1 }, scale: { from: 0.5, to: 1.4 },
        yoyo: true, repeat: -1, duration: Phaser.Math.Between(700, 1800), delay: i * 300, ease: 'Sine.easeInOut'
      });
    });

    // ── Header (celebrationEndHeader) ─────────────────────────────────────
    const header = this.add.text(W / 2, 72, this._t('celebrationEndHeader'), {
      fontFamily: 'serif', fontSize: '32px', color: '#ffee44',
      stroke: '#883300', strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true },
      align: 'center', wordWrap: { width: W - 20 }
    }).setOrigin(0.5);
    this.tweens.add({ targets: header, scaleX: 1.07, scaleY: 1.07, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });

    // ── Title top + big (celebrationEndTitleTop / celebrationEndTitleBig) ──
    const hb = this.add.text(W / 2, 155, this._t('celebrationEndTitleTop'), {
      fontFamily: 'serif', fontSize: '46px', color: '#ff88cc',
      stroke: '#440022', strokeThickness: 5,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true },
      align: 'center', wordWrap: { width: W - 20 }
    }).setOrigin(0.5);
    this.tweens.add({ targets: hb, y: 148, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });

    const valTxt = this.add.text(W / 2, 220, this._t('celebrationEndTitleBig'), {
      fontFamily: 'serif', fontSize: '72px', color: '#ffdd44',
      stroke: '#553300', strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#330000', blur: 10, fill: true },
      align: 'center', wordWrap: { width: W - 20 }
    }).setOrigin(0.5);
    this.tweens.add({ targets: valTxt, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });

    // ── Divider ───────────────────────────────────────────────────────────
    this.add.text(W / 2, 295, '· · · ✦ · · ·', { fontFamily: 'serif', fontSize: '22px', color: '#cc88ff' }).setOrigin(0.5);

    // ── Body + signoff (celebrationEndBody / celebrationEndSignoff) ────────
    const lines = [];
    this._t('celebrationEndBody').split('\n').forEach(l => lines.push({ text: l, signoff: false }));
    const signoff = this._t('celebrationEndSignoff');
    if (signoff) {
      lines.push({ text: '', signoff: false });
      signoff.split('\n').forEach(l => lines.push({ text: l, signoff: true }));
    }
    const msgTop = 335, msgBottom = H - 52;
    const lineH = Math.min(32, (msgBottom - msgTop) / Math.max(lines.length, 1));
    lines.forEach((ln, i) => {
      if (!ln.text) return;
      this.add.text(W / 2, msgTop + i * lineH, ln.text, {
        fontFamily: ln.signoff ? 'serif' : 'sans-serif',
        fontStyle: ln.signoff ? 'italic' : 'normal',
        fontSize: '20px', color: ln.signoff ? '#ff88cc' : '#ddeeff',
        stroke: '#000022', strokeThickness: 3,
        align: 'center', wordWrap: { width: W - 40 }
      }).setOrigin(0.5);
    });

    // ── Tap prompt (celebrationEndPrompt) ─────────────────────────────────
    const prompt = this.add.text(W / 2, H - 32, this._t('celebrationEndPrompt'), {
      fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', color: '#aaddff',
      align: 'center', wordWrap: { width: W - 20 }
    }).setOrigin(0.5).setAlpha(0.8);
    this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });

    // ── Tap → TitleScene ──────────────────────────────────────────────────
    this.input.once('pointerdown', () => {
      this.cameras.main.fade(600, 0, 0, 0, false, (cam, p) => {
        if (p === 1) this.scene.start('TitleScene', {});
      });
    });
  }
}
