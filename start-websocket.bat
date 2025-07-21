@echo off
echo Starting CNC WebSocket Server...
cd /d "%~dp0websocket-server"
node server.js
pause
