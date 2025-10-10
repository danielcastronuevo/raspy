
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
  socketVPS.emit("register_raspy", { raspy_id: RASPY_ID });

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

  logSuccess(`Configuración VPS:     ${colors.cyan}http://91.108.124.53:5000/?id=AABB11${colors.reset}`);
  logSuccess(`Sensores:              ${colors.cyan}http://${ip}:${PORT}/sensors${colors.reset}`);
  logSuccess(`Contador:              ${colors.cyan}http://${ip}:${PORT}/counter${colors.reset}`);

  logWarn(`Servidor:              ${colors.amarillo}http://${ip}:${PORT}${colors.reset}`);
  logWarn(`Configuración local:   ${colors.amarillo}http://${ip}:${PORT}/config${colors.reset}\n`);
});

