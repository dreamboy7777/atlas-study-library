# Atlas — setup guide

This guide is for the person setting up Atlas. No coding, server or paid account is required for the main app.

## 1. Get Atlas

Download the package for your device from the [download page](https://dreamboy7777.github.io/atlas-study-library/):

| Platform | File | First step |
|---|---|---|
| **Windows 10/11** | [`atlas-windows.zip`](https://github.com/dreamboy7777/atlas-study-library/releases/download/v1.0.0/atlas-windows.zip) | Unzip it, then double-click **`Start Atlas.bat`**. |
| **Android 7+** | [`atlas-android.apk`](https://github.com/dreamboy7777/atlas-study-library/releases/download/v1.0.0/atlas-android.apk) | Open the APK and allow installs from your browser or Files app. |
| **iPhone / iPad 15+** | [`atlas-ios.ipa`](https://github.com/dreamboy7777/atlas-study-library/releases/download/v1.0.0/atlas-ios.ipa) | Sideload with AltStore or Sideloadly. |

The iPhone IPA is **unsigned**. It will not install by tapping it in Safari, and there is no App Store build. Use a sideloading tool, then trust the developer profile in **Settings → General → VPN & Device Management**.

If you have the repository, you can also open **`atlas.html`** directly in Chrome or Edge. Use a normal window; private/incognito mode can block storage.

Everything stays on your device. The app does not need a server.

## 2. Create the admin account

1. On the first screen, click **Create account**.
2. Enter your name, a username and a password (at least 6 characters).
3. In **Admin password**, enter:

   ```text
   kellyisthecutest
   ```

4. Pick your batch and year, then create the account.

You are now the admin. The **Admin console**, **Modules** and **Site settings** links appear in the sidebar.

> If an account already exists, sign in and use **Admin access** in the sidebar with the admin password.

## 3. Change the admin password

Do this before sharing the app with anyone.

1. Sidebar → **Site settings**.
2. Scroll to **Admin password**.
3. Type a new password (at least 6 characters).
4. Click **Save settings**.

The default password is public in the source file, so changing it is important.

## 4. Make the site yours

Still in **Site settings**, you can change:

- **Site name** — shown in the header and browser tab.
- **Tagline** — the line on the sign-in screen.
- **Logo letter or emoji** — leave blank for the Atlas mark, or use a letter/emoji.
- **Theme** — Mint, Ocean, Rose, Amber or Violet.
- **Announcement** — a banner at the top of every page. Leave blank to hide it.
- **Footer note** — the small line at the bottom of the sidebar.

Click **Save settings**. Changes apply immediately.

## 5. Add your modules

1. Sidebar → **Modules**.
2. Fill in:
   - **Module code** — for example `SUR-401`.
   - **Title** — optional, for example `Surgery`.
   - **Year** — 1, 2 or 3.
   - **Kind** — horizontal or vertical.
   - **Semester** — optional.
3. Click **Add module**.

You can add as many modules as you need. Use **Edit** to change a custom module. The trash button removes it; if a file is already attached, remove the file first.

The 28 built-in modules are fixed. Your custom modules appear in the library, search, upload picker and module pages.

## 6. Upload the first files

1. Sidebar → **Upload a file**.
2. Pick a module, type and title.
3. Choose a PDF (25 MB max).
4. Leave **Publish immediately** checked, or uncheck it to review it first.
5. Click **Upload file**.

Approve, reject, unpublish or delete files from **Admin console**.

## 7. Invite students

Students create their own accounts with their name, username, password, batch and year. They do **not** need the admin password.

Batch access:

| Batch | Can open |
|---|---|
| 198 | Years 1, 2 and 3 |
| 199 | Years 1 and 2 |
| 200 | Year 1 |

Students only see the years their batch is allowed. Admins see all years.

## 8. Back up your library

1. Sidebar → **Admin console**.
2. Click **Export library**.
3. Keep the JSON file somewhere safe.

To restore, use **Import** on the same screen. Import merges by content hash, so importing the same backup twice is safe.

The export includes the PDFs, your custom modules and the site branding, and can be large. It does **not** include accounts, passwords or the admin passcode. On import, your current admin password is kept.

## 9. Reset before handing it on

If you want to give someone a completely fresh app:

1. Sidebar → **Site settings**.
2. Scroll to **Danger zone**.
3. Click **Factory reset this device**.
4. Type `RESET` to confirm.

This deletes every account, file, chat message, meme, sign-in record, custom module and setting in that browser. The app returns to the first-run screen with the default Atlas branding and the default admin password.

## Verify your downloads

Checksums for all three files are in [`downloads/SHA256SUMS.txt`](downloads/SHA256SUMS.txt). The [download page](https://dreamboy7777.github.io/atlas-study-library/) also shows the SHA-256 for each file and has copy buttons.

## Common questions

**Where are my files stored?**
In this browser's or app's local storage (IndexedDB). They are not uploaded anywhere. Clearing browser or app data deletes them, so keep backups.

**Can I use it on my phone?**
Yes. Use the Android APK or the iPhone IPA from the [download page](https://dreamboy7777.github.io/atlas-study-library/). The APK is debug-signed; the IPA is unsigned and needs a sideloading tool.

**Can two people use it at the same time?**
The single-file app is local to one browser profile. Multiple tabs on the same device can chat live. For multiple devices, you would need a real backend.

**I forgot the admin password.**
The default is `kellyisthecutest`. If it was changed, a factory reset restores the default but deletes all data. Export a backup first if possible.

**The PDF preview is blank.**
Use **Open in tab** or **Download**. Some browsers block embedded PDFs from local files.

**The page says storage is blocked.**
Use Chrome or Edge in a normal window. If you opened the file from inside a ZIP, extract it first.
