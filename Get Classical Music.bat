@echo off
title Lu Cube - get classical music
cd /d "%~dp0"
echo Downloads public-domain classical recordings (Musopen and others) from the Internet Archive
echo into the Music folder here, one folder per album. Only recordings marked public domain are taken.
echo Stop any time with Ctrl+C and run this again to carry on where it left off.
echo.
echo How much?   1 = about 2 GB    2 = about 5 GB    3 = about 10 GB    4 = about 32 GB
choice /c 1234 /n /m "Pick 1-4: "
set GB=2
if errorlevel 2 set GB=5
if errorlevel 3 set GB=10
if errorlevel 4 set GB=32
echo.
echo Quality?    1 = MP3 (smaller)    2 = FLAC (lossless, about 5x bigger)
choice /c 12 /n /m "Pick 1 or 2: "
set Q=mp3
if errorlevel 2 set Q=flac
set PY=
if exist "%~dp0python\python.exe" set PY=%~dp0python\python.exe
if not defined PY if exist "%USERPROFILE%\anaconda3\python.exe" set PY=%USERPROFILE%\anaconda3\python.exe
if not defined PY for /f "delims=" %%p in ('where python 2^>nul') do if not defined PY set PY=%%p
if not defined PY (echo Could not find Python. & pause & exit /b)
"%PY%" get_classical.py %GB% %Q%
echo.
echo Open Lu Cube (desktop shortcut) to listen.
pause
