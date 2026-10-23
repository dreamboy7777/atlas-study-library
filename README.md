# Atlas

A calm, searchable study library for medical students — one stable home per file instead of an endless Telegram scroll.

The product is **[`atlas.html`](atlas.html)**: one self-contained file you open in Chrome or Edge. No install, no server, no accounts with a cloud provider. The optional Next.js prototype in [`web/`](web/) is kept for reference.

## Quick start

### Option A — the single file (recommended)

1. Download or clone this repository.
2. Open **`atlas.html`** in Chrome or Edge.
3. Create the first account. Use the admin password **`kellyisthecutest`** to make yourself the admin. Accounts without it join as students.
4. Go to **Admin console → Site settings** and change the admin password immediately.

Everything — accounts, PDFs, memes, chat, reactions, sign-in history and preferences — is stored in that browser's IndexedDB. Sign-in lasts 30 days. The library starts empty, ready for real material.

> **Important:** if you received this as a ZIP, extract it first. Opening `atlas.html` from inside the ZIP will not persist data correctly.

### Option B — tiny local server

If you prefer a normal `http://` address:

```bash
npm start
# http://127.0.0.1:4321
```

No dependencies. Node 18+ only. The server is optional; the file works on its own.

## First-run checklist

- [ ] Open `atlas.html` and create the admin account.
- [ ] **Site settings → Admin password** — replace `kellyisthecutest`.
- [ ] **Site settings** — set the site name, tagline, logo letter/emoji, theme, announcement and footer.
- [ ] **Modules** — add the modules your batch actually uses. You can add as many as you need.
- [ ] **Upload a file** — add the first slides or past paper and publish it.
- [ ] **Admin console → Export library** — save a backup once you have real files.
- [ ] Invite students. They create their own accounts; they do not need the admin password.

## What is inside

| Area | What it does |
|---|---|
| **Library** | Batches 198/199/200, Years 1–3, 28 built-in modules plus unlimited custom modules, semester grouping, type/subject filters, search, PDF preview. |
| **Batch access** | **198 → Years 1–3**, **199 → Years 1–2**, **200 → Year 1**. The batch selector only shows allowed years; admins see all years. |
| **Accounts** | IndexedDB user table, salted SHA-256 passwords, batch + year, last-seen and sign-in counts. Choose a year at sign-up; confirm or switch it at sign-in. |
| **Admin gate** | The staff password upgrades the current account. Uploading, moderation, exports and settings are locked without it. |
| **Upload** | Admin-only PDFs, 25 MB max, publish now or send to the review queue; SHA-256 duplicate rejection. |
| **Reactions** | 👍 🔥 ❤️ 🤯 on every file, counted on rows and stored per account. |
| **Lounge chat** | One room, synced live between tabs with `BroadcastChannel`, unread badge. |
| **Meme break** | 36 canvas-drawn memes plus admin image uploads, a popup every 5 minutes (mutable), gallery and download. |
| **Saved** | Star files for later, stored per account. |
| **Admin console** | Review queue, reports, unpublish/delete, member database, sign-in log, export/import JSON. |
| **Site settings** | Rename the site, change the tagline/logo/theme/announcement/footer, rotate the admin password, factory reset. |
| **Modules** | Add, edit and remove custom modules. Built-in modules stay fixed. Files block deletion or a code change until they are moved/removed. |

## Admin guide

### Customize the site

Go to **Site settings** in the sidebar (admins only).

- **Site name** — replaces “Atlas” in the header, sidebar, auth screen and page title.
- **Tagline** — shown on the sign-in/sign-up screen.
- **Logo letter or emoji** — leave blank for the Atlas mark, or use one or two characters.
- **Theme** — Mint, Ocean, Rose, Amber or Violet. The whole UI re-tints from CSS variables.
- **Announcement** — a banner at the top of every page. Leave blank to hide it.
- **Footer note** — the small line at the bottom of the sidebar.
- **Admin password** — leave blank to keep the current one. Changing it affects future sign-ups and admin unlocks; existing admin sessions stay signed in.

### Add modules

Go to **Modules** in the sidebar (admins only).

