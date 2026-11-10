# Cursor RTL Chat Fix

Fixes **Right-to-Left (RTL)** text in [Cursor](https://cursor.com) AI Chat for Arabic, Persian, and other RTL languages.

> **Tested on:** Cursor **3.5+** (Composer / Agent UI with `.markdown-root`, streamdown, and legacy `.anysphere-markdown-container-root`).

---

## Features

- RTL for **AI responses** (plain text and markdown in Composer)
- RTL for **user input** (prompt / Lexical editor)
- **Code blocks stay LTR**
- **Model picker / menus stay LTR**
- Works after restart — no DevTools paste each time
- Single file: **`rtl.js`** (CSS + JavaScript)

---

## Quick install (Windows)

1. Close Cursor completely (**File → Exit**).
2. Open PowerShell in this folder and run:

```powershell
.\install.ps1 -CursorOut "D:\programs\cursor\cursor\resources\app\out"
```

Change the path to your Cursor `out` folder if different.

3. Open Cursor again.

---

## Manual install

### 1. Find Cursor `out` folder

| OS | Typical path |
|----|--------------|
| **Windows** | `C:\Users\<USER>\AppData\Local\Programs\cursor\resources\app\out` |
| **Windows (custom)** | e.g. `D:\programs\cursor\cursor\resources\app\out` |
| **macOS** | `Cursor.app/Contents/Resources/app/out` |
| **Linux** | `.../resources/app/out` |

### 2. Copy `rtl.js`

Copy **`rtl.js`** from this repo to the **`out`** folder (same level as `main.js`):

```
.../resources/app/out/
├── main.js
├── rtl.js          ← here
└── vs/...
```

### 3. Patch `main.js`

Open **`main.js`**. After the first copyright comment block:

```
/*!--------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
```

Paste the **entire contents** of **`main.patch.js`** on the next line (one line, no line breaks inside).

Or copy from here:

```js
import{createRequire}from"module";import{fileURLToPath}from"url";const _require=createRequire(import.meta.url);const _dirname=fileURLToPath(new URL(".",import.meta.url));(function(){var fs=_require("fs"),path=_require("path"),electron=_require("electron");var rtlPath=path.join(_dirname,"rtl.js");var rtlScript="";try{rtlScript=fs.readFileSync(rtlPath,"utf-8");}catch(e){}if(!rtlScript)return;var hooked=new WeakSet();function inject(wc){if(!wc||wc.isDestroyed())return;wc.executeJavaScript(rtlScript).catch(function(){});}function hookWindow(win){if(!win||!win.webContents||hooked.has(win))return;hooked.add(win);var wc=win.webContents;wc.on("dom-ready",function(){inject(wc);});wc.on("did-finish-load",function(){inject(wc);});wc.on("did-navigate-in-page",function(){inject(wc);});}electron.app.on("browser-window-created",function(ev,win){hookWindow(win);});electron.app.whenReady().then(function(){electron.BrowserWindow.getAllWindows().forEach(hookWindow);});})();
```

### 4. Patch `workbench.html`

Open:

```
out/vs/code/electron-sandbox/workbench/workbench.html
```

Find:

```html
<link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css">
```

Add **right after it**:

```html
		<!-- Cursor RTL Chat Fix -->
		<script src="../../../../rtl.js"></script>
```

### 5. Restart Cursor

Close completely and reopen.

---

## File layout

```
cursor_fix_rtl/
├── rtl.js           # RTL fix (CSS + JS)
├── main.patch.js    # One-line patch for main.js
├── install.ps1      # Windows auto-installer
├── README.md
└── LICENSE
```

After install:

```
.../cursor/resources/app/out/
├── main.js          # patched
├── rtl.js           # copied
└── vs/code/electron-sandbox/workbench/workbench.html   # patched
```

---

## How it works

1. **`workbench.html`** loads `rtl.js` when the UI starts.
2. **`main.js` patch** (Cursor **before 3.29.9** only) injects the same script into every BrowserWindow as a fallback. **`install.ps1` skips `main.js` on 3.29.9+** because that patch breaks startup on newer builds.
3. **`rtl.js`** injects RTL CSS and watches the DOM for AI markdown (`.markdown-root`, `.anysphere-markdown-container-root`, `.markdown-section`), including streaming text.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| AI text still LTR | Full restart (File → Exit). Re-run `install.ps1`. |
| Cursor won't start | Restore `main.js` from `backup/`. On Cursor **3.29.9+**, do not patch `main.js` — use `workbench.html` only. |
| Fix lost after update | Cursor updates overwrite `main.js` / `workbench.html`. Re-run install. |
| `require is not defined` | Patch must use `import{createRequire}` — see `main.patch.js`. |

---

## Uninstall

1. Delete `out/rtl.js`
2. Remove the patch line from `main.js` (the line starting with `import{createRequire}`)
3. Remove the `<script src="../../../../rtl.js">` block from `workbench.html`
4. Restart Cursor

---

## Note

- Unofficial fix — not affiliated with Cursor.
- App file edits may be reset on Cursor updates. Keep backups.

---

## License

MIT

---

## About

Fixes RTL in Cursor AI Chat | حل مشكلة عرض النصوص العربية من اليمين لليسار في Cursor
