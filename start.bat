@echo off
setlocal
cd /d "%~dp0"
echo Starting MJ Website...
echo.
start "MJ Python API" /D "%~dp0api" cmd /k "python -m pip install -r requirements.txt -q && python app.py"
timeout /t 2 /nobreak >nul
echo Starting PHP website on http://127.0.0.1:8000
php -S 127.0.0.1:8000 router.php