1. Enter a unique code (for example `SUR-401`), an optional title, a year, kind and semester.
2. Click **Add module**.
3. Use **Edit** on a custom module to rename it or change its year/semester.
4. Use the trash button to remove a custom module. If any uploaded file uses that module, deletion is blocked until the file is removed.

Custom modules are stored in this browser alongside the library. Built-in modules cannot be edited or deleted.

### Upload and publish

1. **Upload a file**.
2. Pick a module, type, title, optional exam year and subject.
3. Leave **Publish immediately** checked to go live, or uncheck it to send the file to the review queue.
4. Approve, reject, unpublish or delete from **Admin console**.

### Backup and restore

**Admin console → Export library** downloads a JSON file containing the metadata, PDF bytes, custom modules and site branding. It can be large.

**Import** merges by content hash, so importing the same backup twice is safe. It also merges any missing custom modules and can restore the site branding. Use it to move the library to another browser or to restore after clearing browser data.

> Export does not include accounts, passwords or the admin passcode. Students create accounts on the new device; the current admin password is kept on import.

### Factory reset

**Site settings → Danger zone → Factory reset this device** deletes every account, PDF, chat message, meme, sign-in record, preference, custom module and site setting in this browser. Type `RESET` to confirm.

Use this before handing the device or browser profile to someone else.

## Batch access rules

| Batch | Open years |
|---|---|
| 198 | Years 1, 2 and 3 |
| 199 | Years 1 and 2 |
| 200 | Year 1 |

The rules live in `atlas.html` in `YEARS_FOR_BATCH`. Students can browse every year their batch is allowed. Admins can browse all years.

## Where data lives

| Data | Storage |
|---|---|
| Accounts, PDFs, chat, memes, sign-in log | IndexedDB database `studyhub` |
| Site name, theme, announcement, footer, admin password | `localStorage` key `sh.site` |
| Custom modules | `localStorage` key `sh.modules` |
| Session, preferences, saved files, last-read markers | `localStorage` keys starting with `sh.` |

Clearing site data for `atlas.html` in the browser wipes the library. Export a backup first.

## Security note

This is a local-first build, not a server. The admin password gates the UI only; anyone with the file and access to the browser profile can read its data. Do not reuse a real password. For a multi-device, multi-user deployment with real security, use the Next.js/Postgres prototype in `web/` or a proper backend.

## File map

| Path | What it is |
|---|---|
| [`atlas.html`](atlas.html) | **The app** — single file, no build step |
| [`SETUP.md`](SETUP.md) | Step-by-step setup for the person receiving the project |
| [`ACTION_PLAN.md`](ACTION_PLAN.md) | Product plan: phases, backlog, ingestion, costs, risks, metrics |
| [`DATA_MODEL.md`](DATA_MODEL.md) | Taxonomy rules, Postgres DDL, RLS, search, storage flow |
| [`seed/catalog.json`](seed/catalog.json) | Batches, years, modules and subjects as data |
| [`seed/module_subjects.csv`](seed/module_subjects.csv) | Module → subject mapping — fill in when known |
| [`serve.mjs`](serve.mjs) | Optional zero-dependency static server |
| [`web/`](web/) | Optional Next.js + Postgres prototype |
| `studyhub.html` | Tiny redirect for old links |
| `studyhub-v1.html` | Earlier light-theme build, kept as a legacy fallback |

## Optional Next.js prototype

```bash
cd web
npm install
npm run db:setup      # schema + curriculum catalogue, no demo files
npm run dev           # http://localhost:3000
```

See [`web/README.md`](web/README.md). The prototype uses a local PGlite database by default, so it needs no Docker or cloud credentials. It is not the handoff app; `atlas.html` is.

## Troubleshooting

- **“Storage is blocked”** — use Chrome or Edge in a normal window, not private/incognito mode. If you opened the file from a ZIP, extract it first.
- **PDF will not preview** — use **Open in tab** or **Download**. Some browsers block embedded PDFs from `file://`.
- **I cleared browser data and lost the library** — restore the last JSON export from **Admin console → Import**.
- **The admin password is wrong** — the default is `kellyisthecutest`. If it was changed, use the current value. A factory reset restores the default but deletes all data.
- **I want a fresh start** — **Site settings → Factory reset**, type `RESET`.
