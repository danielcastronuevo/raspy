#!/bin/bash
# NODESTART.sh - levanta server.js con Node.js

# Colores
GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

# Ruta al proyecto
BASE_DIR="$(dirname "$0")"
cd "$BASE_DIR" || { echo -e "${RED}[!] Error:${RESET} No se pudo entrar a $BASE_DIR"; exit 1; }

# Instalar dependencias si no existen node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[+] Instalando dependencias de Node...${RESET}"
    npm install || { echo -e "${RED}[!] Error:${RESET} Falló npm install"; exit 1; }
    echo -e "${GREEN}[✓] Dependencias instaladas${RESET}"
fi

# Ejecutar server.js
echo -e "${YELLOW}[+] Ejecutando server.js...${RESET}"
/home/MARCADOR/.nvm/versions/node/v24.4.0/bin/node server.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✓] server.js corriendo${RESET}"
else
    echo -e "${RED}[✗] server.js terminó con error${RESET}"
    exit 1
fi

