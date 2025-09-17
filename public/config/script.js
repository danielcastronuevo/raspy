
const socket = io();

socket.on('esperando', (data) => {
  if (!data.enEspera) {
    setEstadoCancha(true); // muestra CANCHA OCUPADA
  } else {
    setEstadoCancha(false); // muestra CANCHA DISPONIBLE
  }
});
// ===================== VARIABLES GLOBALES =====================
const step1NextBtn = document.getElementById("step1-next");
const estadoCancha = document.getElementById("estado-cancha");
const canchaMsg = document.getElementById("cancha-msg");
const duracionSelect = document.getElementById("duracion");
const finishBtn = document.querySelector("#step4 .finish");
const inputInicio = document.getElementById("inicio-partido");
const inputFin = document.getElementById("fin-partido");
let pulserasDisponibles = {}; // guardamos lo que viene del JSON
const step1Error = document.getElementById("step1-error");
const inputsStep1 = [
  document.getElementById("p1j1"),
  document.getElementById("p1j2"),
  document.getElementById("p2j1"),
  document.getElementById("p2j2")
];
const selectsStep1 = [
  document.getElementById("bracelet-team1"),
  document.getElementById("bracelet-team2")
];

//const step2NextBtn = document.getElementById("step2-next");
//const step2Error = document.getElementById("step2-error");
//const selectsStep2 = [
//  document.getElementById("sacador1"),
//  document.getElementById("sacador2")
//];

const step3NextBtn = document.getElementById("step3-next");
const radiosCalentamiento = document.getElementsByName("calentamiento");
const radiosCambio = document.getElementsByName("cambio");
const radiosGames = document.getElementsByName("games");

const steps = document.querySelectorAll(".step");
let current = 0;
let canchaOcupada = false;

let datosPartido = {
  jugadores: {
    pareja1: { j1: '', j2: '', pulsera: '' },
    pareja2: { j1: '', j2: '', pulsera: '' }
  },
  sacadores: {
    pareja1: '',
    pareja2: ''
  },
  modosJuego: {
    calentamiento: '',
    cambio: '',
    games: ''
  },
  duracion: '',
  comienzo: 'Hoy 20:00'
};

// ===================== INICIALIZACIÓN =====================
window.addEventListener("DOMContentLoaded", () => {
  // Reset inputs, selects y radios
  document.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);

  // Deshabilitar botón Step1 por defecto
  step1NextBtn.disabled = true;

  // Cargar pulseras desde bracelets.json
  fetch("bracelets.json")
    .then(r => r.json())
    .then(data => {
      pulserasDisponibles = data;
      llenarPulseras();
    })
    .catch(err => console.error("Error cargando pulseras:", err));
});

// ===================== RELLENAR PULSERAS =================

function llenarPulseras() {
  selectsStep1.forEach(sel => {
    sel.innerHTML = '<option value="" disabled selected hidden class="placeholder">Seleccionar Pulsera</option>';
    Object.entries(pulserasDisponibles).forEach(([nombre, mac]) => {
      const opt = document.createElement("option");
      opt.value = nombre;
      opt.textContent = `${nombre} (${mac})`;
      sel.appendChild(opt);
    });
  });
}


// ===================== CANCHA =====================
function validateFinalizar() {
  const step4Valido = duracionSelect.value;
  finishBtn.disabled = !(step4Valido && !canchaOcupada);
}

function setEstadoCancha(ocupada) {
  canchaOcupada = ocupada;

  if(ocupada){
    estadoCancha.classList.remove("cancha-libre");
    estadoCancha.classList.add("cancha-ocupada");
    estadoCancha.querySelector(".texto-estado").textContent = "CANCHA OCUPADA";
    canchaMsg.style.display = "flex";
  } else {
    estadoCancha.classList.remove("cancha-ocupada");
    estadoCancha.classList.add("cancha-libre");
    estadoCancha.querySelector(".texto-estado").textContent = "CANCHA DISPONIBLE";
    canchaMsg.style.display = "none";
  }

  validateFinalizar();
}

// Ejemplo inicial
//setEstadoCancha(true);
//setTimeout(() => setEstadoCancha(false), 20000);

// ===================== STEP 1 =====================

