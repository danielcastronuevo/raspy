
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

# CTRL+C
function ctrl_c () {
    echo -e "\n\n${yellowColour}[!]${endColour} Saliendo...\n"
    tput cnorm
    exit 1
}
trap ctrl_c INT

echo -e "${turquoiseColour}[+]${endColour} Preparando servicios systemd para el usuario ${greenColour}$CURRENT_USER${endColour}..."

# Copiar servicios al systemd del usuario
for service in raspy-server raspy-scanner; do
    SERVICE_FILE="$SYSTEMD_DIR/$service.service"
    if [ -f "$SERVICE_FILE" ]; then
        # Reemplazar User dinámicamente
        sed "s/^User=.*/User=$CURRENT_USER/" "$SERVICE_FILE" > "/tmp/$service.service.tmp"
        sudo mv "/tmp/$service.service.tmp" "/etc/systemd/system/$service.service"
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

# Abrir Chrome en pantalla completa apuntando al marcador
echo -e "${greenColour}[+]${endColour} Abriendo Chrome en pantalla completa..."
google-chrome --start-fullscreen "http://localhost:3000" &

echo -e "${greenColour}[+]${endColour} Aplicación levantada y servicios configurados para iniciar automáticamente."

