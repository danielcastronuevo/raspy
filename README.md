# === 0. Primero probar con el start.sh, es automatico ===
mv start.sh ../.start.sh
cd ..
./start.sh

# === 1. Clonar el repo y entrar a la carpeta ===
git clone https://github.com/danielcastronuevo/raspy.git app
cd app

# ==== 2. Scanner Python ====
sudo tee /etc/systemd/system/raspy-scanner.service > /dev/null <<'EOF'
[Unit]
Description=Raspy Scanner Python
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/MARCADOR/raspy
ExecStart=/home/MARCADOR/raspy/PYSTART.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ==== 3. Servidor Node.js ====
sudo tee /etc/systemd/system/raspy-server.service > /dev/null <<'EOF'
[Unit]
Description=Raspy Node Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/MARCADOR/raspy
ExecStart=/home/MARCADOR/raspy/NODESTART.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ==== 4. Dar permisos de ejecución ===
chmod +x PYSTART.sh
chmod +x NODESTART.sh

# ==== (Si es primera vez que se hace, ===
# ==== preferible levantar a mano los ====
# ==== scripts, sobre todo el entorno) ===
# Dejar que arranquen y CTRL + C
./PYSTART.sh
./NODESTART.sh

# ==== 5. Activar servicios ====
sudo systemctl daemon-reload
sudo systemctl enable raspy-scanner
sudo systemctl enable raspy-server

# ==== 6. Autostart Chromium Kiosk ====
mkdir -p ~/.config/autostart
tee ~/.config/autostart/chromium-kiosk.desktop > /dev/null <<'EOF'
[Desktop Entry]
Type=Application
Name=Chromium Kiosk
Exec=/usr/bin/chromium-browser --kiosk http://localhost:5000/counter/ --noerrdialogs --incognito --disable-restore-session-state
StartupNotify=false
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# ==== 7. Reboot para probar ====
sudo reboot

# ==== Opcionales: Apagar servicios ====
sudo systemctl daemon-reload
sudo systemctl stop raspy-scanner
sudo systemctl stop raspy-server

# ==== Opcionales: Logs ====
journalctl -u raspy-server
journalctl -u raspy-scanner
