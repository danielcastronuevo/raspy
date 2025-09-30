#!/bin/bash
# PYSTART.sh - levanta scanner.py dentro del entorno virtual, creándolo si no existe

# Colores
GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR/scanner" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a scanner/"; exit 1; }

VENV_DIR="../venv"

if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}[+] Creando entorno virtual...${RESET}"
    /usr/bin/python3 -m venv "$VENV_DIR" || { echo -e "${RED}[!] Error:${RESET} Falló la creación del entorno"; exit 1; }
    echo -e "${GREEN}[✓] Entorno virtual creado${RESET}"

    source "$VENV_DIR/bin/activate"
    echo -e "${YELLOW}[+] Instalando dependencias...${RESET}"
    pip install --upgrade pip setuptools bleak aiohttp || { echo -e "${RED}[!] Error:${RESET} Falló la instalación de dependencias"; exit 1; }
    echo -e "${GREEN}[✓] Dependencias listas${RESET}"
else
    echo -e "${YELLOW}[+] Usando entorno virtual existente${RESET}"
    source "$VENV_DIR/bin/activate"
fi

echo -e "${YELLOW}[+] Ejecutando scanner.py...${RESET}"
"$VENV_DIR/bin/python3" -u scanner.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✓] scanner.py corriendo${RESET}"
else
    echo -e "${RED}[✗] scanner.py terminó con error${RESET}"
    exit 1
fi

