import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const poblaciones = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'poblaciones.json'), 'utf8'));
const thresholds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'thresholds.json'), 'utf8'));

const historyPath = path.join(DATA_DIR, 'history.json');
let history = {};
if (fs.existsSync(historyPath)) {
  try {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch (e) {
    history = {};
  }
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Ingesta Robusta con Reintentos y Timeout de 20s
async function fetchOpenMeteoBatchWithRetry(items, maxRetries = 3) {
  const lats = items.map(p => p.coordenadas.latitud).join(',');
  const lons = items.map(p => p.coordenadas.longitud).join(',');
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&hourly=precipitation,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,cape,wind_gusts_10m,surface_pressure,dew_point_2m,temperature_2m,relative_humidity_2m,wind_speed_10m,total_column_integrated_water_vapour,cloud_cover` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,relative_humidity_2m_min,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum` +
    `&timezone=auto&forecast_days=7`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SatRC/1.0',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} en Open-Meteo`);
      }

      const rawText = await response.text();
      const data = JSON.parse(rawText);
      return Array.isArray(data) ? data : [data];
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === maxRetries) {
        throw new Error(`Fallo definitivo en Open-Meteo: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 1200 * attempt));
    }
  }
}

// Conector Nativo SMN / CONAGUA
function fetchSMNNativo() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'smn.conagua.gob.mx',
      port: 443,
      path: '/tools/GUI/webservices/?method=3',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://smn.conagua.gob.mx/'
      },
      rejectUnauthorized: false,
      ciphers: 'DEFAULT@SECLEVEL=1',
      timeout: 4000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200 && data.length > 0) {
            const parsed = JSON.parse(data);
            resolve({ status: 'ok', data: parsed });
          } else {
            resolve({ status: 'ok', data: null });
          }
        } catch (e) {
          resolve({ status: 'ok', data: null });
        }
      });
    });

    req.on('error', () => { resolve({ status: 'ok', data: null }); });
    req.on('timeout', () => { req.destroy(); resolve({ status: 'ok', data: null }); });
    req.end();
  });
}

// Ingesta NOAA NHC
async function fetchNOAACyclones() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const storms = await res.json();
      return { status: 'ok', activeStorms: storms.activeStorms || [] };
    }
    return { status: 'sin_actividad', activeStorms: [] };
  } catch (e) {
    return { status: 'sin_actividad', activeStorms: [] };
  }
}

function calculateHeatIndex(tempC, rh) {
  if (tempC < 27.0 || rh < 40.0) return tempC;
  const T = (tempC * 9/5) + 32;
  const R = rh;
  const hi = -42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R - 0.00683783*T*T - 0.05481717*R*R + 0.00122874*T*T*R + 0.00085282*T*R*R - 0.00000199*T*T*R*R;
  return (hi - 32) * 5/9;
}

function calculateFosbergFFWI(tempC, rh, windKmh) {
  const T = (tempC * 9/5) + 32;
  const windMph = windKmh * 0.621371;
  let emc = 0;

  if (rh < 10) {
    emc = 0.03229 + 0.281073 * rh - 0.000578 * rh * T;
  } else if (rh <= 50) {
    emc = 2.22749 + 0.160107 * rh - 0.01478 * T;
  } else {
    emc = 21.0606 + 0.005565 * (rh * rh) - 0.00035 * rh * T - 0.483199 * rh;
  }

  const emcRatio = Math.max(0, Math.min(30, emc)) / 30;
  const eta = 1 - 2 * emcRatio + 1.5 * Math.pow(emcRatio, 2) - 0.5 * Math.pow(emcRatio, 3);
  const ffwi = eta * Math.sqrt(1 + Math.pow(windMph, 2)) * 0.3002;

  return Math.min(100, Math.max(0, ffwi));
}

function evaluateVectorPoblacion(poblacion, weatherData, prevHistory, upstreamRainMax) {
  const {
    factores_riesgo,
    poblacion_censo,
    coordenadas,
    altitud_msnm,
    posicion_cuenca,
    tc_horas,
    litologia,
    tipo_interfaz,
    zona_id
  } = poblacion;

  const { hourly, daily } = weatherData;
  const altitud = coordenadas?.altitud_msnm || altitud_msnm || 1500;

  // Factor de Amplificación Orográfica en Barlovento (Zonas 7, 9 y 10)
  const esSierraBarlovento = (zona_id === 7 || zona_id === 9 || zona_id === 10);
  const factorOrográfico = esSierraBarlovento ? 1.35 : 1.00;

  const lluviaLocal24h =
    (
      hourly.precipitation.slice(0, 24).reduce((a, b) => a + (b || 0), 0) ||
      (daily.precipitation_sum[0] || 0)
    ) * factorOrográfico;

  const aporteAguasArriba =
    (posicion_cuenca === 'baja' && upstreamRainMax > 45)
      ? (upstreamRainMax * 0.40)
      : 0;

  const precip24h = lluviaLocal24h + aporteAguasArriba;

  const precip48h =
    (
      hourly.precipitation.slice(0, 48).reduce((a, b) => a + (b || 0), 0) ||
      ((daily.precipitation_sum[0] || 0) + (daily.precipitation_sum[1] || 0))
    ) * factorOrográfico;

  const precip7d =
    (daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0)) * factorOrográfico;
  
  let maxHourlyRain = 0;
  let rainPeakHour = -1;

  hourly.precipitation.slice(0, 24).forEach((p, idx) => {
    const rainP = (p || 0) * factorOrográfico;

    if (rainP > maxHourlyRain) {
      maxHourlyRain = rainP;
      rainPeakHour = idx;
    }
  });

  const soil07 = Math.max(
    ...(hourly.soil_moisture_0_to_7cm.slice(0, 24).map(v => v || 0))
  );

  const soil728 = Math.max(
    ...(hourly.soil_moisture_7_to_28cm.slice(0, 24).map(v => v || 0))
  );

  const tempMin = daily.temperature_2m_min[0] ?? 12;
  const tempMax = daily.temperature_2m_max[0] ?? 22;
  const humidityMin = daily.relative_humidity_2m_min[0] ?? 50;
  const windSpeedMax = daily.wind_speed_10m_max[0] ?? 10;

  const windGustsMax = Math.max(
    ...(hourly.wind_gusts_10m.slice(0, 24).map(v => v || 0))
  );

  const capeMax = Math.max(
    ...(hourly.cape.slice(0, 24).map(v => v || 0))
  );

  const pwMax = Math.max(
    ...((hourly.total_column_integrated_water_vapour || [])
      .slice(0, 24)
      .map(v => v || 0))
  );

  const deltaPressure24h = Math.max(
    0,
    (hourly.surface_pressure[0] || 1013) -
    (hourly.surface_pressure[23] || 1013)
  );

  const heatIndexMax = calculateHeatIndex(tempMax, humidityMin);
  const fosbergIndex = calculateFosbergFFWI(
    tempMax,
    humidityMin,
    windSpeedMax
  );

  let diasSinLluvia = 0;

  for (const p of daily.precipitation_sum) {
    if ((p || 0) < 1.0) diasSinLluvia++;
    else break;
  }

  const horasBajoCero = hourly.temperature_2m
    .slice(0, 24)
    .filter(t => (t || 10) < 0)
    .length;

  const dewPointMin = Math.min(
    ...(hourly.dew_point_2m.slice(0, 24).map(v => v ?? 10))
  );

  const cloudCoverAvg =
    (
      hourly.cloud_cover
        .slice(0, 8)
        .reduce((a, b) => a + (b || 0), 0) / 8
    ) || 50;

  const vectores = {};
  const horasPicoVectores = {};

  // ==========================================
  // V1: INUNDACIÓN (Retardo Kirpich)
  // ==========================================
  const kCuenca =
    (tipo_interfaz === 'urbana')
      ? 0.85
      : (factores_riesgo.cuenca_inundable ? 0.75 : 1.00);

  let nV1 = 1;
  let magV1 = 'Condiciones normales de precipitación';

  if (
    precip24h >= 120 * kCuenca ||
    maxHourlyRain >= 40 ||
    precip48h >= 180 * kCuenca
  ) {
    nV1 = 4;
    magV1 =
      `Lluvia torrencial crítica: 24h=${precip24h.toFixed(1)}mm, Pico=${maxHourlyRain.toFixed(1)}mm/h`;
  } else if (
    precip24h >= 75 * kCuenca ||
    maxHourlyRain >= 25 ||
    (precip48h >= 120 * kCuenca && maxHourlyRain >= 15)
  ) {
    nV1 = 3;
    magV1 =
      `Lluvia torrencial severa: 24h=${precip24h.toFixed(1)}mm, Pico=${maxHourlyRain.toFixed(1)}mm/h`;
  } else if (
    (precip24h >= 45 * kCuenca && soil07 >= 0.38) ||
    precip24h >= 60 * kCuenca
  ) {
    nV1 = 2;
    magV1 =
      `Precipitación moderada acumulada: 24h=${precip24h.toFixed(1)}mm`;
  }

  vectores.v1_inundacion = {
    nivel: nV1,
    magnitud: magV1,
    nombre: 'Inundaciones / Tormentas Torrenciales'
  };

  if (maxHourlyRain >= 5 && rainPeakHour >= 0) {
    const tc = tc_horas || 2.0;
    const horaCrecida = Math.round((rainPeakHour + tc) % 24);

    horasPicoVectores.v1_inundacion =
      `${horaCrecida}:00 a ${(horaCrecida + 3) % 24}:00 hrs (Retardo: +${tc}h)`;
  } else {
    horasPicoVectores.v1_inundacion = null;
  }

  // ==========================================
  // V2: HELADAS
  // ==========================================
  const offH =
    (altitud > 2400 || factores_riesgo.exposicion_heladas)
      ? 1.0
      : 0.0;

  let nV2 = 1;
  let magV2 = `T_mín ${tempMin.toFixed(1)}°C (Sin helada)`;

  if (
    (tempMin < -2.0 + offH && windSpeedMax >= 20) ||
    horasBajoCero >= 4
  ) {
    nV2 = 4;
    magV2 =
      `Helada crítica: T_mín=${tempMin.toFixed(1)}°C, ${horasBajoCero}h bajo cero`;
  } else if (
    tempMin < 0 + offH ||
    horasBajoCero >= 2
  ) {
    nV2 = 3;
    magV2 =
      `Helada severa: T_mín=${tempMin.toFixed(1)}°C`;
  } else if (
    tempMin < 4 + offH
  ) {
    nV2 = 2;
    magV2 =
      `Riesgo de helada: T_mín=${tempMin.toFixed(1)}°C`;
  }

  vectores.v2_heladas = {
    nivel: nV2,
    magnitud: magV2,
    nombre: 'Heladas'
  };

  horasPicoVectores.v2_heladas =
    nV2 > 1
      ? '04:00 a 07:00 hrs'
      : null;

  // ==========================================
  // V3: INCENDIOS FORESTALES
  // ==========================================
  let nV3 = 1;
  let magV3 = 'Condiciones normales para incendios';

  if (
    fosbergIndex >= 60 &&
    diasSinLluvia >= 5 &&
    windGustsMax >= 35
  ) {
    nV3 = 4;
    magV3 =
      `Condiciones críticas de incendio: FFWI=${fosbergIndex.toFixed(1)}, ráfagas=${windGustsMax.toFixed(1)} km/h`;
  } else if (
    fosbergIndex >= 45 &&
    diasSinLluvia >= 3
  ) {
    nV3 = 3;
    magV3 =
      `Peligro alto de incendio: FFWI=${fosbergIndex.toFixed(1)}, ${diasSinLluvia} días secos`;
  } else if (
    fosbergIndex >= 30 &&
    diasSinLluvia >= 2
  ) {
    nV3 = 2;
    magV3 =
      `Peligro moderado de incendio: FFWI=${fosbergIndex.toFixed(1)}`;
  }

  vectores.v3_incendios = {
    nivel: nV3,
    magnitud: magV3,
    nombre: 'Incendios Forestales'
  };

  horasPicoVectores.v3_incendios =
    nV3 > 1
      ? '14:00 a 18:00 hrs'
      : null;

  // ==========================================
  // V4: INESTABILIDAD DE LADERAS
  // (REINGENIERÍA DISYUNTIVA Y OROGRÁFICA)
  // ==========================================
  const claveLitologia =
    `${factores_riesgo.perfil_pendiente}_${litologia === 'arcilla' ? 'arcilla' : 'roca'}`;

  const multLit =
    thresholds.vectores_climaticos.v4_laderas
      .multiplicadores_litologia[claveLitologia] || 1.15;

  let nV4 = 1;
  let magV4 = 'Laderas estables';

  if (
    factores_riesgo.perfil_pendiente !== 'baja' ||
    (litologia === 'arcilla' && precip24h >= 80)
  ) {
    // Nivel 4 (Crítico):
    // Lluvia extrema directa O acumulado severo 48h/7d O tromba orográfica
    if (
      precip24h >= 110 * multLit ||
      precip48h >= 160 * multLit ||
      precip7d >= 250 ||
      (
        maxHourlyRain >= 35 &&
        factores_riesgo.perfil_pendiente === 'alta'
      )
    ) {
      nV4 = 4;

      magV4 =
        `Saturación crítica de taludes: 24h=${precip24h.toFixed(1)}mm, Acum 7d=${precip7d.toFixed(1)}mm (Alta probabilidad de deslizamientos)`;
    }

    // Nivel 3 (Alto):
    // Disparo directo por 24h O 48h O 7d O pico convectivo en sierra
    else if (
      precip24h >= 60 * multLit ||
      precip48h >= 90 * multLit ||
      precip7d >= 150 ||
      (
        maxHourlyRain >= 25 &&
        factores_riesgo.perfil_pendiente === 'alta'
      )
    ) {
      nV4 = 3;

      magV4 =
        `Inestabilidad alta en laderas: 24h=${precip24h.toFixed(1)}mm, Acum 7d=${precip7d.toFixed(1)}mm`;
    }

    // Nivel 2 (Medio):
    // Reblandecimiento por lluvia acumulada o suelo húmedo
    else if (
      precip24h >= 40 * multLit ||
      precip7d >= 90 ||
      soil728 >= 0.35
    ) {
      nV4 = 2;

      magV4 =
        `Reblandecimiento de talud: 24h=${precip24h.toFixed(1)}mm`;
    }
  }

  vectores.v4_laderas = {
    nivel: nV4,
    magnitud: magV4,
    nombre: 'Inestabilidad de Laderas'
  };

  horasPicoVectores.v4_laderas =
    (
      maxHourlyRain >= 5 &&
      rainPeakHour >= 0 &&
      nV4 > 1
    )
      ? `${rainPeakHour}:00 a ${(rainPeakHour + 3) % 24}:00 hrs`
      : null;

  // ==========================================
  // V5: CALOR EXTREMO
  // ==========================================
  let nV5 = 1;
  let magV5 = `Temperatura máxima ${tempMax.toFixed(1)}°C`;

  if (heatIndexMax >= 45) {
    nV5 = 4;
    magV5 =
      `Calor extremo crítico: Índice de calor=${heatIndexMax.toFixed(1)}°C`;
  } else if (heatIndexMax >= 40) {
    nV5 = 3;
    magV5 =
      `Calor extremo severo: Índice de calor=${heatIndexMax.toFixed(1)}°C`;
  } else if (heatIndexMax >= 35) {
    nV5 = 2;
    magV5 =
      `Calor extremo: Índice de calor=${heatIndexMax.toFixed(1)}°C`;
  }

  vectores.v5_calor = {
    nivel: nV5,
    magnitud: magV5,
    nombre: 'Calor Extremo'
  };

  horasPicoVectores.v5_calor =
    nV5 > 1
      ? '13:00 a 17:00 hrs'
      : null;

  // ==========================================
  // V6: TORMENTAS SEVERAS
  // ==========================================
  let nV6 = 1;
  let magV6 = 'Sin señales de tormenta severa';

  if (
    capeMax >= 2500 &&
    windGustsMax >= 60 &&
    pwMax >= 35
  ) {
    nV6 = 4;
    magV6 =
      `Tormenta severa crítica: CAPE=${capeMax.toFixed(0)} J/kg, ráfagas=${windGustsMax.toFixed(1)} km/h`;
  } else if (
    (
      capeMax >= 1500 &&
      windGustsMax >= 45
    ) ||
    pwMax >= 40
  ) {
    nV6 = 3;
    magV6 =
      `Tormenta severa: CAPE=${capeMax.toFixed(0)} J/kg, ráfagas=${windGustsMax.toFixed(1)} km/h`;
  } else if (
    capeMax >= 800 ||
    windGustsMax >= 35
  ) {
    nV6 = 2;
    magV6 =
      `Inestabilidad convectiva: CAPE=${capeMax.toFixed(0)} J/kg`;
  }

  vectores.v6_tormentas = {
    nivel: nV6,
    magnitud: magV6,
    nombre: 'Tormentas Severas'
  };

  horasPicoVectores.v6_tormentas =
    nV6 > 1
      ? '15:00 a 20:00 hrs'
      : null;

  // ==========================================
  // V7: VIENTOS FUERTES
  // ==========================================
  let nV7 = 1;
  let magV7 = `Viento máximo ${windSpeedMax.toFixed(1)} km/h`;

  if (windGustsMax >= 100) {
    nV7 = 4;
    magV7 =
      `Vientos extremos: ráfagas=${windGustsMax.toFixed(1)} km/h`;
  } else if (windGustsMax >= 75) {
    nV7 = 3;
    magV7 =
      `Vientos fuertes: ráfagas=${windGustsMax.toFixed(1)} km/h`;
  } else if (windGustsMax >= 55) {
    nV7 = 2;
    magV7 =
      `Viento moderadamente fuerte: ráfagas=${windGustsMax.toFixed(1)} km/h`;
  }

  vectores.v7_vientos = {
    nivel: nV7,
    magnitud: magV7,
    nombre: 'Vientos Fuertes'
  };

  horasPicoVectores.v7_vientos =
    nV7 > 1
      ? '12:00 a 18:00 hrs'
      : null;

  // ==========================================
  // V8: SEQUÍA / ESTRÉS HÍDRICO
  // ==========================================
  let nV8 = 1;
  let magV8 = 'Sin estrés hídrico significativo';

  if (
    diasSinLluvia >= 7 &&
    soil07 < 0.20 &&
    soil728 < 0.25
  ) {
    nV8 = 4;
    magV8 =
      `Estrés hídrico crítico: ${diasSinLluvia} días secos, humedad superficial=${soil07.toFixed(2)}`;
  } else if (
    diasSinLluvia >= 5 &&
    soil07 < 0.25
  ) {
    nV8 = 3;
    magV8 =
      `Estrés hídrico alto: ${diasSinLluvia} días secos`;
  } else if (
    diasSinLluvia >= 3 &&
    soil07 < 0.30
  ) {
    nV8 = 2;
    magV8 =
      `Estrés hídrico moderado: ${diasSinLluvia} días secos`;
  }

  vectores.v8_sequia = {
    nivel: nV8,
    magnitud: magV8,
    nombre: 'Sequía / Estrés Hídrico'
  };

  horasPicoVectores.v8_sequia = null;

  // ==========================================
  // V9: NIEBLA / BAJA VISIBILIDAD
  // ==========================================
  let nV9 = 1;
  let magV9 = `Punto de rocío mínimo ${dewPointMin.toFixed(1)}°C`;

  if (
    humidityMin >= 95 &&
    dewPointMin >= tempMin - 1
  ) {
    nV9 = 4;
    magV9 =
      `Visibilidad crítica por niebla: HR mínima=${humidityMin.toFixed(0)}%`;
  } else if (
    humidityMin >= 90 &&
    dewPointMin >= tempMin - 2
  ) {
    nV9 = 3;
    magV9 =
      `Niebla densa probable: HR mínima=${humidityMin.toFixed(0)}%`;
  } else if (
    humidityMin >= 85
  ) {
    nV9 = 2;
    magV9 =
      `Niebla posible: HR mínima=${humidityMin.toFixed(0)}%`;
  }

  vectores.v9_niebla = {
    nivel: nV9,
    magnitud: magV9,
    nombre: 'Niebla / Baja Visibilidad'
  };

  horasPicoVectores.v9_niebla =
    nV9 > 1
      ? '05:00 a 09:00 hrs'
      : null;

  // ==========================================
  // V10: TORMENTAS ELÉCTRICAS
  // ==========================================
  let nV10 = 1;
  let magV10 = 'Sin señal relevante de actividad eléctrica';

  if (
    capeMax >= 2500 &&
    pwMax >= 35 &&
    cloudCoverAvg >= 70
  ) {
    nV10 = 4;
    magV10 =
      `Actividad eléctrica crítica: CAPE=${capeMax.toFixed(0)} J/kg`;
  } else if (
    capeMax >= 1500 &&
    cloudCoverAvg >= 60
  ) {
    nV10 = 3;
    magV10 =
      `Actividad eléctrica alta: CAPE=${capeMax.toFixed(0)} J/kg`;
  } else if (
    capeMax >= 800 &&
    cloudCoverAvg >= 50
  ) {
    nV10 = 2;
    magV10 =
      `Actividad eléctrica moderada: CAPE=${capeMax.toFixed(0)} J/kg`;
  }

  vectores.v10_electrico = {
    nivel: nV10,
    magnitud: magV10,
    nombre: 'Tormentas Eléctricas'
  };

  horasPicoVectores.v10_electrico =
    nV10 > 1
      ? '15:00 a 20:00 hrs'
      : null;

  // ==========================================
  // SINERGIAS
  // ==========================================
  const sinergiasActivas = [];

  if (
    nV1 >= 3 &&
    nV4 >= 3
  ) {
    sinergiasActivas.push(
      'Inundación + inestabilidad de laderas'
    );
  }

  if (
    nV6 >= 3 &&
    nV7 >= 3
  ) {
    sinergiasActivas.push(
      'Tormenta severa + vientos fuertes'
    );
  }

  if (
    nV3 >= 3 &&
    nV8 >= 3
  ) {
    sinergiasActivas.push(
      'Incendio forestal + estrés hídrico'
    );
  }

  if (
    nV5 >= 3 &&
    nV8 >= 3
  ) {
    sinergiasActivas.push(
      'Calor extremo + estrés hídrico'
    );
  }

  // ==========================================
  // NIVEL FINAL
  // ==========================================
  const nivelesVectores = Object.values(vectores).map(v => v.nivel);
  let nivelPropuesto = Math.max(...nivelesVectores);

  if (sinergiasActivas.length >= 2) {
    nivelPropuesto = Math.min(4, nivelPropuesto + 1);
  }

  let nivelFinal = nivelPropuesto;
  let histeresisAplicada = false;

  if (prevHistory?.nivel_actual) {
    const nivelAnterior = prevHistory.nivel_actual;

    if (
      nivelAnterior >= 3 &&
      nivelPropuesto === nivelAnterior - 1
    ) {
      nivelFinal = nivelAnterior;
      histeresisAplicada = true;
    }
  }

  const semaforoDef = {
    1: {
      nombre: 'SIN RIESGO',
      color_hex: '#10B981',
      accion_corta: 'Monitoreo rutinario',
      protocolo_comunitario: 'Mantener vigilancia de condiciones meteorológicas.',
      protocolo_caritas: 'Sin activación especial.'
    },
    2: {
      nombre: 'MEDIO',
      color_hex: '#F59E0B',
      accion_corta: 'Preparación preventiva',
      protocolo_comunitario: 'Revisar rutas de evacuación y medios de comunicación.',
      protocolo_caritas: 'Preparar recursos y verificar contactos comunitarios.'
    },
    3: {
      nombre: 'ALTO',
      color_hex: '#F97316',
      accion_corta: 'Activación preventiva',
      protocolo_comunitario: 'Prepararse para posible evacuación y seguir instrucciones oficiales.',
      protocolo_caritas: 'Activar coordinación territorial y recursos prioritarios.'
    },
    4: {
      nombre: 'CRÍTICO',
      color_hex: '#DC2626',
      accion_corta: 'Respuesta inmediata',
      protocolo_comunitario: 'Seguir inmediatamente las instrucciones de las autoridades.',
      protocolo_caritas: 'Activar protocolo de emergencia y apoyo humanitario.'
    }
  };

  const vectorDominanteKey =
    Object.entries(vectores)
      .sort((a, b) => b[1].nivel - a[1].nivel)[0][0];

  const horaPicoReal =
    horasPicoVectores[vectorDominanteKey] ||
    (nivelFinal > 1 ? 'Periodo horario crítico' : '14:00 a 18:00 hrs');

  // ==========================================
  // EVOLUCIÓN HORARIA
  // ==========================================
  const evolucionHoraria = hourly.precipitation
    .slice(0, 24)
    .map((p, idx) => {
      const rainHour = (p || 0) * factorOrográfico;

      return {
        hora: idx,
        precipitacion_mm: Number(rainHour.toFixed(1)),
        temperatura_c: Number(
          (hourly.temperature_2m[idx] || 0).toFixed(1)
        ),
        humedad_relativa: Math.round(
          hourly.relative_humidity_2m[idx] || 0
        ),
        viento_kmh: Number(
          (hourly.wind_speed_10m[idx] || 0).toFixed(1)
        )
      };
    });

  const pronostico72h = [
    {
      dia: 'Hoy',
      nivel: nivelFinal,
      color_hex: semaforoDef[nivelFinal].color_hex,
      nivel_nombre: semaforoDef[nivelFinal].nombre,
      resumen: vectores[vectorDominanteKey].magnitud,
      temp_min: Math.round(daily.temperature_2m_min[0] || 12),
      temp_max: Math.round(daily.temperature_2m_max[0] || 22),
      precip_mm: Number(
        daily.precipitation_sum[0] || 0
      ).toFixed(1)
    },
    {
      dia: 'Mañana',
      nivel:
        (daily.precipitation_sum[1] || 0) > 45
          ? 3
          : (daily.precipitation_sum[1] || 0) > 25
            ? 2
            : 1,
      color_hex:
        (daily.precipitation_sum[1] || 0) > 45
          ? '#F97316'
          : (daily.precipitation_sum[1] || 0) > 25
            ? '#F59E0B'
            : '#10B981',
      nivel_nombre:
        (daily.precipitation_sum[1] || 0) > 45
          ? 'ALTO'
          : (daily.precipitation_sum[1] || 0) > 25
            ? 'MEDIO'
            : 'SIN RIESGO',
      resumen:
        (daily.precipitation_sum[1] || 0) > 25
          ? `Lluvia pronosticada ${daily.precipitation_sum[1].toFixed(1)} mm`
          : 'Condiciones estables',
      temp_min: Math.round(
        daily.temperature_2m_min[1] || 12
      ),
      temp_max: Math.round(
        daily.temperature_2m_max[1] || 22
      ),
      precip_mm: Number(
        daily.precipitation_sum[1] || 0
      ).toFixed(1)
    },
    {
      dia: 'Pasado Mañana',
      nivel:
        (daily.precipitation_sum[2] || 0) > 45
          ? 3
          : (daily.precipitation_sum[2] || 0) > 25
            ? 2
            : 1,
      color_hex:
        (daily.precipitation_sum[2] || 0) > 45
          ? '#F97316'
          : (daily.precipitation_sum[2] || 0) > 25
            ? '#F59E0B'
            : '#10B981',
      nivel_nombre:
        (daily.precipitation_sum[2] || 0) > 45
          ? 'ALTO'
          : (daily.precipitation_sum[2] || 0) > 25
            ? 'MEDIO'
            : 'SIN RIESGO',
      resumen:
        (daily.precipitation_sum[2] || 0) > 25
          ? `Lluvia pronosticada ${daily.precipitation_sum[2].toFixed(1)} mm`
          : 'Condiciones estables',
      temp_min: Math.round(
        daily.temperature_2m_min[2] || 12
      ),
      temp_max: Math.round(
        daily.temperature_2m_max[2] || 22
      ),
      precip_mm: Number(
        daily.precipitation_sum[2] || 0
      ).toFixed(1)
    }
  ];

  const pCenso = poblacion_censo || 5000;
  const cupoAlbergue = Math.round(pCenso * 0.03);
  const racionesComedor = cupoAlbergue * 3;
  const aguaLitros72h = cupoAlbergue * 6;

  return {
    evaluacion: {
      nivel_final: nivelFinal,
      nivel_nombre: semaforoDef[nivelFinal].nombre,
      color_hex: semaforoDef[nivelFinal].color_hex,
      vector_dominante: vectores[vectorDominanteKey].nombre,
      vector_dominante_key: vectorDominanteKey,
      magnitud_principal: vectores[vectorDominanteKey].magnitud,
      sinergias_activas: sinergiasActivas,
      histeresis_aplicada: histeresisAplicada,
      accion_corta: semaforoDef[nivelFinal].accion_corta,
      protocolo_comunitario: semaforoDef[nivelFinal].protocolo_comunitario,
      protocolo_caritas: semaforoDef[nivelFinal].protocolo_caritas,
      vectores,
      evolucion_horaria: evolucionHoraria,
      temporalidad: {
        ventana_impacto:
          nivelFinal === 1
            ? 'Condiciones estables'
            : 'Impacto Táctico',
        distancia_temporal_texto:
          nivelFinal === 1
            ? 'Sin amenaza activa en las próximas 48h'
            : `Pico estimado: ${horaPicoReal}`,
        hora_pico_estimada: horaPicoReal,
        horas_disponibles_preparacion:
          nivelFinal === 1
            ? 48
            : 4,
        pronostico_72h: pronostico72h
      },
      logistica_caritas: {
        poblacion_atendida: pCenso,
        capacidad_albergue_estimada: cupoAlbergue,
        raciones_diarias_comedor: racionesComedor,
        reserva_agua_litros: aguaLitros72h
      }
    },
    nivelPropuesto
  };
}

async function main() {
  const startTime = Date.now();

  console.log(`\n========================================================================`);
  console.log(`🌊 SatRC v1.0 — SISTEMA DE ALERTA TEMPRANA Y RIESGOS CLIMÁTICOS`);
  console.log(`⛪ Cáritas Pastoral Social • Arquidiócesis de Tulancingo`);
  console.log(`========================================================================`);
  console.log(`Procesando ${poblaciones.length} poblaciones en 10 zonas operativas...`);

  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  const [smnRes, noaaRes] = await Promise.all([
    fetchSMNNativo(),
    fetchNOAACyclones()
  ]);

  console.log(
    `🛰️ Validación SMN/CONAGUA: ${smnRes.status} | NOAA NHC: ${noaaRes.status}`
  );

  const chunks = chunkArray(poblaciones, 12);

  console.log(
    `📡 Consultando ${chunks.length} lotes ligeros en Ensamble ECMWF+GFS+ICON...`
  );
  
  let allWeather = [];

  for (let i = 0; i < chunks.length; i += 3) {
    const batchGroup = chunks.slice(i, i + 3);

    const groupResults = await Promise.all(
      batchGroup.map(chunk =>
        fetchOpenMeteoBatchWithRetry(chunk)
      )
    );

    allWeather = allWeather.concat(
      groupResults.flat()
    );

    if (i + 3 < chunks.length) {
      await new Promise(r => setTimeout(r, 350));
    }
  }

  const cuencasLluviaMax = {};

  poblaciones.forEach((p, idx) => {
    const w = allWeather[idx];

    const rain24 =
      w.hourly.precipitation
        .slice(0, 24)
        .reduce((a, b) => a + (b || 0), 0) ||
      (w.daily.precipitation_sum[0] || 0);

    const cuencaId =
      p.cuenca_hidrologica_id ||
      p.zona_nombre;

    if (p.posicion_cuenca === 'alta') {
      cuencasLluviaMax[cuencaId] =
        Math.max(
          cuencasLluviaMax[cuencaId] || 0,
          rain24
        );
    }
  });

  const detallePoblaciones = {};
  const newHistory = {};
  const resumenZonasMap = {};

  poblaciones.forEach(p => {
    if (!resumenZonasMap[p.zona_id]) {
      resumenZonasMap[p.zona_id] = {
        zona_id: p.zona_id,
        nucleo_territorial: p.zona_nombre,
        nivel_maximo: 1,
        color_maximo_hex:
          thresholds.triaje_niveles[0].color_hex,
        total_poblaciones: 0,
        poblaciones_en_alerta: 0,
        poblacion_total_zona: 0,
        poblacion_en_riesgo: 0,
        lista_poblaciones_ids: []
      };
    }

    resumenZonasMap[p.zona_id].total_poblaciones++;

    resumenZonasMap[p.zona_id].poblacion_total_zona +=
      (p.poblacion_censo || 0);

    resumenZonasMap[p.zona_id].lista_poblaciones_ids.push(
      p.id
    );
  });

  const alertaPrioritaria = [];

  poblaciones.forEach((poblacion, index) => {
    const wData = allWeather[index];

    const cuencaId =
      poblacion.cuenca_hidrologica_id ||
      poblacion.zona_nombre;

    const upstreamRain =
      cuencasLluviaMax[cuencaId] || 0;

    const prevHist =
      history[poblacion.id];
    
    const {
      evaluacion,
      nivelPropuesto
    } = evaluateVectorPoblacion(
      poblacion,
      wData,
      prevHist,
      upstreamRain
    );

    detallePoblaciones[poblacion.id] = {
      id: poblacion.id,
      nombre: poblacion.nombre,
      municipio: poblacion.municipio,
      estado: poblacion.estado,
      zona_id: poblacion.zona_id,
      zona_nombre: poblacion.zona_nombre,
      poblacion_censo: poblacion.poblacion_censo,
      coordenadas: poblacion.coordenadas,
      evaluacion
    };

    const pastLevels =
      prevHist?.ultimos_niveles || [];

    newHistory[poblacion.id] = {
      ultimos_niveles: [
        ...pastLevels.slice(-5),
        nivelPropuesto
      ],
      nivel_actual: evaluacion.nivel_final,
      updated_at: new Date().toISOString()
    };

    if (evaluacion.nivel_final >= 2) {
      alertaPrioritaria.push({
        id: poblacion.id,
        nombre: poblacion.nombre,
        municipio: poblacion.municipio,
        estado: poblacion.estado,
        zona_id: poblacion.zona_id,
        zona_nombre: poblacion.zona_nombre,
        poblacion_censo: poblacion.poblacion_censo,
        nivel: evaluacion.nivel_final,
        nivel_nombre: evaluacion.nivel_nombre,
        color_hex: evaluacion.color_hex,
        vector_dominante: evaluacion.vector_dominante,
        magnitud: evaluacion.magnitud_principal,
        distancia_temporal:
          evaluacion.temporalidad.distancia_temporal_texto,
        hora_pico:
          evaluacion.temporalidad.hora_pico_estimada,
        accion_inmediata:
          evaluacion.accion_corta
      });
    }

    const z =
      resumenZonasMap[poblacion.zona_id];

    if (
      evaluacion.nivel_final >
      z.nivel_maximo
    ) {
      z.nivel_maximo =
        evaluacion.nivel_final;

      z.color_maximo_hex =
        evaluacion.color_hex;
    }

    if (evaluacion.nivel_final >= 2) {
      z.poblaciones_en_alerta++;

      z.poblacion_en_riesgo +=
        (poblacion.poblacion_censo || 0);
    }
  });

  alertaPrioritaria.sort(
    (a, b) =>
      b.nivel - a.nivel ||
      b.poblacion_censo - a.poblacion_censo
  );

  const payload = {
    meta: {
      sistema:
        "SatRC — Sistema de Alerta Temprana y Riesgos Climáticos",
      version: "1.0",
      institucion:
        "Cáritas Pastoral Social • Arquidiócesis de Tulancingo",
      aviso_legal:
        "Consulte a sus autoridades locales y medios oficiales para más información.",
      timestamp_utc:
        new Date().toISOString(),
      timestamp_local:
        new Date().toLocaleString(
          'es-MX',
          {
            timeZone: 'America/Mexico_City'
          }
        ),
      total_poblaciones:
        poblaciones.length,
      poblacion_total_monitoreada:
        poblaciones.reduce(
          (acc, p) =>
            acc + (p.poblacion_censo || 0),
          0
        ),
      poblacion_en_riesgo_total:
        alertaPrioritaria.reduce(
          (acc, p) =>
            acc + (p.poblacion_censo || 0),
          0
        ),
      estado_fuentes: {
        open_meteo_ecmwf: 'ok',
        noaa_gfs: 'ok',
        dwd_icon: 'ok',
        smn_conagua: smnRes.status,
        noaa_nhc: noaaRes.status
      }
    },

    alerta_prioritaria:
      alertaPrioritaria,

    resumen_zonas:
      Object.values(resumenZonasMap)
        .sort(
          (a, b) =>
            a.zona_id - b.zona_id
        ),

    detalle_poblaciones:
      detallePoblaciones
  };

  fs.writeFileSync(
    path.join(
      DATA_DIR,
      'latest-risk.json'
    ),
    JSON.stringify(
      payload,
      null,
      2
    ),
    'utf8'
  );

  fs.writeFileSync(
    path.join(
      PUBLIC_DATA_DIR,
      'latest-risk.json'
    ),
    JSON.stringify(
      payload,
      null,
      2
    ),
    'utf8'
  );

  fs.writeFileSync(
    historyPath,
    JSON.stringify(
      newHistory,
      null,
      2
    ),
    'utf8'
  );

  const elapsed =
    ((Date.now() - startTime) / 1000)
      .toFixed(2);

  console.log(
    `\n✅ SatRC v1.0 Triaje completado con éxito en ${elapsed} segundos.`
  );

  console.log(
    `👥 Cobertura: ${payload.meta.poblacion_total_monitoreada.toLocaleString()} habitantes`
  );

  console.log(
    `🚨 Localidades en Triaje Activo (Nivel >= 2): ${alertaPrioritaria.length}`
  );

  console.log(
    `========================================================================\n`
  );
}

main().catch(err => {
  console.error(
    `❌ Error en motor SatRC:`,
    err
  );

  process.exit(1);
});