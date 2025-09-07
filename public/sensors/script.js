// ===================================
// --- Enviar acciones al servidor ---
// ===================================

  const enviarAccion = (sensorId, accion) => {
    console.log(`📤 Enviando: ${accion} - Sensor: ${sensorId}`);
    fetch('/api/sensors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion })
    })
    .then(res => res.json())
    .then(data => console.log("📥 Estado actualizado:", data.estado))
    .catch(err => console.error("❌ Error enviando acción:", err));
  };

  // Asignación de cada botón
  const botones = [
    { id: 'b1-p1', accion: () => enviarAccion(1, 'sumarP1') },
    { id: 'b1-p2', accion: () => enviarAccion(2, 'sumarP2') },
    { id: 'b2-p1', accion: () => enviarAccion(0, 'restar') },
    { id: 'b2-p2', accion: () => enviarAccion(0, 'restar') },
    { id: 'b3-p1', accion: () => enviarAccion(0, '3-toques') },
    { id: 'b3-p2', accion: () => enviarAccion(0, '3-toques') }
  ];

  botones.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (!el) return;

    const ejecutar = () => btn.accion();

    // Mouse
    el.addEventListener('mousedown', ejecutar);
    el.addEventListener('mouseup', () => {}); // solo envío en click
    el.addEventListener('mouseleave', () => {});

    // Touch
    el.addEventListener('touchstart', (e) => { e.preventDefault(); ejecutar(); }, { passive: false });
  });
