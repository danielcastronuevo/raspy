
const colors = require('./data/colors'); // Tus colores ANSI
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { io: Client } = require("socket.io-client");
const { configurarPartido } = require('./logic/configurator');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ====================================
// Helpers para logs
// ====================================
function logError(msg) {
  console.log(`${colors.rojo}[!]${colors.reset} ${msg}`);
}
function logInfo(msg) {
  console.log(`${colors.cyan}[i]${colors.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${colors.amarillo}[!]${colors.reset} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${colors.verde}[+]${colors.reset} ${msg}`);
}

// ====================================
// Leer configuración
// ====================================
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  logError("No se encontró config.json en la raíz del proyecto");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const VPS_URL = config.vps_url;
const RASPY_ID = config.raspy_id;

// ====================================
// Lógica del partido
// ====================================
const estado = require('./logic/match');

// Reset inicial
if (estado.resetEstado) {
  estado.resetEstado();
}

estado.setOnChange(() => {
  const currentEstado = estado.getEstado();
  io.emit('estado', currentEstado);
  io.emit('resumen', estado.getResumen());
  io.emit('menu', estado.menu);
  io.emit('menuSacador', estado.menuSacador);
  io.emit('esperando', { enEspera: estado.estaEnEspera() });

  if (socketVPS.connected) {
    socketVPS.emit("estado_cancha", {
      raspy_id: RASPY_ID,
      enEspera: estado.estaEnEspera(),
      estado: currentEstado
    });
  }
});

// ====================================
// Sincronización periódica de partidos
// ====================================
// Cada 5 minutos intenta sincronizar los partidos pendientes
const INTERVALO_SINCRONIZACION = 5 * 60 * 1000; // 5 minutos
estado.iniciarSincronizacionPeriodica(INTERVALO_SINCRONIZACION);

// ====================================
// Middlewares
// ====================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====================================
// Rutas
// ====================================
const configRoutes = require('./routes/config')(io);
const sensorsRoutes = require('./routes/sensors');
const historyRoutes = require('./routes/history');

app.use('/api/config', configRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/history', historyRoutes);

// ====================================
// Endpoints
// ====================================
app.get('/api/partido-estado', (req, res) => {
  const currentEstado = estado.getEstado();
  res.json({ 
    enCurso: currentEstado?.ocupada || false,
    enEspera: estado.estaEnEspera()
  });
});

app.get('/api/raspy-id', (req, res) => {
  res.json({ raspy_id: RASPY_ID });
});

app.get('/api/config-info', (req, res) => {
  res.json({ 
    raspy_id: RASPY_ID,
    club: config.club || 'sin-configurar'
  });
});

// ====================================
// Endpoint: verificar conexión a internet
// ====================================
app.get('/api/internet-check', async (req, res) => {
  try {
    const https = require('https');
    
    // Hacer un request HEAD simple a un servidor que sabemos que responde
    // Usamos Cloudflare DNS (1.1.1.1) que es muy confiable
    const result = await new Promise((resolve, reject) => {
      const request = https.request('https://1.1.1.1', { method: 'HEAD', timeout: 2000 }, (response) => {
        resolve(true);
      });
      
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Timeout'));
      });
      
      request.on('error', (err) => {
        reject(err);
      });
      
      request.end();
    });
    
    res.json({ hasInternet: true });
  } catch (err) {
    // Si falla el HTTPS, intentamos HTTP a un sitio simple
    try {
      const http = require('http');
      const result = await new Promise((resolve, reject) => {
        const request = http.request('http://1.0.0.1', { method: 'HEAD', timeout: 2000 }, (response) => {
          resolve(true);
        });
        
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Timeout'));
        });
        
        request.on('error', (err) => {
          reject(err);
        });
        
        request.end();
      });
      
      res.json({ hasInternet: true });
    } catch (err2) {
      console.log('❌ Sin conexión a internet detectada');
      res.json({ hasInternet: false });
    }
  }
});

// ====================================
// Endpoint: estado de sincronización
// ====================================
app.get('/api/sync-status', (req, res) => {
  const pendientes = estado.obtenerPartidosPendientes();
  res.json({
    pendientes: pendientes.length,
    partidos: pendientes.map(p => ({
      matchId: p.matchId,
      archivo: p.archivo
    }))
  });
});

