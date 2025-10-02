
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
// Leer configuración desde config.json
// ====================================
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error("❌ No se encontró config.json en la raíz del proyecto");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const VPS_URL = config.vps_url;
const RASPY_ID = config.raspy_id;

// ====================================
// Lógica del partido
// ====================================
const estado = require('./logic/match');

// Forzar estado inicial limpio al arrancar
if (estado.resetEstado) {
  estado.resetEstado();  // Nueva función que centraliza el reset
}

estado.setOnChange(() => {
  const currentEstado = estado.getEstado();

  io.emit('estado', currentEstado);
  io.emit('resumen', estado.getResumen());
  io.emit('menu', estado.menu);
  io.emit('menuSacador', estado.menuSacador);
  io.emit('esperando', { enEspera: estado.estaEnEspera() });

  // 🔹 Enviar info de cancha al VPS en tiempo real
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
// Rutas principales
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

// Estado del partido
app.get('/api/partido-estado', (req, res) => {
  const currentEstado = estado.getEstado();
  res.json({ 
    enCurso: currentEstado?.ocupada || false,
    enEspera: estado.estaEnEspera()
  });
});

// Exponer Raspy ID al front
app.get('/api/raspy-id', (req, res) => {
  res.json({ raspy_id: RASPY_ID });
});

// ====================================
// Socket.io local
// ====================================
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);

  const currentEstado = estado.getEstado();
  socket.emit('estado', currentEstado);
  socket.emit('resumen', estado.getResumen());
  socket.emit('menu', estado.menu);
  socket.emit('menuSacador', estado.menuSacador);
  socket.emit('esperando', { enEspera: estado.estaEnEspera() });

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});


// ====================================
// Conexión permanente a VPS
// ====================================
const socketVPS = Client(VPS_URL, {
  reconnectionAttempts: 999,
  reconnectionDelay: 2000
});

socketVPS.on("connect", () => {
  console.log("✅ Conectado a VPS");
  socketVPS.emit("register_raspy", { raspy_id: RASPY_ID });

  // 🔹 Apenas conecta, enviar estado limpio actual
  const currentEstado = estado.getEstado();
  socketVPS.emit("estado_cancha", {
    raspy_id: RASPY_ID,
    enEspera: estado.estaEnEspera(),
    estado: currentEstado
  });
});

socketVPS.on("disconnect", () => {
  console.log("❌ Desconectado de VPS");
});

// Escuchar configuraciones desde la VPS
socketVPS.on(`config_${RASPY_ID}`, (datosPartido) => {
  console.log("✅ LLEGUE - Datos recibidos desde VPS:", datosPartido);
  configurarPartido(datosPartido, io);
});
// ====================================
// Iniciar servidor local
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

server.listen(PORT, () => {
  console.log(`\n▶️  Servidor:        http://${ip}:${PORT}`);
  console.log(`▶️  Configuración:   http://${ip}:${PORT}/config`);
  console.log(`▶️  Sensores:        http://${ip}:${PORT}/sensors`);
  console.log(`▶️  Contador:        http://${ip}:${PORT}/counter\n`);
});

