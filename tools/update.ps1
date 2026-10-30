# Lu Cube updater: finds every Lu Cube folder on this PC (the one your shortcut opens included),
# closes Lu Cube, and puts the new web\index.html, desktop\main.js and musiccube.py in each one.
# Your music, favourites, passport and settings are not touched.
$ErrorActionPreference = 'Continue'
$src = Join-Path $PSScriptRoot 'files'
$cand = New-Object System.Collections.Generic.List[string]

# 1. every shortcut on your desktop, Start menu and taskbar (pinned ones can have any name):
#    look at what each one runs and walk up from there to a folder with musiccube.py in it
function Add-Up([string]$p) {
  if (-not $p) { return }
  $p = $p.Trim().Trim('"')
  for ($i = 0; $i -lt 7 -and $p; $i++) {
    try {
      if (Test-Path -LiteralPath (Join-Path $p 'musiccube.py')) { $cand.Add($p); return }
      $p = Split-Path $p -Parent
    } catch { return }
  }
}
$sh = New-Object -ComObject WScript.Shell
$lnkDirs = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'),
  (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\ImplicitAppShortcuts'))
foreach ($ld in $lnkDirs) {
  if (-not (Test-Path -LiteralPath $ld)) { continue }
  foreach ($l in Get-ChildItem -LiteralPath $ld -Filter *.lnk -Recurse -ErrorAction SilentlyContinue) {
    try { $k = $sh.CreateShortcut($l.FullName) } catch { continue }
    $all = ($k.TargetPath + ' ' + $k.Arguments + ' ' + $k.WorkingDirectory)
    if ($all -notmatch 'cube|musiccube|electron' -and $l.Name -notmatch 'cube') { continue }
    Write-Host ("Shortcut: " + $l.FullName)
    Write-Host ("   runs:  " + $k.TargetPath + " " + $k.Arguments)
    Write-Host ("   in:    " + $k.WorkingDirectory)
    Add-Up $k.WorkingDirectory; Add-Up $k.TargetPath; Add-Up $k.Arguments
  }
}
# 2. the usual places: "Lu Cube" at the top of any drive and in your user folder,
#    plus any copy up to three folders deep in Desktop, Downloads, Documents and OneDrive
foreach ($d in Get-PSDrive -PSProvider FileSystem) { $cand.Add((Join-Path $d.Root 'Lu Cube')); $cand.Add((Join-Path $d.Root 'Music Cube')) }
$cand.Add((Join-Path $env:USERPROFILE 'Lu Cube')); $cand.Add((Join-Path $env:USERPROFILE 'Music Cube'))
Write-Host ""; Write-Host "Searching your user folders for other copies ..."
foreach ($u in @('Desktop', 'Downloads', 'Documents', 'OneDrive')) {
  $r = Join-Path $env:USERPROFILE $u
  if (Test-Path -LiteralPath $r) { Get-ChildItem -LiteralPath $r -Filter musiccube.py -Recurse -Depth 3 -File -ErrorAction SilentlyContinue | ForEach-Object { $cand.Add($_.DirectoryName) } }
}

$targets = @()
foreach ($c in $cand) {
  try { $full = (Resolve-Path -LiteralPath $c -ErrorAction Stop).Path.TrimEnd('\') } catch { continue }
  if ((Test-Path -LiteralPath (Join-Path $full 'musiccube.py')) -and -not ($targets -contains $full)) { $targets += $full }
}
if ($targets.Count -eq 0) { Write-Host ""; Write-Host "Couldn't find a Lu Cube folder (one with musiccube.py in it)."; exit 1 }
Write-Host ""
Write-Host "Lu Cube folders found:"; $targets | ForEach-Object { Write-Host ("   " + $_) }

# 3. close Lu Cube (the floating cube and its music server)
Write-Host ""; Write-Host "Closing Lu Cube if it's running ..."
foreach ($p in Get-CimInstance Win32_Process -ErrorAction SilentlyContinue) {
  $cl = [string]$p.CommandLine; $exe = [string]$p.ExecutablePath; $hit = $false
  if ($cl -like '*musiccube.py*') { $hit = $true }
  foreach ($t in $targets) { if ($exe -like ($t + '\*')) { $hit = $true } }
  if ($hit) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Milliseconds 800

# 4. copy the new files in, and clear away renamed duplicates like "index (1).html"
$files = @(@('index.html', 'web'), @('main.js', 'desktop'), @('preload.js', 'desktop'), @('musiccube.py', ''), @('get_audiobooks.py', ''), @('MakeStick.bat', '', 'Make Lu Cube Stick.bat'), @('InstallStick.bat', 'stick', 'Install Lu Cube.bat'))
$ok = $true
foreach ($t in $targets) {
  Write-Host ""; Write-Host ("Updating " + $t)
  foreach ($f in $files) {
    $name = $f[0]; $dir = if ($f[1]) { Join-Path $t $f[1] } else { $t }
    $out = if ($f.Count -gt 2) { $f[2] } else { $name }
    if ($f[1] -eq 'stick' -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    if (-not (Test-Path -LiteralPath $dir)) { Write-Host ("   (no " + $f[1] + " folder, skipped " + $name + ")"); continue }
    $base = [IO.Path]::GetFileNameWithoutExtension($out); $ext = [IO.Path]::GetExtension($out)
    Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Name -match ('^' + [regex]::Escape($base) + ' \(\d+\)' + [regex]::Escape($ext) + '$') } | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force; Write-Host ("   removed duplicate " + $_.Name) }
    $dst = Join-Path $dir $out
    try {
      Copy-Item -LiteralPath (Join-Path $src $name) -Destination $dst -Force -ErrorAction Stop
      Write-Host ("   " + $out + "  ->  " + (Get-Item -LiteralPath $dst).Length + " bytes")
    } catch { $ok = $false; Write-Host ("   COULDN'T REPLACE " + $dst + " : " + $_.Exception.Message) }
  }
}
Write-Host ""
foreach ($t in $targets) {
  $h = Join-Path $t 'web\index.html'
  $new = (Test-Path -LiteralPath $h) -and ((Get-Content -LiteralPath $h -Raw) -match 'data-act="close" title="close"')
  Write-Host ($(if ($new) { "   NEW  " } else { "   OLD  " }) + $t)
}
Write-Host ""
if (-not $ok) { Write-Host "Some files couldn't be replaced (see above). Close anything using them and run this again."; exit 1 }
# all good: start Lu Cube again (the copy your shortcut opens) and close this window
$start = Join-Path $targets[0] 'Lu Cube Desktop.bat'
$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Lu Cube.lnk'
if (Test-Path -LiteralPath $lnk) { $start = $lnk }
Write-Host "Done. Starting Lu Cube ..."
if (Test-Path -LiteralPath $start) { Start-Process -FilePath $start -WorkingDirectory $targets[0] }
Remove-Item -LiteralPath $src -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
exit 0
