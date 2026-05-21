@echo off
title Claude Code with OpenCode Go

:: 1. Clear any conflicting authentication token
set ANTHROPIC_AUTH_TOKEN=

:: 2. Clear ALL custom model overrides so nvidia/nemotron disappears!
set ANTHROPIC_DEFAULT_OPUS_MODEL=
set ANTHROPIC_DEFAULT_OPUS_MODEL_NAME=
set ANTHROPIC_DEFAULT_SONNET_MODEL=
set ANTHROPIC_DEFAULT_SONNET_MODEL_NAME=
set ANTHROPIC_DEFAULT_HAIKU_MODEL=
set ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME=
set ANTHROPIC_MODEL=

:: 3. Start the proxy on port 8001 if it's not already running
netstat -ano | findstr :8001 >nul
if errorlevel 1 (
    echo Starting OpenCode Go Proxy on port 8001...
    start /B node "C:\Users\Poste\.claude\opencode-claude-proxy.js"
    timeout /t 2 >nul
) else (
    echo OpenCode Go Proxy is already running on port 8001.
)

:: 4. EXPLICITLY point to our local proxy!
set ANTHROPIC_BASE_URL=http://localhost:8001
set ANTHROPIC_API_KEY=sk-F5I9CdeRxDDs6QexAyKJZ4nFhVsHsT2NWbGKcCUIr39KpAPS4ciUb31KyHL2YD8f

:: 5. Force gateway discovery to update the list
set CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1

:: 6. Launch Claude CLI
echo Launching Claude Code...
claude
