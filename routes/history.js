
// routes/history.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /api/history/ultimo
router.get('/ultimo', (req, res) => {
  try {
    const historyDir = path.join(__dirname, '../history'); // carpeta donde guardas los JSON
    if (!fs.existsSync(historyDir)) return res.json({ ok: false, message: 'No hay historial' });

    const files = fs.readdirSync(historyDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ 
        name: f, 
        time: fs.statSync(path.join(historyDir, f)).mtime.getTime() 
      }))
      .sort((a, b) => b.time - a.time); // orden descendente, el último primero

    if (files.length === 0) return res.json({ ok: false, message: 'No hay historial' });

    const ultimoArchivo = path.join(historyDir, files[0].name);
    const data = JSON.parse(fs.readFileSync(ultimoArchivo, 'utf-8'));

    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error leyendo historial' });
  }
});

module.exports = router;

