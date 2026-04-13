@echo off
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%dist\cli\index.js" %*
