// =======================
// 🧠 Estado y configuración
// =======================

// UUID
const { randomUUID } = require('crypto');

let estado = {
  matchId: null,  // 🆕 identificador único del partido
  configuracion: {},
  marcador: {
    sets: [
      { games: [0, 0] },
      { games: [0, 0] },
      { games: [0, 0] }
    ],
    puntos: [0, 0],
    setActual: 0,
    partidoTerminado: false,
  },

  ladoActual: 'izquierda',
  puntosTotalesEnTiebreak: 0,
  historial: [],

  // 🆕 Nuevos campos para calentamiento y tiempo
  estadoPartido: 'esperando', // puede ser: esperando, calentamiento, eligiendoSacador, jugando, terminado
  tiempoInicio: null, // timestamp real de inicio de partido
  tiempoCalentamientoRestante: null, // en segundos
  temporizadorCalentamiento: null,
  tiempoPartidoSegundos: 0, // PARA MANEJAR EL TIEMPO DEL PARTIDO UNA VEZ FINALIZADO EL CALENTAMIENTO
  temporizadorPartido: null, // PARA MANEJAR EL TIEMPO DEL PARTIDO UNA VEZ FINALIZADO EL CALENTAMIENTO

  // 🆕 Nuevo campo numérico que viaja al frontend
  tiempoGraciaRestante: null,
  temporizadorFin: null
};


let onChangeCallback = null;

// =======================
// 🔁 Subscripción a cambios de estado
// =======================

function setOnChange(callback) {
  onChangeCallback = callback;
}

function notificarCambio() {
  if (onChangeCallback) {
    onChangeCallback(getEstado());
  }
}

// =======================
// 💾 Historial para deshacer
// =======================

const fs = require('fs');
const path = require('path');

// Ruta al archivo de historial dentro del directorio "logs"
const HISTORIAL_DIR = path.join(__dirname, '..', 'logs');
const HISTORIAL_PATH = path.join(HISTORIAL_DIR, 'historial.json');

function guardarEstado() {
  const estadoCopia = {
    configuracion: { ...estado.configuracion },
    marcador: JSON.parse(JSON.stringify(estado.marcador)),
    sacadorActual: { ...estado.sacadorActual },
    ladoActual: estado.ladoActual,          // <--- AGREGADO
    puntosTotalesEnTiebreak: estado.puntosTotalesEnTiebreak // opcional, si quieres restaurar contador tiebreak
  };

  if (!fs.existsSync(HISTORIAL_DIR)) {
    fs.mkdirSync(HISTORIAL_DIR, { recursive: true });
  }

  let historial = [];
  if (fs.existsSync(HISTORIAL_PATH)) {
    historial = JSON.parse(fs.readFileSync(HISTORIAL_PATH));
  }

  historial.push(estadoCopia);
  fs.writeFileSync(HISTORIAL_PATH, JSON.stringify(historial, null, 2));
}

// ===============================
// 🛠️ CONFIGURAR PARTIDO
// ===============================

function configurarPartido(config) {
  if (estado.estadoPartido !== 'esperando') {
    console.log(`⚠️ No se puede configurar un nuevo partido, estado actual: ${estado.estadoPartido}`);
    return false;
  }

  const { randomUUID } = require('crypto');
  estado.matchId = randomUUID();
  estado.configuracion = config;

  // Limpiar temporizadores anteriores
  [estado.temporizadorCalentamiento, estado.temporizadorPartido, estado.temporizadorFin]
    .forEach(timer => {
      if (timer) clearInterval(timer);
    });
  estado.temporizadorCalentamiento = null;
  estado.temporizadorPartido = null;
  estado.temporizadorFin = null;

  estado.tiempoInicio = null;
  estado.tiempoPartidoTranscurrido = 0;

  // ✅ Programar finalización absoluta por hora "fin"
  const ahora = new Date();
  const [finHoras, finMinutos] = config.fin.split(':').map(Number);
  const finDate = new Date(ahora);
  finDate.setHours(finHoras, finMinutos, 0, 0);

  if (finDate <= ahora) finDate.setDate(finDate.getDate() + 1); // si ya pasó, que sea mañana
  const msRestantes = finDate.getTime() - ahora.getTime();

  estado.temporizadorFin = setTimeout(() => {
    console.log(`⏰ Hora de fin alcanzada (${config.fin}), finalizando partido.`);
    finalizarPorTiempo();
  }, msRestantes);

  // Extraer minutos de calentamiento
  const tiempoConfig = config.tiempoCalentamiento || '0 minutos';
  const matchMinutos = tiempoConfig.match(/(\d+)/);
  const minutos = matchMinutos ? parseInt(matchMinutos[1]) : 0;

  if (minutos > 0) {
    estado.estadoPartido = 'calentamiento';
    estado.tiempoCalentamientoRestante = minutos * 60;

    estado.temporizadorCalentamiento = setInterval(() => {
      estado.tiempoCalentamientoRestante--;
      if (estado.tiempoCalentamientoRestante <= 0) {
        clearInterval(estado.temporizadorCalentamiento);
        estado.temporizadorCalentamiento = null;
        iniciarEleccionSacador();
      }
    }, 1000);

  } else {
    iniciarEleccionSacador();
  }

  // Reset marcador e historial
  estado.marcador = {
    sets: [
      { games: [0, 0] },
      { games: [0, 0] },
      { games: [0, 0] }
    ],
    puntos: [0, 0],
    setActual: 0,
    partidoTerminado: false,
  };
  estado.historial = [];

  try {
    if (fs.existsSync(HISTORIAL_PATH)) fs.unlinkSync(HISTORIAL_PATH);
    if (!fs.existsSync(HISTORIAL_DIR)) fs.mkdirSync(HISTORIAL_DIR, { recursive: true });
  } catch (err) {
    console.error('❌ Error al eliminar historial:', err);
  }

  estado.sacadorActual = {
    nombre: config.ordenDeSaque[0],
    indice: 0,
    puntosEnTiebreak: 0
  };

  console.log('🛠️ Partido configurado:', config);
  notificarCambio();
  return true;
}


