export default async function handler(req, res) {
  const timeoutMs = Number(req.query.timeout) || 15000;

  const fuentes = [
    { id: 'ecmwf', nombre: '🇪🇺 ECMWF IFS (9km - Europa)', url: 'https://api.open-meteo.com/v1/forecast?latitude=20.08&longitude=-98.36&hourly=temperature_2m' },
    { id: 'gfs', nombre: '🇺🇸 NOAA GFS (13km - EE.UU.)', url: 'https://api.open-meteo.com/v1/gfs?latitude=20.08&longitude=-98.36&hourly=temperature_2m' },
    { id: 'icon', nombre: '🇩🇪 DWD ICON Global (13km - Alemania)', url: 'https://api.open-meteo.com/v1/dwd-icon?latitude=20.08&longitude=-98.36&hourly=temperature_2m' },
    { id: 'smn', nombre: '🇲🇽 SMN / CONAGUA (Avisos de Alerta)', url: 'https://smn.conagua.gob.mx/tools/GUI/webservices/?method=3' },
    { id: 'nhc', nombre: '🌀 NOAA NHC (Centro Nacional de Huracanes)', url: 'https://www.nhc.noaa.gov/CurrentStorms.json' }
  ];

  const resultados = await Promise.all(fuentes.map(async f => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(f.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://smn.conagua.gob.mx/'
        }
      });
      clearTimeout(timeout);
      const latencia = Date.now() - start;
      return {
        id: f.id,
        nombre: f.nombre,
        status: resp.ok ? 'ok' : 'degradado',
        httpCode: resp.status,
        latencia_ms: latencia,
        mensaje: resp.ok ? `Operativo (${latencia} ms)` : `HTTP ${resp.status} (${latencia} ms)`
      };
    } catch (err) {
      return {
        id: f.id,
        nombre: f.nombre,
        status: 'fuera_de_linea',
        httpCode: 0,
        latencia_ms: Date.now() - start,
        mensaje: `Tiempo de espera agotado (>${timeoutMs / 1000}s) o servidor inaccesible`
      };
    }
  }));

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ timestamp: new Date().toISOString(), timeout_usado: timeoutMs, resultados });
}