function validateStep1() {
  let valid = true;
  step1Error.style.display = "none";
  const values = [];

  // jugadores
  inputsStep1.forEach(inp => {
    inp.classList.remove("error");
    if(!inp.value.trim()) valid = false;
    values.push(inp.value.trim());
  });

  // pulseras
  const pulserasElegidas = [];
  selectsStep1.forEach(sel => {
    sel.classList.remove("error");
    if(!sel.value) valid = false;
    pulserasElegidas.push(sel.value);
  });

  // jugadores duplicados
  const duplicates = values.filter((v,i,a) => v && a.indexOf(v) !== i);
  if(duplicates.length > 0){
    valid = false;
    inputsStep1.forEach(inp => {
      if(duplicates.includes(inp.value.trim())) inp.classList.add("error");
    });
  }

  // pulseras duplicadas
  if (pulserasElegidas[0] && pulserasElegidas[1] && pulserasElegidas[0] === pulserasElegidas[1]) {
    valid = false;
    selectsStep1.forEach(sel => sel.classList.add("error"));
  }

  step1Error.style.display = valid ? "none" : "block";
  step1NextBtn.disabled = !valid;
}


function updateDatosStep1() {
  datosPartido.jugadores.pareja1.j1 = inputsStep1[0].value.trim();
  datosPartido.jugadores.pareja1.j2 = inputsStep1[1].value.trim();
  datosPartido.jugadores.pareja2.j1 = inputsStep1[2].value.trim();
  datosPartido.jugadores.pareja2.j2 = inputsStep1[3].value.trim();

  datosPartido.jugadores.pareja1.pulsera = selectsStep1[0].value;
  datosPartido.jugadores.pareja2.pulsera = selectsStep1[1].value;

  validateStep1();
}

function populateStep1() {
  inputsStep1[0].value = datosPartido.jugadores.pareja1.j1;
  inputsStep1[1].value = datosPartido.jugadores.pareja1.j2;
  inputsStep1[2].value = datosPartido.jugadores.pareja2.j1;
  inputsStep1[3].value = datosPartido.jugadores.pareja2.j2;
  selectsStep1[0].value = datosPartido.jugadores.pareja1.pulsera || '';
  selectsStep1[1].value = datosPartido.jugadores.pareja2.pulsera || '';
  validateStep1();
}

inputsStep1.forEach(i => i.addEventListener("input", updateDatosStep1));
selectsStep1.forEach(s => s.addEventListener("change", updateDatosStep1));

// ===================== STEP 2 =====================
//function validateStep2() {
//  const valid = selectsStep2.every(s => s.value);
//  step2Error.style.display = valid ? "none" : "block";
//  step2NextBtn.disabled = !valid;
//}

//function updateDatosStep2() {
//  datosPartido.sacadores.pareja1 = selectsStep2[0].value;
//  datosPartido.sacadores.pareja2 = selectsStep2[1].value;
//  validateStep2();
//}

//function populateStep2() {
//  const sac1 = selectsStep2[0];
//  const sac2 = selectsStep2[1];
//  sac1.innerHTML = `<option value="" disabled hidden class="placeholder">Seleccionar Sacador</option>
//                    <option ${datosPartido.sacadores.pareja1===datosPartido.jugadores.pareja1.j1?'selected':''}>${datosPartido.jugadores.pareja1.j1}</option>
//                    <option ${datosPartido.sacadores.pareja1===datosPartido.jugadores.pareja1.j2?'selected':''}>${datosPartido.jugadores.pareja1.j2}</option>`;
//  sac2.innerHTML = `<option value="" disabled hidden class="placeholder">Seleccionar Sacador</option>
//                    <option ${datosPartido.sacadores.pareja2===datosPartido.jugadores.pareja2.j1?'selected':''}>${datosPartido.jugadores.pareja2.j1}</option>
//                    <option ${datosPartido.sacadores.pareja2===datosPartido.jugadores.pareja2.j2?'selected':''}>${datosPartido.jugadores.pareja2.j2}</option>`;
//  sac1.value = datosPartido.sacadores.pareja1 || '';
//  sac2.value = datosPartido.sacadores.pareja2 || '';
//  validateStep2();
//}

//selectsStep2.forEach(s => s.addEventListener("change", updateDatosStep2));

// ===================== STEP 3 =====================
function validateRadios(radios) {
  return Array.from(radios).some(r => r.checked);
}

function validateStep3() {
  const valid = validateRadios(radiosCalentamiento) &&
                validateRadios(radiosCambio) &&
                validateRadios(radiosGames);
  step3NextBtn.disabled = !valid;
}

function updateDatosStep3() {
  datosPartido.modosJuego.calentamiento = document.querySelector('input[name="calentamiento"]:checked')?.value || '';
  datosPartido.modosJuego.cambio = document.querySelector('input[name="cambio"]:checked')?.value || '';
  datosPartido.modosJuego.games = document.querySelector('input[name="games"]:checked')?.value || '';
  validateStep3();
}

