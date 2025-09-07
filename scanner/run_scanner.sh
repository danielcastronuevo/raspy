#!/bin/bash

# Ir al directorio donde está este script
cd "$(dirname "$0")" || {
  echo "[Scanner Bash ERROR]: No se pudo cambiar al directorio del script"
  exit 1
}

# Mostrar ruta actual (debug opcional)
 echo "📂 Estoy en: $(pwd)"

# Activar entorno virtual (sube dos niveles desde 'scanner' → 'Foxbat_AppPadel' → 'APP_PADEL')
source ../../entorno_virtual_app/bin/activate || {
  echo "[Scanner Bash ERROR]: No se pudo activar el entorno virtual"
  exit 1
}

# Ejecutar el scanner (está en el mismo directorio)
python3 scanner.py || {
  echo "[Scanner Bash ERROR]: Falló la ejecución de scanner.py"
  exit 2
}
