# Atlas mobile wrappers

This folder contains the native shells that package the single-file Atlas app for Android and iPhone.

Both wrappers load the same `atlas.html` used by the desktop app, so accounts, uploads, chat, memes, and admin settings stay local to the device. The only native code is for:

- a full-screen WebView
- the system file picker for PDF uploads
- a save bridge so PDF, meme, and JSON downloads work inside the wrapper

## Artifacts

The GitHub Actions workflow at `.github/workflows/build-mobile.yml` builds:

- `downloads/atlas-android.apk` (debug-signed, installable on Android 7+)
- `downloads/atlas-ios.ipa` (unsigned, for sideloading on iOS 15+)

The workflow runs automatically when `mobile/**` or `atlas.html` changes on `main`, and can also be started manually from the Actions tab.

## Android

See `android/README.md`.

## iPhone

See `ios/README.md`.
