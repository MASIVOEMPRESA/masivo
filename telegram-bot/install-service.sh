#!/bin/zsh
# Instala el bot como servicio de macOS (arranca solo al iniciar sesión).
set -e
cd -- "$(dirname -- "$0")"
PLIST="$HOME/Library/LaunchAgents/com.masivo.telegram-bot.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cp com.masivo.telegram-bot.plist "$PLIST"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/com.masivo.telegram-bot"
echo "Servicio instalado. Log: $HOME/Library/Logs/masivo-telegram-bot.log"
