#!/bin/bash
# NODESTART.sh - levanta server.js con Node.js

GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a $BASE_DIR"; exit 1; }

# Ejecutar server.js directamente
echo -e "${YELLOW}[+] Ejecutando server.js...${RESET}"
/home/MARCADOR/.nvm/versions/node/v24.4.0/bin/node server.js

