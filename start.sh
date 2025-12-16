#!/bin/bash
# start.sh - Configura y habilita los servicios del proyecto Raspy
# Ejecutar después de clonar el repositorio

set -e

# --------------------------
# Colores
# --------------------------
TURQUOISE="\e[36m"
GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

# --------------------------
# Banner
# --------------------------
echo -e "${TURQUOISE}"
echo "_____________________                          "
echo "____    |__  /__  __/___________ ____  ______ "
echo "___  /| |_  /__  /  _  __ \\  __ \`/  / / /  _ \\"
echo "__  ___ |  / _  /   / /_/ / /_/ // /_/ //  __/"
echo "_/_/  |_/_/  /_/    \\____/\\__, / \\__,_/ \\___/ "
echo "                            /_/               "
echo -e "${TURQUOISE}>_ ARRANQUE AUTOMÁTICO${RESET}\n"

# --------------------------
# Variables base
# --------------------------
BASE_DIR="$(pwd)"
USER_NAME="$(whoami)"

echo -e "${YELLOW}[+] Directorio base detectado:${RESET} $BASE_DIR"
echo -e "${YELLOW}[+] Usuario actual:${RESET} $USER_NAME\n"

# ---------------------------------------------------
# NUEVO: Crear carpeta de logs si no existe
# ---------------------------------------------------
LOG_DIR="${BASE_DIR}/reports"
mkdir -p "$LOG_DIR"
echo -e "${YELLOW}[+] Carpeta de logs asegurada en:${RESET} $LOG_DIR\n"

# --------------------------
# Generar config.json si no existe o preguntar
# --------------------------
CONFIG_FILE="${BASE_DIR}/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}[+] No se encontró config.json, generando uno nuevo${RESET}"
    REGEN=true
else
    echo -e "${YELLOW}[+] Config.json existente encontrado${RESET}"
    echo -e "${YELLOW}[!] Desea regenerarlo? Se reemplazará con un nuevo ID aleatorio [s/N] (auto 10s):${RESET} \c"
    
    read -t 10 RESP || RESP="s"
    
    if [[ "$RESP" =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}[+] Regenerando config.json...${RESET}"
        rm -f "$CONFIG_FILE"
        REGEN=true
    else
        echo -e "${YELLOW}[+] Se mantiene el config.json existente${RESET}"
        REGEN=false
    fi
fi

if [ "$REGEN" = true ]; then
    UUID=$(cat /proc/sys/kernel/random/uuid | cut -c1-8 | tr '[:lower:]' '[:upper:]')
    
    # ===== SELECCIONAR CLUB =====
    echo -e "\n${YELLOW}[+] Seleccione el club a configurar:${RESET}"
    # Array de clubs (añadir más aquí en el futuro)
    CLUBS=("hulk-padel" "la-esquina")
    
    for i in "${!CLUBS[@]}"; do
        echo -e "  ${GREEN}$((i+1))${RESET}) ${CLUBS[$i]}"
    done
    
    echo -e "${YELLOW}[!] Ingrese el número de club (auto 15s):${RESET} \c"
    read -t 15 CLUB_INDEX || CLUB_INDEX=2
    
    # Validar índice
    if ! [[ "$CLUB_INDEX" =~ ^[0-9]+$ ]] || [ "$CLUB_INDEX" -lt 1 ] || [ "$CLUB_INDEX" -gt "${#CLUBS[@]}" ]; then
        CLUB_INDEX=2  # Default: la-esquina
        echo -e "${YELLOW}Opción inválida, usando default...${RESET}"
    fi
    
    SELECTED_CLUB="${CLUBS[$((CLUB_INDEX-1))]}"
    echo -e "${GREEN}[✓] Club seleccionado:${RESET} $SELECTED_CLUB\n"
    
    cat <<EOF > "$CONFIG_FILE"
{
  "raspy_id": "$UUID",
  "vps_url": "http://91.108.124.53:5000",
  "club": "$SELECTED_CLUB"
}
EOF
    echo -e "${GREEN}[✓] Config.json creado con ID:${RESET} $UUID"
fi

# --------------------------
# Limpiar servicios previos
# --------------------------
echo -e "${YELLOW}[+] Deteniendo servicios antiguos${RESET}"
for svc in raspy-scanner raspy-server raspy-generalstats; do
    if systemctl list-units --full -all | grep -q "${svc}.service"; then
        sudo systemctl stop "$svc" || true
        sudo systemctl disable "$svc" || true
    fi
done

# --------------------------
# Dar permisos a los scripts
# --------------------------
echo -e "${YELLOW}[+] Ajustando permisos de ejecución${RESET}"
chmod +x "$BASE_DIR/PYSTART.sh" "$BASE_DIR/NODESTART.sh" "$BASE_DIR/GENERALSTATS.sh"

# --------------------------
# Crear servicios systemd
# --------------------------
echo -e "${YELLOW}[+] Creando servicios systemd${RESET}"

sudo tee /etc/systemd/system/raspy-scanner.service > /dev/null <<EOF
[Unit]
Description=Raspy Scanner Python
After=network.target

[Service]
Type=simple
WorkingDirectory=${BASE_DIR}
ExecStart=${BASE_DIR}/PYSTART.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/raspy-server.service > /dev/null <<EOF
[Unit]
Description=Raspy Node Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${BASE_DIR}
ExecStart=${BASE_DIR}/NODESTART.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/raspy-generalstats.service > /dev/null <<EOF
[Unit]
Description=Raspy General Stats Monitor
After=multi-user.target

[Service]
Type=simple
WorkingDirectory=${BASE_DIR}
ExecStart=${BASE_DIR}/GENERALSTATS.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# --------------------------
# Recargar systemd y habilitar servicios
# --------------------------
echo -e "${YELLOW}[+] Activando servicios${RESET}"
sudo systemctl daemon-reload
sudo systemctl enable raspy-scanner
sudo systemctl enable raspy-server
sudo systemctl enable raspy-generalstats

# --------------------------
# Configurar autostart de Chromium
# --------------------------
echo -e "${YELLOW}[+] Configurando autostart de Chromium${RESET}"
mkdir -p ~/.config/autostart
tee ~/.config/autostart/chromium-kiosk.desktop > /dev/null <<EOF
[Desktop Entry]
Type=Application
Name=Chromium Kiosk
Exec=/bin/bash -c "sleep 10 && /usr/bin/chromium-browser --kiosk http://localhost:5000/counter/ --noerrdialogs --incognito --disable-restore-session-state"
StartupNotify=false
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# --------------------------
# Preparar entornos si faltan
# --------------------------
if [ ! -d "$BASE_DIR/venv" ]; then
    echo -e "${YELLOW}[+] Creando entorno virtual Python${RESET}"
    cd "$BASE_DIR/scanner"
    VENV_DIR="../venv"
    echo -e "${YELLOW}    ↳ Ubicación:${RESET} $(realpath $VENV_DIR)"
    /usr/bin/python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip setuptools bleak aiohttp >/dev/null 2>&1
    echo -e "${GREEN}[✓] Entorno Python listo en:${RESET} $(realpath $VENV_DIR)"
fi

if [ ! -d "$BASE_DIR/node_modules" ]; then
    echo -e "${YELLOW}[+] Instalando dependencias Node${RESET}"
    cd "$BASE_DIR"
    npm install >/dev/null 2>&1
    echo -e "${GREEN}[✓] Dependencias Node listas${RESET}"
fi

# --------------------------
# Fin del setup
# --------------------------
echo -e "${GREEN}[✓] Setup completo!${RESET}"
echo -e "Reiniciá la Raspberry para iniciar automáticamente los servicios."