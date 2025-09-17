
#!/usr/bin/env bash

# Colores
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
yellowColour="\e[0;33m\033[1m"
redColour="\e[0;31m\033[1m"
turquoiseColour="\e[0;36m\033[1m"

VENV_DIR="../pyenv"

# CTRL+C
function ctrl_c () {
  echo -e "\n\n${yellowColour}[!]${endColour} Saliendo...\n"
  tput cnorm
  exit 1
}
trap ctrl_c INT

echo -e "${turquoiseColour}[+]${endColour} Iniciando aplicación..."

# 1. Levantar backend
if [ -f "server.js" ]; then
    echo -e "${greenColour}[+]${endColour} Levantando backend con Node.js..."
    node server.js &
    NODE_PID=$!
    sleep 1
else
    echo -e "${redColour}[!]${endColour} No se encontró server.js en la carpeta actual."
fi

# 2. Entrar al virtualenv y ejecutar scanner.py
if [ -d "$VENV_DIR" ]; then
    echo -e "${greenColour}[+]${endColour} Activando entorno virtual..."
    source "$VENV_DIR/bin/activate"

    if [ -f "scanner/scanner.py" ]; then
        echo -e "${greenColour}[+]${endColour} Ejecutando scanner.py..."
        python scanner/scanner.py
    else
        echo -e "${redColour}[!]${endColour} No se encontró scanner.py en scanner/"
    fi

    deactivate
else
    echo -e "${redColour}[!]${endColour} No se encontró entorno virtual '$VENV_DIR'."
fi

# Opcional: matar backend si querés que termine junto con scanner.py
if [[ ! -z "$NODE_PID" ]]; then
    kill $NODE_PID 2>/dev/null
fi

echo -e "${greenColour}[+]${endColour} Aplicación finalizada."
