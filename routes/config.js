// routes/config.js

const express = require('express');
const estado = require('../logic/match');
const { configurarPartido } = require('../logic/configurator');

module.exports = function(io) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const datos = req.body;

    if (!datos || Object.keys(datos).length === 0) {
      return res.status(400).json({ error: 'No se recibieron datos de configuración' });
    }

    if (!estado.estaEnEspera()) {
      return res.status(400).json({ error: 'No se puede configurar partido mientras hay uno en curso' });
    }

    // ✅ Usamos la función compartida
    configurarPartido(datos, io);

    res.json({ mensaje: 'Configuración recibida correctamente' });
  });

  return router;
};