function iniciarPartido() {
  if (estado.estadoPartido === 'jugando') return;

  if (estado.temporizadorCalentamiento) {
    clearInterval(estado.temporizadorCalentamiento);
    estado.temporizadorCalentamiento = null;
  }

  estado.estadoPartido = 'jugando';
  if (!estado.tiempoInicio) {
    estado.tiempoInicio = Date.now();
  }

  // ⏱️ Solo mide el tiempo transcurrido, el fin ya lo maneja configurarPartido
  estado.temporizadorPartido = setInterval(() => {
    if (estado.estadoPartido !== 'jugando') {
      clearInterval(estado.temporizadorPartido);
      estado.temporizadorPartido = null;
      return;
    }
    estado.tiempoPartidoTranscurrido = Math.floor((Date.now() - estado.tiempoInicio) / 1000);
  }, 1000);

  console.log('🎾 Partido comenzado automáticamente');
  notificarCambio();
}






// =======================
// 📝 Utilidades de texto y puntuación
// =======================

function puntoATexto(punto, enTieBreak = false, parejaIndex = null, puntos = null) {
  if (enTieBreak) return punto.toString();

  if (estado.configuracion.tipoGames === 'Deuce / Advantage') {
    // Mostrar "AD" para ventaja
    if (punto === 'ADV') return 'AD';

    // Mostrar "-" cuando el rival tiene ventaja
    if (
      parejaIndex !== null &&
      puntos !== null &&
      puntos[parejaIndex] === 3 &&
      puntos[1 - parejaIndex] === 'ADV'
    ) {
      return '-';
    }
  }

  const map = [0, 15, 30, 40];
  return map[punto] ?? punto;
}

// =======================
// 🧮 Lógica de sets ganados
// =======================

function setGanadoPorPareja(set) {
  const g1 = set.games[0];
  const g2 = set.games[1];
  const diff = Math.abs(g1 - g2);
  const maxGames = Math.max(g1, g2);

  if (maxGames < 6) return -1;

  if (diff >= 2 && maxGames >= 6) {
    return g1 > g2 ? 0 : 1;
  }

  if ((g1 === 7 && g2 === 6) || (g2 === 7 && g1 === 6)) {
    return g1 > g2 ? 0 : 1;
  }

  return -1;
}

function setsGanados() {
  const resultados = [0, 0];
  for (const set of estado.marcador.sets) {
    const ganador = setGanadoPorPareja(set);
    if (ganador !== -1) {
      resultados[ganador]++;
    }
  }
  return resultados;
}

// =======================
// 📋 Logs y resumen del estado
// =======================

function logEstado() {
  const sets = setsGanados();
  const enTieBreak = esTieBreak();
  const puntos = estado.marcador.puntos.map(p => puntoATexto(p, enTieBreak));
  console.log(
    `Estado ➡️ Pareja 1 | SetsGanados: ${sets[0]} | Puntos: ${puntos[0]} | Games Set Actual: ${estado.marcador.sets[estado.marcador.setActual].games[0]}`
  );
  console.log(
    `        Pareja 2 | SetsGanados: ${sets[1]} | Puntos: ${puntos[1]} | Games Set Actual: ${estado.marcador.sets[estado.marcador.setActual].games[1]}`
  );
}

function getResumen() {
  const sets = setsGanados();
  const enTieBreak = esTieBreak();
  const puntos = estado.marcador.puntos.map(p => puntoATexto(p, enTieBreak));
  const games = estado.marcador.sets[estado.marcador.setActual].games;
  const puntosTexto = estado.marcador.puntos.map((p, i) =>
  puntoATexto(p, enTieBreak, i, estado.marcador.puntos)
  );

  return {
    pareja1: {
      setsGanados: sets[0],
      puntos: puntosTexto[0],
      gamesSetActual: games[0]
    },
    pareja2: {
      setsGanados: sets[1],
      puntos: puntosTexto[1],
      gamesSetActual: games[1]
    },
    setActual: estado.marcador.setActual + 1
  };
}

// ========================
// 🆕 Lógica de cambio de lado
// ========================

function cambiarLado() {
  estado.ladoActual = estado.ladoActual === 'izquierda' ? 'derecha' : 'izquierda';
  console.log(`🔁 Cambio de lado: ahora están en el lado ${estado.ladoActual}`);
}

// =======================
// 🎾 Lógica de juego
// =======================

function esTieBreak() {
  const setActual = estado.marcador.setActual;
  const games = estado.marcador.sets[setActual].games;
  return games[0] === 6 && games[1] === 6;
}

function ganarSet(parejaIndex, setIdx) {
  const gamesPareja = estado.marcador.sets[setIdx].games[parejaIndex];
  const gamesRival = estado.marcador.sets[setIdx].games[parejaIndex === 0 ? 1 : 0];

  if (esTieBreak() && setIdx === estado.marcador.setActual) {
    return false; // se gana dentro de `sumarPunto` en tie-break
  }

  return gamesPareja >= 6 && gamesPareja - gamesRival >= 2;
}



// =======================
// 🚨 Finalizar por tiempo
// =======================
function finalizarPorTiempo() {
  if (estado.marcador.partidoTerminado) return;
  ganarPartido(null, "tiempo"); 
}

