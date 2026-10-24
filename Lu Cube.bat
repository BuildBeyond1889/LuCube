@echo off
REM Opens Lu Cube on the Music folder next to this file. No accounts, no internet.
cd /d "%~dp0"
if exist "%~dp0python\pythonw.exe" (start "" "%~dp0python\pythonw.exe" musiccube.py & exit /b)
if exist "%USERPROFILE%\anaconda3\pythonw.exe" (start "" "%USERPROFILE%\anaconda3\pythonw.exe" musiccube.py & exit /b)
where pythonw >nul 2>nul && (start "" pythonw musiccube.py & exit /b)
REM no Python on this computer: fetch the official portable one from python.org (about 11 MB) into .\python
echo Getting a portable Python for Lu Cube (about 11 MB, one time only) ...
curl -L --fail -o "%TEMP%\lc-python.zip" "https://www.python.org/ftp/python/3.12.7/python-3.12.7-embed-amd64.zip" || (echo Couldn't download Python. Check your internet and try again. & pause & exit /b)
mkdir "%~dp0python" 2>nul
tar -xf "%TEMP%\lc-python.zip" -C "%~dp0python" & del "%TEMP%\lc-python.zip"
if exist "%~dp0python\pythonw.exe" (start "" "%~dp0python\pythonw.exe" musiccube.py & exit /b)
echo Could not set up Python.
pause
