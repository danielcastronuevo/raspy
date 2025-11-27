#!/bin/bash
# GENERALSTATS.sh - monitoreo general cada 30 segundos

GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"

BASE_DIR="$(dirname "$0")"
LOG_DIR="${BASE_DIR}/reports"
mkdir -p "$LOG_DIR"

echo -e "${YELLOW}[+] Iniciando monitor GENERALSTATS...${RESET}"

while true; do
    DATE=$(date "+%Y-%m-%d %H:%M:%S")

    # Temperatura CPU
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP_RAW / 1000))

    # CPU load
    LOAD=$(cat /proc/loadavg | awk '{print $1}')

    # RAM usage
    RAM_USED=$(free -m | awk '/Mem:/ {print $3}')
    RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')

    # Disk
    DISK_ROOT=$(df -h / | awk 'NR==2 {print $4}')
    DISK_HOME=$(df -h /home | awk 'NR==2 {print $4}')

    # Network
    if ping -c 1 -W 1 8.8.8.8 >/dev/null 2>&1; then
        NET="OK"
    else
        NET="NO"
    fi

    echo "[$DATE] Temp: ${TEMP_C}°C | Load: ${LOAD} | RAM: ${RAM_USED}/${RAM_TOTAL}MB | Disk /: ${DISK_ROOT} | /home: ${DISK_HOME} | Net: ${NET}" >> "$LOG_DIR/generalstats.log"

    sleep 30
done
