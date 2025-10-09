
// data/colors.js

// ==============================
// Colores y estilos ANSI para terminal
// ==============================

// Reset
const reset = "\x1b[0m";

// Colores de texto normales
const negro = "\x1b[30m";
const rojo = "\x1b[31m";
const verde = "\x1b[32m";
const amarillo = "\x1b[33m";
const azul = "\x1b[34m";
const magenta = "\x1b[35m";
const cyan = "\x1b[36m";
const blanco = "\x1b[37m";

// Colores de texto brillantes
const negroBr = "\x1b[90m";
const rojoBr = "\x1b[91m";
const verdeBr = "\x1b[92m";
const amarilloBr = "\x1b[93m";
const azulBr = "\x1b[94m";
const magentaBr = "\x1b[95m";
const cyanBr = "\x1b[96m";
const blancoBr = "\x1b[97m";

// Fondos normales
const bgNegro = "\x1b[40m";
const bgRojo = "\x1b[41m";
const bgVerde = "\x1b[42m";
const bgAmarillo = "\x1b[43m";
const bgAzul = "\x1b[44m";
const bgMagenta = "\x1b[45m";
const bgCyan = "\x1b[46m";
const bgBlanco = "\x1b[47m";

// Fondos brillantes
const bgNegroBr = "\x1b[100m";
const bgRojoBr = "\x1b[101m";
const bgVerdeBr = "\x1b[102m";
const bgAmarilloBr = "\x1b[103m";
const bgAzulBr = "\x1b[104m";
const bgMagentaBr = "\x1b[105m";
const bgCyanBr = "\x1b[106m";
const bgBlancoBr = "\x1b[107m";

// Estilos
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const italic = "\x1b[3m";
const underline = "\x1b[4m";
const inverse = "\x1b[7m";
const hidden = "\x1b[8m";
const strikethrough = "\x1b[9m";

// Exportamos todo
module.exports = {
  reset,
  negro, rojo, verde, amarillo, azul, magenta, cyan, blanco,
  negroBr, rojoBr, verdeBr, amarilloBr, azulBr, magentaBr, cyanBr, blancoBr,
  bgNegro, bgRojo, bgVerde, bgAmarillo, bgAzul, bgMagenta, bgCyan, bgBlanco,
  bgNegroBr, bgRojoBr, bgVerdeBr, bgAmarilloBr, bgAzulBr, bgMagentaBr, bgCyanBr, bgBlancoBr,
  bold, dim, italic, underline, inverse, hidden, strikethrough
};
