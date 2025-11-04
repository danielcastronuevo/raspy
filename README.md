## Instalación y configuración del Contador 

Este repositorio contiene la aplicación de **Contador**, que incluye el servidor Node.js, el escáner Bluetooth y el frontend web en modo kiosko, con despliegue automático en Raspberry Pi.

### Instalación

```bash
git clone https://github.com/danielcastronuevo/raspy.git
cd raspy
chmod +x start.sh
./start.sh
```

### ¿Que hace `start.sh`?

El script automatiza la instalación y configuración completa del entorno:

1. **Inicialización del entorno**
   - Detecta usuario y ruta base del proyecto.
   - Crea o regenera `config.json` con un ID único y la URL del servidor VPS.

2. **Servicios systemd**
   - Crea y habilita dos servicios:
     - `raspy-scanner.service`: ejecuta el escáner Bluetooth (Python).
     - `raspy-server.service`: ejecuta el backend Node.js.
   - Ambos se inician automáticamente al arrancar el sistema.

3. **Preparación de entornos**
   - Crea un entorno virtual de Python (`venv`) e instala dependencias.
   - Instala dependencias Node (`npm install`).

4. **Configuración del modo kiosko**
   - Crea un autostart en `~/.config/autostart/` para lanzar Chromium en modo kiosko con la interfaz del contador:
     ```
     http://localhost:5000/counter/
     ```

5. **Limpieza y permisos**
   - Detiene servicios antiguos.
   - Ajusta permisos de ejecución de los scripts principales.

### Requisitos

- Raspberry Pi con Debian/Raspberry Pi OS  
- Python 3 y Node.js instalados  
- Chromium disponible  
- Conexión a internet para la instalación inicial

### Reinicio

Una vez completada la instalación, reiniciá el sistema para aplicar los cambios:

```bash
sudo reboot
```
