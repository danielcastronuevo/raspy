# =============================================
# =============================================
# =============================================

sudo nano /etc/systemd/system/raspy-scanner.service

[Unit]
Description=Raspy Scanner Python
After=network.target

[Service]
Type=simple
#User=MARCADOR
WorkingDirectory=/home/MARCADOR/raspy
ExecStart=/home/MARCADOR/raspy/PYSTART.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

# =============================================
# =============================================
# =============================================

sudo nano /etc/systemd/system/raspy-server.service

[Unit]
Description=Raspy Node Server
After=network.target

[Service]
Type=simple
#User=MARCADOR
WorkingDirectory=/home/MARCADOR/raspy
ExecStart=/home/MARCADOR/raspy/NODESTART.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

# =============================================
# =============================================
# =============================================

nano ~/.config/autostart/chromium-kiosk.desktop

[Desktop Entry]
Type=Application
Name=Chromium Kiosk
Exec=/usr/bin/chromium-browser --kiosk http://localhost:5000/counter/ --noerrdialogs --incognito --disable-restore-session-state
StartupNotify=false
Terminal=false
X-GNOME-Autostart-enabled=true

# =============================================
# =============================================
# =============================================

# ==== Scanner Python ====
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

# ==== Servidor Node.js ====
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

# ==== Activar servicios ====
sudo systemctl daemon-reload
sudo systemctl enable raspy-scanner
sudo systemctl enable raspy-server

# ==== Autostart Chromium Kiosk ====
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

# ==== Reboot para probar ====
sudo reboot

# ==== Apagar servicios ====
sudo systemctl daemon-reload
sudo systemctl stop raspy-scanner
sudo systemctl stop raspy-server