// ===============================
// 🏁 GANAR PARTIDO FINALIZAR 🏁 
// ===============================
function ganarPartido(parejaIndex, motivo = "normal") {
  estado.marcador.partidoTerminado = true;
  estado.estadoPartido = 'terminado';
  estado.motivoFin = motivo;

  if (estado.temporizadorPartido) {
    clearInterval(estado.temporizadorPartido);
    estado.temporizadorPartido = null;
  }


if (motivo === "tiempo") {
  console.log(`⏹️ Partido terminado por motivo: tiempo`);

  // Guardar historial ya mismo
  guardarHistorialFinal();

  // Limpiar archivo temporal
  if (fs.existsSync(HISTORIAL_PATH)) fs.unlinkSync(HISTORIAL_PATH);

  // Reset inmediato del estado
  estado.estadoPartido = 'esperando';
  estado.matchId = null;
  estado.marcador = {
    sets: [
      { games: [0, 0] },
      { games: [0, 0] },
      { games: [0, 0] }
    ],
    puntos: [0, 0],
    setActual: 0,
    partidoTerminado: false
  };
  estado.historial = [];
  estado.tiempoPartidoTranscurrido = 0;
  estado.tiempoGraciaRestante = null;

  // 🚨 Limpiar también menú sacador
  estado.sacadorActual = null;
  if (estado.estadoPartido === 'eligiendoSacador') {
    estado.estadoPartido = 'esperando';
  }
    // 🔹 Reseteamos menú sacador
    menuSacador.activo = false;
    menuSacador.paso = null;
    menuSacador.opciones = [];
    menuSacador.index = 0;
    menuSacador.metodo = null;
    menuSacador.ordenDeSaque = [];

  notificarCambio();
  return; // 👈 cortamos acá
}


  // --- Lógica normal (cuando hay un ganador) ---
  console.log(`🎉 Pareja ${parejaIndex + 1} gana el partido! 🎉`);

  const duracion = 30; // tiempo de gracia
  estado.tiempoGraciaRestante = duracion;

  if (estado.temporizadorFin) clearInterval(estado.temporizadorFin);

  estado.temporizadorFin = setInterval(() => {
    estado.tiempoGraciaRestante--;

    if (estado.tiempoGraciaRestante <= 0) {
      clearInterval(estado.temporizadorFin);
      estado.temporizadorFin = null;

      console.log("⌛ Fin del tiempo de gracia, volviendo a standby.");

      guardarHistorialFinal();
      if (fs.existsSync(HISTORIAL_PATH)) fs.unlinkSync(HISTORIAL_PATH);

      estado.estadoPartido = 'esperando';
      estado.matchId = null;
      estado.marcador = {
        sets: [
          { games: [0, 0] },
          { games: [0, 0] },
          { games: [0, 0] }
        ],
        puntos: [0, 0],
        setActual: 0,
        partidoTerminado: false
      };
      estado.historial = [];
      estado.tiempoPartidoTranscurrido = 0;
      estado.tiempoGraciaRestante = null;

      if (estado.temporizadorPartido) {
        clearInterval(estado.temporizadorPartido);
        estado.temporizadorPartido = null;
      }

      notificarCambio();
    }
  }, 1000);
}


// ===============================
// --- GUARDAR HISTORIAL FINAL  ---
// ===============================

function guardarHistorialFinal() {
  try {
    if (!fs.existsSync(HISTORIAL_PATH)) return;

    let historial = JSON.parse(fs.readFileSync(HISTORIAL_PATH, "utf-8"));

    // 🔹 Guardar el último snapshot antes de reiniciar
    const ultimoSnapshot = {
      configuracion: { ...estado.configuracion },
      marcador: JSON.parse(JSON.stringify(estado.marcador)),
      sacadorActual: { ...estado.sacadorActual },
      ladoActual: estado.ladoActual,
      puntosTotalesEnTiebreak: estado.puntosTotalesEnTiebreak || 0
    };
    historial.push(ultimoSnapshot);

    // --- Valores meta ---
    const matchId = estado.matchId;
    const setsG = setsGanados();
    let ganador = null;
    if (setsG[0] > setsG[1]) ganador = "Pareja 1";
    else if (setsG[1] > setsG[0]) ganador = "Pareja 2";

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
    const hora = ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }).replace(":", "-");

    const duracionSegundos = estado.tiempoPartidoTranscurrido || 0;
    const duracionTexto = new Date(duracionSegundos * 1000).toISOString().substr(11, 8);

    const huboCalentamiento = estado.configuracion?.tiempoCalentamiento 
      && !estado.configuracion.tiempoCalentamiento.startsWith("0");

    const metadata = {
      matchId,
      fecha,
      hora,
      ganador,
      duracionSegundos,
      duracionTexto,
      huboCalentamiento,
      configuracion: estado.configuracion
    };

    // --- Ensamblamos data final ---
    const dataFinal = { 
      id: matchId,     // 👈 requerido por el server
      metadata, 
      historial 
    };

    // --- Guardar local ---
    const baseDir = path.join(__dirname, "..", "history");
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

    // Si ya existe archivo con ese matchId, lo reemplazamos
    const archivos = fs.readdirSync(baseDir).filter(f => f.endsWith(".json"));
    for (const f of archivos) {
      const ruta = path.join(baseDir, f);
      const contenido = JSON.parse(fs.readFileSync(ruta, "utf-8"));
      if (contenido.metadata?.matchId === matchId) {
        fs.unlinkSync(ruta);
        console.log(`🗑️ Archivo de historial existente reemplazado: ${f}`);
      }
    }

    const archivo = path.join(baseDir, `${fecha}_${hora}.json`);
    fs.writeFileSync(archivo, JSON.stringify(dataFinal, null, 2), "utf-8");
    console.log(`📁 Historial archivado en: ${archivo}`);

    // --- Enviar al server central ---
    enviarPartidoAlServer(dataFinal);

  } catch (err) {
    console.error("❌ Error guardando historial:", err);
  }
}


