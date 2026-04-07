@echo off
cd /d "%~dp0"

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote remove origin >nul 2>nul
git remote add origin https://github.com/ShubhjeetKT/random.git
git push -u origin main
pause
