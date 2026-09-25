import fs from 'fs';
import path from 'path';
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

// 1. Ingesta Open-Meteo (Ensamble ECMWF + NOAA GFS)
async function fetchOpenMeteoBatch(items) {
  const lats = items.map(p => p.coordenadas.latitud).join(',');
  const lons = items.map(p => p.coordenadas.longitud).join(',');
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&hourly=precipitation,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,cape,wind_gusts_10m,surface_pressure,dew_point_2m,temperature_2m,relative_humidity_2m,wind_speed_10m,total_column_integrated_water_vapour,cloud_cover` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,relative_humidity_2m_min,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

// 2. Conector SMN / CONAGUA Optimizado (Cabeceras completas y 10s de espera)
async function fetchSMNValidation() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        'Referer': 'https://smn.conagua.gob.mx/',
        'Origin': 'https://smn.conagua.gob.mx'
      }
    });
    clearTimeout(timeout);
    if (res.ok) return { status: 'ok', data: await res.json() };
    return { status: 'degradado', data: null };
  } catch (e) {
    return { status: 'degradado', data: null };
  }
}

// 3. Conector Oficial CENAPRED / SMN (Boletines de Alerta de Tiempo Severo)
async function fetchCENAPREDSMNAlertas() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://smn.conagua.gob.mx/tools/GUI/webservices/?method=3', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', avisos: data };
    }
    return { status: 'sin_avisos_activos', avisos: [] };
  } catch (e) {
    return { status: 'sin_avisos_activos', avisos: [] };
  }
}

// 4. Ingesta NOAA (Centro Nacional de Huracanes NHC)
async function fetchNOAACyclones() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
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
  const { factores_riesgo, poblacion_censo, coordenadas, altitud_msnm, posicion_cuenca, tc_horas, litologia, tipo_interfaz } = poblacion;
  const { hourly, daily } = weatherData;
  const altitud = coordenadas?.altitud_msnm || altitud_msnm || 1500;

  const lluviaLocal24h = hourly.precipitation.slice(0, 24).reduce((a, b) => a + (b || 0), 0) || (daily.precipitation_sum[0] || 0);
  const aporteAguasArriba = (posicion_cuenca === 'baja' && upstreamRainMax > 45) ? (upstreamRainMax * 0.40) : 0;
  const precip24h = lluviaLocal24h + aporteAguasArriba;
  const precip48h = hourly.precipitation.slice(0, 48).reduce((a, b) => a + (b || 0), 0) || ((daily.precipitation_sum[0] || 0) + (daily.precipitation_sum[1] || 0));
  const precip7d = daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
  
  let maxHourlyRain = 0;
  let rainPeakHour = -1;
  hourly.precipitation.slice(0, 24).forEach((p, idx) => {
    if ((p || 0) > maxHourlyRain) {
      maxHourlyRain = p;
      rainPeakHour = idx;
    }
  });

  const soil07 = Math.max(...(hourly.soil_moisture_0_to_7cm.slice(0, 24).map(v => v || 0)));
  const soil728 = Math.max(...(hourly.soil_moisture_7_to_28cm.slice(0, 24).map(v => v || 0)));

  const tempMin = daily.temperature_2m_min[0] ?? 12;
  const tempMax = daily.temperature_2m_max[0] ?? 22;
  const humidityMin = daily.relative_humidity_2m_min[0] ?? 50;
  const windSpeedMax = daily.wind_speed_10m_max[0] ?? 10;
  const windGustsMax = Math.max(...(hourly.wind_gusts_10m.slice(0, 24).map(v => v || 0)));
  const capeMax = Math.max(...(hourly.cape.slice(0, 24).map(v => v || 0)));
  const pwMax = Math.max(...((hourly.total_column_integrated_water_vapour || []).slice(0, 24).map(v => v || 0)));
  const deltaPressure24h = Math.max(0, (hourly.surface_pressure[0] || 1013) - (hourly.surface_pressure[23] || 1013));

  const heatIndexMax = calculateHeatIndex(tempMax, humidityMin);
  const fosbergIndex = calculateFosbergFFWI(tempMax, humidityMin, windSpeedMax);

  let diasSinLluvia = 0;
  for (const p of daily.precipitation_sum) {
    if ((p || 0) < 1.0) diasSinLluvia++;
    else break;
  }

  const horasBajoCero = hourly.temperature_2m.slice(0, 24).filter(t => (t || 10) < 0).length;
  const dewPointMin = Math.min(...(hourly.dew_point_2m.slice(0, 24).map(v => v ?? 10)));
  const cloudCoverAvg = (hourly.cloud_cover.slice(0, 8).reduce((a, b) => a + (b || 0), 0) / 8) || 50;

  const vectores = {};
  const horasPicoVectores = {};

  // V1: INUNDACIÓN
  const kCuenca = (tipo_interfaz === 'urbana') ? 0.85 : (factores_riesgo.cuenca_inundable ? 0.75 : 1.00);
  let nV1 = 1;
  let magV1 = 'Condiciones normales de precipitación';
  if (precip24h >= 120 * kCuenca || maxHourlyRain >= 40 || precip48h >= 180 * kCuenca) {
    nV1 = 4;
    magV1 = `Lluvia torrencial crítica: 24h=${precip24h.toFixed(1)}mm, Pico=${maxHourlyRain.toFixed(1)}mm/h`;
  } else if (precip24h >= 75 * kCuenca || maxHourlyRain >= 25 || (precip48h >= 120 * kCuenca && maxHourlyRain >= 15)) {
    nV1 = 3;
    magV1 = `Lluvia torrencial severa: 24h=${precip24h.toFixed(1)}mm, Pico=${maxHourlyRain.toFixed(1)}mm/h`;
  } else if ((precip24h >= 45 * kCuenca && soil07 >= 0.38) || precip24h >= 60 * kCuenca) {
    nV1 = 2;
    magV1 = `Precipitación moderada acumulada: 24h=${precip24h.toFixed(1)}mm`;
  }
  vectores.v1_inundacion = { nivel: nV1, magnitud: magV1, nombre: 'Inundaciones / Tormentas Torrenciales' };

  if (maxHourlyRain >= 5 && rainPeakHour >= 0) {
    const tc = tc_horas || 2.0;
    const horaCrecida = Math.round((rainPeakHour + tc) % 24);
    horasPicoVectores.v1_inundacion = `${horaCrecida}:00 a ${(horaCrecida + 3) % 24}:00 hrs (Retardo: +${tc}h)`;
  } else {
    horasPicoVectores.v1_inundacion = null;
  }

  // V2: HELADAS
  const offH = (altitud > 2400 || factores_riesgo.exposicion_heladas) ? 1.0 : 0.0;
  let nV2 = 1;
  let magV2 = `T_mín ${tempMin.toFixed(1)}°C (Sin helada)`;
  if ((tempMin < -2.0 + offH && windSpeedMax >= 20) || horasBajoCero >= 4) {
    nV2 = 4;
    magV2 = `Congelación severa / Wind Chill: T_mín=${tempMin.toFixed(1)}°C (${horasBajoCero}h bajo cero)`;
  } else if (tempMin <= 0.0 + offH || horasBajoCero >= 3) {
    nV2 = 3;
    magV2 = `Helada negra: T_mín=${tempMin.toFixed(1)}°C (${horasBajoCero}h bajo cero)`;
  } else if (tempMin <= 3.0 + offH && (dewPointMin <= -1.5 || (windSpeedMax < 6 && cloudCoverAvg < 30))) {
    nV2 = 2;
    magV2 = `Riesgo de escarcha / helada blanca: T_mín=${tempMin.toFixed(1)}°C`;
  }
  vectores.v2_heladas = { nivel: nV2, magnitud: magV2, nombre: 'Bajas Temperaturas / Heladas' };
  horasPicoVectores.v2_heladas = (nV2 > 1) ? '05:00 a 07:30 hrs' : null;

  // V3: CALOR
  const esZonaBaja = altitud < 1000;
  const cfgCalor = esZonaBaja ? thresholds.vectores_climaticos.v3_calor.zonas_bajas : thresholds.vectores_climaticos.v3_calor.zonas_altas;
  let nV3 = 1;
  let magV3 = `T_máx ${tempMax.toFixed(1)}°C (Rango térmico normal)`;
  if (tempMax >= cfgCalor.t_max_critica || heatIndexMax >= cfgCalor.heat_index_critico) {
    nV3 = 4;
    magV3 = `Calor extremo crítico: T_máx=${tempMax.toFixed(1)}°C, Sensación=${heatIndexMax.toFixed(1)}°C`;
  } else if (tempMax >= cfgCalor.t_max_alerta || heatIndexMax >= cfgCalor.heat_index_alerta || (esZonaBaja && tempMin >= cfgCalor.t_min_noche_tropical)) {
    nV3 = 3;
    magV3 = `Onda de calor severa: T_máx=${tempMax.toFixed(1)}°C, Sensación=${heatIndexMax.toFixed(1)}°C`;
  } else if (tempMax >= cfgCalor.t_max_base || heatIndexMax >= cfgCalor.heat_index_base) {
    nV3 = 2;
    magV3 = `Ambiente caluroso / Bochorno: T_máx=${tempMax.toFixed(1)}°C, Sensación=${heatIndexMax.toFixed(1)}°C`;
  }
  vectores.v3_calor = { nivel: nV3, magnitud: magV3, nombre: 'Ondas de Calor' };
  horasPicoVectores.v3_calor = (nV3 > 1) ? '13:30 a 16:30 hrs' : null;

  // V4: LADERAS
  const claveLitologia = `${factores_riesgo.perfil_pendiente}_${litologia === 'arcilla' ? 'arcilla' : 'roca'}`;
  const multLit = thresholds.vectores_climaticos.v4_laderas.multiplicadores_litologia[claveLitologia] || 1.15;
  let nV4 = 1;
  let magV4 = 'Laderas estables';
  if (factores_riesgo.perfil_pendiente !== 'baja' || (litologia === 'arcilla' && precip24h >= 100)) {
    if ((precip24h >= 130 * multLit && soil728 >= 0.36) || (precip7d >= 320 && soil728 >= 0.38)) {
      nV4 = 4;
      magV4 = `Saturación crítica de taludes: 24h=${precip24h.toFixed(1)}mm, Acum 7d=${precip7d.toFixed(1)}mm`;
    } else if ((precip24h >= 75 * multLit && precip7d >= 180) || (maxHourlyRain >= 30 && factores_riesgo.perfil_pendiente === 'alta')) {
      nV4 = 3;
      magV4 = `Alta inestabilidad en laderas: 24h=${precip24h.toFixed(1)}mm, Acum 7d=${precip7d.toFixed(1)}mm`;
    } else if (precip24h >= 50 * multLit && soil728 >= 0.34) {
      nV4 = 2;
      magV4 = `Reblandecimiento de talud: 24h=${precip24h.toFixed(1)}mm`;
    }
  }
  vectores.v4_laderas = { nivel: nV4, magnitud: magV4, nombre: 'Inestabilidad de Laderas' };
  horasPicoVectores.v4_laderas = (maxHourlyRain >= 5 && rainPeakHour >= 0 && nV4 > 1) ? `${rainPeakHour}:00 a ${(rainPeakHour + 3) % 24}:00 hrs` : null;

  // V5: INCENDIOS
  let nV5 = 1;
  let magV5 = 'Bajo riesgo de fuego';
  const esWUI = tipo_interfaz === 'wui';
  const esCombustibleAlto = factores_riesgo.combustible_forestal === 'alto';
  if ((humidityMin < 20 && windSpeedMax > 40 && tempMax >= 33 && diasSinLluvia >= 14 && fosbergIndex >= 70 && esCombustibleAlto) || (fosbergIndex >= 80 && diasSinLluvia >= 10)) {
    nV5 = 4;
    magV5 = `Condición extrema de propagación: FFWI=${fosbergIndex.toFixed(0)}, HR=${humidityMin}%, Viento=${windSpeedMax.toFixed(1)}km/h`;
  } else if ((humidityMin < 30 && windSpeedMax > 30 && tempMax >= 30 && diasSinLluvia >= 8 && fosbergIndex >= 50 && factores_riesgo.combustible_forestal !== 'bajo') || (esWUI && fosbergIndex >= 45 && diasSinLluvia >= 7)) {
    nV5 = 3;
    magV5 = `Regla 30-30-30 activa / WUI: FFWI=${fosbergIndex.toFixed(0)}, HR=${humidityMin}%, Días secos=${diasSinLluvia}`;
  } else if (humidityMin < 35 && windSpeedMax > 25 && tempMax >= 28 && diasSinLluvia >= 5 && fosbergIndex >= 35) {
    nV5 = 2;
    magV5 = `Sequedad ambiental y viento: FFWI=${fosbergIndex.toFixed(0)}, HR=${humidityMin}%`;
  }
  vectores.v5_incendios = { nivel: nV5, magnitud: magV5, nombre: 'Incendios Forestales y de Malezas' };
  horasPicoVectores.v5_incendios = (nV5 > 1) ? '12:30 a 17:00 hrs' : null;

  // V6: TORMENTAS
  let nV6 = 1;
  let magV6 = 'Sin inestabilidad convectiva severa';
  if (capeMax >= 3000 && maxHourlyRain >= 35 && windGustsMax >= 75 && pwMax >= 40) {
    nV6 = 4;
    magV6 = `Supercelda severa / Granizo destructivo: CAPE=${capeMax.toFixed(0)} J/kg, Ráfagas=${windGustsMax.toFixed(1)}km/h`;
  } else if (capeMax >= 2000 && maxHourlyRain >= 22 && windGustsMax >= 55 && pwMax >= 35) {
    nV6 = 3;
    magV6 = `Tormenta severa con granizo: CAPE=${capeMax.toFixed(0)} J/kg, Lluvia=${maxHourlyRain.toFixed(1)}mm/h`;
  } else if (capeMax >= 1200 && maxHourlyRain >= 12 && pwMax >= 30) {
    nV6 = 2;
    magV6 = `Chubascos y actividad eléctrica: CAPE=${capeMax.toFixed(0)} J/kg`;
  }
  vectores.v6_tormentas = { nivel: nV6, magnitud: magV6, nombre: 'Tormentas Eléctricas / Granizo' };
  horasPicoVectores.v6_tormentas = (nV6 > 1) ? ((altitud > 1500) ? '14:30 a 18:30 hrs' : '17:00 a 21:00 hrs') : null;

  // V7: CICLONES
  let nV7 = 1;
  let magV7 = 'Sin influencia ciclónica';
  if (factores_riesgo.sensibilidad_ciclones) {
    if (deltaPressure24h >= 13.0 && windSpeedMax >= 100) {
      nV7 = 4;
      magV7 = `Impacto ciclónico mayor: Caída presión=${deltaPressure24h.toFixed(1)}hPa/24h, Viento=${windSpeedMax.toFixed(1)}km/h`;
    } else if (deltaPressure24h >= 9.0 && windSpeedMax >= 75) {
      nV7 = 3;
      magV7 = `Bandas ciclónicas severas: Caída presión=${deltaPressure24h.toFixed(1)}hPa/24h`;
    } else if (deltaPressure24h >= 6.0 || windSpeedMax >= 50) {
      nV7 = 2;
      magV7 = `Perturbación tropical en aproximación: Caída presión=${deltaPressure24h.toFixed(1)}hPa/24h`;
    }
  }
  vectores.v7_ciclones = { nivel: nV7, magnitud: magV7, nombre: 'Ciclones / Huracanes' };
  horasPicoVectores.v7_ciclones = (nV7 > 1) ? 'Ventana de mínima presión barométrica' : null;

  // Evolución Horaria Profesional
  const evolucionHoraria = {
    v1_inundacion: [],
    v2_heladas: [],
    v3_calor: [],
    v4_laderas: [],
    v5_incendios: [],
    v6_tormentas: [],
    v7_ciclones: []
  };

  for (let h = 0; h < 24; h++) {
    const horaLabel = `${String(h).padStart(2, '0')}:00`;
    const pRain = hourly.precipitation[h] || 0;
    const tAir = hourly.temperature_2m[h] || 15;
    const rh = hourly.relative_humidity_2m[h] || 50;
    const wSpeed = hourly.wind_speed_10m[h] || 5;
    const wGust = hourly.wind_gusts_10m[h] || 10;
    const cape = hourly.cape[h] || 0;
    const hIndex = calculateHeatIndex(tAir, rh);

    let nH1 = 1;
    let consejo1 = 'Sin precipitación: Favorable para actividades a la intemperie.';
    if (pRain >= 25) { nH1 = 3; consejo1 = 'Precipitación torrencial severa: Resguardo total en construcciones firmes.'; }
    else if (pRain >= 10) { nH1 = 2; consejo1 = 'Chubasco moderado: Asegurar enseres exteriores y techumbres ligeras.'; }
    else if (pRain >= 1) { nH1 = 1; consejo1 = 'Precipitación ligera: Monitoreo visual de cielo.'; }
    evolucionHoraria.v1_inundacion.push({ hora: horaLabel, valor: `${pRain.toFixed(1)} mm/h`, nivel: nH1, consejo: consejo1 });

    let nH2 = 1;
    let consejo2 = 'Confort térmico dentro del promedio estacional.';
    if (tAir <= -2) { nH2 = 4; consejo2 = 'Congelación severa: Alto riesgo en carreteras por pavimento resbaladizo.'; }
    else if (tAir <= 0) { nH2 = 3; consejo2 = 'Helada activa: Abrigarse adecuadamente y resguardar personas vulnerables.'; }
    else if (tAir <= 3) { nH2 = 2; consejo2 = 'Descenso térmico marcado: Proteger tomas de agua y mascotas.'; }
    evolucionHoraria.v2_heladas.push({ hora: horaLabel, valor: `${tAir.toFixed(1)} °C`, nivel: nH2, consejo: consejo2 });

    let nH3 = 1;
    let consejo3 = 'Temperatura ambiental en rango seguro.';
    if (tAir >= 38 || hIndex >= 41) { nH3 = 3; consejo3 = 'Estrés térmico extremo: Alto riesgo de insolación y golpe de calor.'; }
    else if (tAir >= 33 || hIndex >= 36) { nH3 = 2; consejo3 = 'Radiación solar intensa: Hidratación continua y evitar exposición directa.'; }
    evolucionHoraria.v3_calor.push({ hora: horaLabel, valor: `${tAir.toFixed(1)} °C (Sensación: ${hIndex.toFixed(1)}°C)`, nivel: nH3, consejo: consejo3 });

    evolucionHoraria.v4_laderas.push({
      hora: horaLabel,
      valor: `Suelo profundo: ${soil728.toFixed(2)} m³/m³ • Lluvia horaria: ${pRain.toFixed(1)}mm`,
      nivel: nH1 >= 3 ? 3 : (nH1 === 2 ? 2 : 1),
      consejo: nH1 >= 2 ? 'Reblandecimiento de talud: Vigilancia visual de escurrimientos.' : 'Estabilidad geotécnica nominal.'
    });

    const ffwiH = calculateFosbergFFWI(tAir, rh, wSpeed);
    let nH5 = 1;
    let consejo5 = 'Índice de inflamabilidad bajo.';
    if (ffwiH >= 50) { nH5 = 3; consejo5 = 'Atmósfera desecante y viento: Prohibición absoluta de fuego a cielo abierto.'; }
    else if (ffwiH >= 35) { nH5 = 2; consejo5 = 'Sequedad moderada: Extremar precauciones en pastizales.'; }
    evolucionHoraria.v5_incendios.push({ hora: horaLabel, valor: `FFWI: ${ffwiH.toFixed(0)} (HR: ${rh.toFixed(0)}%, Viento: ${wSpeed.toFixed(0)}km/h)`, nivel: nH5, consejo: consejo5 });

    let nH6 = 1;
    let consejo6 = 'Atmósfera estable.';
    if (cape >= 2000 && pRain >= 15) { nH6 = 3; consejo6 = 'Tormenta eléctrica severa con granizo: Desconectar energía y resguardo bajo losa.'; }
    else if (cape >= 1200) { nH6 = 2; consejo6 = 'Inestabilidad convectiva: Probabilidad de chubascos con actividad eléctrica.'; }
    evolucionHoraria.v6_tormentas.push({ hora: horaLabel, valor: `CAPE: ${cape.toFixed(0)} J/kg • Ráfagas: ${wGust.toFixed(0)} km/h`, nivel: nH6, consejo: consejo6 });

    evolucionHoraria.v7_ciclones.push({ hora: horaLabel, valor: `Viento: ${wSpeed.toFixed(0)} km/h • Ráfagas: ${wGust.toFixed(0)} km/h`, nivel: 1, consejo: 'Sin perturbación ciclónica activa en la región.' });
  }

  // Agregación
  let nivelBase = 1;
  let vectorDominanteKey = 'v1_inundacion';

  for (const [key, vec] of Object.entries(vectores)) {
    if (vec.nivel > nivelBase) {
      nivelBase = vec.nivel;
      vectorDominanteKey = key;
    }
  }

  const sinergiasActivas = [];
  let bonoSinergia = 0;
  for (const sin of thresholds.sinergias) {
    const nA = vectores[sin.vector_a]?.nivel || 1;
    const nB = vectores[sin.vector_b]?.nivel || 1;
    if (nA >= sin.nivel_minimo && nB >= sin.nivel_minimo) {
      bonoSinergia += sin.incremento;
      sinergiasActivas.push(sin);
    }
  }

  const nivelPropuesto = Math.min(nivelBase + bonoSinergia, 4);

  // Histéresis
  const pastLevels = prevHistory?.ultimos_niveles || [];
  let nivelFinal = nivelPropuesto;
  let histeresisAplicada = false;

  if (pastLevels.length > 0) {
    const ultimo = pastLevels[pastLevels.length - 1];
    if (nivelPropuesto > ultimo) {
      nivelFinal = nivelPropuesto;
    } else if (nivelPropuesto < ultimo) {
      const confirmados = pastLevels.filter(n => n <= nivelPropuesto).length;
      if (confirmados >= thresholds.reglas_histeresis.ciclos_descenso_requeridos) {
        nivelFinal = nivelPropuesto;
      } else {
        nivelFinal = ultimo;
        histeresisAplicada = true;
      }
    }
  }

  const semaforoDef = thresholds.triaje_niveles.find(t => t.nivel === nivelFinal) || thresholds.triaje_niveles[0];
  const horaPicoReal = horasPicoVectores[vectorDominanteKey] || (nivelFinal === 1 ? 'Sin horario crítico' : '14:00 a 18:00 hrs');

  // Pronóstico 72h
  const pronostico72h = [
    {
      dia: 'Hoy',
      nivel: nivelFinal,
      color_hex: semaforoDef.color_hex,
      nivel_nombre: semaforoDef.nombre,
      resumen: vectores[vectorDominanteKey].magnitud,
      temp_min: Math.round(daily.temperature_2m_min[0] || 12),
      temp_max: Math.round(daily.temperature_2m_max[0] || 22),
      precip_mm: Number(daily.precipitation_sum[0] || 0).toFixed(1)
    },
    {
      dia: 'Mañana',
      nivel: (daily.precipitation_sum[1] || 0) > 45 ? 3 : (daily.precipitation_sum[1] || 0) > 25 ? 2 : 1,
      color_hex: (daily.precipitation_sum[1] || 0) > 45 ? '#F97316' : (daily.precipitation_sum[1] || 0) > 25 ? '#F59E0B' : '#10B981',
      nivel_nombre: (daily.precipitation_sum[1] || 0) > 45 ? 'ALTO' : (daily.precipitation_sum[1] || 0) > 25 ? 'MEDIO' : 'SIN RIESGO',
      resumen: (daily.precipitation_sum[1] || 0) > 25 ? `Lluvia pronosticada ${daily.precipitation_sum[1].toFixed(1)} mm` : 'Condiciones estables',
      temp_min: Math.round(daily.temperature_2m_min[1] || 12),
      temp_max: Math.round(daily.temperature_2m_max[1] || 22),
      precip_mm: Number(daily.precipitation_sum[1] || 0).toFixed(1)
    },
    {
      dia: 'Pasado Mañana',
      nivel: (daily.precipitation_sum[2] || 0) > 45 ? 3 : (daily.precipitation_sum[2] || 0) > 25 ? 2 : 1,
      color_hex: (daily.precipitation_sum[2] || 0) > 45 ? '#F97316' : (daily.precipitation_sum[2] || 0) > 25 ? '#F59E0B' : '#10B981',
      nivel_nombre: (daily.precipitation_sum[2] || 0) > 45 ? 'ALTO' : (daily.precipitation_sum[2] || 0) > 25 ? 'MEDIO' : 'SIN RIESGO',
      resumen: (daily.precipitation_sum[2] || 0) > 25 ? `Lluvia pronosticada ${daily.precipitation_sum[2].toFixed(1)} mm` : 'Condiciones estables',
      temp_min: Math.round(daily.temperature_2m_min[2] || 12),
      temp_max: Math.round(daily.temperature_2m_max[2] || 22),
      precip_mm: Number(daily.precipitation_sum[2] || 0).toFixed(1)
    }
  ];

  const pCenso = poblacion_censo || 5000;
  const cupoAlbergue = Math.round(pCenso * 0.03);
  const racionesComedor = cupoAlbergue * 3;
  const aguaLitros72h = cupoAlbergue * 6;

  return {
    evaluacion: {
      nivel_final: nivelFinal,
      nivel_nombre: semaforoDef.nombre,
      color_hex: semaforoDef.color_hex,
      vector_dominante: vectores[vectorDominanteKey].nombre,
      vector_dominante_key: vectorDominanteKey,
      magnitud_principal: vectores[vectorDominanteKey].magnitud,
      sinergias_activas: sinergiasActivas,
      histeresis_aplicada: histeresisAplicada,
      accion_corta: semaforoDef.accion_corta,
      protocolo_comunitario: semaforoDef.protocolo_comunitario,
      protocolo_caritas: semaforoDef.protocolo_caritas,
      vectores,
      evolucion_horaria: evolucionHoraria,
      temporalidad: {
        ventana_impacto: nivelFinal === 1 ? 'Condiciones estables' : 'Impacto Táctico',
        distancia_temporal_texto: nivelFinal === 1 ? 'Sin amenaza activa en las próximas 48h' : `Pico estimado: ${horaPicoReal}`,
        hora_pico_estimada: horaPicoReal,
        horas_disponibles_preparacion: nivelFinal === 1 ? 48 : 4,
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
  console.log(`\n========================================================================`);
  console.log(`🌊 SatRC v1.0 — SISTEMA DE ALERTA TEMPRANA Y RIESGOS CLIMÁTICOS`);
  console.log(`⛪ Cáritas Pastoral Social • Arquidiócesis de Tulancingo`);
  console.log(`========================================================================`);
  console.log(`Procesando 91 poblaciones en 10 zonas operativas...`);

  if (!fs.existsSync(PUBLIC_DATA_DIR)) fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

  // Ingesta paralela de 4 fuentes (Open-Meteo, SMN, CENAPRED Alertas, NOAA NHC)
  const [smnRes, cenapredRes, noaaRes] = await Promise.all([
    fetchSMNValidation(),
    fetchCENAPREDSMNAlertas(),
    fetchNOAACyclones()
  ]);

  const estadoSMNFinal = smnRes.status === 'ok' ? 'ok' : (cenapredRes.status === 'ok' ? 'ok (vía CENAPRED)' : 'degradado');
  console.log(`🛰️ Estado SMN/CONAGUA: ${estadoSMNFinal} | CENAPRED: ${cenapredRes.status} | NOAA NHC: ${noaaRes.status}`);

  const chunks = chunkArray(poblaciones, 25);
  let allWeather = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`📡 Consultando lote ${i + 1}/${chunks.length} en Ensamble ECMWF+GFS...`);
    const cData = await fetchOpenMeteoBatch(chunks[i]);
    allWeather = allWeather.concat(cData);
  }

  const cuencasLluviaMax = {};
  poblaciones.forEach((p, idx) => {
    const w = allWeather[idx];
    const rain24 = w.hourly.precipitation.slice(0, 24).reduce((a, b) => a + (b || 0), 0) || (w.daily.precipitation_sum[0] || 0);
    const cuencaId = p.cuenca_hidrologica_id || p.zona_nombre;
    if (p.posicion_cuenca === 'alta') {
      cuencasLluviaMax[cuencaId] = Math.max(cuencasLluviaMax[cuencaId] || 0, rain24);
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
        color_maximo_hex: thresholds.triaje_niveles[0].color_hex,
        total_poblaciones: 0,
        poblaciones_en_alerta: 0,
        poblacion_total_zona: 0,
        poblacion_en_riesgo: 0,
        lista_poblaciones_ids: []
      };
    }
    resumenZonasMap[p.zona_id].total_poblaciones++;
    resumenZonasMap[p.zona_id].poblacion_total_zona += (p.poblacion_censo || 0);
    resumenZonasMap[p.zona_id].lista_poblaciones_ids.push(p.id);
  });

  const alertaPrioritaria = [];

  poblaciones.forEach((poblacion, index) => {
    const wData = allWeather[index];
    const cuencaId = poblacion.cuenca_hidrologica_id || poblacion.zona_nombre;
    const upstreamRain = cuencasLluviaMax[cuencaId] || 0;
    const prevHist = history[poblacion.id];
    
    const { evaluacion, nivelPropuesto } = evaluateVectorPoblacion(poblacion, wData, prevHist, upstreamRain);

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

    const pastLevels = prevHist?.ultimos_niveles || [];
    newHistory[poblacion.id] = {
      ultimos_niveles: [...pastLevels.slice(-5), nivelPropuesto],
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
        distancia_temporal: evaluacion.temporalidad.distancia_temporal_texto,
        hora_pico: evaluacion.temporalidad.hora_pico_estimada,
        accion_inmediata: evaluacion.accion_corta
      });
    }

    const z = resumenZonasMap[poblacion.zona_id];
    if (evaluacion.nivel_final > z.nivel_maximo) {
      z.nivel_maximo = evaluacion.nivel_final;
      z.color_maximo_hex = evaluacion.color_hex;
    }
    if (evaluacion.nivel_final >= 2) {
      z.poblaciones_en_alerta++;
      z.poblacion_en_riesgo += (poblacion.poblacion_censo || 0);
    }
  });

  alertaPrioritaria.sort((a, b) => b.nivel - a.nivel || b.poblacion_censo - a.poblacion_censo);

  const payload = {
    meta: {
      sistema: "SatRC — Sistema de Alerta Temprana y Riesgos Climáticos",
      version: "1.0",
      institucion: "Cáritas Pastoral Social • Arquidiócesis de Tulancingo",
      aviso_legal: "Consulte a sus autoridades locales y medios oficiales para más información.",
      timestamp_utc: new Date().toISOString(),
      timestamp_local: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      total_poblaciones: poblaciones.length,
      poblacion_total_monitoreada: poblaciones.reduce((acc, p) => acc + (p.poblacion_censo || 0), 0),
      poblacion_en_riesgo_total: alertaPrioritaria.reduce((acc, p) => acc + (p.poblacion_censo || 0), 0),
      estado_fuentes: {
        open_meteo_ecmwf: 'ok',
        noaa_gfs: 'ok',
        smn_conagua: estadoSMNFinal,
        cenapred_alertas: cenapredRes.status,
        noaa_nhc: noaaRes.status
      }
    },
    alerta_prioritaria: alertaPrioritaria,
    resumen_zonas: Object.values(resumenZonasMap).sort((a, b) => a.zona_id - b.zona_id),
    detalle_poblaciones: detallePoblaciones
  };

  fs.writeFileSync(path.join(DATA_DIR, 'latest-risk.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'latest-risk.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(historyPath, JSON.stringify(newHistory, null, 2), 'utf8');

  console.log(`\n✅ SatRC v1.0 Triaje completado con éxito.`);
  console.log(`👥 Cobertura: ${payload.meta.poblacion_total_monitoreada.toLocaleString()} habitantes`);
  console.log(`🚨 Localidades en Triaje Activo (Nivel >= 2): ${alertaPrioritaria.length}`);
  console.log(`========================================================================\n`);
}

main().catch(err => {
  console.error(`❌ Error en motor SatRC:`, err);
  process.exit(1);
});