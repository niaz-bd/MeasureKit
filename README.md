# MeasureKit

Android-first measure toolkit (on-screen + AR ruler and more) built with Expo + React Native (SDK 58).

- **On-screen:** back-camera viewfinder + dual full-height bars (gap = length); density + credit-card calibration
- **AR:** ViroReact / ARCore — tap two plane points for real-world distance (same cm/inch units). **Not in Expo Go.**

## AR testing

| Path | On-screen | AR |
|------|-----------|-----|
| `npm run start:go` (Expo Go) | Yes | Gated message → use `run:android` |
| `npx expo run:android` | Yes | Yes (ARCore device / Play Services for AR) |

AR UX: switch to **AR** → move phone to detect a plane → **tap** (or **Place** at crosshair) twice → readout shows distance → **Clear** to reset.

## Why “no app on this device can handle it”?

This project includes **`expo-dev-client`** and **`react-native-google-mobile-ads`**.  
Default `npx expo start` QR / links open a **custom development-build scheme** (`exp+measurekit://…`). Android shows that error when:

1. Expo Go is missing **or**
2. The custom MeasureKit native app is not installed (most common)

**AdMob is not in Expo Go.** Full ads require a native install via USB.

---

## Right now — pick one path

> If you see `runtime 'custom'` / “Unable to determine redirect location”, you started **without** `--go`. Stop Metro and use the Expo Go command below (or install a native build).

### A) Quick UI in Expo Go (no real ads)

**Exact command:**

```bash
cd f:\apps\expo\visual-ruler
npm install
npm run start:go
```

(`npm run start:go` = `EXPO_NO_ADMOB=1 expo start --go` — stubs AdMob in Metro so Expo Go never hits `RNGoogleMobileAdsModule`.)

1. Install **Expo Go** (SDK 58) from Play Store.
2. Same Wi‑Fi (or press `s` → tunnel).
3. Scan the QR **inside Expo Go**. Do not open `exp+…` links in Chrome.

JS never loads AdMob in Expo Go (TurboModule probe + lazy loader). Ads show a placeholder. Tap **Allow camera** for the live preview under the ruler.

### B) Full app + AdMob test ads (recommended)

1. Enable **Developer options → USB debugging** on the phone.
2. Plug in USB; run `adb devices` and accept the prompt until the device is listed.
3. On the PC:

```bash
cd f:\apps\expo\visual-ruler
npm install
npx expo run:android
```

That prebuilds native code, installs `com.visualruler.app`, and starts Metro. Later sessions:

```bash
npx expo start
```

…then open the installed **MeasureKit** app (not Expo Go).

---

## AdMob test IDs

Configured in `app.json` (plugin) and `src/ads.ts`:

| Kind | Android test ID |
|------|-----------------|
| App | `ca-app-pub-3940256099942544~3347511713` |
| Banner | `ca-app-pub-3940256099942544/6300978111` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |

Swap to production IDs before store release.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:go` | Force Expo Go protocol |
| `npm run android` | `expo run:android` (native + AdMob) |
| `npm run start` | Dev server (opens custom client if installed) |
