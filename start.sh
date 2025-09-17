#!/usr/bin/env bash

# Colores
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
yellowColour="\e[0;33m\033[1m"
redColour="\e[0;31m\033[1m"
turquoiseColour="\e[0;36m\033[1m"

SYSTEMD_DIR="systemd"
TMP_SYSTEMD_DIR="./tmp_systemd"
APP_DIR="$(pwd)/raspy-app"   # raíz de la aplicación
VENV_DIR="$APP_DIR/../pyenv"
CURRENT_USER=$(whoami)

# Rutas dinámicas
NODE_NVM_SH="$HOME/.nvm/nvm.sh"
NODE_PATH=$(which node)
PYTHON_PATH=$(which python)

mkdir -p "$TMP_SYSTEMD_DIR"

# CTRL+C
function ctrl_c () {
    echo -e "\n\n${yellowColour}[!]${endColour} Saliendo...\n"
    tput cnorm
    exit 1
}
trap ctrl_c INT

echo -e "${turquoiseColour}[+]${endColour} Preparando servicios systemd para el usuario ${greenColour}$CURRENT_USER${endColour}..."
echo -e "${turquoiseColour}[+]${endColour} Node/NVM: ${greenColour}$NODE_NVM_SH${endColour}"
echo -e "${turquoiseColour}[+]${endColour} Python: ${greenColour}$PYTHON_PATH${endColour}"

# Generar archivos systemd en tmp_systemd
for service in raspy-server raspy-scanner; do
    SERVICE_FILE="$SYSTEMD_DIR/$service.service"
    TMP_FILE="$TMP_SYSTEMD_DIR/$service.service"

    if [ -f "$SERVICE_FILE" ]; then
        cp "$SERVICE_FILE" "$TMP_FILE"
        sed -i "s|^User=.*|User=$CURRENT_USER|" "$TMP_FILE"
        # Ajustar WorkingDirectory un nivel arriba de APP_DIR
	sed -i "s|^WorkingDirectory=.*|WorkingDirectory=$(dirname "$APP_DIR")|" "$TMP_FILE"


        if [[ "$service" == "raspy-server" ]]; then
            sed -i "/^ExecStart=/c\ExecStart=/bin/bash -c 'source $NODE_NVM_SH && $NODE_PATH $(dirname "$APP_DIR")/server.js'" "$TMP_FILE"
        else
            sed -i "/^ExecStart=/c\ExecStart=$PYTHON_PATH $(dirname "$APP_DIR")/scanner/scanner.py" "$TMP_FILE"
        fi

        echo -e "${greenColour}[+]${endColour} Servicio $service preparado en $TMP_FILE"
    else
        echo -e "${redColour}[!]${endColour} No se encontró $SERVICE_FILE"
    fi
done

# Revisar antes de copiar
echo -e "${yellowColour}[!]${endColour} Los archivos están listos en $TMP_SYSTEMD_DIR. Revisa antes de copiarlos."
read -p "¿Querés copiarlos a /etc/systemd/system ahora? (S/N): " RESP
RESP=${RESP^^}

if [[ "$RESP" == "S" ]]; then
    for service in raspy-server raspy-scanner; do
        sudo mv "$TMP_SYSTEMD_DIR/$service.service" "/etc/systemd/system/$service.service"
        sudo chmod 644 "/etc/systemd/system/$service.service"
        echo -e "${greenColour}[+]${endColour} Servicio $service instalado en systemd."
    done
    sudo systemctl daemon-reload
    echo -e "${greenColour}[+]${endColour} Systemd recargado."
fi

# Levantar servicios y habilitarlos
for service in raspy-server raspy-scanner; do
    sudo systemctl enable "$service"
    sudo systemctl start "$service"
    echo -e "${greenColour}[+]${endColour} Servicio $service iniciado y habilitado."
done

# Abrir Chromium en pantalla completa
echo -e "${greenColour}[+]${endColour} Abriendo Chromium en pantalla completa..."
chromium-browser --start-fullscreen --disable-gpu --no-sandbox "http://localhost:5000/counter/" &>/dev/null &

echo -e "${greenColour}[+]${endColour} Aplicación levantada y servicios configurados para iniciar automáticamente."