function populateStep3() {
  radiosCalentamiento.forEach(r => r.checked = r.value===datosPartido.modosJuego.calentamiento);
  radiosCambio.forEach(r => r.checked = r.value===datosPartido.modosJuego.cambio);
  radiosGames.forEach(r => r.checked = r.value===datosPartido.modosJuego.games);
  validateStep3();
}

[...radiosCalentamiento, ...radiosCambio, ...radiosGames].forEach(r => r.addEventListener("change", updateDatosStep3));

// ===================== STEP 4 =====================
// Inicializamos fin vacío
inputFin.value = '';

// Mensaje de error debajo del select de duración
const step4Error = document.createElement("div");
step4Error.classList.add("error-msg");
step4Error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Debes seleccionar la duración del partido';
duracionSelect.parentNode.appendChild(step4Error);

// ===================== FUNCIONES DE HORARIOS =====================


function generateTimeOptions() {
  const now = new Date();
  let hour = now.getHours();
  let minutes = now.getMinutes();

  // Determinar el próximo horario válido (redondeo a la media hora)
  let validHour = hour;
  let validMinutes = minutes;
  if (minutes <= 15) validMinutes = 0;
  else if (minutes <= 45) validMinutes = 30;
  else { validMinutes = 0; validHour += 1; }
  if (validHour >= 24) validHour -= 24;

  const defaultTime = `${validHour.toString().padStart(2,'0')}:${validMinutes.toString().padStart(2,'0')}`;

  const options = [];
  // Generar opciones: media hora antes hasta 1 hora adelante
  const totalSlots = 3; // -1, 0, +1, +2
  for (let i = -1; i <= 2; i++) {
    let totalMinutes = validHour * 60 + validMinutes + i * 30;
    let h = Math.floor(totalMinutes / 60);
    let m = totalMinutes % 60;
    if (h < 0) h += 24;
    if (h >= 24) h -= 24;
    options.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
  }

  return { options, defaultTime };
}


function updateInicioSelect() {
  const { options, defaultTime } = generateTimeOptions();
  const previousValue = inputInicio.value; // lo que el usuario ya seleccionó
  inputInicio.innerHTML = ''; // limpiar select

  let selectionStillValid = previousValue && options.includes(previousValue);

  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt;
    el.textContent = opt;
    // solo seleccionamos si es la selección previa válida o si no hay previa
    if(selectionStillValid) {
      if(opt === previousValue) el.selected = true;
    } else {
      if(opt === defaultTime) el.selected = true;
    }
    inputInicio.appendChild(el);
  });

  // actualizar fin automáticamente
  updateFin();
}


function updateFin() {
  if (!duracionSelect.value) {
    inputFin.value = '';
    return;
  }
  const [h, m] = inputInicio.value.split(':').map(Number);
  const inicio = new Date();
  inicio.setHours(h, m, 0, 0);
  const fin = new Date(inicio.getTime() + parseInt(duracionSelect.value) * 60000);
  inputFin.value = `${fin.getHours().toString().padStart(2,'0')}:${fin.getMinutes().toString().padStart(2,'0')}`;
}

// Llamamos a esta función cada vez que cargamos Step4 o cada X segundos si queremos que se actualice dinámicamente
setInterval(updateInicioSelect, 60000); // cada minuto

// Validación de Step 4
function validateStep4() {
  if(duracionSelect.value){
    step4Error.style.display = "none";
    duracionSelect.classList.remove("error");
  } else {
    step4Error.style.display = "block";
    duracionSelect.classList.add("error");
  }
  validateFinalizar(); // habilita/deshabilita botón Finalizar según cancha y duración
}

// Poblado inicial de Step 4
function populateStep4() {
  duracionSelect.value = datosPartido.duracion || '';
  validateStep4();
  updateInicioSelect();
}

// ===================== EVENTOS =====================
duracionSelect.addEventListener("change", () => {
  datosPartido.duracion = duracionSelect.value;
  validateStep4();
  updateFin();
});

// Cuando el usuario cambia manualmente el inicio
inputInicio.addEventListener('change', updateFin);

// Actualización automática cada 60 segundos
setInterval(updateInicioSelect, 60000);
updateInicioSelect(); // inicial al cargar

// ===================== NAVEGACIÓN =====================
function showStep(index){
  steps.forEach((s,i)=>s.classList.toggle("active", i===index));
  current = index;
  if(index===0) populateStep1();
//  if(index===1) populateStep2(); //SI LA REACTIVAS FIJATE LOS INDICES
  if(index===1) populateStep3();
  if(index===2) populateStep4();
}

