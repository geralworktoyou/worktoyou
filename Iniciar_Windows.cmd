@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao foi encontrado. Abra WorkToyou_Local.html diretamente ou instale o Node.js 22 ou superior.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4173"
node servidor-local.cjs
pause
