@echo off
setlocal
title Lu Cube - make a stick
cd /d "%~dp0"
echo Puts Lu Cube on a USB stick so you can install it on another computer.
echo The stick gets the newest Lu Cube (straight from GitHub), your stuff (favourites, saved
echo stations, caught songs, passport, alarm, weather town and settings), the desktop cube and its
echo own Python, so the other computer doesn't need anything. Plug the stick in there and run
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
REM 1) the newest Lu Cube from GitHub, so this computer and the stick are both on the current version
REM    (only the program files: your music, settings, Python and Electron here are never touched)
echo.
echo Getting the newest Lu Cube from GitHub ...
set "NEW=%TEMP%\lucube-latest"
set "G="
if exist "%NEW%" rmdir /s /q "%NEW%"
mkdir "%NEW%"
curl -L --fail -s -o "%NEW%\lc.zip" "https://github.com/BuildBeyond1889/LuCube/archive/refs/heads/main.zip" && tar -xf "%NEW%\lc.zip" -C "%NEW%"
if exist "%NEW%\LuCube-main\musiccube.py" set "G=%NEW%\LuCube-main"
if not defined G (echo Couldn't reach GitHub, so the stick gets the version on this computer. & goto copyit)
robocopy "%G%" "%~dp0." *.py *.bat README.md LICENSE /COPY:D /R:0 /W:0 /NJH /NJS /NDL /NP /NFL /XF "Make Lu Cube Stick.bat"
robocopy "%G%\web" "%~dp0web" /E /COPY:D /R:0 /W:0 /NJH /NJS /NDL /NP /NFL
robocopy "%G%\desktop" "%~dp0desktop" /E /COPY:D /R:0 /W:0 /NJH /NJS /NDL /NP /NFL
robocopy "%G%\stick" "%~dp0stick" /E /COPY:D /R:0 /W:0 /NJH /NJS /NDL /NP /NFL
echo This computer is on the newest version now too (a running Lu Cube picks it up next time it starts).
:copyit

REM 2) onto the stick. If a file won't copy it tries once and moves on (it used to retry for ages, which looked like it was stuck),
REM and every file is listed as it goes. Running this again only copies what's missing.
echo.
echo Copying Lu Cube to %OUT% ...
REM Electron's files come out of its zip dated 1 Jan 1980, which USB sticks reject ("ERROR 87"). Re-date them to today first.
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0desktop' -Recurse -File | Where-Object { $_.LastWriteTime.Year -lt 1990 -or $_.CreationTime.Year -lt 1990 } | ForEach-Object { $n=Get-Date; $_.CreationTime=$n; $_.LastWriteTime=$n; $_.LastAccessTime=$n }"
REM the program files always overwrite what's on the stick, so an older stick comes up to date
REM code files go over with copy/xcopy: robocopy kept failing to set file attributes on USB sticks ("ERROR 87") even though the files copied fine
for %%F in ("%~dp0*.py" "%~dp0*.bat" "%~dp0README.md" "%~dp0LICENSE") do copy /y "%%~F" "%OUT%\" >nul
del "%OUT%\Update Lu Cube*.bat" "%OUT%\Finish Lu Cube Rename.bat" "%OUT%\Install Lu Cube.bat" >nul 2>nul
xcopy "%~dp0web" "%OUT%\web\" /E /I /Y /Q >nul
>"%TEMP%\lc-skip.txt" echo \electron\
xcopy "%~dp0desktop" "%OUT%\desktop\" /E /I /Y /Q /EXCLUDE:%TEMP%\lc-skip.txt >nul
del "%TEMP%\lc-skip.txt" >nul 2>nul
echo Lu Cube files copied.
if exist "%~dp0desktop\electron" robocopy "%~dp0desktop\electron" "%OUT%\desktop\electron" /E /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NJS /NDL /NP /NFL
if defined G copy /y "%G%\Make Lu Cube Stick.bat" "%OUT%\" >nul
if not exist "%OUT%\musiccube.py" (echo Copy failed. Is the stick full or read-only? & pause & exit /b)
REM 3) your stuff rides along: favourites, saved stations, caught songs, passport, alarm, weather town, settings.
REM    Every computer installed or updated from this stick folds it in the next time Lu Cube starts
REM    (added to what that computer already has, nothing of its own is lost). Window position stays per computer.
set "PYX=python"
if exist "%~dp0python\python.exe" set "PYX=%~dp0python\python.exe"
if exist "%OUT%\favs.json" del "%OUT%\favs.json"
if exist "%~dp0state.json" "%PYX%" -c "import json,sys,time;s=json.load(open(sys.argv[1],encoding='utf-8'));s.pop('ui',None);s['stamp']=time.strftime('%%Y%%m%%d%%H%%M%%S');json.dump(s,open(sys.argv[2],'w',encoding='utf-8'))" "%~dp0state.json" "%OUT%\mystuff.json"
if exist "%OUT%\mystuff.json" (echo Your favourites, saved stations, caught songs and settings are on the stick.) else (echo Couldn't copy your favourites and settings onto the stick.)

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
echo A computer that already has Lu Cube offers to update itself when the stick is plugged in.
pause
REM last of all, this file updates itself to the newest version (it can't while it's still running above)
if defined G (copy /y "%G%\Make Lu Cube Stick.bat" "%~f0" >nul & exit /b)
exit /b
