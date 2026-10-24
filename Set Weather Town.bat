@echo off
setlocal
title Lu Cube - weather town
cd /d "%~dp0"
echo Lu Cube can tint its faces with your local weather (rain, snow, sun) as well as the time of day.
echo Type your town, like:  Buffalo, NY   or   Toronto, ON
echo.
set T=
set /p T=Town: 
if "%T%"=="" exit /b
set PY=
if exist "%~dp0python\python.exe" set PY=%~dp0python\python.exe
if not defined PY if exist "%USERPROFILE%\anaconda3\python.exe" set PY=%USERPROFILE%\anaconda3\python.exe
if not defined PY for /f "delims=" %%p in ('where python 2^>nul') do if not defined PY set PY=%%p
if not defined PY (echo Could not find Python. & pause & exit /b)
"%PY%" musiccube.py --set-town %T%
pause
