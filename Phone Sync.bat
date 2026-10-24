@echo off
REM Lets the Lu Cube phone app copy your songs (and swap passport stamps) over Wi-Fi. Close this window to stop.
cd /d "%~dp0"
title Lu Cube Phone Sync
set PY=
if exist "%~dp0python\python.exe" set PY="%~dp0python\python.exe"
if not defined PY if exist "%USERPROFILE%\anaconda3\python.exe" set PY="%USERPROFILE%\anaconda3\python.exe"
if not defined PY (where python >nul 2>nul && set PY=python)
if not defined PY (echo Run Lu Cube.bat once first, it sets up Python. & pause & exit /b)
echo Windows may ask whether Python can use your network: allow it on Private networks.
%PY% musiccube.py --phone-sync
pause
