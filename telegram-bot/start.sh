#!/bin/zsh
# Arranca el bot y evita que la Mac se duerma por inactividad.
cd -- "$(dirname -- "$0")" || exit 1
exec /usr/bin/caffeinate -i /usr/local/bin/node bridge.mjs
