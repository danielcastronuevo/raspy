import asyncio, csv, datetime as dt, os, time
from collections import defaultdict
from pathlib import Path
from bleak import BleakScanner
import aiohttp
import json

# ------------ CONFIG ---------------------------------------
MAC_PREFIX = "C3:00:00".upper()
NODE_URL   = "http://localhost:5000/api/sensors" 
WATCHDOG_INTERVAL = 1.0  # segundos

SCRIPT_DIR = Path(__file__).parent  # carpeta donde esta scanner.py
WHITELIST_FILE = SCRIPT_DIR / "whiteList.json"
CSV_PATH = SCRIPT_DIR / "log.csv"

# ------------ WHITELIST ------------------------------------
def load_mac_to_pareja(filepath=WHITELIST_FILE):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        mac_to_pareja = {}
        for pareja_name, pareja_info in data.items():
            mac = pareja_info.get("macPulsera", "").upper()
            if mac:
                mac_to_pareja[mac] = pareja_name
        return mac_to_pareja
    except Exception as e:
        print(f"❌ Error al cargar whitelist: {e}")
        return {}

MAC_TO_PAREJA = load_mac_to_pareja()
last_whitelist_mtime = os.path.getmtime(WHITELIST_FILE) if os.path.exists(WHITELIST_FILE) else 0

async def whitelist_watchdog():
    global MAC_TO_PAREJA, last_whitelist_mtime
    while True:
        try:
            if os.path.exists(WHITELIST_FILE):
                mtime = os.path.getmtime(WHITELIST_FILE)
                if mtime != last_whitelist_mtime:
                    MAC_TO_PAREJA = load_mac_to_pareja()
                    last_whitelist_mtime = mtime
                    print("🔄 Whitelist recargada en caliente.")
        except Exception as e:
            print(f"⚠️ Error en watchdog: {e}")
        await asyncio.sleep(WATCHDOG_INTERVAL)

# ------------ LOGIC ----------------------------------------
REBOUND_BY_TYPE = {
    "simple": 4.0,
    "double": 4.0,
    "triple": 4.0,   
}

ACTIONS = {
    (11, 11): "simple",
    (22, 22): "double",
    (33, 33): "triple",   
}

def node_action(pareja, tipo):
    if tipo == "simple":
        return "sumarP1" if pareja == "pareja1" else "sumarP2"
    elif tipo == "double":
        return "restar"
    elif tipo == "triple":
        return "3-toques"  
    return None

last_evt   = defaultdict(float)  # debounce por MAC+tipo
last_global_evt = 0               # debounce global
GLOBAL_DEBOUNCE = 5.0             # segundos para bloquear cualquier toque
totals     = defaultdict(int)
rebounces  = defaultdict(int)
log_rows   = []

def header():
    print(f"Captura con envío a Node (rebotes por tipo y dispositivo)\n")
    print(f"{'ts':<12} {'maj/min':<9} {'rssi':>5}  MAC/Pareja       decisión")

def parse_ibeacon(b: bytes):
    if len(b) < 23 or b[:2] != b"\x02\x15":
        return None
    major = int.from_bytes(b[18:20],'big')
    minor = int.from_bytes(b[20:22],'big')
    if (major, minor) not in ACTIONS:
        return None
    return (major, minor)

async def send_to_node(session, accion):
    if not accion:
        return
    try:
        async with session.post(NODE_URL, json={"accion": accion}) as resp:
            if resp.status != 200:
                print(f"⚠️  Error al enviar '{accion}' ({resp.status})")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")

def make_callback(session):
    async def cb(dev, adv):
        global last_global_evt
        if not dev.address.upper().startswith(MAC_PREFIX):
            return
        blk = adv.manufacturer_data.get(0x004C)
        if not blk:
            return
        key = parse_ibeacon(blk)
        if not key:
            return

        tipo_toque = ACTIONS.get(key, "unknown")
        mac = dev.address.upper()
        pareja = MAC_TO_PAREJA.get(mac, None)
        now = time.time()
        decision = "unknown"

        if tipo_toque != "unknown" and pareja is not None:
            key_mac_tipo = (mac, tipo_toque)
            rebound_time = REBOUND_BY_TYPE.get(tipo_toque, 2.0)
            elapsed_mac = now - last_evt[key_mac_tipo]
            elapsed_global = now - last_global_evt

            if elapsed_mac >= rebound_time and elapsed_global >= GLOBAL_DEBOUNCE:
                totals[key_mac_tipo] += 1
                last_evt[key_mac_tipo] = now
                last_global_evt = now
                decision = f"counted ({pareja})"

                accion = node_action(pareja, tipo_toque)
                if accion:
                    asyncio.create_task(send_to_node(session, accion))
            else:
                rebounces[key_mac_tipo] += 1
                reasons = []
                if elapsed_mac < rebound_time:
                    reasons.append(f"MAC debounce ({rebound_time - elapsed_mac:.1f}s)")
                if elapsed_global < GLOBAL_DEBOUNCE:
                    reasons.append(f"GLOBAL debounce ({GLOBAL_DEBOUNCE - elapsed_global:.1f}s)")
                decision = f"rebounce ({pareja}) - {' & '.join(reasons)}"

        ts_str = dt.datetime.now().strftime("%H:%M:%S.%f")[:-3]
        maj, min_ = key
        print(f"{ts_str[-12:]}  {maj:>3}/{min_:<3}  {adv.rssi:>5}  {mac:<17}  {decision}")

        log_rows.append({
            "timestamp": ts_str,
            "phase": tipo_toque,
            "mac": mac,
            "pareja": pareja if pareja else "desconocida",
            "major": maj,
            "minor": min_,
            "rssi": adv.rssi,
            "decision": decision,
        })

    return cb

# ------------ MAIN -----------------------------------------
async def main():
    header()

    async with aiohttp.ClientSession() as session:
        scanner = BleakScanner(make_callback(session), scanning_mode="active")
        await scanner.start()
        print("🛰️ Escaneando... (Ctrl+C para detener)")

        watchdog_task = asyncio.create_task(whitelist_watchdog())

        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Escaneo detenido por el usuario.")
        finally:
            await scanner.stop()
            watchdog_task.cancel()

    print("\nResumen:")
    for (mac, tipo) in sorted(totals):
        counted = totals[(mac, tipo)]
        bounced = rebounces.get((mac, tipo), 0)
        print(f"  {mac} - {tipo:<6}: {counted} evento(s) contados, {bounced} descartados")

    if log_rows:
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, log_rows[0].keys())
            writer.writeheader()
            writer.writerows(log_rows)
        print(f"\n📄 Log guardado en {CSV_PATH.absolute()}")

if __name__ == "__main__":
    asyncio.run(main())