// ===============================
// --- ENVIAR DATOS AL SERVIDOR  ---
// ===============================
async function enviarPartidoAlServer(dataFinal) {
  try {
    const res = await fetch("http://91.108.124.53:3000/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataFinal)
    });
    const result = await res.json();
    console.log("📤 Partido enviado al server:", result);
  } catch (err) {
    console.error("❌ Error enviando partido al server:", err);
  }
}

// ===============================
// --- SUMAR PUNTO  ---
// ===============================


function sumarPunto(parejaIndex) {

  // 🚨 Caso 0: partido no configurado o en espera
  if (!estado.matchId || estado.estadoPartido === 'esperando') {
    console.log(`⚠️ Partido no configurado. Ignorando acción de sumar para pareja ${parejaIndex + 1}.`);
    return;
  }

  if (estado.estadoPartido === 'calentamiento') {
    // No hacemos nada si estamos en calentamiento
    console.log('⚠️ Partido en calentamiento. No se aceptan puntos.');
    return;
  }

  if (!estado.configuracion || !estado.configuracion.tipoGames) {
    console.log('⚠️ Partido no configurado. Ignorando puntos.');
    return;
  }
  if (estado.marcador.partidoTerminado) {
    console.log('⚠️ Partido terminado. No se aceptan más puntos.');
    return;
  }

  guardarEstado();

  const tipoGame = estado.configuracion.tipoGames;
  const rivalIndex = parejaIndex === 0 ? 1 : 0;
  const setActual = estado.marcador.setActual;
  const puntos = estado.marcador.puntos;
  const sets = estado.marcador.sets;

  // --- Tie-break ---
  if (esTieBreak()) {
    puntos[parejaIndex]++;
    console.log(`Tie-break: Pareja ${parejaIndex + 1} suma punto. Puntos: ${puntos[0]} - ${puntos[1]}`);

    // 🧮 Acumulador total de puntos del tiebreak
    estado.puntosTotalesEnTiebreak = (estado.puntosTotalesEnTiebreak || 0) + 1;

    // 🔁 Cambio de lado cada 6 puntos
    const modoCambioLado = estado.configuracion.cambioDeLado; // "al finalizar cada set", "tradicional", "sin cambios"

    // ✅ Cambio de lado en tie-break solo si la modalidad lo permite
    if (esTieBreak() && modoCambioLado !== 'Sin cambios de lado') {
      // Solo cambios de lado cada 6 puntos si no es "sin cambios"
      if (estado.puntosTotalesEnTiebreak > 0 && estado.puntosTotalesEnTiebreak % 6 === 0) {
        console.log(modoCambioLado)
        cambiarLado();
      }
    }

    // 🎾 Cambio de sacador en tiebreak
    actualizarSacadorEnTiebreak();
    console.log(`🎾 Nuevo sacador en tiebreak: ${estado.sacadorActual.nombre}`);

    if (puntos[parejaIndex] >= 7 && puntos[parejaIndex] - puntos[rivalIndex] >= 2) {
      sets[setActual].games[parejaIndex]++;
      console.log(`🏆 Pareja ${parejaIndex + 1} gana el tie-break y el set ${setActual + 1}`);
      estado.marcador.puntos = [0, 0];
      estado.puntosTotalesEnTiebreak = 0;

      if (setActual < 2) {
        estado.marcador.setActual++;
      }

      const setsG = setsGanados();
      if (setsG[parejaIndex] === 2) {
        ganarPartido(parejaIndex);
      }

      notificarCambio();
      return;
    }

    notificarCambio();
    logEstado();
    return;
  }

  // --- Punto de oro ---
  if (tipoGame === 'Punto de oro') {
    if (puntos[parejaIndex] < 3) {
      puntos[parejaIndex]++;
    } else {
      console.log(`🏆 Pareja ${parejaIndex + 1} gana el game por punto de oro`);
      ganarGame(parejaIndex);
      return;
    }
  } else {
    // --- Deuce / ventaja ---
    if (puntos[parejaIndex] < 3) {
      puntos[parejaIndex]++;
    } else if (puntos[parejaIndex] === 3) {
      if (puntos[rivalIndex] < 3) {
        console.log(`🏆 Pareja ${parejaIndex + 1} gana el game (rival menos de 40)`);
        ganarGame(parejaIndex);
        return;
      } else if (puntos[rivalIndex] === 3) {
        puntos[parejaIndex] = 'ADV';
      } else if (puntos[rivalIndex] === 'ADV') {
        puntos[rivalIndex] = 3; // Vuelve a deuce
      }
    } else if (puntos[parejaIndex] === 'ADV') {
      console.log(`🏆 Pareja ${parejaIndex + 1} gana el game (desde ventaja)`);
      ganarGame(parejaIndex);
      return;
    }
  }

  logEstado();
  notificarCambio();
}



