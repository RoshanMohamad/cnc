Write-Host "Starting CNC WebSocket Server..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\websocket-server"
node server.js
