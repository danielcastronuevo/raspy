
const estado = require('./match');
const fs = require('fs');
const path = require('path');

/**
 * Configura el partido y emite eventos a los clientes conectados.
 * @param {Object} datos - Datos del partido
 * @param {Server} io - instancia de Socket.IO
 */
function configurarPartido(datos, io) {
  if (!datos || Object.keys(datos).length === 0) return;

  // Configuramos el partido en memoria
  estado.configurarPartido(datos);
  console.log('✅ Partido configurado en memoria:', datos);

  // Guardamos whiteList.json
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
    if (err) console.error('❌ Error al guardar whitelist:', err);
    else console.log(`✅ whitelist guardada en ${whiteListPath}`);
  });

  // Emitimos a todos los clientes locales conectados
  if (io) {
    io.emit('configuracionActualizada', datos);
    console.log('🔔 Evento "configuracionActualizada" emitido');
  }
}

// ✅ EXPORTACIÓN
module.exports = { configurarPartido };