function ganarGame(parejaIndex) {
  const setActual = estado.marcador.setActual;
  estado.marcador.sets[setActual].games[parejaIndex]++;
  console.log(`🎯 Pareja ${parejaIndex + 1} gana game en set ${setActual + 1}`);

  estado.marcador.puntos = [0, 0]; // Reset de puntos
  estado.sacadorActual.puntosEnTiebreak = 0;
  actualizarSacadorNormal(); // 🎾 Cambio de sacador fuera del tiebreak

  if (ganarSet(parejaIndex, setActual)) {
    console.log(`🏅 Pareja ${parejaIndex + 1} gana el set ${setActual + 1}`);
    if (setActual < 2) {
      estado.marcador.setActual++;
      console.log(`➡️ Avanzando al set ${estado.marcador.setActual + 1}`);
    }

    const setsG = setsGanados();
    if (setsG[parejaIndex] === 2) {
      ganarPartido(parejaIndex);
    }
  }

  if (esTieBreak()) {
    console.log('⚠️ ¡Entramos en tie-break!');
    estado.marcador.puntos = [0, 0];
  }

  // 🧭 CAMBIO DE LADO (solo si el partido NO terminó)
  if (!estado.marcador.partidoTerminado) {
    const modoCambioLado = estado.configuracion.cambioDeLado; // "al finalizar cada set", "tradicional", "sin cambios"
    const gamesSet = estado.marcador.sets[setActual].games;
    const totalGames = gamesSet[0] + gamesSet[1];

    if (modoCambioLado === 'Sin cambios') {
      // No hacemos nada, ni en tiebreak ni en games normales
    } else if (modoCambioLado === 'Tradicional (impares)' && totalGames % 2 === 1) {
      cambiarLado();
    } else if (modoCambioLado === 'Al finalizar cada SET' && ganarSet(parejaIndex, setActual)) {
      cambiarLado();
    }

    // ✅ Además, para tiebreak:
    if (esTieBreak() && modoCambioLado !== 'Sin cambios') {
      // Cambios de lado automáticos cada 6 puntos, pero no en el primer punto del tiebreak
      if (estado.puntosTotalesEnTiebreak > 0 && estado.puntosTotalesEnTiebreak % 6 === 0) {
        cambiarLado();
      }
    }
  }

  logEstado();
  notificarCambio();
}


// Actualiza el sacador actual en el tie-break
function actualizarSacadorEnTiebreak() {
  const orden = estado.configuracion.ordenDeSaque;
  const totalPuntosJugados = estado.marcador.puntos[0] + estado.marcador.puntos[1];

  if (totalPuntosJugados === 0) {
    // Primer punto del tiebreak: primer sacador
    estado.sacadorActual = {
      nombre: orden[0],
      indice: 0
    };
    return;
  }

  // A partir del segundo punto
  const turno = Math.floor((totalPuntosJugados - 1) / 2) + 1;
  const nuevoIndice = turno % orden.length;

  estado.sacadorActual = {
    nombre: orden[nuevoIndice],
    indice: nuevoIndice
  };
}


// Actualiza el sacador actual al ganar un game
function actualizarSacadorNormal() {
  const orden = estado.configuracion.ordenDeSaque;
  const anterior = estado.sacadorActual || { indice: -1 };

  const nuevoIndice = (anterior.indice + 1) % orden.length;

  estado.sacadorActual = {
    nombre: orden[nuevoIndice],
    indice: nuevoIndice,
    puntosEnTiebreak: 0 // opcional: resetear por si venís del tiebreak
  };
}

// =======================
// ↩️ Funcionalidad deshacer
// =======================


function deshacer() {
  if (!fs.existsSync(HISTORIAL_PATH)) {
    console.log("⚠️ No hay historial para deshacer");
    return;
  }

  let historial = JSON.parse(fs.readFileSync(HISTORIAL_PATH));
  if (historial.length === 0) {
    console.log("⚠️ Historial vacío");
    return;
  }

  const estadoAnterior = historial.pop();
  fs.writeFileSync(HISTORIAL_PATH, JSON.stringify(historial, null, 2));

  estado.configuracion = { ...estadoAnterior.configuracion };
  estado.marcador = JSON.parse(JSON.stringify(estadoAnterior.marcador));
  estado.sacadorActual = { ...estadoAnterior.sacadorActual };
  estado.ladoActual = estadoAnterior.ladoActual;
  estado.puntosTotalesEnTiebreak = estadoAnterior.puntosTotalesEnTiebreak || 0;

  console.log("↩️ Estado restaurado desde archivo");
  logEstado();

  // 🚨 Si el partido estaba "terminado" y lo reactivamos con deshacer
  if (!estado.marcador.partidoTerminado) {
    // 💡 Cancelar el temporizador de gracia si aún corría
    if (estado.temporizadorFin) {
      clearInterval(estado.temporizadorFin);
      estado.temporizadorFin = null;
      estado.tiempoGraciaRestante = null;
      console.log("🛑 Temporizador de gracia cancelado (deshacer).");
    }

    estado.estadoPartido = 'jugando';

    if (!estado.temporizadorPartido) {
      if (!estado.tiempoInicio) {
        estado.tiempoInicio = Date.now();
      } else {
        if (typeof estado.tiempoPartidoTranscurrido !== "number") {
          estado.tiempoPartidoTranscurrido = 0;
        }
        estado.tiempoInicio = Date.now() - estado.tiempoPartidoTranscurrido * 1000;
      }

      estado.temporizadorPartido = setInterval(() => {
        if (estado.marcador.partidoTerminado) {
          clearInterval(estado.temporizadorPartido);
          estado.temporizadorPartido = null;
          return;
        }

        estado.tiempoPartidoTranscurrido = Math.floor((Date.now() - estado.tiempoInicio) / 1000);
        console.log('⏱️ Tiempo partido transcurrido (s):', estado.tiempoPartidoTranscurrido);
      }, 1000);

      console.log('▶️ Temporizador de partido reanudado después de deshacer.');
    }
  }

  notificarCambio();
}

