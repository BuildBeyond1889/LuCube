@echo off
setlocal
title Lu Cube - make a stick
cd /d "%~dp0"
echo Puts Lu Cube on a USB stick so you can install it on another computer.
echo The stick gets the player, the desktop cube, the music downloader and its own Python,
echo so the other computer doesn't need anything installed. Plug the stick in there and run
echo "Install Lu Cube.bat" from it.
echo.
echo Removable drives plugged in:
powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2' | ForEach-Object { '   ' + $_.DeviceID + '  ' + $_.VolumeName + '  (' + [math]::Round($_.FreeSpace/1GB,1) + ' GB free)' }"
echo.
set D=
set /p D=Type the stick's drive letter (just the letter, e.g. E): 
set D=%D::=%
if "%D%"=="" exit /b
if not exist "%D%:\" (echo There's no drive %D%: plugged in. & pause & exit /b)
set OUT=%D%:\Lu Cube
REM a stick made before the rename: reuse what's already on it
if exist "%D%:\Music Cube\musiccube.py" if not exist "%OUT%" ren "%D%:\Music Cube" "Lu Cube"
if exist "%D%:\Install Music Cube.bat" del "%D%:\Install Music Cube.bat"
for %%f in ("Music Cube.bat" "Music Cube Desktop.bat" "Make Music Cube Stick.bat") do if exist "%OUT%\%%~f" del "%OUT%\%%~f"
REM if a file won't copy it now tries twice and moves on (it used to retry for ages, which looked like it was stuck),
REM and every file is listed as it goes. Running this again only copies what's missing.
echo.
echo Copying Lu Cube to %OUT% ...
REM Electron's files come out of its zip dated 1 Jan 1980, which USB sticks reject ("ERROR 87"). Re-date them to today first.
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0desktop' -Recurse -File | Where-Object { $_.LastWriteTime.Year -lt 1990 -or $_.CreationTime.Year -lt 1990 } | ForEach-Object { $n=Get-Date; $_.CreationTime=$n; $_.LastWriteTime=$n; $_.LastAccessTime=$n }"
robocopy "%~dp0." "%OUT%" musiccube.py get_classical.py README.md "Lu Cube.bat" "Lu Cube Desktop.bat" "Get Classical Music.bat" "Get Lofi Music.bat" "Set Up Desktop Cube.bat" "Make Taskbar Shortcut.bat" "Set Weather Town.bat" /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NJS /NDL /NP
robocopy "%~dp0web" "%OUT%\web" /E /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NJS /NDL /NP
robocopy "%~dp0desktop" "%OUT%\desktop" /E /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NJS /NDL /NP
if not exist "%OUT%\musiccube.py" (echo Copy failed. Is the stick full or read-only? & pause & exit /b)

REM its own Python (the official "embeddable" build from python.org, about 11 MB), so the other PC needs nothing
if exist "%OUT%\python\python.exe" goto havepy
if exist "%~dp0python\python.exe" (robocopy "%~dp0python" "%OUT%\python" /E /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NJS /NDL /NP & goto havepy)
echo Getting a portable Python for the stick ...
curl -L --fail -o "%TEMP%\mc-python.zip" "https://www.python.org/ftp/python/3.12.7/python-3.12.7-embed-amd64.zip" || (echo Couldn't download Python. Check your internet and run this again. & pause & exit /b)
mkdir "%OUT%\python" 2>nul
tar -xf "%TEMP%\mc-python.zip" -C "%OUT%\python" & del "%TEMP%\mc-python.zip"
:havepy

REM the desktop cube needs Electron; copy yours, or fetch it if you never ran the setup here
if exist "%OUT%\desktop\electron\electron.exe" goto haveel
echo Getting Electron for the desktop cube (about 100 MB) ...
curl -L --fail -o "%TEMP%\mc-electron.zip" "https://github.com/electron/electron/releases/download/v33.2.1/electron-v33.2.1-win32-x64.zip" || (echo Couldn't download Electron. The window version will still work. & goto haveel)
mkdir "%OUT%\desktop\electron" 2>nul
tar -xf "%TEMP%\mc-electron.zip" -C "%OUT%\desktop\electron" & del "%TEMP%\mc-electron.zip"
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%OUT%\desktop\electron' -Recurse -File | ForEach-Object { $n=Get-Date; $_.CreationTime=$n; $_.LastWriteTime=$n }"
:haveel

echo.
if exist "%~dp0Music" (
  choice /c YN /n /m "Also copy the music you already have onto the stick? (Y/N) "
  if not errorlevel 2 (echo Copying music ... & robocopy "%~dp0Music" "%OUT%\Music" /E /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NDL /NP)
)
copy /y "%~dp0stick\Install Lu Cube.bat" "%D%:\Install Lu Cube.bat" >nul
REM version stamp: computers installed from this stick see it's newer and offer to update themselves
powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmmss" > "%OUT%\version.txt"
if exist "%~dp0Make Taskbar Shortcut.bat" copy /y "%~dp0Make Taskbar Shortcut.bat" "%OUT%\" >nul
echo.
echo If any file above said ERROR, the stick may be full or failing; check its free space and run this again.
echo.
echo Done. On the other computer: plug the stick in and open "Install Lu Cube.bat".
pause
