@echo off
title Lu Cube - get audiobooks
cd /d "%~dp0"
echo Pulls classic public-domain audiobooks (LibriVox) into Music\^<Book^>\ with chapters in order and a cover.
echo It is a LOT of audio (many GB). You can close this and run it again any time - it picks up where it left off.
echo.
set "PYX=python"
if exist "%~dp0python\python.exe" set "PYX=%~dp0python\python.exe"
"%PYX%" get_audiobooks.py %*
pause
