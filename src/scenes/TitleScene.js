import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { AvatarStore } from '../data/AvatarStore.js';
import { MusicSystem } from '../audio/MusicSystem.js';
import { BackgroundStore } from '../data/BackgroundStore.js';
import { GT, resolveStory } from '../data/GameText.js';
import { variant } from '../variants/registry.js';
import { App } from '@capacitor/app';
import { showQuitConfirm } from '../ui/QuitConfirm.js';
import { shareGame } from '../shareGame.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const { width, height } = this.scale;

    // Background — custom upload or procedural starfield
    if (BackgroundStore.hasCustom('bg_title') && this.textures.exists('bg_title')) {
      this.add.image(width / 2, height / 2, 'bg_title')
        .setDisplaySize(width, height)
        .setDepth(-1);
    } else {
      // Starfield
      for (let i = 0; i < 120; i++) {
        this.add.circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          Phaser.Math.FloatBetween(0.5, 2),
          0xffffff,
          Phaser.Math.FloatBetween(0.3, 1)
        );
      }
      // Gradient background
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x000022, 0x000022, 0x001144, 0x001144, 1);
      bg.fillRect(0, 0, width, height);
      bg.setDepth(-1);
    }

    const crystal = this.add.graphics();
    crystal.fillStyle(0x5c3317, 0.9);
    crystal.fillCircle(width/2, height*0.17, 28);
    crystal.fillStyle(0x3d1f0a, 0.95);
    crystal.fillCircle(width/2 - 8, height*0.165, 7);
    crystal.fillCircle(width/2 + 8, height*0.165, 7);
    crystal.fillCircle(width/2, height*0.18, 7);
    crystal.fillStyle(0x8b5e3c, 0.5);
    crystal.fillCircle(width/2 - 9, height*0.15, 3);
    crystal.fillCircle(width/2 + 6, height*0.14, 3);

    this.tweens.add({
      targets: crystal,
      alpha: { from: 0.6, to: 1 },
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Title text — split on first space so "Generic Quest" → "GENERIC" / "QUEST"
    const titleWords = resolveStory(GT.gameTitle).split(' ');
    const titleLine1 = titleWords[0].toUpperCase();
    const titleLine2 = titleWords.slice(1).join(' ').toUpperCase();

    const t1 = this.add.text(width / 2, height * 0.32 + 170, titleLine1, {
      fontFamily: 'serif',
      fontSize: '104px',
      color: '#aaddff',
      stroke: '#002255',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000044', blur: 8, fill: true }
    }).setOrigin(0.5);
    const maxTitleW = width * 0.92;
    if (t1.width > maxTitleW) t1.setScale(maxTitleW / t1.width);

    if (titleLine2) {
      const t2 = this.add.text(width / 2, height * 0.42 + 170, titleLine2, {
        fontFamily: 'serif',
        fontSize: '80px',
        color: '#ffdd88',
        stroke: '#553300',
        strokeThickness: 5,
        shadow: { offsetX: 2, offsetY: 2, color: '#331100', blur: 6, fill: true }
      }).setOrigin(0.5);
      if (t2.width > maxTitleW) t2.setScale(maxTitleW / t2.width);
    }

    // Menu buttons
    const menuY = height * 0.65 + 70;
    const hasSave = GameState.hasSave();

    this.newGameBtn = this.createMenuButton(width / 2, menuY, 'NEW GAME', () => variant.routes.newGame ? this.scene.start(variant.routes.newGame) : this.scene.start('DifficultyScene'));
    if (hasSave) {
      this.contBtn = this.createMenuButton(width / 2, menuY + 80, 'CONTINUE', () => this.openLoadScreen());
    }

    // Footer
    const footer = this.add.text(width / 2, height - 16, `© 2026 ${resolveStory(GT.gameTitle)}`, {
      fontSize: '22px', color: '#88bbff', fontFamily: 'monospace'
    }).setOrigin(0.5);
    // Small version number sitting just above the copyright (build-time __APP_VERSION__).
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
    if (appVersion) {
      this.add.text(width / 2, footer.y - footer.height / 2 - 4, `v${appVersion}`, {
        fontSize: '22px', color: '#88bbff', fontFamily: 'monospace'
      }).setOrigin(0.5, 1);
    }

    // ── Hero party row — sits below CONTINUE, above the version line ──
    // Hero textures are 512² with transparent padding; the visible sprite fills
    // the lower ~55% and touches the texture bottom, so anchor by bottom edge
    // and oversize the frame to make the visible pixels fill the gap.
    const contBottom = menuY + 80 + 30;
    const versionTop = footer.y - footer.height / 2 - 4 - 26;
    const heroBottom = versionTop - 6;
    const heroSize = Phaser.Math.Clamp((heroBottom - contBottom) / 0.55, 80, 185);
    const heroSpacing = heroSize * 0.68;
    ['hero1', 'hero2', 'hero3'].forEach((key, i) => {
      const img = this.add.image(width / 2 + (i - 1) * heroSpacing, heroBottom, this.titleHeroTexture(key))
        .setOrigin(0.5, 1)
        .setDisplaySize(heroSize, heroSize);
      this.tweens.add({
        targets: img, y: heroBottom - 5,
        duration: 1400, yoyo: true, repeat: -1,
        delay: i * 220, ease: 'Sine.easeInOut'
      });
    });

    // ── Quit button (top-left) — same action as Android Back on title ──
    this.createQuitButton(12, 12, 92, 60);
    // ── Share button (top-right, mirrors Quit) — system share sheet / clipboard fallback ──
    this._shareBusy = false;
    this.createShareButton(width - 12 - 92, 12, 92, 60);

    MusicSystem.play('title');

    // Floating particles
    this.time.addEvent({
      delay: 400, loop: true, callback: this.spawnParticle, callbackScope: this
    });
  }

  // Android Back on the title screen (top level) → confirm, then exit the app. App.exitApp()
  // is native-only — @capacitor/app's web implementation THROWS ("Not implemented on web"),
  // and since that throw happens inside the confirm dialog's fade-to-black completion callback,
  // it breaks Phaser's render loop and leaves the screen stuck fully faded to black (bug found
  // 2026-07-22: tapping Quit on web = permanent black screen). There's nothing to exit on web,
  // so skip the dialog there entirely — the button simply stays on the title screen, matching
  // what Android's hardware Back already does on a platform with no "quit the app" concept.
  handleBackButton() {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    showQuitConfirm(this, () => App.exitApp(), {
      message: `Quit ${resolveStory(GT.gameTitle)}?`,
      sub: '',
      confirmLabel: 'Quit'
    });
  }

  // Title-only copy of a hero texture with a white outline hugging the opaque
  // silhouette. The bundled hero art is mirrored at boot for battle scenes —
  // un-mirror it here so the title row matches the app icon. Player-uploaded
  // custom art is never mirrored at boot, so it keeps its orientation.
  // Regenerated on every title create() so mid-session art changes show up.
  titleHeroTexture(key) {
    const outKey = `${key}_title`;
    if (this.textures.exists(outKey)) this.textures.remove(outKey);
    const src = this.textures.getFrame(key).source.image;
    const S = 512, R = 8;
    const sil = document.createElement('canvas');
    sil.width = sil.height = S;
    const sx = sil.getContext('2d');
    sx.drawImage(src, 0, 0, S, S);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = '#ffffff';
    sx.fillRect(0, 0, S, S);
    const out = document.createElement('canvas');
    out.width = out.height = S + 2 * R;
    const ox = out.getContext('2d');
    if (AvatarStore._bundled.has(key)) {
      ox.translate(out.width, 0);
      ox.scale(-1, 1);
    }
    for (let a = 0; a < 16; a++) {
      ox.drawImage(sil, R + Math.round(Math.cos(a * Math.PI / 8) * R),
                        R + Math.round(Math.sin(a * Math.PI / 8) * R));
    }
    ox.drawImage(src, R, R, S, S);
    this.textures.addCanvas(outKey, out);
    return outKey;
  }

  // Two centered lines within a button's box, split from a single "Word Word" label on its LAST
  // space (falls back to one line, shown on the top slot, if there's no space — e.g. a custom
  // single-word override). fontSize/offsets tuned so two lines fit inside a 40px-tall button
  // without crowding. Returns the two Text objects so callers can recolor both on hover.
  _twoLineLabel(x, y, w, h, label) {
    const idx = label.lastIndexOf(' ');
    const line1 = idx < 0 ? label : label.slice(0, idx);
    const line2 = idx < 0 ? '' : label.slice(idx + 1);
    // Font/offset scale with h (not fixed pixels) so this stays correct if the button height
    // changes again: at h=60 this is 22px font, ±14px offsets (28px line-center spacing —
    // still clears the ~25px two-line box a 22px font needs, so lines don't crowd each other).
    const fontSize = Math.round(h * 0.367);
    const dy = Math.round(h * 0.233);
    const make = (text, off) => {
      const t = this.add.text(x + w / 2, y + h / 2 + off, text, {
        fontSize: `${fontSize}px`, color: '#aaddff', fontFamily: 'serif'
      }).setOrigin(0.5);
      if (text && t.width > w - 10) t.setScale((w - 10) / t.width);
      return t;
    };
    return [make(line1, -dy), make(line2, dy)];
  }

  createQuitButton(x, y, w, h) {
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x224488 : 0x112244, 0.9);
      bg.fillRoundedRect(x, y, w, h, 8);
      bg.lineStyle(2, hover ? 0x88ccff : 0x4488cc, 1);
      bg.strokeRoundedRect(x, y, w, h, 8);
    };
    draw(false);
    const [t1, t2] = this._twoLineLabel(x, y, w, h, GT.btnQuitGame);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover', () => { draw(true);  t1.setColor('#ffffff'); t2.setColor('#ffffff'); });
    bg.on('pointerout',  () => { draw(false); t1.setColor('#aaddff'); t2.setColor('#aaddff'); });
    bg.on('pointerdown', () => this.handleBackButton());
  }

  createShareButton(x, y, w, h) {
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x224488 : 0x112244, 0.9);
      bg.fillRoundedRect(x, y, w, h, 8);
      bg.lineStyle(2, hover ? 0x88ccff : 0x4488cc, 1);
      bg.strokeRoundedRect(x, y, w, h, 8);
    };
    draw(false);
    const [t1, t2] = this._twoLineLabel(x, y, w, h, GT.btnShareGame);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover', () => { draw(true);  t1.setColor('#ffffff'); t2.setColor('#ffffff'); });
    bg.on('pointerout',  () => { draw(false); t1.setColor('#aaddff'); t2.setColor('#aaddff'); });
    bg.on('pointerdown', async () => {
      if (this._shareBusy) return;
      this._shareBusy = true;
      try {
        const r = await shareGame();
        if (r === 'copied' && this.scene.isActive()) this._toast(GT.toastLinkCopied);
        else if (r === 'failed' && this.scene.isActive()) this._toast(GT.toastShareFailed);
      } finally { this._shareBusy = false; }
    });
    return bg;
  }

  // Brief self-destroying toast (matches MenuScene._showToast's styling for consistency).
  _toast(msg) {
    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height * 0.85, msg, {
      fontSize: '26px', color: '#ffaa44', fontFamily: 'serif',
      backgroundColor: '#000022', padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(1800, () => txt.destroy());
  }

  createMenuButton(x, y, label, callback) {
    const btn = this.add.graphics();
    btn.fillStyle(0x112244, 0.9);
    btn.fillRoundedRect(-110, -30, 220, 60, 10);
    btn.lineStyle(2, 0x4488cc, 1);
    btn.strokeRoundedRect(-110, -30, 220, 60, 10);
    btn.setPosition(x, y).setInteractive(
      new Phaser.Geom.Rectangle(-110, -30, 220, 60),
      Phaser.Geom.Rectangle.Contains
    );

    const txt = this.add.text(x, y, label, {
      fontSize: '40px', color: '#aaddff',
      fontFamily: 'serif',
      shadow: { offsetX: 1, offsetY: 1, color: '#000044', blur: 4, fill: true }
    }).setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x224488, 1);
      btn.fillRoundedRect(-110, -30, 220, 60, 10);
      btn.lineStyle(2, 0x88ccff, 1);
      btn.strokeRoundedRect(-110, -30, 220, 60, 10);
      txt.setColor('#ffffff');
    });
    btn.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x112244, 0.9);
      btn.fillRoundedRect(-110, -30, 220, 60, 10);
      btn.lineStyle(2, 0x4488cc, 1);
      btn.strokeRoundedRect(-110, -30, 220, 60, 10);
      txt.setColor('#aaddff');
    });
    btn.on('pointerdown', () => {
      this.cameras.main.flash(300, 255, 255, 255, false, () => callback());
    });

    return btn;
  }

  spawnParticle() {
    const { width, height } = this.scale;
    const x = Phaser.Math.Between(0, width);
    const p = this.add.circle(x, height + 4, Phaser.Math.Between(2, 5), 0x4488ff, 0.7);
    this.tweens.add({
      targets: p,
      y: -10,
      x: x + Phaser.Math.Between(-30, 30),
      alpha: 0,
      duration: Phaser.Math.Between(2000, 4000),
      ease: 'Cubic.Out',
      onComplete: () => p.destroy()
    });
  }

  openLoadScreen() {
    this.scene.start('SaveLoadScene', { mode: 'load', returnScene: 'TitleScene' });
  }
}
