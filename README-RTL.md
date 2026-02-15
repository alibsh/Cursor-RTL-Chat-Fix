# Cursor RTL Chat Fix

Fixes **Right-to-Left (RTL)** text rendering in [Cursor](https://cursor.com) AI Chat for Arabic, Persian, and other RTL languages. Messages, code blocks, tables, and Plan Mode display correctly without re-applying the fix after each restart.

> **Compatible with:** Cursor 2.4.37+ (uses `app.on('browser-window-created')`, no `BrowserWindow` override).

---

## ✨ Features

- **Persistent:** Applied automatically on every window and survives restarts (no DevTools paste each time).
- **RTL everywhere:** Chat messages, input field, placeholders, lists, tables, and code blocks in responses.
- **All windows:** Main window and any secondary windows get RTL injection.
- **Safe:** Does not override `BrowserWindow` (avoids "property has only a getter" errors on newer Cursor).

---

## 🛠 How to Use

### 1. Locate Cursor’s app folder

Find the folder that contains `main.js` (usually `resources/app/out` inside your Cursor install):

| OS        | Typical path |
|-----------|--------------|
| **Windows** | `C:\Users\<USER>\AppData\Local\Programs\cursor\resources\app\out` or your install path `...\cursor\resources\app\out` |
| **macOS**   | `Cursor.app/Contents/Resources/app/out` |
| **Linux**   | `.../resources/app/out` (inside your Cursor install) |

### 2. Backup

- Copy **`main.js`** from that folder to a safe place (e.g. Desktop).

### 3. Add `rtl.js`

- Place **`rtl.js`** in the **same folder as `main.js`** (e.g. `.../out/rtl.js`).
- You can use the `rtl.js` from this repo or your own script that injects RTL styles (e.g. via `document.createElement('style')`).

### 4. Patch `main.js`

- Open **`main.js`** in a text editor (e.g. Notepad++, VS Code).
- Find the **first comment block** at the top:

  ```
  /*!--------------------------------------------------------
   * Copyright (C) Microsoft Corporation. All rights reserved.
   *--------------------------------------------------------*/
  ```

- **Right after that block**, before any other code (e.g. before `!function(){...}`), **insert this single line**:

  ```js
  import{createRequire}from"module";import{fileURLToPath}from"url";const _require=createRequire(import.meta.url);const _dirname=fileURLToPath(new URL(".",import.meta.url));(function(){var fs=_require("fs"),path=_require("path"),electron=_require("electron");var rtlPath=path.join(_dirname,"rtl.js");var rtlScript="";try{rtlScript=fs.readFileSync(rtlPath,"utf-8");}catch(e){}if(rtlScript){electron.app.on("browser-window-created",function(ev,win){if(win&&win.webContents){win.webContents.on("did-finish-load",function(){win.webContents.executeJavaScript(rtlScript).catch(function(){});});}});}})();
  ```

- Save the file (keep encoding as UTF-8).

### 5. Restart Cursor

- Close Cursor completely, then open it again. RTL should apply automatically in chat, code, and tables.

---

## 📁 File layout

```
.../resources/app/out/
├── main.js   ← patched (one line added at top)
├── rtl.js    ← RTL script (same folder as main.js)
└── ...
```

---

## 🔧 How it works

- Cursor runs `main.js` as an **ES module** (`"type": "module"`), so the patch uses `createRequire` and `fileURLToPath` instead of `require`.
- It does **not** modify `BrowserWindow` (which is read-only in recent Cursor).
- It listens for **`app.on('browser-window-created')`**: for each new window, it attaches **`did-finish-load`** on `webContents` and runs **`rtl.js`** via `executeJavaScript`, so RTL is applied in the UI.

---

## ❓ Troubleshooting

| Issue | What to do |
|-------|------------|
| Cursor won’t start or shows an error | Ensure the added line was copied **entirely** and no original code was removed. Restore `main.js` from backup and re-apply the patch. |
| `require is not defined` | The patch must start with `import{createRequire}from"module";`. Keep the file as an ES module (don’t rename to `.cjs`). |
| RTL doesn’t appear | Ensure **`rtl.js`** is in the **same folder as `main.js`** and the filename is exactly **`rtl.js`**. Restart Cursor after any change. |
| RTL gone after Cursor update | Updates may overwrite `main.js`. Re-apply the same patch line to the new `main.js` or restore from backup and patch again. |

---

## ⚠️ Note

- Modifying app files may be reverted by Cursor updates; keep a backup of **`main.js`** and re-apply the patch after upgrading if needed.
- This is an unofficial fix and is not affiliated with Cursor.

---

## 📄 License

MIT — use and modify as you like. If you share your version, crediting this approach is appreciated.

---

## About

Fixes RTL text rendering in Cursor AI Chat | حل مشكلة عرض النصوص العربية والفارسية من اليمين لليسار في Cursor

**Topics:** `rtl` `cursor` `cursor-ide` `arabic` `persian` `rtl-fix`
