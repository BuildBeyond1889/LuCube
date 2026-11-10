@echo off
title Lu Cube - set up desktop mode
cd /d "%~dp0"
REM Downloads Electron once (about 100 MB, from Electron's official GitHub releases) into desktop\electron.
REM Electron is what lets the cube float on your desktop with no window around it.
set EV=33.2.1
if exist "desktop\electron\electron.exe" (echo Already set up. Open "Lu Cube Desktop.bat". & pause & exit /b)
echo Downloading Electron %EV% ...
curl -L --fail -o "%TEMP%\electron-mc.zip" "https://github.com/electron/electron/releases/download/v%EV%/electron-v%EV%-win32-x64.zip" || (echo Download failed. Check your internet and try again. & pause & exit /b)
mkdir "desktop\electron" 2>nul
tar -xf "%TEMP%\electron-mc.zip" -C "desktop\electron" || (echo Couldn't unpack it. & pause & exit /b)
del "%TEMP%\electron-mc.zip"
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0desktop\electron' -Recurse -File | ForEach-Object { $n=Get-Date; $_.CreationTime=$n; $_.LastWriteTime=$n }"
echo.
echo Done. Open "Lu Cube Desktop.bat", or run "Make Taskbar Shortcut.bat" for a Lu Cube shortcut.
pause