// ====================================
// Endpoint: forzar sincronización manual
// ====================================
app.post('/api/sync-now', async (req, res) => {
  try {
    await estado.sincronizarPartidosPendientes();
    res.json({ ok: true, mensaje: "Sincronización iniciada" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ====================================
// 📄 ENDPOINT: historial anterior y estado actual
// ====================================

// 🔹 Devuelve el historial guardado (snapshot anteriores)
app.get('/api/historial', (req, res) => {
  try {
    const HISTORIAL_PATH = path.join(__dirname, 'logs', 'historial.json');
    if (!fs.existsSync(HISTORIAL_PATH)) {
      return res.json({ historial: [], mensaje: "No hay historial disponible" });
    }

    const historial = JSON.parse(fs.readFileSync(HISTORIAL_PATH, 'utf-8'));
    res.json({ historial });
  } catch (err) {
    console.error("❌ Error leyendo historial:", err);
    res.status(500).json({ error: "Error leyendo historial" });
  }
});

// 🔹 Devuelve el estado actual del partido (100% en vivo)
app.get('/api/estado-actual', (req, res) => {
  try {
    const snapshotActual = estado.getHistorialActual();
    res.json({ estadoActual: snapshotActual });
  } catch (err) {
    console.error("❌ Error generando estado actual:", err);
    res.status(500).json({ error: "Error generando estado actual" });
  }
});

// ====================================
// Socket.io
// ====================================
io.on('connection', (socket) => {
  logSuccess(`Cliente conectado: ${socket.id}`);

  const currentEstado = estado.getEstado();
  socket.emit('estado', currentEstado);
  socket.emit('resumen', estado.getResumen());
  socket.emit('menu', estado.menu);
  socket.emit('menuSacador', estado.menuSacador);
  socket.emit('esperando', { enEspera: estado.estaEnEspera() });

  socket.on('disconnect', () => {
    logWarn(`Cliente desconectado: ${socket.id}`);
  });
});

// ====================================
// Conexión a VPS
// ====================================
const socketVPS = Client(VPS_URL, {
  reconnectionAttempts: 999,
  reconnectionDelay: 2000
});

socketVPS.on("connect", () => {
  logSuccess("Conectado a VPS");
  socketVPS.emit("register_raspy", { raspy_id: RASPY_ID, club: config.club });

  const currentEstado = estado.getEstado();
  socketVPS.emit("estado_cancha", {
    raspy_id: RASPY_ID,
    enEspera: estado.estaEnEspera(),
    estado: currentEstado
  });
});

socketVPS.on("disconnect", () => {
  logError("Desconectado de VPS");
});

socketVPS.on(`config_${RASPY_ID}`, (datosPartido) => {
  logInfo("Datos recibidos desde VPS");
  configurarPartido(datosPartido, io);
});

// ====================================
// Iniciar servidor
// ====================================
const os = require('os');
const PORT = process.env.PORT || 5000;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost';
}

const ip = getLocalIp();

console.log(colors.cyan);
console.log("_____________________                          ");
console.log("____    |__  /__  __/___________ ____  ______ ");
console.log("___  /| |_  /__  /  _  __ \\  __ `/  / / /  _ \\");
console.log("__  ___ |  / _  /   / /_/ / /_/ // /_/ //  __/");
console.log("_/_/  |_/_/  /_/    \\____/\\__, / \\__,_/ \\___/ ");
console.log("                            /_/               ");
console.log(`${colors.cyan}>_ CONTADOR DE PADEL${colors.reset}\n`);

server.listen(PORT, () => {
  console.log(''); 
  logInfo('Links:');
  logSuccess(`Configuración VPS:     ${colors.cyan}https://config.altoquepadel.com/?id=${RASPY_ID}&club=${config.club}${colors.reset}`);
  logSuccess(`Sensores:              ${colors.cyan}http://${ip}:${PORT}/sensors${colors.reset}`);
  logSuccess(`Contador:              ${colors.cyan}http://${ip}:${PORT}/counter${colors.reset}`);

  logWarn(`Servidor:              ${colors.amarillo}http://${ip}:${PORT}${colors.reset}`);
  logWarn(`Configuración local:   ${colors.amarillo}http://${ip}:${PORT}/config${colors.reset}\n`);
});

