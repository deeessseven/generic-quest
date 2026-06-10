# Store Release Guide — Generic Quest

How to ship a store app (Apple App Store + Google Play) from this repo. GitHub Pages is separate
and unaffected (it serves `docs/`, rebuilt with `npm run build:variants`).

## Model: one store app per variant

Each store app is **one variant** built lean, with its **own** app ID, name, icon, and signing key.
The personalized birthday variants stay on GitHub Pages only unless you deliberately ship them.

| Thing | Where it lives |
|---|---|
| GitHub Pages (base + all variants) | `docs/` — `npm run build:variants` |
| One native app's web build | `www/` (gitignored) — `node scripts/build-app.mjs <variant>` |
| Per-variant text | `variants/<id>/gametext.txt` |
| Per-variant art | `variants/<id>/custom-art/*.png` |

### App ID scheme (permanent — choose each leaf carefully)
Namespace `com.dacquery.*`, unique leaf per app:
- Boba Quest (base) → `com.dacquery.bobaquest`  ← current default in `capacitor.config.json`
- A future non-boba quest → `com.dacquery.<theme>`
- A birthday store edition → `com.dacquery.<name>` (e.g. `com.dacquery.valquest`)

The same ID must be used on **both** stores for a given app and can never change once published.

## Build the web app for a variant
```
node scripts/build-app.mjs            # base  → www/
node scripts/build-app.mjs val        # variant → www/
```
This produces a lean `www/` (one bundle), with the variant's gametext + art overlaid. Capacitor's
`webDir` is `www`. (`npm run cap:sync` builds the base app then syncs.)

## App icon + splash (do once per app, on Windows or Mac)
1. Put a 1024×1024 PNG at `resources/icon.png` (and optionally `resources/splash.png` 2732×2732).
2. `npm install -D @capacitor/assets`
3. `npx capacitor-assets generate`  → fills the native icon/splash sets.

## Signing — use Google Play App Signing (secure, recoverable)
**Never commit keystore passwords.** Keep them in a local file outside the repo
(e.g. `C:\Users\dshen\Desktop\AI\keystores\<app>.txt`).

The old `bobaquest-release.keystore` password was committed in git history → **compromised and
retired.** Generate a fresh **upload** key per app:
```
keytool -genkey -v -keystore <app>-upload.keystore -alias <app>upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
At Play Console → Release → Setup → App signing, enroll in **Play App Signing** and register this
upload key. Google holds the real signing key, so a lost upload key is recoverable.

## Android build (Windows)
> The existing `android/` project is LEGACY (old ID `com.bobaquest.myapp`, retired keystore).
> For each store app, regenerate it fresh so it picks up the new ID from `capacitor.config.json`:
```
node scripts/build-app.mjs <variant>     # or base
# (regenerate native project for a clean ID — back up android/ first if you want)
npx cap add android                       # only if android/ doesn't exist for this ID
npx cap sync android
# Configure release signing (upload key) in android/app/build.gradle + android/key.properties (gitignored)
cd android && ./gradlew bundleRelease     # → app/build/outputs/bundle/release/app-release.aab
```
Upload the `.aab` to Play Console → Production.

## iOS build (requires a Mac with Xcode)
On the Mac, after cloning the repo:
```
npm install                               # pulls @capacitor/ios (already in package.json)
node scripts/build-app.mjs <variant>      # or: npm run cap:sync
npx cap add ios                           # first time (needs CocoaPods: sudo gem install cocoapods)
npx cap sync ios
npx cap open ios                          # opens Xcode
```
In Xcode: set the Bundle Identifier to the app's `com.dacquery.<leaf>`, pick your Team (Automatic
signing), set Version + Build, then Product → Archive → Distribute App → App Store Connect.
Requires the **Apple Developer Program ($99/yr)** — enroll early; approval can take a day or two.

## Store listing checklist (both stores)
- Privacy policy URL: `https://deeessseven.github.io/generic-quest/privacy.html`
  (and `/<variant>/privacy.html` per variant). Edit the contact email in `public/privacy.html`.
- Data safety (Play) / App Privacy (Apple): **No data collected** — the game is offline, local-save only.
- Screenshots (per required device sizes), short + full description, app icon (1024px), age rating
  (turn-based fantasy combat → typically Everyone 10+/9+).
