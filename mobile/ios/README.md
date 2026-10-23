# Atlas for iPhone and iPad

A small WKWebView wrapper around `atlas.html`.

## Requirements

- macOS with Xcode 15 or newer
- XcodeGen (`brew install xcodegen`)

## Build locally

From this folder:

```bash
xcodegen generate
xcodebuild \
  -project Atlas.xcodeproj \
  -scheme Atlas \
  -sdk iphoneos \
  -configuration Release \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build
```

Package the unsigned app:

```bash
mkdir -p Payload
cp -R build/Build/Products/Release-iphoneos/Atlas.app Payload/
zip -qry Atlas-unsigned.ipa Payload
```

## Build with GitHub Actions

Push a change under `mobile/` or `atlas.html` to `main`, or run **Build mobile apps** from the Actions tab. The macOS job installs XcodeGen, builds the app without code signing, and uploads the unsigned IPA.

## Installing the unsigned IPA

An unsigned IPA cannot be installed by tapping it in Safari. Use one of these sideloading tools on a computer:

- AltStore
- Sideloadly
- Xcode (with a free Apple ID)

The tool signs the app with your Apple ID. Free Apple ID signing usually expires after 7 days; a paid Apple Developer account gives longer-lived signatures.

## What the wrapper handles

- Full-screen WKWebView loading the bundled `atlas.html`
- Local storage and IndexedDB
- Document picker for PDF uploads
- `window.webkit.messageHandlers.atlas` bridge for PDF, meme, and JSON downloads; saved files open in the iOS share sheet
- Dark launch screen and app icon

