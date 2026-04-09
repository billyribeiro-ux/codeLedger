# CodeLedger

**Repository:** [github.com/billyribeiro-ux/codeLedger](https://github.com/billyribeiro-ux/codeLedger)

### Put this code on GitHub (you must run this locally)

Git was **reset to one fresh commit** with the full project. Nothing appears on GitHub until **you push** from your Mac.

**Easiest — HTTPS** (no SSH key; GitHub will ask you to sign in or use a token):

```bash
cd /Users/billyribeiro/developer/my-apps/code-ledger
chmod +x push-to-github.sh
./push-to-github.sh
```

If push is **rejected** because GitHub already has a “Initialize with README” commit:

```bash
git push -u origin main --force
```

**SSH** (only if you use keys): `git remote set-url origin git@github.com:billyribeiro-ux/codeLedger.git` then `git push -u origin main`.

**What belongs in Git:** all source, configs, `package-lock.json`, `src-tauri/Cargo.lock`, icons, and CI workflows. **Not** in Git (see `.gitignore`): `node_modules/`, `dist/`, `src-tauri/target/`, and local env files — those are regenerated or machine-specific.

Desktop learning tracker: languages, notes, goals, study sessions, Pomodoro timer, spaced-repetition review, and analytics. Data is stored in a **local SQLite** database (via [Tauri SQL plugin](https://v2.tauri.app/plugin/sql/)) under the app config directory. Running the web UI alone (`npm run dev`) uses **localStorage** with the same keys for quick browser testing.

## Requirements

- Node.js 20+
- [Rust](https://www.rust-lang.org/tools/install) and Xcode CLI tools (macOS) for Tauri

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Vite dev server (browser; `localStorage`) |
| `npm run build` | Production frontend build to `dist/` |
| `npm run tauri dev` | Desktop app with SQLite |
| `npm run tauri build` | Release bundles (`.app`, `.dmg`, etc. on macOS) |
| `npm test` | Vitest |
| `npm run lint` | ESLint |

## Keyboard shortcuts

Global shortcuts (when focus is **not** in an input): **`/`** command palette, **`⌘K`** / **`Ctrl+K`** palette, **`Alt+1`–`Alt+8`** main views, **`[`** / **`]`** previous/next view, **`⌘,`** / **`Ctrl+,`** settings, **`⌘B`** / **`Ctrl+B`** sidebar, **`⌘⌥P`** / **`Ctrl+Alt+P`** Pomodoro, **`Space`** start/pause timer while the Pomodoro dialog is open, **`Esc`** close palette or Pomodoro. Full list in-app under **Settings → Keyboard shortcuts**. The palette uses **fuzzy** matching on commands, languages, notes, and goals.

## CI

GitHub Actions (`.github/workflows/tauri-build.yml`) runs `npm run tauri build` on **macOS**, **Ubuntu**, and **Windows** for pushes and PRs to `main`/`master`, and uploads `src-tauri/target/release/bundle/**` as workflow artifacts. Add code signing / notarization secrets when you ship publicly.

## Legacy data and JSON backup

- **In-app**: Settings supports **Export JSON** / **Import JSON** (same structure as before: `profile`, `progress`, `notes`, `goals`, `sessions`, optional `version` / `exportedAt`).
- **Older hosts** that injected `window.storage.get` / `window.storage.set` are replaced by SQLite in the desktop app. To migrate, use **Export** from the old environment if available, then **Import** in CodeLedger.
- **Browser-only dev**: Data lives in `localStorage` under keys `cl3-profile`, `cl3-progress`, `cl3-notes`, `cl3-goals`, `cl3-sessions`.

Import validation uses [Zod](https://zod.dev/) (`src/schema.ts`).

## Icons

Replace branding by dropping a **1024×1024** PNG into the repo and running:

```bash
npm run tauri icon path/to/icon.png
```

This regenerates `src-tauri/icons/*` referenced from `src-tauri/tauri.conf.json`.

## Project layout

- `src/CodeLedger.tsx` — main UI (migrated from the original single-file app)
- `src/storage.ts` — SQLite (Tauri) / `localStorage` (browser) adapter
- `src/constants.ts`, `src/utils.ts` — shared data and helpers
- `src-tauri/` — Rust shell, capabilities, bundled icons

Optional next steps: add `@tauri-apps/plugin-updater` for auto-updates, and Playwright for desktop E2E against `npm run tauri build` artifacts.
