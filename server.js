
// server.js

// ====================================================================
// ========================== IMPORTACIONES ============================
// ====================================================================
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ====================================================================
// ====== Importamos lógica del partido y le pasamos un callback ======
// ====================================================================
const estado = require('./logic/match');

estado.setOnChange(() => {
  const currentEstado = estado.getEstado();

  io.emit('estado', currentEstado);     // Estado detallado completo
  io.emit('resumen', estado.getResumen());   // Estado resumido
  io.emit('menu', estado.menu);          // Solo menú
  io.emit('menuSacador', estado.menuSacador);

  // Nuevo: enviar si está esperando
  io.emit('esperando', { enEspera: estado.estaEnEspera() });
});

// ====================================================================
// ========================= MIDDLEWARES ===============================
// ====================================================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====================================================================
// ======================= RUTAS PRINCIPALES ==========================
// ====================================================================
const configRoutes = require('./routes/config')(io); // Pasamos `io` para emitir desde ahí
const sensorsRoutes = require('./routes/sensors');
const historyRoutes = require('./routes/history');

app.use('/api/config', configRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/history', historyRoutes);

// =================== END POINT PARA PREGUNTAR ESTADO ===================
app.get('/api/partido-estado', (req, res) => {
  const currentEstado = estado.getEstado();
  res.json({ 
    enCurso: currentEstado?.ocupada || false,
    enEspera: estado.estaEnEspera()           // <-- agregamos esta info
  });
});

// ====================================================================
// ======================== SOCKET.IO SETUP ============================
// ====================================================================
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);

  const currentEstado = estado.getEstado();

  // Enviar datos actuales al cliente que se conecta
  socket.emit('estado', currentEstado);
  socket.emit('resumen', estado.getResumen());
  socket.emit('menu', estado.menu);
  socket.emit('menuSacador', estado.menuSacador);

  // Enviar estado de espera
  socket.emit('esperando', { enEspera: estado.estaEnEspera() });

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

// ====================================================================
// ========================== INICIAR SERVIDOR ========================
// ====================================================================
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
  console.log(`\n▶️  Servidor:        http://${ip}:${PORT}\x1b[0m`);
  console.log(`▶️  Configuración:   http://${ip}:${PORT}/\x1b[36mconfig\x1b[0m`);
  console.log(`▶️  Sensores:        http://${ip}:${PORT}/\x1b[36msensors\x1b[0m`);
  console.log(`▶️  Contador:        http://${ip}:${PORT}/\x1b[36mcounter\x1b[0m\n`);
});

