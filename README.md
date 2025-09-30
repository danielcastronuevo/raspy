## Ejecutar `start.sh` directamente

Si querés probar o ejecutar el script `start.sh` sin clonar todo el repositorio, podés hacerlo descargándolo directamente desde GitHub y otorgándole permisos de ejecución. Los pasos son los siguientes:

```bash
# 1️⃣ Descargar el archivo directamente desde el repositorio
curl -O https://raw.githubusercontent.com/danielcastronuevo/raspy/refs/heads/master/start.sh

# 2️⃣ Hacer que el archivo sea ejecutable
chmod +x start.sh

# 3️⃣ Ejecutar el script
./start.sh
```

> ⚠️ Asegurate de revisar el contenido del script antes de ejecutarlo, especialmente si lo descargás de Internet. Podés hacer esto con `cat start.sh` o abrirlo en tu editor de texto favorito.
