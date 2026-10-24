@echo off
setlocal
title Install Lu Cube
set "SRC=%~dp0Lu Cube"
if not exist "%SRC%\musiccube.py" (echo Can't find the "Lu Cube" folder next to this file. & pause & exit /b)
echo LU CUBE - a music wheel and a 3D cube player for your desktop.
echo Free music only: public-domain classical and Creative Commons lofi. No accounts, nothing to sign up for.
echo.
set "DEST=%USERPROFILE%\Lu Cube"
REM already installed here (as Lu Cube, or as Music Cube from before the rename)? then this is just a quick update
if exist "%DEST%\musiccube.py" goto update
if exist "%USERPROFILE%\Music Cube\musiccube.py" (set "DEST=%USERPROFILE%\Music Cube" & goto update)
echo It will be installed in:  %DEST%
set ALT=
set /p ALT=Press Enter for that, or type a different folder: 
if not "%ALT%"=="" set "DEST=%ALT%"
echo.
echo Copying Lu Cube onto this computer ...
robocopy "%SRC%" "%DEST%" /E /COPY:D /DCOPY:D /XO /R:2 /W:2 /NJH /NJS /NDL /NP /XD __pycache__ /XF state.json
if not exist "%DEST%\musiccube.py" (echo Copy failed. & pause & exit /b)
mkdir "%DEST%\Music" 2>nul
call :electron

set "PY=%DEST%\python\python.exe"
if not exist "%PY%" for /f "delims=" %%p in ('where python 2^>nul') do if not exist "%PY%" set "PY=%%p"
echo.
echo What music should it download?   1 = classical   2 = lofi   3 = both   4 = none for now
choice /c 1234 /n /m "Pick 1-4: "
set K=%errorlevel%
if %K%==4 goto shortcut
echo.
echo How much?   1 = about 2 GB    2 = about 5 GB    3 = about 10 GB    4 = about 32 GB
choice /c 1234 /n /m "Pick 1-4: "
set GB=2& set H=1
if errorlevel 2 (set GB=5& set H=2.5)
if errorlevel 3 (set GB=10& set H=5)
if errorlevel 4 (set GB=32& set H=16)
echo.
echo Quality?   1 = MP3 (smaller)    2 = FLAC (lossless, about 5x bigger)
choice /c 12 /n /m "Pick 1 or 2: "
set Q=mp3
if errorlevel 2 set Q=flac
echo.
echo Downloading. This can take a while; you can stop with Ctrl+C and run "Get Classical Music.bat" in
echo %DEST% later to carry on where it left off.
echo.
cd /d "%DEST%"
if %K%==1 "%PY%" get_classical.py %GB% %Q% classical
if %K%==2 "%PY%" get_classical.py %GB% %Q% lofi
if %K%==3 "%PY%" get_classical.py %H% %Q% classical
if %K%==3 "%PY%" get_classical.py %H% %Q% lofi

:shortcut
set "T=%DEST%\Lu Cube Desktop.bat"
if exist "%DEST%\desktop\electron\electron.exe" (call "%DEST%\Make Taskbar Shortcut.bat" <nul & goto made)
set "T=%DEST%\Lu Cube.bat"
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Lu Cube.lnk');$s.TargetPath=$env:T;$s.WorkingDirectory=$env:DEST;$s.WindowStyle=7;$s.Save()"
:made
echo.
echo Installed. There's a "Lu Cube" shortcut on your desktop and in the Start menu.
echo To pin it: Start menu, find Lu Cube, right-click, Pin to taskbar. Starting it now ...
start "" /min "%T%"
timeout /t 3 >nul

exit /b

:update
echo Lu Cube is already installed on this computer, so this just updates it.
echo Your music, favourites and settings stay as they are.
echo.
REM close this computer's Lu Cube (only the copy in %DEST%) so its files can be replaced
powershell -NoProfile -Command "Get-Process electron,python,pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ($env:DEST + '\*') } | Stop-Process -Force"
timeout /t 1 >nul
robocopy "%SRC%" "%DEST%" /E /COPY:D /DCOPY:D /XO /R:0 /W:0 /NJH /NJS /NDL /NP /XD __pycache__ Music python electron /XF state.json
copy /y "%SRC%\version.txt" "%DEST%\version.txt" >nul 2>nul
call :electron
for %%f in ("Music Cube.bat" "Music Cube Desktop.bat" "Make Music Cube Stick.bat") do if exist "%DEST%\%%~f" del "%DEST%\%%~f"
if exist "%DEST%\desktop\electron\electron.exe" call "%DEST%\Make Taskbar Shortcut.bat" <nul >nul
echo.
choice /c YN /n /m "Updated. Download more music too? (Y/N) "
if errorlevel 2 goto start
set "PY=%DEST%\python\python.exe"
if not exist "%PY%" for /f "delims=" %%p in ('where python 2^>nul') do if not exist "%PY%" set "PY=%%p"
echo What music?   1 = classical   2 = lofi
choice /c 12 /n /m "Pick 1 or 2: "
set KIND=classical
if errorlevel 2 set KIND=lofi
echo How much?   1 = about 2 GB    2 = about 5 GB    3 = about 10 GB    4 = about 32 GB
choice /c 1234 /n /m "Pick 1-4: "
set GB=2
if errorlevel 2 set GB=5
if errorlevel 3 set GB=10
if errorlevel 4 set GB=32
cd /d "%DEST%"
"%PY%" get_classical.py %GB% mp3 %KIND%
:start
set "T=%DEST%\Lu Cube Desktop.bat"
if not exist "%DEST%\desktop\electron\electron.exe" set "T=%DEST%\Lu Cube.bat"
echo Starting Lu Cube ...
start "" /min "%T%"
timeout /t 3 >nul
exit /b

:electron
REM the desktop cube needs Electron: take it from the stick, or download it if the stick doesn't have it
if exist "%DEST%\desktop\electron\electron.exe" exit /b
if exist "%SRC%\desktop\electron\electron.exe" (
  echo Copying the desktop cube's Electron from the stick ...
  robocopy "%SRC%\desktop\electron" "%DEST%\desktop\electron" /E /COPY:D /DCOPY:D /R:2 /W:2 /NJH /NJS /NDL /NP >nul
)
if exist "%DEST%\desktop\electron\electron.exe" exit /b
echo Getting Electron for the desktop cube (about 100 MB) ...
curl -L --fail -o "%TEMP%\lc-electron.zip" "https://github.com/electron/electron/releases/download/v33.2.1/electron-v33.2.1-win32-x64.zip" || (echo Couldn't download it. The window version still works; run "Set Up Desktop Cube.bat" later. & exit /b)
mkdir "%DEST%\desktop\electron" 2>nul
tar -xf "%TEMP%\lc-electron.zip" -C "%DEST%\desktop\electron"
del "%TEMP%\lc-electron.zip"
exit /b