// =======================
// Funcionalidad quitar calentamiento
// =======================

function estaEnCalentamiento() {
  return estado.estadoPartido === 'calentamiento';
}


function restarPunto() {
  console.log("Estado actual:", estado.estadoPartido);

  // 🚨 Caso 0: si no hay partido configurado o estamos en espera
  if (!estado.matchId || estado.estadoPartido === 'esperando') {
    console.log("⚠️ Partido no configurado o en espera. Ignorando puntos.");
    return;
  }

  // 🚨 Caso 1: si estaba en calentamiento, arrancamos el partido
  if (estado.estadoPartido === 'calentamiento') {
    //iniciarPartido();
    // detiene el cronometro del calentamiento
    if (estado.temporizadorCalentamiento) {
      clearInterval(estado.temporizadorCalentamiento);
      estado.temporizadorCalentamiento = null;
    }
    iniciarEleccionSacador()
    return;
  }

  // 🚨 Caso 2: si estaba terminado y todavía dentro del tiempo de gracia
  if (estado.estadoPartido === 'terminado') {
    if (estado.tiempoGraciaRestante > 0) {
      if (estado.temporizadorFin) {
        clearInterval(estado.temporizadorFin);
        estado.temporizadorFin = null;
      }
      estado.marcador.partidoTerminado = false;
      estado.estadoPartido = 'jugando';
      console.log("↩️ Partido reactivado restando punto dentro del tiempo de gracia.");
    } else {
      console.log("⌛ Tiempo de gracia terminado, no se puede reactivar el partido.");
      return;
    }
  }

  // 🚨 Caso 3: lógica normal de restar punto
  if (estado.marcador.puntos[0] > 0) {
    estado.marcador.puntos[0]--;
  } else if (estado.marcador.puntos[1] > 0) {
    estado.marcador.puntos[1]--;
  }

  guardarEstado();
  notificarCambio();
}


// =======================
// 📤 Export del estado
// =======================


function getEstado() {
  const {
    temporizadorCalentamiento,
    temporizadorPartido,
    temporizadorFin, // 🔹 excluir
    ...estadoSinTimers
  } = estado;

  const copia = JSON.parse(JSON.stringify(estadoSinTimers));

  const enTiebreak = esTieBreak();

  copia.marcador.puntosTexto = [
    puntoATexto(copia.marcador.puntos[0], enTiebreak, 0, copia.marcador.puntos),
    puntoATexto(copia.marcador.puntos[1], enTiebreak, 1, copia.marcador.puntos)
  ];
  copia.marcador.estaEnTiebreak = enTiebreak;
  copia.marcador.setsGanados = setsGanados();
  copia.ladoActual = estado.ladoActual;

  // Agregamos tiempo partido y tiempo de gracia
  copia.tiempoPartidoTranscurrido = estado.tiempoPartidoTranscurrido || 0;
  copia.tiempoGraciaRestante = estado.tiempoGraciaRestante || null;

  // 🔹 Agregamos estado del menú
  copia.menu = { ...menu };

  // 🔹 Y ahora el del menú sacador
  copia.menuSacador = { ...menuSacador };

  return copia;
}




















// =================================================
// FUNCION DE ELEGIR SACADOR (para entrar en el estado y llamar cosas)
// =================================================

function iniciarEleccionSacador() {
  estado.estadoPartido = 'eligiendoSacador';
  console.log('🎾 Estado: eligiendo sacador.');
  iniciarMenuSacador();
  notificarCambio();
}

// ============== MENU SACADOR ====================


const menuSacador = {
  activo: false,
  paso: null,        // "sacadorPareja1", "sacadorPareja2", "metodo", "parejaSacadora", "confirmacion"
  opciones: [],
  index: 0,
  metodo: null,      // "manual" o "sorteo"
  ordenDeSaque: []   // acá guardamos el orden final de 4 jugadores
};


function iniciarMenuSacador() {
  estado.estadoPartido = 'eligiendoSacador';

  menuSacador.activo = true;
  menuSacador.paso = "sacadorPareja1";
  menuSacador.opciones = estado.configuracion.parejas.pareja1;
  menuSacador.index = 0;

  console.log("🎾 Paso 1: Elegir sacador de Pareja 1");
  notificarCambio();
}


