# Visual Ruler

Android-first on-screen ruler built with Expo + React Native.

## Features

- Landscape measure screen with bottom-edge ruler and a single sliding handle
- Teal + soft graphite UI; soft glowing readout
- Turtle fine-adjust (±0.1 mm) and gear settings
- Physical scale from display density + credit-card calibration (persisted)
- Units: cm / inch (locale-friendly decimals)
- Google AdMob **test** banner on settings/calibration/about; optional interstitial only after leaving those screens

## Run

```bash
cd f:\apps\expo\visual-ruler
npm install
npx expo start
```

Press `a` for Android emulator, or scan the QR with a **development build**.

### AdMob / native module

`react-native-google-mobile-ads` is **not** available in Expo Go. Use a dev client:

```bash
npx expo prebuild --platform android
npx expo run:android
```

Test App ID (Android): `ca-app-pub-3940256099942544~3347511713`  
Test banner / interstitial: package `TestIds` (or the Google demo unit IDs in `src/ads.ts`).

Swap plugin App IDs in `app.json` and unit IDs in `src/ads.ts` before production.
