
#!/bin/bash
# PYSTART.sh - levanta scanner.py dentro del entorno virtual, creándolo si no existe

# Ruta relativa al script
BASE_DIR="$(dirname "$0")"

#!/bin/bash
# PYSTART.sh - levanta scanner.py dentro del entorno virtual, creándolo si no existe

# Ruta relativa al script
BASE_DIR="$(dirname "$0")"

# Entrar al proyecto
cd "$BASE_DIR/scanner" || exit 1

# Nombre del entorno virtual
VENV_DIR="../venv"

# Crear el entorno virtual si no existe
if [ ! -d "$VENV_DIR" ]; then
    echo "⚡ Creando entorno virtual..."
    python3 -m venv "$VENV_DIR"
    echo "⚡ Entorno virtual creado."
    
    # Activar y instalar dependencias
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip setuptools
    pip install bleak aiohttp
else
    # Activar entorno virtual existente
    source "$VENV_DIR/bin/activate"
fi

# Ejecutar el script Python
python3 scanner.py

