#!/bin/bash
# PYSTART.sh - levanta scanner.py dentro del entorno virtual ya preparado

GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR/scanner" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a scanner/"; exit 1; }

VENV_DIR="../venv"
if [ ! -x "$VENV_DIR/bin/python3" ]; then
    echo -e "${RED}[!] Error:${RESET} Entorno virtual no encontrado. Ejecutá start.sh primero."
    exit 1
fi

# Activar entorno virtual
source "$VENV_DIR/bin/activate"

# Ejecutar scanner
echo -e "${YELLOW}[+] Ejecutando scanner.py...${RESET}"
"$VENV_DIR/bin/python3" -u scanner.py

