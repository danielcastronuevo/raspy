
// ====================================================================
// ============================ DEPENDENCIAS ==========================
// ====================================================================
const express = require('express');
const router = express.Router();
const partido = require('../logic/match');

// ====================================================================
// ========================= RUTA POST /api/sensors ===================
// ====================================================================

router.post('/', async (req, res) => {
  const { accion } = req.body;

  console.log('📥 Acción recibida del sensor:', accion);

  // 🚫 Bloqueamos todo si estamos en espera
  if (partido.estaEnEspera()) {
    console.log('⚠️ Partido en espera. No se aceptan acciones.');
    return res.json({ ok: false, mensaje: 'Partido en espera' });
  }

  // ================================
  // === ESTADO: ELIGIENDO SACADOR ==
  // ================================

if (partido.estaEnEligiendoSacador()) {
  switch (accion) {
    case 'sumarP1':
      console.log('➡️ Accion: elegir Opción 1');
      partido.seleccionarMenuSacador(0);
      break;

    case 'sumarP2':
      console.log('➡️ Accion: elegir Opción 2');
      partido.seleccionarMenuSacador(0);
      break;

    case 'restar':
      console.log('➡️ Accion: elegir Opción 2');
      partido.seleccionarMenuSacador(1);
      break;

    case '3-toques':
      console.log('↩️ Accion: Volver paso anterior');
      partido.volverMenuSacador();
      break;

    default:
      console.warn(`⚠️ Acción desconocida en eligiendoSacador: ${accion}`);
      return res.status(400).json({ error: 'Acción no reconocida en eligiendoSacador' });
  }

  return res.json({ ok: true, estado: 'eligiendoSacador', menu: partido.menuSacador });
}


  // =======================
  // === MODO MENÚ ACTIVO ===
  // =======================
  if (partido.menu && partido.menu.activo) {
    switch (accion) {
      case 'sumarP1':
      case 'sumarP2':
        await partido.seleccionarMenu();
        break;

      case 'restar':
        partido.navegarMenu();
        break;

      case '3-toques':
        partido.cerrarMenu();
        break;

      default:
        console.warn(`⚠️ Acción desconocida recibida en menú: ${accion}`);
        return res.status(400).json({ error: 'Acción no reconocida en menú' });
    }

    return res.json({ ok: true, menu: partido.menu });
  }

  // ========================
  // === MODO NORMAL JUEGO ==
  // ========================
  switch (accion) {
    case 'sumarP1':
      partido.sumarPunto(0);
      break;

    case 'sumarP2':
      partido.sumarPunto(1);
      break;

    case 'restar':
      if (partido.estaEnCalentamiento()) {
        partido.restarPunto(); // inicia el partido si está en calentamiento
      } else {
        partido.deshacer(); // deshace si el partido ya empezó o no está en calentamiento
      }
      break;

    case '3-toques':
      partido.abrirMenu();
      break;

    default:
      console.warn(`⚠️ Acción desconocida recibida: ${accion}`);
      return res.status(400).json({ error: 'Acción no reconocida' });
  }

  // ============================
  // === RESPUESTA FINAL ========
  // ============================
  res.json({ ok: true, estado: partido.getEstado(), menu: partido.menu });
});

module.exports = router;

