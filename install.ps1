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
$MainPatchMinVersion = "3.29.9"
$patchRegex = [regex]'import\{createRequire\}from"module";[\s\S]*?\}\)\(\);'

function Get-CursorSemVersion {
    param([string]$OutDir)

    $packageJson = Join-Path (Split-Path $OutDir -Parent) "package.json"
    if (Test-Path $packageJson) {
        $meta = Get-Content $packageJson -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($meta.version) {
            return [string]$meta.version
        }
    }

    $cursor = Get-Command cursor -ErrorAction SilentlyContinue
    if ($cursor) {
        $banner = & cursor -v 2>&1 | Out-String
        if ($banner -match '(\d+\.\d+\.\d+)') {
            return $Matches[1]
        }
    }

    return $null
}

function Test-SemVerAtLeast {
    param(
        [string]$Version,
        [string]$Minimum
    )

    $left = $Version -split '\.'
    $right = $Minimum -split '\.'
    $count = [Math]::Max($left.Count, $right.Count)

    for ($i = 0; $i -lt $count; $i++) {
        $a = 0
        $b = 0
        if ($i -lt $left.Count) { $a = [int]$left[$i] }
        if ($i -lt $right.Count) { $b = [int]$right[$i] }
        if ($a -gt $b) { return $true }
        if ($a -lt $b) { return $false }
    }

    return $true
}

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

# Patch main.js (older Cursor only; 3.29.9+ loads rtl.js from workbench.html)
$cursorVersion = Get-CursorSemVersion -OutDir $CursorOut
$skipMainPatch = $false

if ($cursorVersion -and (Test-SemVerAtLeast -Version $cursorVersion -Minimum $MainPatchMinVersion)) {
    $skipMainPatch = $true
    Write-Host "[INFO] Cursor $cursorVersion - skipping main.js patch (>= $MainPatchMinVersion)"
} elseif ($cursorVersion) {
    Write-Host "[INFO] Cursor $cursorVersion - main.js patch enabled"
} else {
    Write-Host "[WARN] Could not detect Cursor version; keeping legacy main.js patch behavior"
}

$mainContent = Get-Content $MainJs -Raw -Encoding UTF8
$patch = (Get-Content $PatchSrc -Raw -Encoding UTF8).Trim()
$loaderUpdated = $false
$patchMatch = $patchRegex.Match($mainContent)

if ($skipMainPatch) {
    if ($patchMatch.Success) {
        $mainContent = $mainContent.Substring(0, $patchMatch.Index) + $mainContent.Substring($patchMatch.Index + $patchMatch.Length)
        Set-Content -Path $MainJs -Value $mainContent -Encoding UTF8 -NoNewline
        $loaderUpdated = $true
        Write-Host "[OK] Removed main.js RTL loader"
    } else {
        Write-Host "[SKIP] main.js left untouched"
    }
} elseif ($patchMatch.Success) {
    if ($patchMatch.Value -eq $patch) {
        Write-Host "[SKIP] main.js patch already current"
    } else {
        $mainContent = $mainContent.Substring(0, $patchMatch.Index) + $patch + $mainContent.Substring($patchMatch.Index + $patchMatch.Length)
        Set-Content -Path $MainJs -Value $mainContent -Encoding UTF8 -NoNewline
        $loaderUpdated = $true
        Write-Host "[OK] Updated main.js loader"
    }
} elseif ($mainContent -notmatch [regex]::Escape($PatchMarker)) {
    if ($mainContent -notmatch '\*/\s*\r?\n') {
        Write-Error "Could not find copyright block end in main.js"
    }
    $mainContent = $mainContent -replace '\*/\s*\r?\n', "*/`r`n$patch"
    Set-Content -Path $MainJs -Value $mainContent -Encoding UTF8 -NoNewline
    $loaderUpdated = $true
    Write-Host "[OK] Patched main.js"
} else {
    Write-Error "main.js mentions rtl.js but the loader line was not found"
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
if ($skipMainPatch) {
    if ($loaderUpdated) {
        Write-Host "Restart Cursor once (File -> Exit) so the removed main.js patch takes effect."
    }
    Write-Host "RTL loads from workbench.html on this Cursor version."
    Write-Host "After update.bat, Ctrl+Shift+R is enough (no full restart unless main.js was changed)."
} elseif ($loaderUpdated) {
    Write-Host "main.js loader changed. Restart Cursor once (File -> Exit)."
    Write-Host "After that, Ctrl+Shift+R reloads rtl.js without a full restart."
} else {
    Write-Host "Reload Cursor with Ctrl+Shift+R. A full restart is not required."
}
Write-Host "Backups saved in: $BackupDir"