function seleccionarMenuSacador(opcionIndex) {
  if (!menuSacador.activo) return;

  const index = opcionIndex !== undefined ? opcionIndex : menuSacador.index;

  switch (menuSacador.paso) {
    case "sacadorPareja1":
      estado.configuracion.sacadores[0] = menuSacador.opciones[index];
      console.log(`✅ Sacador de pareja 1: ${estado.configuracion.sacadores[0]}`);
      menuSacador.paso = "sacadorPareja2";
      menuSacador.opciones = estado.configuracion.parejas.pareja2;
      menuSacador.index = 0;
      console.log("🎾 Paso 2: Elegir sacador de Pareja 2");
      notificarCambio();
      break;

    case "sacadorPareja2":
      estado.configuracion.sacadores[1] = menuSacador.opciones[index];
      console.log(`✅ Sacador de pareja 2: ${estado.configuracion.sacadores[1]}`);
      menuSacador.paso = "metodo";
      menuSacador.opciones = ["Manual", "Sorteo"];
      menuSacador.index = 0;
      console.log("🎾 Paso 3: Elegir método [Manual o Sorteo]");
      notificarCambio();
      break;

    case "metodo":
      menuSacador.metodo = menuSacador.opciones[index].toLowerCase();
      console.log(`✅ Método elegido: ${menuSacador.metodo}`);

      if (menuSacador.metodo === "manual") {
        menuSacador.paso = "parejaSacadora";
        menuSacador.opciones = ["pareja1", "pareja2"];
        menuSacador.index = 0;
        console.log("🎾 Paso 4: Elegir pareja sacadora inicial");
        notificarCambio();
      } else {
        // Sorteo automático
        estado.configuracion.parejaSacadora = Math.random() < 0.5 ? "pareja1" : "pareja2";
        console.log(`🎲 Sorteo: empieza sacando ${estado.configuracion.parejaSacadora}`);

        // >>> Generamos orden de saque para el menú <<<
        menuSacador.ordenDeSaque = generarOrdenDeSaque();

        menuSacador.paso = "confirmacion";
        menuSacador.opciones = ["Iniciar Partido", "Reconfigurar"];
        menuSacador.index = 0;
        console.log("➡️ Orden de saque (previo):", menuSacador.ordenDeSaque);
        console.log("❓ Confirmar configuración: Sí o Reconfigurar");
        notificarCambio();
      }
      break;

    case "parejaSacadora":
      estado.configuracion.parejaSacadora = menuSacador.opciones[index];
      console.log(`✅ Pareja sacadora: ${estado.configuracion.parejaSacadora}`);

      // >>> Generamos orden de saque para el menú <<<
      menuSacador.ordenDeSaque = generarOrdenDeSaque();

      menuSacador.paso = "confirmacion";
      menuSacador.opciones = ["Iniciar Partido", "Reconfigurar"];
      menuSacador.index = 0;
      console.log("➡️ Orden de saque (previo):", menuSacador.ordenDeSaque);
      console.log("❓ Confirmar configuración: Sí o Reconfigurar");
      notificarCambio();
      break;

    case "confirmacion":
      if (index === 0) {
        finalizarMenuSacador();
      } else {
        estado.configuracion.sacadores = ["", ""];
        estado.configuracion.parejaSacadora = null;
        iniciarMenuSacador();
      }
      break;
  }
}

// Función auxiliar para no repetir lógica
function generarOrdenDeSaque() {
  const parejaSacadora = estado.configuracion.parejaSacadora;
  const sacadorPareja1 = estado.configuracion.sacadores[0];
  const sacadorPareja2 = estado.configuracion.sacadores[1];

  const jugadoresPareja1 = [...estado.configuracion.parejas.pareja1];
  const jugadoresPareja2 = [...estado.configuracion.parejas.pareja2];

  const restoPareja1 = jugadoresPareja1.filter(j => j !== sacadorPareja1);
  const restoPareja2 = jugadoresPareja2.filter(j => j !== sacadorPareja2);

  if (parejaSacadora === "pareja1") {
    return [sacadorPareja1, sacadorPareja2, ...restoPareja1, ...restoPareja2];
  } else {
    return [sacadorPareja2, sacadorPareja1, ...restoPareja2, ...restoPareja1];
  }
}


function volverMenuSacador() {
  if (!menuSacador.activo) return;

  switch (menuSacador.paso) {
    case "sacadorPareja2":
      estado.configuracion.sacadores[0] = '';
      menuSacador.paso = "sacadorPareja1";
      menuSacador.opciones = estado.configuracion.parejas.pareja1;
      menuSacador.index = 0;
      console.log("↩️ Volviste al paso 1: Elegir sacador de Pareja 1");
      notificarCambio();
      break;

    case "metodo":
      estado.configuracion.sacadores[1] = '';
      menuSacador.paso = "sacadorPareja2";
      menuSacador.opciones = estado.configuracion.parejas.pareja2;
      menuSacador.index = 0;
      console.log("↩️ Volviste al paso 2: Elegir sacador de Pareja 2");
      notificarCambio();
      break;

    case "parejaSacadora":
      menuSacador.paso = "metodo";
      menuSacador.opciones = ["Manual", "Sorteo"];
      menuSacador.index = 0;
      console.log("↩️ Volviste al paso 3: Elegir método");
      notificarCambio();
      break;

    case "confirmacion":
      if (menuSacador.metodo === "manual") {
        menuSacador.paso = "parejaSacadora";
        menuSacador.opciones = ["pareja1", "pareja2"];
        menuSacador.index = 0;
        console.log("↩️ Volviste al paso 4: Elegir pareja sacadora");
        notificarCambio();
      } else {
        menuSacador.paso = "metodo";
        menuSacador.opciones = ["Manual", "Sorteo"];
        menuSacador.index = 0;
        console.log("↩️ Volviste al paso 3: Elegir método");
        notificarCambio();
      }
      break;
  }
}


