
#!/usr/bin/env bash

# Colores
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
yellowColour="\e[0;33m\033[1m"
redColour="\e[0;31m\033[1m"
turquoiseColour="\e[0;36m\033[1m"

SYSTEMD_DIR="systemd"
APP_DIR="$(pwd)"
VENV_DIR="../pyenv"
CURRENT_USER=$(whoami)

# Detectar rutas absolutas
NODE_PATH=$(which node)
PYTHON_PATH=$(which python)

# CTRL+C
function ctrl_c () {
    echo -e "\n\n${yellowColour}[!]${endColour} Saliendo...\n"
    tput cnorm
    exit 1
}
trap ctrl_c INT

echo -e "${turquoiseColour}[+]${endColour} Preparando servicios systemd para el usuario ${greenColour}$CURRENT_USER${endColour}..."
echo -e "${turquoiseColour}[+]${endColour} Node: ${greenColour}$NODE_PATH${endColour}"
echo -e "${turquoiseColour}[+]${endColour} Python: ${greenColour}$PYTHON_PATH${endColour}"

# Copiar servicios al systemd del usuario con rutas dinámicas
for service in raspy-server raspy-scanner; do
    SERVICE_FILE="$SYSTEMD_DIR/$service.service"
    if [ -f "$SERVICE_FILE" ]; then
        TMP_FILE="/tmp/$service.service.tmp"
        if [[ "$service" == "raspy-server" ]]; then
            sed -e "s|^User=.*|User=$CURRENT_USER|" \
                -e "s|^ExecStart=.*|ExecStart=$NODE_PATH server.js|" \
                "$SERVICE_FILE" > "$TMP_FILE"
        else
            sed -e "s|^User=.*|User=$CURRENT_USER|" \
                -e "s|^ExecStart=.*|ExecStart=$PYTHON_PATH $APP_DIR/scanner/scanner.py|" \
                "$SERVICE_FILE" > "$TMP_FILE"
        fi
        sudo mv "$TMP_FILE" "/etc/systemd/system/$service.service"
        sudo chmod 644 "/etc/systemd/system/$service.service"
        echo -e "${greenColour}[+]${endColour} Servicio $service preparado."
    else
        echo -e "${redColour}[!]${endColour} No se encontró $SERVICE_FILE"
    fi
done

# Recargar systemd
sudo systemctl daemon-reload

# Función para verificar si un servicio está activo
function check_service() {
    systemctl is-active --quiet "$1"
}

# Levantar servicios
for service in raspy-server raspy-scanner; do
    if check_service "$service"; then
        read -p "$(echo -e "${yellowColour}[!]${endColour} $service ya está corriendo. Reiniciarlo? (S/N): ")" RESP
        RESP=${RESP^^}
        if [[ "$RESP" == "S" ]]; then
            echo -e "${greenColour}[+]${endColour} Reiniciando $service..."
            sudo systemctl restart "$service"
        else
            echo -e "${greenColour}[+]${endColour} Dejando $service en ejecución."
        fi
    else
        echo -e "${greenColour}[+]${endColour} Iniciando $service..."
        sudo systemctl start "$service"
    fi
done

# Habilitar para que arranque al iniciar
for service in raspy-server raspy-scanner; do
    sudo systemctl enable "$service"
done

# Abrir Chromium en pantalla completa apuntando al marcador
echo -e "${greenColour}[+]${endColour} Abriendo Chromium en pantalla completa..."
chromium-browser --start-fullscreen --disable-gpu --no-sandbox "http://localhost:5000/counter/" &>/dev/null &

echo -e "${greenColour}[+]${endColour} Aplicación levantada y servicios configurados para iniciar automáticamente."

