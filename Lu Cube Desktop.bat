@echo off
REM Lu Cube on your desktop: just the wheel on the screen edge and the cube, no window. Run "Set Up Desktop Cube.bat" once first.
cd /d "%~dp0"
if not exist "desktop\electron\electron.exe" (echo The desktop cube isn't set up on this computer yet. Setting it up now ... & call "Set Up Desktop Cube.bat")
if not exist "desktop\electron\electron.exe" (echo Still no Electron, so opening the window version instead. & start "" "%~dp0Lu Cube.bat" & exit /b)
set MC_PY=
if exist "%~dp0python\python.exe" set MC_PY=%~dp0python\python.exe
if not defined MC_PY if exist "%USERPROFILE%\anaconda3\python.exe" set MC_PY=%USERPROFILE%\anaconda3\python.exe
if not defined MC_PY for /f "delims=" %%p in ('where python 2^>nul') do if not defined MC_PY set MC_PY=%%p
if not defined MC_PY (
  REM no Python on this computer: fetch the official portable one from python.org, about 11 MB, into .\python
  echo Getting a portable Python for Lu Cube ^(about 11 MB, one time only^) ...
  curl -L --fail -o "%TEMP%\lc-python.zip" "https://www.python.org/ftp/python/3.12.7/python-3.12.7-embed-amd64.zip" || (echo Couldn't download Python. Check your internet and try again. & pause & exit /b)
  mkdir "%~dp0python" 2>nul
  tar -xf "%TEMP%\lc-python.zip" -C "%~dp0python" & del "%TEMP%\lc-python.zip"
  if exist "%~dp0python\python.exe" set "MC_PY=%~dp0python\python.exe"
)
if not defined MC_PY (echo Could not find Python. & pause & exit /b)
start "" "desktop\electron\electron.exe" "%~dp0desktop"