function finalizarMenuSacador() {
  // Detener calentamiento si aún estaba activo
  if (estado.temporizadorCalentamiento) {
    clearInterval(estado.temporizadorCalentamiento);
    estado.temporizadorCalentamiento = null;
  }

  menuSacador.activo = false;
  menuSacador.paso = null;

  const parejaSacadora = estado.configuracion.parejaSacadora;
  const otraPareja = parejaSacadora === "pareja1" ? "pareja2" : "pareja1";

  // Sacadores elegidos
  const sacadorPareja1 = estado.configuracion.sacadores[0];
  const sacadorPareja2 = estado.configuracion.sacadores[1];

  // Todos los jugadores de cada pareja
  const jugadoresPareja1 = [...estado.configuracion.parejas.pareja1];
  const jugadoresPareja2 = [...estado.configuracion.parejas.pareja2];

  // Quitamos los sacadores elegidos para generar el resto del orden
  const restoPareja1 = jugadoresPareja1.filter(j => j !== sacadorPareja1);
  const restoPareja2 = jugadoresPareja2.filter(j => j !== sacadorPareja2);

  // Orden de saque: sacador de la pareja que empieza, luego sacador de la otra pareja, luego el resto de la pareja que empieza, luego el resto de la otra pareja
  if (parejaSacadora === "pareja1") {
    estado.configuracion.ordenDeSaque = [
      sacadorPareja1,
      sacadorPareja2,
      ...restoPareja1,
      ...restoPareja2
    ];
  } else {
    estado.configuracion.ordenDeSaque = [
      sacadorPareja2,
      sacadorPareja1,
      ...restoPareja2,
      ...restoPareja1
    ];
  }

  // Sacador actual es el primero del orden
  estado.sacadorActual = {
    nombre: estado.configuracion.ordenDeSaque[0],
    indice: 0,
    puntosEnTiebreak: 0
  };

  console.log("🎾 Elección de sacador completada. Arranca el partido.");
  console.log("➡️ Orden de saque:", estado.configuracion.ordenDeSaque);
  notificarCambio();

  iniciarPartido();
}
















// =============================================================
// ------------------ MENU DE CONFIGURACIÓN --------------------
// =============================================================

// ============================
// ====== NUEVO OBJETO ========
// ============================
let menu = {
  activo: false,
  opciones: ["Finalizar partido", "Cerrar menú"],
  index: 0,
  confirmacion: null
};

// ===============================
// ====== FUNCIONES DE MENÚ ======
// ===============================
function abrirMenu() {
  if (!estado.matchId || estado.estadoPartido !== "jugando") {
    console.log("⚠️ No se puede abrir el menú, partido no activo.");
    return;
  }
  menu.activo = true;
  menu.opciones = ["Finalizar partido", "Cerrar menú"];
  menu.index = 0;
  menu.confirmacion = null;
  console.log("📋 Menú abierto");
  notificarCambio();
}

function cerrarMenu() {
  menu.activo = false;
  menu.opciones = ["Finalizar partido", "Cerrar menú"];
  menu.index = 0;
  menu.confirmacion = null;
  console.log("❌ Menú cerrado");
  notificarCambio();
}


function navegarMenu() {
  if (!menu.activo) return;

  // Ahora sí se puede navegar en cualquier menú, incluso confirmaciones
  menu.index = (menu.index + 1) % menu.opciones.length;
  console.log(`➡️ Navegando menú: ${menu.opciones[menu.index]}`);
  notificarCambio();
}


function seleccionarMenu() {
  if (!menu.activo) return;

  // === Estamos en modo confirmación ===
  if (menu.confirmacion === "finalizarPartido") {
    if (menu.index === 0) { // Sí
      finalizarPartido();
      cerrarMenu();
    } else if (menu.index === 1) { // No
      // volvemos al menú principal
      menu.confirmacion = null;
      menu.opciones = ["Finalizar partido", "Cerrar menú"];
      menu.index = 0;
      console.log("↩️ Cancelada finalización, volviendo al menú");
      notificarCambio();
    }
    return;
  }

  // === Menú principal ===
  const opcion = menu.opciones[menu.index];
  if (opcion === "Finalizar partido") {
    menu.confirmacion = "finalizarPartido";
    menu.opciones = ["Sí", "No"];
    menu.index = 0;
    console.log("⚠️ Confirmar finalización de partido");
    notificarCambio();
  } else if (opcion === "Cerrar menú") {
    cerrarMenu();
  }
}


// ================================
// ====== FINALIZAR PARTIDO =======
// ================================

function finalizarPartido() {
  console.log("🏁 Partido finalizado manualmente.");

  // 🔹 Detener completamente los temporizadores
  if (estado.temporizadorPartido) {
    clearInterval(estado.temporizadorPartido);
    estado.temporizadorPartido = null;
  }
  if (estado.temporizadorFin) {
    clearInterval(estado.temporizadorFin);
    estado.temporizadorFin = null;
  }

  // 🔹 Reiniciar estado completamente (igual que al inicio)
  estado.estadoPartido = 'esperando';
  estado.matchId = null; // marcar que no hay partido activo
  estado.marcador = {
    sets: [
      { games: [0, 0] },
      { games: [0, 0] },
      { games: [0, 0] }
    ],
    puntos: [0, 0],
    setActual: 0,
    partidoTerminado: false,
  };
  estado.tiempoGraciaRestante = null;
  //estado.tiempoInicio = null;
  //estado.tiempoPartidoTranscurrido = 0;

  // 🔹 Borrar historial
  if (fs.existsSync(HISTORIAL_PATH)) fs.unlinkSync(HISTORIAL_PATH);

  // 🔔 Notificar al frontend
  notificarCambio();
}


// =======================
// 📦 Export de funciones
// =======================

module.exports = {
  configurarPartido,
  sumarPunto,
  restarPunto,
  deshacer,
  getEstado,
  setOnChange,
  getResumen,
  estaEnCalentamiento,
  iniciarPartido,
  estaEnEspera,
  estaEnEligiendoSacador,
  // MENÚS
  abrirMenu,
  cerrarMenu,
  navegarMenu,
  seleccionarMenu,
  finalizarPartido,
  menu,
  // MENÚ SACADOR
  menuSacador,
  iniciarEleccionSacador,
  iniciarMenuSacador,
  seleccionarMenuSacador,
  volverMenuSacador,
  finalizarMenuSacador,
  estaEnEligiendoSacador
};


function estaEnEspera() {
  return estado.estadoPartido === 'esperando';
}

function estaEnEligiendoSacador() {
  return estado.estadoPartido === 'eligiendoSacador';
}
