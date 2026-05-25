# Cursor RTL Chat Fix — Windows installer
# Usage: .\install.ps1 -CursorOut "D:\programs\cursor\cursor\resources\app\out"

param(
    [string]$CursorOut = "D:\programs\cursor\cursor\resources\app\out"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RtlSrc = Join-Path $RepoRoot "rtl.js"
$PatchSrc = Join-Path $RepoRoot "main.patch.js"
$RtlDst = Join-Path $CursorOut "rtl.js"
$MainJs = Join-Path $CursorOut "main.js"
$WorkbenchHtml = Join-Path $CursorOut "vs\code\electron-sandbox\workbench\workbench.html"
$ScriptTag = '<script src="../../../../rtl.js"></script>'
$PatchMarker = "rtl.js"

if (-not (Test-Path $CursorOut)) {
    Write-Error "Cursor out folder not found: $CursorOut"
}
if (-not (Test-Path $MainJs)) {
    Write-Error "main.js not found: $MainJs"
}
if (-not (Test-Path $WorkbenchHtml)) {
    Write-Error "workbench.html not found: $WorkbenchHtml"
}

# Backup
$BackupDir = Join-Path $RepoRoot "backup"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $MainJs (Join-Path $BackupDir "main.js.$Stamp.bak") -Force
Copy-Item $WorkbenchHtml (Join-Path $BackupDir "workbench.html.$Stamp.bak") -Force
if (Test-Path $RtlDst) {
    Copy-Item $RtlDst (Join-Path $BackupDir "rtl.js.$Stamp.bak") -Force
}

# Copy rtl.js
Copy-Item $RtlSrc $RtlDst -Force
Write-Host "[OK] Copied rtl.js"

# Patch main.js
$mainContent = Get-Content $MainJs -Raw -Encoding UTF8
if ($mainContent -notmatch [regex]::Escape($PatchMarker)) {
    $patch = Get-Content $PatchSrc -Raw -Encoding UTF8
    $marker = "*/`r`n"
    if ($mainContent -notmatch '\*/\s*\r?\n') {
        Write-Error "Could not find copyright block end in main.js"
    }
    $mainContent = $mainContent -replace '\*/\s*\r?\n', "*/`r`n$patch"
    Set-Content -Path $MainJs -Value $mainContent -Encoding UTF8 -NoNewline
    Write-Host "[OK] Patched main.js"
} else {
    Write-Host "[SKIP] main.js already patched"
}

# Patch workbench.html
$html = Get-Content $WorkbenchHtml -Raw -Encoding UTF8
if ($html -notmatch [regex]::Escape($ScriptTag)) {
    $insert = "`t`t<!-- Cursor RTL Chat Fix -->`r`n`t`t$ScriptTag`r`n"
    $html = $html -replace '(<link rel="stylesheet" href="\.\./\.\./\.\./workbench/workbench\.desktop\.main\.css">)', "`$1`r`n$insert"
    Set-Content -Path $WorkbenchHtml -Value $html -Encoding UTF8 -NoNewline
    Write-Host "[OK] Patched workbench.html"
} else {
    Write-Host "[SKIP] workbench.html already patched"
}

Write-Host ""
Write-Host "Done. Restart Cursor completely (File -> Exit)."
Write-Host "Backups saved in: $BackupDir"
