// routes/config.js

// ====================================================================
// ============================ DEPENDENCIAS ==========================
// ====================================================================
const express = require('express');
const estado = require('../logic/match');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Ruta al entorno virtual (editá según dónde lo creaste)
const PYTHON_PATH = path.join(__dirname, '..', '..', 'entorno_virtual_app', 'bin', 'python3');
const RADAR_PATH = path.join(__dirname, '..', 'scanner', 'scanner.py');
const SCRIPT_PATH = path.join(__dirname, '..', 'scanner', 'run_scanner.sh');



// ====================================================================
// ======================= EXPORTACIÓN DE RUTAS =======================
// ====================================================================
module.exports = function(io) {
  const router = express.Router();

  // ==================================================================
  // =================== POST /api/config (configurar partido) ========
  // ==================================================================
  router.post('/', (req, res) => {
    const datos = req.body;

    if (!datos || Object.keys(datos).length === 0) {
      console.warn('⚠️  Intentaron configurar sin datos');
      return res
        .status(400)
        .json({ error: 'No se recibieron datos de configuración' });
    }

    // ============================
    // === VERIFICAR ESTADO DEL PARTIDO ==
    // ============================
    if (!estado.estaEnEspera()) {
      console.warn('⚠️ No se puede configurar partido mientras otro está en curso');
      return res.status(400).json({ error: 'No se puede configurar partido mientras hay uno en curso' });
    }

    // ==================================================================
    // ========================== LÓGICA ================================
    // ==================================================================
    estado.configurarPartido(datos);
    console.log('✅ Partido configurado en memoria:', datos);

    // ==================================================================
    // =============== CREAR ARCHIVO WHITE LIST =========================
    // ==================================================================
    const whiteListPath = path.join(__dirname, '..', 'scanner', 'whiteList.json');

    const whiteListData = {
      pareja1: {
        nombrePulsera: datos.pulseras.pareja1.nombre,
        macPulsera: datos.pulseras.pareja1.mac,
        jugadores: datos.parejas.pareja1
      },
      pareja2: {
        nombrePulsera: datos.pulseras.pareja2.nombre,
        macPulsera: datos.pulseras.pareja2.mac,
        jugadores: datos.parejas.pareja2
      }
    };

    fs.writeFile(whiteListPath, JSON.stringify(whiteListData, null, 2), (err) => {
      if (err) {
        console.error('❌ Error al guardar whitelist:', err);
      } else {
        console.log(`✅ whitelist guardada en ${whiteListPath}`);
      }
    });

    // ==================================================================
    // ====================== EMISIÓN POR SOCKET.IO =====================
    // ==================================================================
    io.emit('configuracionActualizada', datos);
    console.log('🔔 Evento "configuracionActualizada" emitido');

    // ==================================================================
    // ================= RESPUESTA AL CLIENTE ===========================
    // ==================================================================
    res.json({ mensaje: 'Configuración recibida correctamente' });
  });

  return router;
};