document.querySelectorAll(".next").forEach(btn => btn.addEventListener("click", ()=>{ if(current<steps.length-1) showStep(current+1); }));
document.querySelectorAll(".prev").forEach(btn => btn.addEventListener("click", ()=>{ if(current>0) showStep(current-1); }));

// ==================================================
// FINALIZAR Y ENVIAR AL SERVIDOR
// ==================================================
finishBtn.addEventListener("click", () => {
  const datosCompat = {
    jugadores: [
      datosPartido.jugadores.pareja1.j1,
      datosPartido.jugadores.pareja1.j2,
      datosPartido.jugadores.pareja2.j1,
      datosPartido.jugadores.pareja2.j2
    ],
    parejas: {
      pareja1: [
        datosPartido.jugadores.pareja1.j1,
        datosPartido.jugadores.pareja1.j2
      ],
      pareja2: [
        datosPartido.jugadores.pareja2.j1,
        datosPartido.jugadores.pareja2.j2
      ]
    },

    parejaSacadora: "pareja1", // si querés podés dejarlo fijo o borrarlo

    // 🔹 Sacadores vacío
    sacadores: ["", ""],

    tiempoCalentamiento: (() => {
      switch (datosPartido.modosJuego.calentamiento) {
        case "0": return "Sin calentamiento";
        case "5": return "5 minutos";
        case "10": return "10 minutos";
        default: return "";
      }
    })(),
    cambioDeLado: (() => {
      switch (datosPartido.modosJuego.cambio) {
        case "set": return "Al finalizar cada SET";
        case "tradicional": return "Tradicional (impares)";
        case "ninguno": return "Sin cambios";
        default: return "";
      }
    })(),
    tipoGames: (() => {
      switch (datosPartido.modosJuego.games) {
        case "punto-oro": return "Punto de oro";
        case "deuce": return "Deuce / Advantage";
        default: return "";
      }
    })(),

    // 🔹 Orden de saque vacío
    ordenDeSaque: ["", "", "", ""],

    // 🔹 Info de horarios
    duracion: `${datosPartido.duracion} minutos`,
    comienzo: inputInicio.value,
    fin: inputFin.value,


    pulseras: {
     pareja1: {
       nombre: datosPartido.jugadores.pareja1.pulsera,
        mac: pulserasDisponibles[datosPartido.jugadores.pareja1.pulsera] || ""
     },
     pareja2: {
        nombre: datosPartido.jugadores.pareja2.pulsera,
        mac: pulserasDisponibles[datosPartido.jugadores.pareja2.pulsera] || ""
     }
}

  };

  console.log("🛠️ Partido configurado:", datosCompat);
  sendToServer(datosCompat);
});


// ==================================================
// ENVIAR DATOS AL SERVIDOR
// ==================================================

sendToServer = (datosPartido) => {
    // Enviar los datos al servidor
    fetch('/api/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosPartido)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Respuesta del servidor:', data);
    })
    .catch(error => {
        console.error('Error enviando datos al servidor:', error);
        console.warn("¿Estás seguro de que el servidor está corriendo?");
    });
}




// ==================================================
// 🧪 ENVIAR PRUEBA AL SERVIDOR
// ==================================================
function enviarPruebaAlServer(finCustom = "23:59") {
  const datosPrueba = {
    jugadores: ["Juan", "Pedro", "Luis", "Carlos"],
    parejas: {
      pareja1: ["Juan", "Pedro"],
      pareja2: ["Luis", "Carlos"]
    },
    parejaSacadora: "pareja1",
    sacadores: ["Juan", "Luis"],

    tiempoCalentamiento: "5 minutos",
    cambioDeLado: "Tradicional (impares)",
    tipoGames: "Punto de oro",

    ordenDeSaque: ["Juan", "Pedro", "Luis", "Carlos"],

    duracion: "60 minutos",
    comienzo: "20:00",
    fin: finCustom,  // 🔹 Editable a gusto

    pulseras: {
      pareja1: { nombre: "Pulsera Azul", mac: "AA:BB:CC:DD:EE:01" },
      pareja2: { nombre: "Pulsera Roja", mac: "AA:BB:CC:DD:EE:02" }
    }
  };

  console.log("🧪 Enviando datos de PRUEBA al servidor:", datosPrueba);

  sendToServer(datosPrueba);
}


enviarPruebaAlServer("17:10");

