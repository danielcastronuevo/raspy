#!/bin/bash
# NODESTART.sh - levanta server.js con Node.js

GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a $BASE_DIR"; exit 1; }

NODE_BIN=$(which node)

if [ -z "$NODE_BIN" ]; then
  echo -e "${RED}[!] Error:${RESET} Node.js no encontrado en el PATH."
  exit 1
fi

echo -e "${YELLOW}[+] Ejecutando server.js con ${NODE_BIN}${RESET}"
"$NODE_BIN" server.js

