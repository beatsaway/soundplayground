@echo off
cd /d "%~dp0"
echo Circle Beat: http://localhost:8768/
python -m http.server 8768
