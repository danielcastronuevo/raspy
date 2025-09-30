#!/bin/bash
# setup_raspy.sh - Prepara toda la Raspberry para el proyecto Raspy
# Ejecutar solo 1 vez

set -e  # Si algo falla, se detiene el script

# --------------------------
# Colores para la terminal
# --------------------------
TURQUOISE="\e[36m"
GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

# --------------------------
# Banner del proyecto
# --------------------------
echo -e "${TURQUOISE}"
echo "_____________________                          "
echo "____    |__  /__  __/___________ ____  ______ "
echo "___  /| |_  /__  /  _  __ \  __ \`/  / / /  _ \\"
echo "__  ___ |  / _  /   / /_/ / /_/ // /_/ //  __/"
echo "_/_/  |_/_/  /_/    \____/\__, / \__,_/ \___/ "
echo "                            /_/               "
echo -e "${TURQUOISE}AUTOMATIZACIÓN DE ARRANQUE${RESET}\n"

# --------------------------
# Carpeta del proyecto
# --------------------------
BASE_DIR="$HOME/app"
RECREATE=false  # Si vamos a clonar o recrear entornos

# --------------------------
# Detener y limpiar servicios existentes
# --------------------------
echo -e "${YELLOW}[+] Detener y limpiar servicios existentes${RESET}"
for svc in raspy-scanner raspy-server; do
    if systemctl list-units --full -all | grep -q "${svc}.service"; then
        echo -e "${YELLOW}[!] Deteniendo ${svc}.service...${RESET}"
        sudo systemctl stop "$svc"
        sudo systemctl disable "$svc"
    fi
done

# --------------------------
# Detectar si ya existe carpeta del proyecto
# --------------------------
if [ -d "$BASE_DIR" ]; then
    echo -e "${YELLOW}[!] Se detectó una carpeta existente para el proyecto: $BASE_DIR${RESET}"
    read -p "¿Querés borrarla y empezar desde cero? (o CTRL + C para cortar ejecución) [Y/N]: " RESP
    case "$RESP" in
        [Yy]* )
            echo -e "${GREEN}[+] Borrando carpeta existente...${RESET}"
            rm -rf "$BASE_DIR"
            RECREATE=true
            ;;
        [Nn]* )
            echo -e "${YELLOW}[+] Manteniendo carpeta existente, se usará tal cual.${RESET}"
            ;;
        * )
            echo -e "${RED}[✗] Respuesta no válida, abortando.${RESET}"
            exit 1
            ;;
    esac
fi

# --------------------------
# Clonar el repositorio si no existe o si se borró
# --------------------------
if [ ! -d "$BASE_DIR" ]; then
    echo -e "${GREEN}[+] Clonando repositorio...${RESET}"
    git clone https://github.com/danielcastronuevo/raspy.git "$BASE_DIR"
    RECREATE=true
else
    echo -e "${YELLOW}[+] Usando carpeta existente, saltando clonación.${RESET}"
fi

cd "$BASE_DIR"

# --------------------------
# Dar permisos a los scripts
# --------------------------
echo -e "${YELLOW}[+] Dar permisos a scripts${RESET}"
chmod +x PYSTART.sh NODESTART.sh

# --------------------------
# Crear servicios systemd
# --------------------------
echo -e "${YELLOW}[+] Crear servicios systemd${RESET}"
sudo tee /etc/systemd/system/raspy-scanner.service > /dev/null <<'EOF'
[Unit]
Description=Raspy Scanner Python
After=network.target
[Service]
Type=simple
WorkingDirectory=/home/MARCADOR/raspy
ExecStart=/home/MARCADOR/raspy/PYSTART.sh
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/raspy-server.service > /dev/null <<'EOF'
[Unit]
Description=Raspy Node Server
After=network.target
[Service]
Type=simple
WorkingDirectory=/home/MARCADOR/raspy
ExecStart=/home/MARCADOR/raspy/NODESTART.sh
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

# --------------------------
# Recargar systemd y habilitar servicios
# --------------------------
echo -e "${YELLOW}[+] Recargar systemd y habilitar servicios${RESET}"
sudo systemctl daemon-reload
sudo systemctl enable raspy-scanner
sudo systemctl enable raspy-server

# --------------------------
# Configurar autostart de Chromium
# --------------------------
echo -e "${YELLOW}[+] Configurar autostart de Chromium${RESET}"
mkdir -p ~/.config/autostart
tee ~/.config/autostart/chromium-kiosk.desktop > /dev/null <<'EOF'
[Desktop Entry]
Type=Application
Name=Chromium Kiosk
Exec=/usr/bin/chromium-browser --kiosk http://localhost:5000/counter/ --noerrdialogs --incognito --disable-restore-session-state
StartupNotify=false
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# --------------------------
# Preparar entorno Python y Node solo si es necesario
# --------------------------
if [ "$RECREATE" = true ]; then
    echo -e "${YELLOW}[+] Preparar entorno Python${RESET}"
    cd "$BASE_DIR/scanner"
    VENV_DIR="../venv"
    rm -rf "$VENV_DIR"
    echo -e "${YELLOW}[+] Creando entorno virtual y dependencias Python...${RESET}"
    /usr/bin/python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip setuptools bleak aiohttp >/dev/null 2>&1
    echo -e "${GREEN}[✓] Entorno Python listo${RESET}"

    echo -e "${YELLOW}[+] Preparar dependencias Node${RESET}"
    cd "$BASE_DIR"
    npm install >/dev/null 2>&1
    echo -e "${GREEN}[✓] Dependencias Node listas${RESET}"
else
    echo -e "${YELLOW}[+] Carpeta existente: se saltan creación de entornos y dependencias${RESET}"
fi

# --------------------------
# Fin del setup
# --------------------------
echo -e "${GREEN}[✓] Setup completo!${RESET}"
echo -e "Ahora podés reiniciar la Raspberry y todo arrancará automáticamente"
