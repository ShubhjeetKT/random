@echo off
cd /d "%~dp0"

set GIT_EXE=C:\Users\tiwari.sk\tools\mingit\cmd\git.exe

"%GIT_EXE%" init
"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "Initial commit"
"%GIT_EXE%" branch -M main
"%GIT_EXE%" remote remove origin >nul 2>nul
"%GIT_EXE%" remote add origin https://github.com/ShubhjeetKT/random.git
"%GIT_EXE%" push -u origin main
pause
