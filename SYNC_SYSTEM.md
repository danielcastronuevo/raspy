# Sistema de Sincronización de Partidos

## 📋 Descripción General

El sistema de sincronización automáticamente reintentar enviar los datos de los partidos a la VPS sin crear duplicados.

## 🔄 ¿Cómo funciona?

### 1. **Guardar un partido**
Cuando finaliza un partido (normal o desde menú):
- Se guarda en `history/YYYY-MM-DD_HHmm.json`
- Se intenta enviar al servidor VPS inmediatamente

### 2. **Registro de sincronización**
- Si el envío es exitoso → se registra el `matchId` en `logs/sync.json`
- Si el envío falla → el `matchId` NO se registra (quedará pendiente)

### 3. **Servicio periódico** (cada 5 minutos)
- Revisa todos los archivos en `history/`
- Compara con `logs/sync.json`
- Intenta enviar los que NO están registrados
- Si tienen éxito → se registran
- Si fallan → se reintentarán en el siguiente ciclo

## 📁 Archivos involucrados

```
logs/
├── historial.json          (snapshoots del partido en vivo)
└── sync.json              (registro de partidos sincronizados)

history/
├── 2025-12-16_1420.json   (partido finalizado 1)
├── 2025-12-16_1553.json   (partido finalizado 2)
└── 2025-12-16_1615.json   (partido finalizado 3)
```

## 🛠️ Configuración

### Intervalo de sincronización
En `server.js` línea 75:
```javascript
const INTERVALO_SINCRONIZACION = 5 * 60 * 1000; // 5 minutos
estado.iniciarSincronizacionPeriodica(INTERVALO_SINCRONIZACION);
```

Cambiar el valor para ajustar la frecuencia.

## 📡 Endpoints disponibles

### Ver partidos pendientes
```bash
GET /api/sync-status
```
Respuesta:
```json
{
  "pendientes": 2,
  "partidos": [
    { "matchId": "abc123...", "archivo": "2025-12-16_1420.json" },
    { "matchId": "def456...", "archivo": "2025-12-16_1553.json" }
  ]
}
```

### Forzar sincronización manual
```bash
POST /api/sync-now
```
Respuesta:
```json
{ "ok": true, "mensaje": "Sincronización iniciada" }
```

## 🎯 Ventajas

✅ **Sin duplicados**: El registro de sincronización evita envíos múltiples  
✅ **Reintentos automáticos**: Los fallos se reintentarán periódicamente  
✅ **Sin intervención manual**: El sistema funciona de forma autónoma  
✅ **Recuperación ante fallos**: Si cae la VPS, los datos se guardan localmente  
✅ **Verificable**: Puedes chequear qué está pendiente con `/api/sync-status`  

## 📊 Flujo de ejecución

```
┌─────────────────────────┐
│  Finaliza un partido    │
└────────────┬────────────┘
             │
             ├──→ Guarda en history/
             └──→ Intenta enviar a VPS
                    │
                    ├─ Éxito → Registra en sync.json
                    └─ Falla → Queda pendiente
                    
┌──────────────────────────────┐
│  Cada 5 minutos (timer)      │
└────────────┬─────────────────┘
             │
             └──→ sincronizarPartidosPendientes()
                    │
                    ├─ Lee history/
                    ├─ Compara con sync.json
                    ├─ Intenta enviar pendientes
                    └─ Registra los exitosos
```

## ⚙️ Funciones clave

- `iniciarSincronizacionPeriodica(intervaloMs)` - Inicia el timer de sincronización
- `sincronizarPartidosPendientes()` - Sincroniza todos los partidos pendientes
- `obtenerPartidosPendientes()` - Lista los partidos que falta enviar
- `registrarEnSyncLog(matchId)` - Marca un partido como sincronizado
- `cargarSyncLog()` - Carga el registro de sincronización
