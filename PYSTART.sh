#!/bin/bash
# PYSTART.sh - levanta scanner.py dentro del entorno virtual ya preparado

GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR/scanner" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a scanner/"; exit 1; }

# Carpeta de logs (afuera, junto al resto)
LOG_DIR="${BASE_DIR}/reports"
mkdir -p "$LOG_DIR"

VENV_DIR="../venv"
if [ ! -x "$VENV_DIR/bin/python3" ]; then
    echo -e "${RED}[!] Error:${RESET} Entorno virtual no encontrado. Ejecutá start.sh primero."
    exit 1
fi

# Activar entorno virtual
source "$VENV_DIR/bin/activate"

# Ejecutar scanner con logs + timestamp por línea
echo -e "${YELLOW}[+] Ejecutando scanner.py... (logs en logs/python.log)${RESET}"
"$VENV_DIR/bin/python3" -u scanner.py 2>&1 | while IFS= read -r line
do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
done >> "$LOG_DIR/python.log"
