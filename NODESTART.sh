
#!/bin/bash
# NODESTART.sh - levanta server.js con Node

# Ruta absoluta a tu proyecto
PROJECT_DIR="/home/pi/padel_app"

# Entrar al proyecto
cd "$PROJECT_DIR" || exit 1

# Ejecutar Node.js
/usr/bin/node server.js

# Nota: si querés reinicio automático en crash, conviene usar systemd
