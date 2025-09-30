#!/bin/bash
# PYSTART.sh - levanta scanner.py dentro del entorno virtual, creándolo si no existe

# Ruta relativa al script
BASE_DIR="$(dirname "$0")"

# Entrar a la carpeta del scanner
cd "$BASE_DIR/scanner" || exit 1

# Entorno virtual (en la raíz del proyecto)
VENV_DIR="../venv"

# Crear entorno si no existe
if [ ! -d "$VENV_DIR" ]; then
    echo "⚡ Creando entorno virtual..."
    /usr/bin/python3 -m venv "$VENV_DIR"
    echo "⚡ Entorno virtual creado."
    
    # Activar y instalar dependencias
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip setuptools
    pip install bleak aiohttp
else
    # Activar entorno virtual existente
    source "$VENV_DIR/bin/activate"
fi

# Ejecutar el script Python en modo unbuffered
"$VENV_DIR/bin/python3" -u scanner.py
