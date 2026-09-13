$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host 'Starting MJ Website...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\api'; python -m pip install -r requirements.txt -q; python app.py"
Start-Sleep -Seconds 2
Set-Location $root
Write-Host 'Open http://127.0.0.1:8000' -ForegroundColor Green
php -S 127.0.0.1:8000 router.php
