function scaleUI() {
  const scene = document.getElementById('scene-container');
  const ui = document.getElementById('ui-container');

  const sw = scene.clientWidth;
  const sh = scene.clientHeight;

  const scaleX = sw / 1600;
  const scaleY = sh / 900;

  const scale = Math.min(scaleX, scaleY);

  ui.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", scaleUI);
scaleUI();


// =================================================
// ================= SOCKET.IO ====================
// =================================================

const socket = io();

socket.on("connect", () => {
  console.log("✅ Conectado al servidor Socket.IO con ID:", socket.id);
});

// =================================================
// ============== VARIABLES GLOBALES ===============
// =================================================

let ladoPrevio = null;
let estadoActual = null;
let estabaEnTiebreak = false;
let estadoPrevioPartido = null; // 👈 guardamos el último estado



// =================================================
// ================ EVENTO ESTADO =================
// =================================================

socket.on("estado", (estado) => {
  estadoActual = estado;

    // MOSTRAMOS TIEMPO PARA HACER EL PROXIMO PUNTO
  startCountdown(5);

  const cronoRestante = document.querySelector(".crono-2");

  // =================== LIMPIAR CRONO TIEMPO RESTANTE SI NO SE ESTÁ JUGANDO ===================
  if (estado.estadoPartido !== 'jugando' && timerTiempoRestante) {
    // Si teníamos un cronómetro activo y ahora ya no estamos jugando, el partido terminó
    clearInterval(timerTiempoRestante);
    timerTiempoRestante = null;

    // Mostramos mensaje de partido finalizado solo si venía jugando
    if (cronoRestante && cronoRestante.textContent !== "00:00:00") {
      showAdviceOverlay("PARTIDO", "FINALIZADO");
     // Quitar overlay animado
     hideBgOverlay("lowtime-bg");
    }

    if (cronoRestante) {
      cronoRestante.style.color = "";
      cronoRestante.textContent = "00:00:00";
    }

    avisoDosMinutosMostrado = false;
  }

  // =================== ESTADO ESPERANDO ===================
  if (estado.estadoPartido === "esperando") {
    console.warn("⚪ Estado ESPERANDO → mostrar QR");
    ocultarOverlayCalentamiento(); 
    ocultarOverlayFinalPartido();
    ocultarOverlayMenu();
    ocultarContadores();
    mostrarOverlayQR();

  // =================== ESTADO CALENTAMIENTO ===================
  } else if (estado.estadoPartido === "calentamiento") {
    console.warn("⚪ Estado CALENTAMIENTO → mostrar overlay calentamiento");
    ocultarOverlayQR();
    ocultarOverlayFinalPartido();
    ocultarOverlayMenu();
    ocultarContadores();
    const tiempoSegundos = parseInt(estado.configuracion.tiempoCalentamiento, 10) * 60;
    mostrarOverlayCalentamiento(tiempoSegundos);

  // =================== ESTADO JUGANDO ===================
  } else if (estado.estadoPartido === "jugando") {
    const ahora = new Date();
    const finDate = new Date(estado.configuracion.finFecha); // 👈 usar la fecha completa del servidor
    let segundosHastaFin = Math.floor((finDate - ahora) / 1000);
    if (segundosHastaFin < 0) segundosHastaFin = 0;

    iniciarCronoRestante(segundosHastaFin);

    console.warn("⚪ Estado JUGANDO → mostrar contadores");
    ocultarOverlayFinalPartido();
    ocultarOverlayCalentamiento();
    ocultarOverlayQR();
    ocultarOverlayMenu();
    mostrarContadores();

  // =================== ESTADO TERMINADO ===================
  } else if (estado.estadoPartido === "terminado") {
    console.warn("⚪ Estado TERMINADO → mostrar overlay final partido");
    ocultarOverlayCalentamiento();
    ocultarOverlayQR();
    ocultarOverlayMenu();
    ocultarContadores();
    mostrarOverlayFinalPartido(estado.tiempoGraciaRestante);    
  }

  // =================== MENÚ ACTIVO ===================
  if (estado.menu?.activo) {
    console.warn("⚪ Menú activo → mostrar overlay menú");
    mostrarOverlayMenu(estado.menu);
  }

  // =================== TRANSICIÓN TERMINADO → JUGANDO ===================
  if (estadoPrevioPartido === "terminado" && estado.estadoPartido === "jugando") {
    showAdviceOverlay("¡PARTIDO", "REANUDADO!");
  }

  // =================== RELOJ LOCAL ===================
  if (estado.estadoPartido === 'jugando') {
    iniciarRelojLocal(estado.tiempoPartidoTranscurrido);
  } else if (estado.estadoPartido === 'terminado') {
    if (timerLocal) clearInterval(timerLocal);
    timerLocal = null;
  }

  // =================== TIE-BREAK ===================
  const enTiebreakAhora = estado.marcador.estaEnTiebreak;
  if (enTiebreakAhora && !estabaEnTiebreak) activarModoTiebreak(estado.marcador);
  else if (!enTiebreakAhora && estabaEnTiebreak) desactivarModoTiebreak(estado.marcador);
  estabaEnTiebreak = enTiebreakAhora;

  // =================== CAMBIO DE LADO / SACADOR ===================
  chequearCambioDeLado(estado.ladoActual);
  actualizarNombresJugadores(estado.configuracion.jugadores);
  actualizarSacadorActual(estado.sacadorActual?.nombre, estado.configuracion.jugadores);

  // =================== MARCADOR ===================
  actualizarSets(estado);

  // =================== DEBUG ===================
  console.log("📡 Estado recibido:");
  console.log(" - Estado partido:", estado.estadoPartido);
  console.log(" - Tiempo transcurrido:", estado.tiempoPartidoTranscurrido);
  console.log(" - Configuración:", estado.configuracion);
  console.log(" - Marcador:", estado.marcador);
  console.log(" - Sacador actual:", estado.sacadorActual?.nombre || "N/A");
  console.log(" - Lado actual:", estado.ladoActual);

  // =================== ACTUALIZAR ESTADO PREVIO ===================
  estadoPrevioPartido = estado.estadoPartido;

  // =================== ACTUALIZAR HISTORIAL DE JUGADAS ============
  actualizarUltimasJugadas();
});

// =================================================
// ================ EVENTO RESUMEN ===============
// =================================================

// EVENTO RESUMEN: envía un resumen del MARCADOR.
// 📌 Puntos convertidos y procesados.
// 📌 Contiene sets y games ganados de cada pareja, listo para mostrar en la interfaz.

socket.on("resumen", (resumen) => {
  console.log("➡️ Resumen recibido:", resumen);



  // ACTUALIZAMOS MARCADOR CON LOS GAMES TRANSFORMADOS
  actualizarGames(resumen);

  // chequeamos punto de oro
  checkPuntoDeOro(resumen);
});

// =================================================
// ================= EVENTO MENÚ ==================
// =================================================

let menuActual = null;

socket.on("menu", (menu) => {
  console.log("📋 Menú recibido:", menu);
  menuActual = menu;

  // 🔹 Dependiendo de tu front, podrías actualizar la UI
  // Ejemplo simple:
  if (menu.activo) {
    mostrarOverlayMenu(menu);
  } else {
    ocultarOverlayMenu();
  }
});


// ==============================
// MENU
// ==============================

function mostrarOverlayMenu(menu) {
  const overlay = document.getElementById("menu-overlay");
  const opcionesDiv = document.getElementById("menu-opciones");
  const tituloDiv = document.getElementById("menu-titulo"); // Asegurate de tener este div

  if (!overlay || !opcionesDiv || !tituloDiv) return;

  overlay.style.display = "flex";
  opcionesDiv.innerHTML = "";

  // Cambiar título dinámicamente
  if (menu.confirmacion === "finalizarPartido") {
    tituloDiv.textContent = "¿SEGURO QUE DESEA FINALIZAR SU PARTIDO?\nLOS DATOS NO SERÁN ALMACENADOS";
  } else {
    tituloDiv.textContent = "MENÚ DE CONFIGURACIÓN DE PARTIDO";
  }

  // Renderizamos opciones
  menu.opciones.forEach((opcion, i) => {
    const div = document.createElement("div");
    div.className = "menu-opcion";
    if (i === menu.index) div.classList.add("seleccionado");
    div.textContent = opcion;
    opcionesDiv.appendChild(div);
  });
}


function ocultarOverlayMenu() {
  const overlay = document.getElementById("menu-overlay");
  if (overlay) overlay.style.display = "none";
}



// =================================================
// ========== EVENTO MENÚ SACADOR ==================
// =================================================

let menuSacadorActual = null;

socket.on("menuSacador", (menuSacador) => {
  console.log("🎾 Menú Sacador recibido:", menuSacador);
  menuSacadorActual = menuSacador;

  if (menuSacador && menuSacador.activo) {
    console.warn("⚪ Menú Sacador activo → ocultando todo lo demás y mostrando overlay sacador");
    
    // Ocultamos todos los overlays que podrían interferir
    ocultarOverlayCalentamiento();
    ocultarOverlayFinalPartido();
    ocultarOverlayMenu();
    ocultarContadores();
    ocultarOverlayQR();

    // Mostramos solo el overlay del menú sacador
    mostrarOverlayMenuSacador(menuSacador);
  } else {
    console.warn("⚪ Menú Sacador inactivo → ocultando overlay sacador");
    ocultarOverlayMenuSacador();
  }
});

// ==============================
// MENU SACADOR
// ==============================

const pasosTexto = {
  sacadorPareja1: "elección del primer sacador de pareja 1",
  sacadorPareja2: "elección del primer sacador de pareja 2",
  metodo: "ELECCIÓN DE PAREJA SACADORA",
  parejaSacadora: "ELECCIÓN DE PAREJA SACADORA",
  confirmacion: "CONFIRMAR CONFIGURACIÓN - RESUMEN"
};


const iconosOpciones = {
  "Iniciar Partido": "fa-solid fa-play",
  "Reconfigurar": "fa-solid fa-rotate-left",
  "Sorteo": "fa-solid fa-dice",
  "Manual": "fa-solid fa-hand-paper",
  "pareja1": "fa-solid fa-user-group",
  "pareja2": "fa-solid fa-user-group"
};

function mostrarOverlayMenuSacador(menuSacador) {
  const overlay = document.getElementById("menu-sacador-overlay");
  if (!overlay) return;

  overlay.style.display = "flex";
  overlay.style.opacity = 1;

  // Paso actual
  document.getElementById("menu-sacador-paso").textContent =
    pasosTexto[menuSacador.paso] || "SIN PASO";

  // Contenedor de opciones
  const contenedorOpciones = document.getElementById("menu-sacador-opciones");
  contenedorOpciones.innerHTML = "";

  // 🔹 Limpio cualquier tabla previa dentro del contenedor-tabla-opciones
  const contenedorTabla = document.querySelector(".contenedor-tabla-opciones");
  const tablaVieja = contenedorTabla.querySelector(".tabla-resumen");
  if (tablaVieja) tablaVieja.remove();

  // === Opciones normales ===
  menuSacador.opciones.forEach((opcion, i) => {
    const toques = i + 1;
    const palabraVez = toques === 1 ? "VEZ" : "VECES";

    const opcionDiv = document.createElement("div");
    opcionDiv.classList.add("calento-help-container");

    // Contenedor principal de la opción (icono + texto)
    const texto = document.createElement("p");
    texto.classList.add("calento-help");
    texto.style.display = "flex";
    texto.style.alignItems = "center";
    texto.style.gap = "0.5vw";

    const opcionSpan = document.createElement("span");
    opcionSpan.classList.add("menu-option-text");

    // Icono
    const icon = document.createElement("i");
    icon.className = iconosOpciones[opcion] || "fa-solid fa-user";
    icon.style.marginRight = "0.5ch";
    opcionSpan.appendChild(icon);

    opcionSpan.appendChild(document.createTextNode(opcion));
    texto.appendChild(opcionSpan);

    // Referencia de toque
    const refSpan = document.createElement("span");
    refSpan.classList.add("menu-option-ref");
    refSpan.textContent = `TOCÁ ${toques} ${palabraVez} (`;
    texto.appendChild(refSpan);

    opcionDiv.appendChild(texto);

    // Gráfico pulsera
    const pulseraDiv = document.createElement("div");
    pulseraDiv.classList.add("pulsera-grafico-container");
    pulseraDiv.innerHTML = `
      <div class="circulo-exterior">
        <div class="circulo-detalle">
          <div class="circulo-interior">
            <div class="linea-detalle"></div>
          </div>
        </div>
      </div>
    `;
    opcionDiv.appendChild(pulseraDiv);

    // Manitos
    const handsDiv = document.createElement("div");
    handsDiv.classList.add("hands-container");
    for (let j = 0; j < toques; j++) {
      const icon = document.createElement("i");
      icon.classList.add("fa-solid", "fa-hand-pointer");
      handsDiv.appendChild(icon);
    }
    opcionDiv.appendChild(handsDiv);

    // Cerrar paréntesis
    const textoFin = document.createElement("p");
    textoFin.classList.add("calento-help");
    textoFin.textContent = ")";
    opcionDiv.appendChild(textoFin);

    contenedorOpciones.appendChild(opcionDiv);
  });



// === Caso especial: confirmación ===
if (menuSacador.paso === "confirmacion") {
  const tablaDiv = document.createElement("div");
  tablaDiv.classList.add("tabla-resumen");

  console.log(menuSacadorActual.ordenDeSaque);

  const ordenDeSaque = menuSacadorActual.ordenDeSaque || [];
  const total = ordenDeSaque.length;

  const filas = ordenDeSaque.map((jugador, i) => {
    // Opacidad más clara arriba (i=0) y más fuerte abajo (i=último)
    const alpha = 0.15 + ((total - 1 - i) * 0.15);

    return `
      <tr>
        <td class="orden-col">${i + 1}</td>
        <td class="jugador-col" style="background: linear-gradient(
          to right,
          rgba(155,48,255,${alpha}),
          rgba(155,48,255,0)
        );">${jugador || "-"}</td>
      </tr>
    `;
  }).join("");

  tablaDiv.innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="orden-col"><i class="fa-solid fa-list-ol"></i></th>
          <th>ORDEN DE SAQUE</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `;

  contenedorTabla.appendChild(tablaDiv);
}






}





function ocultarOverlayMenuSacador() {
  const overlay = document.getElementById("menu-sacador-overlay");
  if (!overlay) return;

  overlay.style.opacity = 0;
  setTimeout(() => overlay.style.display = "none", 300);
}

// ==============================
// OVERLAY DE FINAL DE PARTIDO
// ==============================

let timerFinPartido = null;
let tiempoRestanteFin = 0;

let timeoutContenidoOverlayFinal = null;

function mostrarOverlayFinalPartido(segundos) {

  // Timeout para showAdviceOverlay

  showAdviceOverlay("¡PARTIDO", "FINALIZADO!");


  if (timerFinPartido) clearInterval(timerFinPartido);
  if (timeoutContenidoOverlayFinal) clearTimeout(timeoutContenidoOverlayFinal);

  tiempoRestanteFin = segundos;

  const overlay = document.getElementById("partido-final-overlay");
  const crono = overlay.querySelector(".final-crono");
  const finalColumn = overlay.querySelector(".final-column");
  const finalHelp = overlay.querySelector(".final-help-container");

  // Timeout para mostrar overlay completo
  timeoutContenidoOverlayFinal = setTimeout(() => {

    // Estado inicial
    overlay.style.display = "flex";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.6s ease";

    finalColumn.style.opacity = "0";
    finalColumn.style.transform = "translateY(3vh) scale(0.9)";
    finalColumn.style.transition = "opacity 0.8s ease, transform 0.8s ease";

    finalHelp.style.opacity = "0";
    finalHelp.style.transform = "translateY(2vh)";
    finalHelp.style.transition = "opacity 0.8s ease, transform 0.8s ease";

    // Animación
    overlay.style.opacity = "1";
    finalColumn.style.opacity = "1";
    finalColumn.style.transform = "translateY(0) scale(1)";
    finalHelp.style.opacity = "1";
    finalHelp.style.transform = "translateY(0)";

    timeoutContenidoOverlayFinal = null;
  }, 4000);

  function actualizarCrono() {
    const min = String(Math.floor(tiempoRestanteFin / 60)).padStart(2, "0");
    const sec = String(tiempoRestanteFin % 60).padStart(2, "0");
    crono.textContent = `${min}:${sec}`;
  }
  actualizarCrono();

  timerFinPartido = setInterval(() => {
    tiempoRestanteFin--;
    if (tiempoRestanteFin < 0) {
      clearInterval(timerFinPartido);
      timerFinPartido = null;
      return;
    }
    actualizarCrono();
  }, 1000);
}

function ocultarOverlayFinalPartido() {
  const overlay = document.getElementById("partido-final-overlay");
  const finalColumn = overlay.querySelector(".final-column");
  const finalHelp = overlay.querySelector(".final-help-container");

  // Cancelar timeouts

  if (timeoutContenidoOverlayFinal) {
    clearTimeout(timeoutContenidoOverlayFinal);
    timeoutContenidoOverlayFinal = null;
  }

  // Cancelar timer
  if (timerFinPartido) {
    clearInterval(timerFinPartido);
    timerFinPartido = null;
  }

  // Animaciones de salida
  finalColumn.style.opacity = "0";
  finalColumn.style.transform = "translateY(3vh) scale(0.9)";
  finalHelp.style.opacity = "0";
  finalHelp.style.transform = "translateY(2vh)";
  overlay.style.opacity = "0";

  setTimeout(() => {
    overlay.style.display = "none";
  }, 600); // coincide con fade out
}

// =======================
// CONTROL DEL OVERLAY
// =======================
function mostrarOverlayQR() {
  const qrOverlay = document.querySelector(".qr-overlay");
  qrOverlay.style.display = "flex";
  qrOverlay.offsetHeight; // reflow
  qrOverlay.style.opacity = "1";
  generarQRyUltimoPartido();
}

function ocultarOverlayQR() {
  const qrOverlay = document.querySelector(".qr-overlay");
  qrOverlay.style.opacity = "0";
  setTimeout(() => { qrOverlay.style.display = "none"; }, 600);
}

// =======================
// AUXILIAR: OBTENER HOST
// =======================
function getHost() {
  // Si abriste la página con la IP, esto ya devuelve la IP (ej: "192.168.1.50")
  let host = window.location.hostname;

  // 🚨 OPCIONAL: si querés hardcodear tu IP LAN para pruebas, descomenta esto
  // host = "192.168.1.50";

  return host;
}

// =======================
// GENERAR QR Y TABLA
// =======================

 
async function generarQRyUltimoPartido() {
  const qrOverlay = document.querySelector(".qr-overlay");
  qrOverlay.innerHTML = ""; // limpiamos

  // === CONTENEDOR DE QR + TITULOS ===
  const qrWrapper = document.createElement("div");
  qrWrapper.id = "qr-wrapper";
  qrWrapper.style.display = "flex";
  qrWrapper.style.flexDirection = "column";
  qrWrapper.style.alignItems = "center";
  qrWrapper.style.justifyContent = "center";
  qrWrapper.style.gap = "10px"; // espacio entre título, qr y subtítulo
  qrOverlay.appendChild(qrWrapper);

  // Título arriba del QR
  const qrTitle = document.createElement("p");
  qrTitle.className = "qr-title";
  qrTitle.textContent = "ESCANEÁ PARA JUGAR:";
  qrWrapper.appendChild(qrTitle);

  // Contenedor del QR
  const qrContainer = document.createElement("div");
  qrContainer.id = "qr-container";
  qrWrapper.appendChild(qrContainer);

  // Contenedor del último partido
  const ultimoContainer = document.createElement("div");
  ultimoContainer.id = "ultimo-partido-container";
  qrOverlay.appendChild(ultimoContainer);

  // === QR dinámico con raspy_id ===
  try {
    // 🔹 1. Pedimos el raspy_id a la propia API local
    const resp = await fetch("/api/raspy-id");
    const data = await resp.json();
    const raspy_id = data.raspy_id;

    // 🔹 2. VPS (dominio o IP pública)
    const vpsUrl = "https://config.altoquepadel.com/"; // o https://tu-dominio.com

    // 🔹 3. Armamos la URL con query param
    //const path = "/config/";
    //const urlPartido = `${vpsUrl}${path}?raspy_id=${raspy_id}`;

    const urlPartido = `${vpsUrl}?id=${raspy_id}`;


    // Definimos tamaño dinámico
    const width = qrContainer.offsetWidth || 200;
    const height = qrContainer.offsetHeight || 200;

    new QRCode(qrContainer, {
      text: urlPartido,
      width: width,
      height: height,
      colorDark: "#ffffff",
      colorLight: "#1b0a3d",
      correctLevel: QRCode.CorrectLevel.H
    });

    console.log("✅ QR generado con URL:", urlPartido);

  } catch (err) {
    console.error("❌ Error obteniendo Raspy ID:", err);
  }

  // === Último partido (igual que antes) ===
  try {
    const response = await fetch('/api/history/ultimo');
    const result = await response.json();

    if (!result.ok || !result.data) {
      console.warn('No hay historial disponible');
      return;
    }

    const historialCompleto = result.data;
    if (!historialCompleto.historial || historialCompleto.historial.length === 0) {
      console.warn('No hay datos en el historial');
      return;
    }

    const ultimoSnapshot = historialCompleto.historial[historialCompleto.historial.length - 1];
    const sets = ultimoSnapshot.marcador.sets || [];
    const parejas = historialCompleto.metadata.configuracion.parejas;
    const pareja1 = parejas.pareja1;
    const pareja2 = parejas.pareja2;

    // =============================
    // Armamos el HTML del marcador
    // =============================
    let html = `
      <p class="ultimo-partido-title">ÚLTIMO PARTIDO:</p>
      <div class="marcador-hist-container">
        <!-- HEADER -->
        <div class="marcador-hist-header">
          <span class="hist-court-name">CANCHA</span>
          ${sets.map((_, i) => `<span class="hist-set-title">SET ${i + 1}</span>`).join('')}
        </div>

        <div class="hist-separator"></div>

        <!-- PAREJA 1 -->
        <div class="marcador-hist-row">
          <span class="hist-player-name">
            <p>${formatearNombre(pareja1[0])}</p>
            <p>${formatearNombre(pareja1[1])}</p>
          </span>
          ${sets.map((s, i) => `<span class="hist-score hist-score-set"><p>${s.games[0] || 0}</p></span>`).join('')}
        </div>

        <div class="hist-vertical-separator-container">
          <span class="hist-vertical-separator"></span>
          <span class="hist-vertical-separator"></span>
        </div>

        <div class="hist-separator hist-separator-center"></div>

        <!-- PAREJA 2 -->
        <div class="marcador-hist-row">
          <span class="hist-player-name">
            <p>${formatearNombre(pareja2[0])}</p>
            <p>${formatearNombre(pareja2[1])}</p>
          </span>
          ${sets.map((s, i) => `<span class="hist-score hist-score-set"><p>${s.games[1] || 0}</p></span>`).join('')}
        </div>

        <div class="hist-separator"></div>
      </div>
    `;

    ultimoContainer.innerHTML = html;

    // Aplicamos estilos dinámicos a cada set
    sets.forEach((s, i) => {
      const p1Cell = ultimoContainer.querySelectorAll(".marcador-hist-row")[0]
                      .querySelectorAll(".hist-score-set")[i].querySelector("p");
      const p2Cell = ultimoContainer.querySelectorAll(".marcador-hist-row")[1]
                      .querySelectorAll(".hist-score-set")[i].querySelector("p");

      const val1 = Number(p1Cell.textContent);
      const val2 = Number(p2Cell.textContent);

      if (val1 > val2) {
        p1Cell.style.opacity = "1";
        p2Cell.style.opacity = "0.5";
      } else if (val2 > val1) {
        p1Cell.style.opacity = "0.5";
        p2Cell.style.opacity = "1";
      } else {
        // Empate
        p1Cell.style.opacity = "1";
        p2Cell.style.opacity = "1";
      }
    });

  } catch (e) {
    console.warn("No hay historial para mostrar:", e);
  }
}



// =================================================
// ========== CONTROL DEL OVERLAY CALENTAMIENTO ====
// =================================================

let calentamientoInterval = null;
let tiempoRestante = 0;

function mostrarOverlayCalentamiento(tiempoEnSegundos) {
  const overlay = document.getElementById("calentamiento-overlay");
  const crono = overlay.querySelector(".calento-crono");

  // Mostrar overlay
    overlay.style.display = "flex";        // Mostrar
  overlay.style.animation = "fadeInBg 0.8s ease forwards"; // Animación
  overlay.offsetHeight; // fuerza reflow para reiniciar la animación si ya estaba aplicada

  // Resetear si ya había un intervalo
  if (calentamientoInterval) clearInterval(calentamientoInterval);

  tiempoRestante = tiempoEnSegundos;

  // Actualizar inmediatamente
  actualizarCrono();

  // Iniciar intervalo
  calentamientoInterval = setInterval(() => {
    if (tiempoRestante > 0) {
      tiempoRestante--;
      actualizarCrono();
    } 
    // 🚫 OJO: NO ocultamos cuando llega a 0.
  }, 1000);

  function actualizarCrono() {
    const min = String(Math.floor(tiempoRestante / 60)).padStart(2, "0");
    const sec = String(tiempoRestante % 60).padStart(2, "0");
    crono.textContent = `${min}:${sec}`;
  }
}

function ocultarOverlayCalentamiento() {
  const overlay = document.getElementById("calentamiento-overlay");

  // Reiniciamos cualquier animación previa
  overlay.style.animation = "";

  // Aplicamos la animación de fade out
  overlay.style.animation = "fadeOutBg 0.6s ease forwards";

  // Ocultar display después de que termine la animación
  setTimeout(() => {
    overlay.style.display = "none";
    overlay.style.animation = "";
  }, 600); // mismo tiempo que la animación
}


// =================================================
// =============== MOSTRAR CONTADOR ================
// =================================================

let timeoutContadores = null;

function mostrarContadores(delay = 0) {
  if (timeoutContadores) {
    clearTimeout(timeoutContadores);
    timeoutContadores = null;
  }

  const scoreHistory = document.querySelector(".score-history");
  const marcador = document.querySelector(".marcador-container");
  const cronos = document.querySelector(".cronos-container");
  const referencias = document.querySelector(".ads-container3 .seccion-de-referencias");

  timeoutContadores = setTimeout(() => {
    // Estado inicial
    [marcador, cronos, scoreHistory, referencias].forEach(el => {
      if (!el) return;
      el.style.display = "flex";
      el.style.opacity = "0";
      if (el === marcador) el.style.transform = "translateX(-45px) translateY(-22.5px)";
    });

    // Forzar reflow
    [marcador, cronos, scoreHistory, referencias].forEach(el => el && el.offsetHeight);

    // Transiciones
    const duracion = "1s ease";
    if (marcador) marcador.style.transition = `opacity ${duracion}, transform ${duracion}`;
    if (cronos) cronos.style.transition = `opacity ${duracion}`;
    if (scoreHistory) scoreHistory.style.transition = `opacity ${duracion}`;
    if (referencias) referencias.style.transition = `opacity ${duracion}`;

    // Animación final
    if (marcador) marcador.style.opacity = "1";
    if (marcador) marcador.style.transform = "translateY(-22.5px)";
    if (cronos) cronos.style.opacity = "1";
    if (scoreHistory) scoreHistory.style.opacity = "1";
    if (referencias) referencias.style.opacity = "1";

    timeoutContadores = null;
  }, delay);
}

function ocultarContadores() {
  const marcador = document.querySelector(".marcador-container");
  const cronos = document.querySelector(".cronos-container");
  const scoreHistory = document.querySelector(".score-history");
  const referencias = document.querySelector(".ads-container3 .seccion-de-referencias");

  if (timeoutContadores) {
    clearTimeout(timeoutContadores);
    timeoutContadores = null;
  }

  const duracionMs = 1000;

  // Animación de salida
  if (marcador) {
    marcador.style.transition = "opacity 1s ease, transform 1s ease";
    marcador.style.opacity = "0";
    marcador.style.transform = "translateX(-45px) translateY(-22.5px)";
  }

  if (cronos) {
    cronos.style.transition = "opacity 1s ease";
    cronos.style.opacity = "0";
  }

  if (scoreHistory) {
    scoreHistory.style.transition = "opacity 1s ease";
    scoreHistory.style.opacity = "0";
  }

  if (referencias) {
    referencias.style.transition = "opacity 1s ease";
    referencias.style.opacity = "0";
  }

  // Ocultar display al finalizar transición
  setTimeout(() => {
    if (marcador) marcador.style.display = "none";
    if (cronos) cronos.style.display = "none";
    if (scoreHistory) scoreHistory.style.display = "none";
    if (referencias) referencias.style.display = "none";
  }, duracionMs);
}









// =================================================
// =============== TIEMPO RESTANTE =================
// =================================================

let timerTiempoRestante = null;
let avisoDosMinutosMostrado = false; // flag para que el mensaje de 2 min solo aparezca una vez

function iniciarCronoRestante(segundosHastaFin) {
  let tiempoRestante = Number(segundosHastaFin);
  if (isNaN(tiempoRestante) || tiempoRestante < 0) tiempoRestante = 0;

  if (timerTiempoRestante) clearInterval(timerTiempoRestante);

  const cronoRestante = document.querySelector(".crono-2");

  function actualizarCronoRestante() {
    const horas = Math.floor(tiempoRestante / 3600);
    const minutos = Math.floor((tiempoRestante % 3600) / 60);
    const segundos = tiempoRestante % 60;

    cronoRestante.textContent =
      String(horas).padStart(2, "0") + ":" +
      String(minutos).padStart(2, "0") + ":" +
      String(segundos).padStart(2, "0");

    // =========== Mensaje de 2 minutos ===========
    if (tiempoRestante <= 120 && !avisoDosMinutosMostrado) {
      showAdviceOverlay("ÚLTIMOS 2", "MINUTOS");
      showBgOverlay(
        "linear-gradient(to bottom, #FF6B1100, #FF6B1155",
        "lowtime-bg",
        true
      );
      avisoDosMinutosMostrado = true;
      cronoRestante.style.color = "var(--red-warn)";
    } else if (tiempoRestante > 120) {
      cronoRestante.style.color = "";
    }

    // =========== Mensaje de partido finalizado ===========
    if (tiempoRestante <= 0) {
      cronoRestante.textContent = "00:00:00";
      cronoRestante.style.color = "";
      hideBgOverlay("lowtime-bg");
      showAdviceOverlay("PARTIDO", "FINALIZADO");
    }
  }

  actualizarCronoRestante();

  timerTiempoRestante = setInterval(() => {
    tiempoRestante--;
    if (tiempoRestante < 0) {
      clearInterval(timerTiempoRestante);
      timerTiempoRestante = null;
      return;
    }
    actualizarCronoRestante();
  }, 1000);
}


// =================================================
// =============== TIEMPO DE PARTIDO ===============
// =================================================

let tiempoBase = 0;       // segundos que viene del servidor
let fechaServidor = 0;    // timestamp en que llegó el tiempo
let timerLocal = null;    // nuestro interval local

function iniciarRelojLocal(segundosIniciales) {
  tiempoBase = segundosIniciales;
  fechaServidor = Date.now();

  if (timerLocal) clearInterval(timerLocal);

  timerLocal = setInterval(() => {
    const tiempoTranscurrido = tiempoBase + Math.floor((Date.now() - fechaServidor) / 1000);
    actualizarCronoPartido(tiempoTranscurrido);
  }, 1000);
}

function actualizarCronoPartido(segundos = 0) { // default 0 para evitar NaN
  if (typeof segundos !== 'number' || isNaN(segundos)) segundos = 0;

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segundosRestantes = segundos % 60;

  const formato = 
    String(horas).padStart(2, '0') + ':' +
    String(minutos).padStart(2, '0') + ':' +
    String(segundosRestantes).padStart(2, '0');

  const crono1 = document.querySelector('.crono-1');
  if (crono1) crono1.textContent = formato;
}


// =================================================
// ===================== RELOJ =====================
// =================================================

function actualizarHora() {
  const ahora = new Date();
  const horas = ahora.getHours().toString().padStart(2, '0');
  const minutos = ahora.getMinutes().toString().padStart(2, '0');
  document.getElementById("hora-local").textContent = `${horas}:${minutos}`;
}

function iniciarReloj() {
  actualizarHora();
  const ahora = new Date();
  const msHastaProximoMinuto = (60 - ahora.getSeconds()) * 1000;
  setTimeout(() => {
    actualizarHora();
    setInterval(actualizarHora, 60 * 1000);
  }, msHastaProximoMinuto);
}

iniciarReloj();


// =================================================
// ================= ACTUALIZAR MARCADOR ===========
// =================================================

// Función para actualizar los sets
function actualizarSets(estado) {
  const sets = estado.marcador.sets;        // Array de sets con games por pareja
  const setActual = estado.marcador.setActual; // empieza en 1

  sets.forEach((set, index) => {
    const setCol1 = document.getElementById(`set${index+1}_p1`);
    const setCol2 = document.getElementById(`set${index+1}_p2`);
    
    if (!setCol1 || !setCol2) return;

    // Mostrar games jugados en cada set
    setCol1.textContent = set.games[0]; // pareja 1
    setCol2.textContent = set.games[1]; // pareja 2

    // Resetear clases primero
    setCol1.classList.remove("set-ganado", "set-perdido");
    setCol2.classList.remove("set-ganado", "set-perdido");

    // Si el set ya terminó (no es el actual)
    if (index < setActual) {
      if (set.games[0] > set.games[1]) {
        setCol1.classList.add("set-ganado");
        setCol2.classList.add("set-perdido");
      } else if (set.games[1] > set.games[0]) {
        setCol1.classList.add("set-perdido");
        setCol2.classList.add("set-ganado");
      }
    }
  });
}


// Función para actualizar los games/puntos de cada pareja (resumen)
function actualizarGames(resumen) {
  // Puntos actuales en el game en curso
  const puntosP1 = document.getElementById('puntos_p1');
  const puntosP2 = document.getElementById('puntos_p2');

  if (puntosP1) puntosP1.textContent = resumen.pareja1.puntos;
  if (puntosP2) puntosP2.textContent = resumen.pareja2.puntos;

  // Games ganados en el set actual
  const setActual = resumen.setActual; // empieza en 1
  const setCol1 = document.getElementById(`set${setActual}_p1`);
  const setCol2 = document.getElementById(`set${setActual}_p2`);

  if (setCol1) setCol1.textContent = resumen.pareja1.gamesSetActual;
  if (setCol2) setCol2.textContent = resumen.pareja2.gamesSetActual;
}

// =================================================
// ========== ACTUALIZAR NOMBRES JUGADORES =========
// =================================================

function actualizarNombresJugadores(jugadores = []) {
  const jugador1_p1 = document.getElementById("jugador1_p1");
  const jugador2_p1 = document.getElementById("jugador2_p1");
  const jugador1_p2 = document.getElementById("jugador1_p2");
  const jugador2_p2 = document.getElementById("jugador2_p2");

  if (jugador1_p1 && jugadores[0]) jugador1_p1.lastChild.textContent = ` ${formatearNombre(jugadores[0])}`;
  if (jugador2_p1 && jugadores[1]) jugador2_p1.lastChild.textContent = ` ${formatearNombre(jugadores[1])}`;
  if (jugador1_p2 && jugadores[2]) jugador1_p2.lastChild.textContent = ` ${formatearNombre(jugadores[2])}`;
  if (jugador2_p2 && jugadores[3]) jugador2_p2.lastChild.textContent = ` ${formatearNombre(jugadores[3])}`;
}

// Función PARA FORMATEAR NOMBRE
function formatearNombre(nombre, maxLength = 15) {
  if (!nombre) return "";

  const partes = nombre.trim().split(/\s+/); // separa por espacios
  let resultado = "";

  if (partes.length === 1) {
    // Caso 1: un solo nombre
    resultado = partes[0].toUpperCase();
  } else {
    // Caso 2: varios nombres
    resultado = `${partes[0]} ${partes[1][0]}.`.toUpperCase();
  }

  // Si no entra en el límite, truncamos
  if (resultado.length > maxLength) {
    if (partes.length > 1) {
      // recorto la primera palabra y mantengo inicial
      const inicial = partes[1][0].toUpperCase() + ".";
      const espacioDisponible = maxLength - inicial.length - 1; // -1 por el espacio
      resultado = `${partes[0].substring(0, espacioDisponible - 3).toUpperCase()}... ${inicial}`;
    } else {
      // solo una palabra
      resultado = partes[0].substring(0, maxLength - 3).toUpperCase() + "...";
    }
  }

  return resultado;
}


// =================================================
// ========== ACTUALIZAR SACADOR ACTUAL ==========
// =================================================

function actualizarSacadorActual(nombreSacador, jugadores) {
  if (!nombreSacador || !jugadores) return;

  const nombreAPelotita = {
    [jugadores[0]]: "j1p1",
    [jugadores[1]]: "j2p1",
    [jugadores[2]]: "j1p2",
    [jugadores[3]]: "j2p2",
  };

  const pelotitaCorrecta = nombreAPelotita[nombreSacador];

  const pelotitas = document.querySelectorAll(".sacador-ball-container");
  pelotitas.forEach((pelotita) => {
    if (pelotita.getAttribute("data-jugador") === pelotitaCorrecta) {
      pelotita.classList.add("visible");
    } else {
      pelotita.classList.remove("visible");
    }
  });
}


// =================================================
// ========== OVERLAY DE TEXTO AVISO (16/9) ==========
// =================================================

let currentAdviceOverlay = null;

function showAdviceOverlay(text1, text2 = null) {
  const container = document.getElementById("ui-container");
  if (!container) return;

  // Si había uno, eliminarlo
  if (currentAdviceOverlay) {
    currentAdviceOverlay.remove();
    currentAdviceOverlay = null;
  }

  // Crear overlay dentro del 16/9
  const overlay = document.createElement('div');
  overlay.className = 'overlay-advice';
  overlay.style.display = 'flex';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.animation = 'overlayBg 0.8s ease forwards';
  overlay.style.pointerEvents = 'none';

  currentAdviceOverlay = overlay;

  // Convertido: -10vh → -90px
  const barUpper = document.createElement('div');
  barUpper.className = 'bar bar-upper';
  barUpper.style.transform = 'translate(-90px, -90px)';
  barUpper.style.animation = 'slideRightToLeft 0.8s ease forwards';

  const barLower = document.createElement('div');
  barLower.className = 'bar bar-lower';
  barLower.style.transform = 'translate(-90px, 90px)';
  barLower.style.animation = 'slideLeftToRight 0.8s ease forwards';

  const content = document.createElement('div');
  content.className = 'advice-content';

  if (!text2) {
    const single = document.createElement('p');
    single.className = 'advice-text single-line';
    single.textContent = text1;
    single.style.transform = 'translateX(100vw)';
    single.style.animation = 'slideRightToLeftText 0.8s ease forwards';
    content.appendChild(single);
  } else {
    const line1 = document.createElement('p');
    line1.className = 'advice-text line1';
    line1.textContent = text1;
    line1.style.transform = 'translateX(100vw)';
    line1.style.animation = 'slideRightToLeftText 0.8s ease forwards';

    const line2 = document.createElement('p');
    line2.className = 'advice-text line2';
    line2.textContent = text2;
    line2.style.transform = 'translateX(-100vw)';
    line2.style.animation = 'slideLeftToRightText 0.8s ease forwards';

    content.appendChild(line1);
    content.appendChild(line2);
  }

  overlay.appendChild(barUpper);
  overlay.appendChild(content);
  overlay.appendChild(barLower);

  // Agregar overlay dentro del 16/9
  container.appendChild(overlay);

  // Fade out
  const fadeOut = () => {
    overlay.style.animation = 'overlayBgOut 0.8s ease forwards';
    barUpper.style.animation = 'slideLeftToRightOut 0.8s ease forwards';
    barLower.style.animation = 'slideRightToLeftOut 0.8s ease forwards';

    const single = overlay.querySelector('.advice-text.single-line');
    const line1 = overlay.querySelector('.advice-text.line1');
    const line2 = overlay.querySelector('.advice-text.line2');

    if (single) single.style.animation = 'slideLeftToRightTextOut 0.8s ease forwards';
    if (line1) line1.style.animation = 'slideLeftToRightTextOut 0.8s ease forwards';
    if (line2) line2.style.animation = 'slideRightToLeftTextOut 0.8s ease forwards';

    setTimeout(() => {
      overlay.remove();
      if (currentAdviceOverlay === overlay) currentAdviceOverlay = null;
    }, 800);
  };

  setTimeout(fadeOut, 3000);
}


// LLAMADA A LAS ANIMACIONES
//showAdviceOverlay("TIE-BREAK");
//showAdviceOverlay("CAMBIO", "DE LADO");

// ================================================
// =============== TIE-BREAK ======================
// ================================================


function activarModoTiebreak(marcador) {
  showAdviceOverlay("TIE-BREAK");

  // Overlay naranja animado, un poco transparente
  showBgOverlay(
    "linear-gradient(to bottom, #FF6B1100, #FF6B1155",
    "tiebreak-bg",
    true
  );

  // Aplicar estilo naranja a los puntos
  document.querySelectorAll(".game-score").forEach(el => {
    el.classList.add("tiebreak");
  });

  activarPelotasTiebreak();
  activarTituloTiebreak();
}

function desactivarModoTiebreak(marcador) {
  // Quitar overlay animado
  hideBgOverlay("tiebreak-bg");

  // Quitar estilo naranja
  document.querySelectorAll(".game-score").forEach(el => {
    el.classList.remove("tiebreak");
  });

  desactivarPelotasTiebreak();
  desactivarTituloTiebreak();
}

// Cambiar título de "GAME" a "TIEBREAK"
function activarTituloTiebreak() {
  const titulo = document.getElementById("points-title");
  if (titulo) {
    titulo.dataset.originalText = titulo.textContent; // guardar texto original
    titulo.textContent = "TIEBREAK";
  }
}

function desactivarTituloTiebreak() {
  const titulo = document.getElementById("points-title");
  if (titulo) {
    titulo.textContent = titulo.dataset.originalText || "GAME";
  }
}


//==============================================
//========== FONDO DE COLOR GENÉRICO ===========
//==============================================

function showBgOverlay(bg = "#FF6B11", id = "normal-bg", animate = false) {
  const container = document.getElementById("ui-container");
  if (!container) return; // por si te olvidás del div

  // Intentamos obtener overlay dentro del contenedor
  let overlay = container.querySelector(`#${id}`);

  // Si no existe, lo creamos
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = id;

    overlay.style.position = "absolute";  // ahora sí respeta 16:9
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";        // 100% del contenedor
    overlay.style.height = "100%";       // 100% del contenedor

    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";

    // Insertarlo DENTRO del ui-container
    container.appendChild(overlay);
  }

  // Color o gradiente
  if (bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient")) {
    overlay.style.background = bg;
  } else {
    overlay.style.background = "none";
    overlay.style.backgroundColor = bg;
  }

  // Animación opcional
  if (animate) {
    overlay.style.backgroundSize = "200% 200%";
    overlay.style.animation = "overlayBreath 6s ease-in-out infinite";
  } else {
    overlay.style.animation = "none";
  }

  overlay.style.display = "block";

  void overlay.offsetWidth;
  overlay.style.opacity = "1";
}

function hideBgOverlay(id = "normal-bg") {
  const container = document.getElementById("scene-container");
  const overlay = container?.querySelector(`#${id}`);
  if (!overlay) return;

  overlay.style.opacity = "0";

  setTimeout(() => {
    overlay.style.display = "none";
  }, 500);
}



// ================================================
// = CAMBIAR PELOTITA DEL SACADOR POR LA DE FUEGO =
// ================================================

// Cambiar pelotitas a fuego
function activarPelotasTiebreak() {
  const pelotas = document.querySelectorAll(".sacador-ball-container img");
  pelotas.forEach((img) => {
    img.dataset.originalSrc = img.src; // guardar src original
    img.src = "./ball-new-fire.png";
  });
}

// Volver pelotitas a normal
function desactivarPelotasTiebreak() {
  const pelotas = document.querySelectorAll(".sacador-ball-container img");
  pelotas.forEach((img) => {
    img.src = img.dataset.originalSrc || "./ball-new.png";
  });
}

// ===============================================
// ============== CAMBIO DE LADO =================
// ===============================================

function chequearCambioDeLado(nuevoLado) {
  if (ladoPrevio !== null && ladoPrevio !== nuevoLado) {
    showAdviceOverlay("CAMBIO", "DE LADO");
  }
  ladoPrevio = nuevoLado;
}

// =====================================================
// ========== DETECTOR DE PUNTO DE ORO =================
// =====================================================


function checkPuntoDeOro(resumen) {
  // Solo si la configuración es "Punto de oro"
  if (estadoActual?.configuracion?.tipoGames !== 'Punto de oro') {
    if (checkPuntoDeOro.active) {
      checkPuntoDeOro.active = false;
      stopPuntoDeOro();
    }
    return;
  }

  const p1 = resumen.pareja1?.puntos;
  const p2 = resumen.pareja2?.puntos;
  const isDeuce = (p1 === 40 && p2 === 40);

  if (isDeuce && !checkPuntoDeOro.active) {
    checkPuntoDeOro.active = true;
    startPuntoDeOro();
  } else if (!isDeuce && checkPuntoDeOro.active) {
    checkPuntoDeOro.active = false;
    stopPuntoDeOro();
  }
}
checkPuntoDeOro.active = false;

function startPuntoDeOro() {
  // Cambiar texto "GAME" -> "PUNTO DE ORO"
  const title = document.getElementById("points-title");

  // Cambiar fondo de los puntos
  document.querySelectorAll(".game-score").forEach(el => {
    el.classList.add("punto-oro");
  });

  // Cambiar overlay de fondo a dorado oscuro
  const overlay = document.getElementById("bg-overlay");
  if (overlay) {
    overlay.classList.add("punto-oro");
    //showBgOverlay("linear-gradient(transparent 0%, #ffff0055 70%)", "punto-oro-bg");

showBgOverlay(
  "linear-gradient(to bottom, rgba(255,215,0,0.0), rgba(255,215,0,0.3))",
  "punto-oro",
  true
);

    showAdviceOverlay("PUNTO", "DE ORO");
  }
}

function stopPuntoDeOro() {
  // Quitar fondo dorado de los puntos
  document.querySelectorAll(".game-score").forEach(el => {
    el.classList.remove("punto-oro");
  });

  // Quitar dorado del overlay
  const overlay = document.getElementById("bg-overlay");
  if (overlay) {
    overlay.classList.remove("punto-oro");
    hideBgOverlay("punto-oro");
  }
}


//=====================================
//ULTIMO PUNTO HISTORIAL
//=======================================

const BASE_URL = `${window.location.origin.replace(/\/counter.*/, '')}`;
const HISTORY_URL = `${BASE_URL}/api/historial`;
const CURRENT_URL = `${BASE_URL}/api/estado-actual`;

async function actualizarUltimasJugadas() {
  try {
    const [historialRes, estadoRes] = await Promise.all([
      fetch(HISTORY_URL),
      fetch(CURRENT_URL)
    ]);

    const historialDataRaw = await historialRes.json();
    const estadoActual = (await estadoRes.json()).estadoActual;

    const historialData = historialDataRaw.historial || historialDataRaw;

    const ultimasJugadas = [];

    // CASOS según tu lógica
    if (historialData.length === 0) {
      document.querySelector('.history-list').innerHTML = '';
      return;
    }

    const historialFiltrado = historialData.filter(item => {
      if (!item.ultimoPunto) return false;
      const sets = item.marcador?.sets || [];
      const puntos = item.marcador?.puntos || [];
      const todoCero = sets.every(s => s.games.every(g => g === 0)) &&
                        puntos.every(p => p === 0);
      return !todoCero;
    });

    if (historialFiltrado.length === 0) {
      // Solo mostramos estado actual si hay puntos
      ultimasJugadas.push(estadoActual.ultimoPunto?.pareja || 'pareja1');
    } else {
      ultimasJugadas.push(estadoActual.ultimoPunto?.pareja || 'pareja1');
      const últimosDos = historialFiltrado.slice(-2).reverse();
      últimosDos.forEach(item => {
        if (item.ultimoPunto?.pareja) ultimasJugadas.push(item.ultimoPunto.pareja);
      });
    }

    const historyList = document.querySelector('.history-list');
    historyList.innerHTML = '';

    ultimasJugadas.forEach((jugada, idx) => {
      const li = document.createElement('li');
      li.className = 'pair';

      // Convertimos "pareja1" → "PAREJA 1"
      li.textContent = jugada.replace(/pareja(\d)/i, (_, num) => `PAREJA ${num}`);

      // ✨ Aplicamos animación solo a la primera
      if (idx === 0) li.classList.add('new-point');

      historyList.appendChild(li);

      if (idx < ultimasJugadas.length - 1) {
        const sep = document.createElement('li');
        sep.className = 'score-sep';
        sep.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
        historyList.appendChild(sep);
      }
    });

    // Opacidades según CSS
    const pairs = historyList.querySelectorAll('.pair');
    pairs.forEach((el, idx) => {
      if (idx === 0) el.style.opacity = 1;
      else if (idx === 1) el.style.opacity = 0.7;
      else if (idx === 2) el.style.opacity = 0.4;
    });

  } catch (error) {
    console.error('Error al actualizar últimas jugadas:', error);
  }
}

/**
 * Función auxiliar para mostrar "parejaX-valor" (comentada para uso futuro)
 */
/*
function obtenerUltimoPuntoTexto(item, esEstadoActual) {
  if (!item.ultimoPunto && !esEstadoActual) return null;

  const pareja = item.ultimoPunto?.pareja || 'pareja1';
  const tablero = item.tableroTexto[pareja];
  let game = 0;

  if (tablero) {
    const activo = tablero.gamesPorSet.find(g => g.gameActual !== null);
    game = activo ? activo.gameActual : 0;
  }

  if (!game && item.marcador?.puntos) {
    game = pareja === 'pareja1' ? item.marcador.puntos[0] : item.marcador.puntos[1];
  }

  return `${pareja}-${game}`;
}
*/

// ==========================
// TEMPORIZADOR DE TOQUES
// ==========================

let countdownFrame = null;  // ID del frame activo
let countdownRunning = false;

function startCountdown(seconds) {
  const container = document.querySelector('.centered-timer-label-container');
  const label = container.querySelector('.timer-label');
  const progress = container.querySelector('.timer-progress');
  const secondsText = container.querySelector('#seconds');

  // Si había una animación corriendo, la cancelamos
  if (countdownFrame !== null) {
    cancelAnimationFrame(countdownFrame);
    countdownFrame = null;
  }

  // Reset visual ANTES de empezar
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  progress.style.strokeDasharray = circumference;
  progress.style.strokeDashoffset = 0;
  secondsText.textContent = seconds;

  // Forzar el reinicio de la animación
  label.classList.remove('show');
  void label.offsetHeight; // reflow mágico
  label.classList.add('show');

  const startTime = performance.now();

  function update() {
    const elapsed = (performance.now() - startTime) / 1000;
    const timeLeft = Math.max(0, seconds - elapsed);

    secondsText.textContent = Math.ceil(timeLeft);

    const offset = (1 - timeLeft / seconds) * circumference;
    progress.style.strokeDashoffset = offset;

    if (timeLeft > 0) {
      countdownFrame = requestAnimationFrame(update);
    } else {
      countdownFrame = null;
      label.classList.remove('show');
    }
  }

  countdownFrame = requestAnimationFrame(update);
}
