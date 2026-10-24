@echo off
setlocal
REM Makes "Lu Cube" shortcuts (Start menu and desktop) with the cube icon, which you can pin to the taskbar.
cd /d "%~dp0"
if not exist "desktop\electron\electron.exe" (echo Run "Set Up Desktop Cube.bat" first. & pause & exit /b)
set "MC=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$sh=New-Object -ComObject WScript.Shell; $mc=$env:MC.TrimEnd('\');" ^
 "$places=@([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'));" ^
 "foreach($p in $places){ $l=$sh.CreateShortcut((Join-Path $p 'Lu Cube.lnk'));" ^
 " $l.TargetPath=(Join-Path $mc 'desktop\electron\electron.exe'); $l.Arguments='\"'+(Join-Path $mc 'desktop')+'\"';" ^
 " $l.WorkingDirectory=$mc; $l.IconLocation=(Join-Path $mc 'desktop\musiccube.ico')+',0'; $l.Description='Lu Cube'; Remove-Item (Join-Path $p 'Music Cube.lnk') -ErrorAction SilentlyContinue; $l.Save();" ^
 " if(Test-Path (Join-Path $p 'Lu Cube.lnk')){ Write-Host ('  made: '+(Join-Path $p 'Lu Cube.lnk')) } else { Write-Host ('  FAILED: '+$p) } }"
echo.
echo To pin it: open the Start menu, type "Lu Cube", right-click it and pick "Pin to taskbar".
echo (Or start it from the desktop shortcut, right-click its taskbar button and pick "Pin to taskbar".)
pause
