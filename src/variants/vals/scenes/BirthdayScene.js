import Phaser from 'phaser';
import { GT, resolveStory } from '../../../data/GameText.js';
import { GameState } from '../../../GameState.js';

const COLORS = [0xff4466, 0xff9922, 0xffdd00, 0x44cc44, 0x2299ff, 0xbb44ff, 0xff66cc];

// Opening celebration scene. All text is editable via gametext.txt (celebration* keys).
export class BirthdayScene extends Phaser.Scene {
  constructor() { super('BirthdayScene'); }

  // Resolve a GT key (with {placeholder} substitution).
  _t(key) { return resolveStory(GT[key] || '', GameState.party || []); }

  create() {
    const { width, height } = this.scale;

    // ── Gradient background ───────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x220044, 0x440022, 0x001144, 0x002244, 1);
    bg.fillRect(0, 0, width, height);

    // ── Floating confetti ─────────────────────────────────────────────────
    for (let i = 0; i < 38; i++) {
      const g = this.add.graphics();
      const col = COLORS[i % COLORS.length];
      const size = Phaser.Math.Between(5, 11);
      g.fillStyle(col, 1);
      if (i % 3 === 0) g.fillRect(0, 0, size, size);
      else if (i % 3 === 1) g.fillCircle(size / 2, size / 2, size / 2);
      else g.fillTriangle(size / 2, 0, 0, size, size, size);
      g.x = Phaser.Math.Between(0, width);
      g.y = Phaser.Math.Between(-height, height);
      g.rotation = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: g,
        y: height + 20,
        x: g.x + Phaser.Math.Between(-60, 60),
        rotation: g.rotation + Phaser.Math.Between(-6, 6),
        duration: Phaser.Math.Between(3000, 7000),
        ease: 'Linear',
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: () => { g.x = Phaser.Math.Between(0, width); g.y = -20; }
      });
    }

    // ── Sparkle stars ─────────────────────────────────────────────────────
    for (let i = 0; i < 18; i++) {
      const star = this.add.text(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(10, height - 10),
        '✦', {
          fontSize: `${Phaser.Math.Between(14, 28)}px`,
          color: `#${COLORS[i % COLORS.length].toString(16).padStart(6, '0')}`
        }
      ).setAlpha(0).setOrigin(0.5);
      this.tweens.add({
        targets: star,
        alpha: { from: 0, to: 0.9 },
        scale: { from: 0.6, to: 1.2 },
        yoyo: true, repeat: -1,
        duration: Phaser.Math.Between(800, 2000),
        delay: Phaser.Math.Between(0, 2000),
        ease: 'Sine.easeInOut'
      });
    }

    // ── Banner (celebrationBanner) ────────────────────────────────────────
    const bannerTxt = this.add.text(width / 2, 70, this._t('celebrationBanner'), {
      fontFamily: 'serif', fontSize: '30px', color: '#ffee44',
      stroke: '#660000', strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true },
      align: 'center', wordWrap: { width: width - 20 }
    }).setOrigin(0.5);
    this.tweens.add({ targets: bannerTxt, scaleX: 1.06, scaleY: 1.06, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });

    // ── Big rainbow name (celebrationName) ────────────────────────────────
    const name = this._t('celebrationName');
    const letterW = Math.min(width / (name.length + 1), 44);
    const startX = width / 2 - (name.length - 1) * letterW / 2;
    name.split('').forEach((ch, i) => {
      const hex = '#' + COLORS[i % COLORS.length].toString(16).padStart(6, '0');
      const lt = this.add.text(startX + i * letterW, 145, ch, {
        fontFamily: 'serif', fontSize: '40px', color: hex,
        stroke: '#000000', strokeThickness: 3,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
      }).setOrigin(0.5);
      this.tweens.add({ targets: lt, y: 145 - 10, yoyo: true, repeat: -1, duration: 600 + i * 80, ease: 'Sine.easeInOut' });
    });

    // ── Dino illustration (drawn) ─────────────────────────────────────────
    const dino = this.add.graphics();
    const dx = width / 2, dy = 265;
    dino.fillStyle(0x44bb44, 1); dino.fillEllipse(dx, dy, 80, 55);
    dino.fillCircle(dx + 44, dy - 16, 26);
    dino.fillStyle(0x33aa33, 1); dino.fillEllipse(dx + 62, dy - 14, 26, 16);
    dino.fillStyle(0xffffff, 1); dino.fillCircle(dx + 48, dy - 22, 7);
    dino.fillStyle(0x000000, 1); dino.fillCircle(dx + 50, dy - 22, 4);
    dino.fillStyle(0xffffff, 1); dino.fillCircle(dx + 52, dy - 24, 2);
    dino.fillStyle(0x228822, 1); dino.fillCircle(dx + 67, dy - 16, 2);
    dino.lineStyle(2, 0x005500, 1);
    dino.beginPath(); dino.arc(dx + 60, dy - 8, 8, 0, Math.PI * 0.7); dino.strokePath();
    dino.fillStyle(0x22aa22, 1);
    [-30, -15, 0, 15].forEach((ox, i) => {
      dino.fillTriangle(dx + ox, dy - 26, dx + ox - 6, dy - 42 - i * 3, dx + ox + 6, dy - 42 - i * 3);
    });
    dino.fillStyle(0x44bb44, 1); dino.fillTriangle(dx - 40, dy, dx - 72, dy + 10, dx - 38, dy + 18);
    dino.fillStyle(0x33aa33, 1); dino.fillRect(dx - 20, dy + 22, 14, 18); dino.fillRect(dx + 6, dy + 22, 14, 18);
    dino.fillRect(dx + 28, dy - 2, 10, 14);
    dino.fillStyle(0xff4466, 1); dino.fillTriangle(dx + 44, dy - 42, dx + 32, dy - 30, dx + 56, dy - 30);
    dino.fillStyle(0xffdd00, 1); dino.fillCircle(dx + 44, dy - 44, 4);
    this.tweens.add({ targets: dino, y: '-=8', yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });

    // ── Message: greeting + body + signoff (all from GT) ──────────────────
    const lines = [];
    const greeting = this._t('celebrationGreeting');
    if (greeting) lines.push({ text: greeting, style: 'greeting' });
    this._t('celebrationBody').split('\n').forEach(l => lines.push({ text: l, style: 'body' }));
    const signoff = this._t('celebrationSignoff');
    if (signoff) {
      lines.push({ text: '', style: 'body' });
      signoff.split('\n').forEach(l => lines.push({ text: l, style: 'signoff' }));
    }

    const msgTop = 318, msgBottom = height - 52;
    const lineH = Math.min(28, (msgBottom - msgTop) / Math.max(lines.length, 1));
    lines.forEach((ln, i) => {
      if (!ln.text) return;
      const isG = ln.style === 'greeting', isS = ln.style === 'signoff';
      this.add.text(width / 2, msgTop + i * lineH, ln.text, {
        fontFamily: isG || isS ? 'serif' : 'sans-serif',
        fontStyle: isG ? 'italic' : 'normal',
        fontSize: isG ? '22px' : isS ? '20px' : '19px',
        color: isG ? '#ffdd88' : isS ? '#ffaacc' : '#ddeeff',
        stroke: '#000022', strokeThickness: 3,
        align: 'center', wordWrap: { width: width - 40 }
      }).setOrigin(0.5);
    });

    // ── Tap prompt (celebrationPrompt) ────────────────────────────────────
    const prompt = this.add.text(width / 2, height - 32, this._t('celebrationPrompt'), {
      fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', color: '#aaddff',
      align: 'center', wordWrap: { width: width - 20 }
    }).setOrigin(0.5).setAlpha(0.8);
    this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });

    // ── Tap anywhere → TitleScene (opens difficulty menu) ─────────────────
    this.input.once('pointerdown', () => {
      this.scene.start('TitleScene', { showDifficulty: true });
    });
  }
}
