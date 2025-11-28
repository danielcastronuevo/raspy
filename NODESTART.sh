#!/bin/bash
# NODESTART.sh - levanta server.js con Node.js

GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a $BASE_DIR"; exit 1; }

LOG_DIR="${BASE_DIR}/reports"
mkdir -p "$LOG_DIR"

echo -e "${YELLOW}[+] Ejecutando server.js... (logs en logs/node.log)${RESET}"

# Ejecutar con log persistente y timestamp por línea
/home/MARCADOR/.nvm/versions/node/v24.5.0/bin/node server.js 2>&1 | while IFS= read -r line
do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
done >> "$LOG_DIR/node.log"
