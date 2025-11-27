import esbuild from "esbuild";
import htmlMinify from "esbuild-plugin-html-minify";
import fs from "fs";
import path from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

const folders = ["logic", "routes", "public"];

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function getAllFiles(dir, exts, list = []) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    // nunca tocar qrcode.js
    if (full.includes("public/counter/qrcode.js")) continue;

    if (stat.isDirectory()) {
      getAllFiles(full, exts, list);
    } else if (exts.some(ext => full.endsWith(ext))) {
      list.push(full);
    }
  }
  return list;
}

function copyOtherFiles(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const file of fs.readdirSync(src)) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyOtherFiles(srcFile, destFile);
    } else {
      const ext = path.extname(srcFile).toLowerCase();

      // copiar qrcode.js tal cual
      if (srcFile.includes("public/counter/qrcode.js")) {
        fs.copyFileSync(srcFile, destFile);
        continue;
      }

      if (![".js", ".css", ".html"].includes(ext)) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }
}

function obfuscateBasic(file) {
  const code = fs.readFileSync(file, "utf8");

  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    stringArray: true,
    stringArrayEncoding: ["rc4"],
    stringArrayRotate: true,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false
  }).getObfuscatedCode();

  fs.writeFileSync(file, obfuscated);
}

// ---------------------------------------------
// Minificado de carpetas
// ---------------------------------------------
async function minifyFolder(folder) {
  const out = `build/${folder}`;

  await esbuild.build({
    entryPoints: getAllFiles(folder, [".js", ".css", ".html"]),
    outdir: out,
    minify: true,
    bundle: false,
    format: "cjs",
    plugins: [htmlMinify()]
  });

  copyOtherFiles(folder, out);

  // copiar qrcode.js intacto
  const qrOriginal = path.join(folder, "counter/qrcode.js");
  const qrBuild = path.join(out, "counter/qrcode.js");
  if (fs.existsSync(qrOriginal)) fs.copyFileSync(qrOriginal, qrBuild);
}

// ---------------------------------------------
// Scanner
// ---------------------------------------------
async function processScanner() {
  const outDir = "build/scanner";
  fs.mkdirSync(outDir, { recursive: true });

  fs.copyFileSync("scanner/scanner.py", "build/scanner/scanner.py");

  if (fs.existsSync("scanner/whiteList.json")) {
    const data = JSON.parse(fs.readFileSync("scanner/whiteList.json", "utf8"));
    fs.writeFileSync("build/scanner/whiteList.json", JSON.stringify(data));
  }
}

// ---------------------------------------------
// Server + config
// ---------------------------------------------
async function minifyServer() {
  await esbuild.build({
    entryPoints: ["server.js"],
    outfile: "build/server.js",
    minify: true,
    bundle: false,
    format: "cjs"
  });
}

async function minifyConfig() {
  const json = JSON.parse(fs.readFileSync("config.json", "utf8"));
  fs.writeFileSync("build/config.json", JSON.stringify(json));
}

// ---------------------------------------------
// MAIN
// ---------------------------------------------
async function main() {
  fs.rmSync("build", { recursive: true, force: true });

  for (const folder of folders) {
    console.log("Minificando carpeta:", folder);
    await minifyFolder(folder);
  }

  console.log("Procesando scanner/");
  await processScanner();

  console.log("Minificando server.js");
  await minifyServer();

  console.log("Minificando config.json");
  await minifyConfig();

  // ---------------------------------------------
  // Ofuscación leve (pero fea)
  // ---------------------------------------------
  const targets = [
    "build/public/counter/script.js",
    "build/logic/match.js"
  ];

  for (const f of targets) {
    if (fs.existsSync(f)) {
      console.log("Ofuscando:", f);
      obfuscateBasic(f);
    }
  }

  console.log("Build COMPLETO: minificado + ofuscado + qrcode.js intacto");
}

main();
