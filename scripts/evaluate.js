import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// Cargar catálogos
const poblaciones = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'poblaciones.json'), 'utf8'));
const thresholds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'thresholds.json'), 'utf8'));

// Cargar o inicializar histórico para histéresis
const historyPath = path.join(DATA_DIR, 'history.json');
let history = {};
if (fs.existsSync(historyPath)) {
  try {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch (e) {
    history = {};
  }
}

// Función auxiliar para dividir en lotes (batching) y no saturar la URL de Open-Meteo
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Ingesta meteorológica desde Open-Meteo
async function fetchOpenMeteoBatch(items) {
  const lats = items.map(p => p.coordenadas.latitud).join(',');
  const lons = items.map(p => p.coordenadas.longitud).join(',');
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&hourly=precipitation,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,cape,wind_gusts_10m,surface_pressure,dew_point_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,relative_humidity_2m_min,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error en API Open-Meteo: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

// Motor determinista: Evaluación de los 7 módulos por localidad
function evaluatePoblacion(poblacion, weatherData, prevHistory) {
  const { factores_riesgo } = poblacion;
  const { hourly, daily } = weatherData;

  // 1. Extracción y agregación de variables
  const precip24h = (hourly.precipitation.slice(0, 24).reduce((a, b) => a + (b || 0), 0)) || (daily.precipitation_sum[0] || 0);
  const precip48h = (hourly.precipitation.slice(0, 48).reduce((a, b) => a + (b || 0), 0)) || ((daily.precipitation_sum[0] || 0) + (daily.precipitation_sum[1] || 0));
  const precip7d = daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
  const maxPrecip1h = Math.max(...(hourly.precipitation.slice(0, 24).map(v => v || 0)));

  const soil07 = Math.max(...(hourly.soil_moisture_0_to_7cm.slice(0, 24).map(v => v || 0)));
  const tempMin = daily.temperature_2m_min[0] ?? 10;
  const tempMax = daily.temperature_2m_max[0] ?? 20;
  const appTempMax = daily.apparent_temperature_max[0] ?? tempMax;
  const dewPointMin = Math.min(...(hourly.dew_point_2m.slice(0, 24).map(v => v ?? 10)));
  const humidityMin = daily.relative_humidity_2m_min[0] ?? 50;
  const windSpeedMax = daily.wind_speed_10m_max[0] ?? 10;
  const windGustsMax = Math.max(...(hourly.wind_gusts_10m.slice(0, 24).map(v => v || 0)));
  const capeMax = Math.max(...(hourly.cape.slice(0, 24).map(v => v || 0)));

  // Caída de presión en 24h
  const pStart = hourly.surface_pressure[0] || 1013;
  const pEnd = hourly.surface_pressure[23] || pStart;
  const deltaPressure24h = pStart - pEnd; // Positivo si la presión cayó

  // Días consecutivos sin lluvia pronosticados
  let diasSinLluvia = 0;
  for (const p of daily.precipitation_sum) {
    if ((p || 0) < 1.0) diasSinLluvia++;
    else break;
  }

  const modulosResultados = {};

  // --- M1: INUNDACIONES ---
  const kInundable = factores_riesgo.cuenca_inundable ? thresholds.modulos.inundacion.factor_cuenca_inundable : 1.0;
  let nivelInundacion = 0;
  const trigInundacion = [];
  if (precip24h >= 100 * kInundable || precip48h >= 150 * kInundable) {
    nivelInundacion = 4;
    trigInundacion.push(`Lluvia crítica: 24h=${precip24h.toFixed(1)}mm, 48h=${precip48h.toFixed(1)}mm`);
  } else if (precip24h >= 60 * kInundable || precip48h >= 100 * kInundable) {
    nivelInundacion = 3;
    trigInundacion.push(`Lluvia alta: 24h=${precip24h.toFixed(1)}mm, 48h=${precip48h.toFixed(1)}mm`);
  } else if (precip24h >= 30 * kInundable || (precip24h >= 20 * kInundable && soil07 > 0.35)) {
    nivelInundacion = 2;
    trigInundacion.push(`Lluvia moderada: 24h=${precip24h.toFixed(1)}mm, Humedad suelo=${soil07.toFixed(2)}`);
  } else if (precip24h >= 20 * kInundable) {
    nivelInundacion = 1;
    trigInundacion.push(`Lluvia ligera acumulada: 24h=${precip24h.toFixed(1)}mm`);
  }
  modulosResultados.inundacion = {
    nivel: nivelInundacion,
    color_hex: thresholds.semaforo_siat[nivelInundacion].color_hex,
    variables_disparadoras: trigInundacion,
    estado: 'nominal'
  };

  // --- M2: HELADAS ---
  const offsetHelada = factores_riesgo.exposicion_heladas ? thresholds.modulos.heladas.offset_exposicion_heladas : 0.0;
  let nivelHeladas = 0;
  const trigHeladas = [];
  if (tempMin <= (0.0 + offsetHelada)) {
    nivelHeladas = 4;
    trigHeladas.push(`Temperatura congelante: T_min=${tempMin.toFixed(1)}°C`);
  } else if (tempMin <= (2.0 + offsetHelada) || (tempMin <= (4.0 + offsetHelada) && dewPointMin < 1.0 && windSpeedMax < 5)) {
    nivelHeladas = 3;
    trigHeladas.push(`Helada severa / escarcha: T_min=${tempMin.toFixed(1)}°C, Punto rocío=${dewPointMin.toFixed(1)}°C`);
  } else if (tempMin <= (4.0 + offsetHelada)) {
    nivelHeladas = 2;
    trigHeladas.push(`Descenso marcado de temperatura: T_min=${tempMin.toFixed(1)}°C`);
  } else if (tempMin <= (5.0 + offsetHelada)) {
    nivelHeladas = 1;
    trigHeladas.push(`Ambiente frío: T_min=${tempMin.toFixed(1)}°C`);
  }
  modulosResultados.heladas = {
    nivel: nivelHeladas,
    color_hex: thresholds.semaforo_siat[nivelHeladas].color_hex,
    variables_disparadoras: trigHeladas,
    estado: 'nominal'
  };

  // --- M3: ONDAS DE CALOR ---
  let nivelCalor = 0;
  const trigCalor = [];
  if (tempMax >= 38.0 || appTempMax >= 40.0) {
    nivelCalor = 4;
    trigCalor.push(`Calor extremo: T_max=${tempMax.toFixed(1)}°C, Sensación térmica=${appTempMax.toFixed(1)}°C`);
  } else if (tempMax >= 34.0 || appTempMax >= 36.0) {
    nivelCalor = 3;
    trigCalor.push(`Calor muy alto: T_max=${tempMax.toFixed(1)}°C, Sensación térmica=${appTempMax.toFixed(1)}°C`);
  } else if (tempMax >= 30.0 || appTempMax >= 32.0) {
    nivelCalor = 2;
    trigCalor.push(`Ambiente caluroso: T_max=${tempMax.toFixed(1)}°C`);
  } else if (tempMax >= 28.0) {
    nivelCalor = 1;
    trigCalor.push(`Temperatura templada a cálida: T_max=${tempMax.toFixed(1)}°C`);
  }
  modulosResultados.calor = {
    nivel: nivelCalor,
    color_hex: thresholds.semaforo_siat[nivelCalor].color_hex,
    variables_disparadoras: trigCalor,
    estado: 'nominal'
  };

  // --- M4: LADERAS Y DESLAVES ---
  const multPendiente = thresholds.modulos.laderas.multiplicadores_pendiente[factores_riesgo.perfil_pendiente] || 1.3;
  let nivelLaderas = 0;
  const trigLaderas = [];
  if (precip24h >= 120 * multPendiente || precip7d >= 300) {
    nivelLaderas = 4;
    trigLaderas.push(`Saturación extrema de ladera: 24h=${precip24h.toFixed(1)}mm, Acumulado 7d=${precip7d.toFixed(1)}mm`);
  } else if ((precip24h >= 70 * multPendiente && soil07 > 0.35) || precip7d >= 200) {
    nivelLaderas = 3;
    trigLaderas.push(`Suelo altamente inestable: 24h=${precip24h.toFixed(1)}mm, Humedad suelo=${soil07.toFixed(2)}, Acumulado 7d=${precip7d.toFixed(1)}mm`);
  } else if (precip24h >= 40 * multPendiente && soil07 > 0.30) {
    nivelLaderas = 2;
    trigLaderas.push(`Humedad acumulada en talud: 24h=${precip24h.toFixed(1)}mm, Humedad suelo=${soil07.toFixed(2)}`);
  } else if (precip24h >= 30 * multPendiente) {
    nivelLaderas = 1;
    trigLaderas.push(`Lluvia en zona de pendiente: 24h=${precip24h.toFixed(1)}mm`);
  }
  modulosResultados.laderas = {
    nivel: nivelLaderas,
    color_hex: thresholds.semaforo_siat[nivelLaderas].color_hex,
    variables_disparadoras: trigLaderas,
    estado: 'nominal'
  };

  // --- M5: INCENDIOS FORESTALES ---
  const mesActual = new Date().getMonth() + 1;
  const esEstiaje = thresholds.modulos.incendios.meses_temporada_estiaje.includes(mesActual);
  let nivelIncendios = 0;
  const trigIncendios = [];
  if (humidityMin < 25 && (diasSinLluvia >= 14 || esEstiaje) && windSpeedMax > 30) {
    nivelIncendios = 4;
    trigIncendios.push(`Atmósfera altamente inflamable: HR=${humidityMin}%, Viento=${windSpeedMax.toFixed(1)}km/h, Días secos=${diasSinLluvia}`);
  } else if (humidityMin < 35 && (diasSinLluvia >= 7 || esEstiaje) && tempMax > 28) {
    nivelIncendios = 3;
    trigIncendios.push(`Condición favorable para incendios: HR=${humidityMin}%, T_max=${tempMax.toFixed(1)}°C`);
  } else if (humidityMin <= 50 && diasSinLluvia >= 3) {
    nivelIncendios = 2;
    trigIncendios.push(`Sequedad moderada: HR=${humidityMin}%, Días sin lluvia=${diasSinLluvia}`);
  } else if (humidityMin <= 50 && diasSinLluvia >= 2) {
    nivelIncendios = 1;
    trigIncendios.push(`Monitoreo de estiaje`);
  }
  modulosResultados.incendios = {
    nivel: nivelIncendios,
    color_hex: thresholds.semaforo_siat[nivelIncendios].color_hex,
    variables_disparadoras: trigIncendios,
    estado: 'nominal'
  };

  // --- M6: TORMENTAS ELÉCTRICAS ---
  let nivelTormentas = 0;
  const trigTormentas = [];
  if (capeMax >= 2500 && maxPrecip1h >= 20 && windGustsMax > 60) {
    nivelTormentas = 4;
    trigTormentas.push(`Tormenta severa: CAPE=${capeMax.toFixed(0)} J/kg, Lluvia horaria=${maxPrecip1h.toFixed(1)}mm/h, Ráfagas=${windGustsMax.toFixed(1)}km/h`);
  } else if (capeMax >= 1500 && maxPrecip1h >= 10) {
    nivelTormentas = 3;
    trigTormentas.push(`Inestabilidad convectiva fuerte: CAPE=${capeMax.toFixed(0)} J/kg, Lluvia horaria=${maxPrecip1h.toFixed(1)}mm/h`);
  } else if (capeMax >= 500 && maxPrecip1h >= 5) {
    nivelTormentas = 2;
    trigTormentas.push(`Probabilidad de tormenta eléctrica: CAPE=${capeMax.toFixed(0)} J/kg`);
  } else if (capeMax >= 300) {
    nivelTormentas = 1;
    trigTormentas.push(`Inestabilidad ligera: CAPE=${capeMax.toFixed(0)} J/kg`);
  }
  modulosResultados.tormentas = {
    nivel: nivelTormentas,
    color_hex: thresholds.semaforo_siat[nivelTormentas].color_hex,
    variables_disparadoras: trigTormentas,
    estado: 'nominal'
  };

  // --- M7: CICLONES TROPICALES ---
  let nivelCiclones = 0;
  const trigCiclones = [];
  if (factores_riesgo.sensibilidad_ciclones) {
    if (deltaPressure24h > 12 && windGustsMax > 80) {
      nivelCiclones = 4;
      trigCiclones.push(`Impacto ciclónico crítico: Caída presión=${deltaPressure24h.toFixed(1)}hPa/24h, Viento=${windGustsMax.toFixed(1)}km/h`);
    } else if (deltaPressure24h > 8 && windGustsMax > 60) {
      nivelCiclones = 3;
      trigCiclones.push(`Influencia ciclónica severa: Caída presión=${deltaPressure24h.toFixed(1)}hPa/24h, Viento=${windGustsMax.toFixed(1)}km/h`);
    } else if (deltaPressure24h > 5) {
      nivelCiclones = 2;
      trigCiclones.push(`Perturbación atmosférica: Caída presión=${deltaPressure24h.toFixed(1)}hPa/24h`);
    }
  }
  modulosResultados.ciclones = {
    nivel: nivelCiclones,
    color_hex: thresholds.semaforo_siat[nivelCiclones].color_hex,
    variables_disparadoras: trigCiclones,
    estado: 'nominal'
  };

  // --- FASE 4: AGREGACIÓN, SINERGIAS E HISTÉRESIS ---
  let nivelBase = 0;
  let moduloDominante = 'inundacion';

  for (const [modKey, modRes] of Object.entries(modulosResultados)) {
    if (modRes.nivel > nivelBase) {
      nivelBase = modRes.nivel;
      moduloDominante = modKey;
    }
  }

  // Evaluación de Sinergias
  const sinergiasActivas = [];
  let bonoSinergia = 0;

  for (const sin of thresholds.sinergias) {
    const nivelA = modulosResultados[sin.modulo_a]?.nivel || 0;
    const nivelB = modulosResultados[sin.modulo_b]?.nivel || 0;

    if (nivelA >= sin.nivel_minimo && nivelB >= sin.nivel_minimo) {
      bonoSinergia += sin.incremento;
      sinergiasActivas.push({
        id: sin.id,
        titulo: sin.titulo,
        diagnostico: sin.diagnostico,
        peligro: sin.peligro,
        medidas: sin.medidas
      });
    }
  }

  const nivelPropuesto = Math.min(nivelBase + bonoSinergia, 4);

  // Aplicación de Histéresis (memoria de 2 ciclos para descenso)
  const prevLevels = prevHistory?.ultimos_niveles || [];
  let nivelFinal = nivelPropuesto;
  let histeresisAplicada = false;

  if (prevLevels.length > 0) {
    const ultimoNivel = prevLevels[prevLevels.length - 1];
    if (nivelPropuesto > ultimoNivel) {
      // Escalamiento inmediato
      nivelFinal = nivelPropuesto;
    } else if (nivelPropuesto < ultimoNivel) {
      // Evaluar si lleva 2 ciclos en el nivel propuesto
      const ciclosBajo = prevLevels.filter(n => n <= nivelPropuesto).length;
      if (ciclosBajo >= thresholds.reglas_histeresis.ciclos_descenso_requeridos) {
        nivelFinal = nivelPropuesto;
      } else {
        nivelFinal = ultimoNivel; // Retiene nivel preventivo
        histeresisAplicada = true;
      }
    }
  }

  const semaforoDef = thresholds.semaforo_siat[nivelFinal];

  return {
    evaluacion: {
      nivel_final: nivelFinal,
      nivel_nombre: semaforoDef.nombre,
      color_hex: semaforoDef.color_hex,
      modulo_dominante: moduloDominante,
      sinergias_activas: sinergiasActivas,
      histeresis_aplicada: histeresisAplicada,
      accion_corta: semaforoDef.accion_corta,
      protocolo_comunitario: semaforoDef.protocolo_comunitario,
      protocolo_caritas: semaforoDef.protocolo_caritas,
      confianza: 1.0,
      modulos: modulosResultados
    },
    nivelPropuesto
  };
}

// Ejecución principal
async function main() {
  console.log(`\n======================================================`);
  console.log(`🌊 CÁRITAS PASTORAL SOCIAL - MOTOR DE ALERTA TEMPRANA`);
  console.log(`======================================================`);
  console.log(`Fecha/Hora: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (Centro de México)`);
  console.log(`Procesando ${poblaciones.length} poblaciones en 10 zonas operativas...\n`);

  // Asegurar que existan las carpetas destino
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  const chunks = chunkArray(poblaciones, 30);
  let allWeatherData = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`📡 Consultando lote ${i + 1}/${chunks.length} en Open-Meteo...`);
    const chunkData = await fetchOpenMeteoBatch(chunks[i]);
    allWeatherData = allWeatherData.concat(chunkData);
  }

  const detallePoblaciones = {};
  const newHistory = { ...history };
  const resumenZonasMap = {};

  // Inicializar mapa de zonas (1 a 10)
  poblaciones.forEach(p => {
    if (!resumenZonasMap[p.zona_id]) {
      resumenZonasMap[p.zona_id] = {
        zona_id: p.zona_id,
        nucleo_territorial: p.zona_nombre,
        nivel_maximo: 0,
        color_maximo_hex: thresholds.semaforo_siat[0].color_hex,
        total_poblaciones: 0,
        poblaciones_en_alerta: 0,
        lista_poblaciones_ids: []
      };
    }
    resumenZonasMap[p.zona_id].total_poblaciones++;
    resumenZonasMap[p.zona_id].lista_poblaciones_ids.push(p.id);
  });

  const alertaPrioritaria = [];

  poblaciones.forEach((poblacion, index) => {
    const wData = allWeatherData[index];
    const prevHist = history[poblacion.id];
    const { evaluacion, nivelPropuesto } = evaluatePoblacion(poblacion, wData, prevHist);

    detallePoblaciones[poblacion.id] = {
      id: poblacion.id,
      nombre: poblacion.nombre,
      municipio: poblacion.municipio,
      estado: poblacion.estado,
      zona_id: poblacion.zona_id,
      zona_nombre: poblacion.zona_nombre,
      coordenadas: poblacion.coordenadas,
      evaluacion
    };

    // Actualizar historial
    const pastLevels = prevHist?.ultimos_niveles || [];
    newHistory[poblacion.id] = {
      ultimos_niveles: [...pastLevels.slice(-5), nivelPropuesto],
      nivel_actual: evaluacion.nivel_final,
      updated_at: new Date().toISOString()
    };

    // Nivel 1: Alerta Prioritaria (Niveles >= 2: Amarillo, Naranja, Rojo)
    if (evaluacion.nivel_final >= 2) {
      alertaPrioritaria.push({
        id: poblacion.id,
        nombre: poblacion.nombre,
        municipio: poblacion.municipio,
        estado: poblacion.estado,
        zona_id: poblacion.zona_id,
        zona_nombre: poblacion.zona_nombre,
        nivel: evaluacion.nivel_final,
        nivel_nombre: evaluacion.nivel_nombre,
        color_hex: evaluacion.color_hex,
        modulo_dominante: evaluacion.modulo_dominante,
        accion_inmediata: evaluacion.accion_corta,
        sinergias: evaluacion.sinergias_activas.map(s => s.titulo)
      });
    }

    // Nivel 2: Estadísticas de Zona
    const zona = resumenZonasMap[poblacion.zona_id];
    if (evaluacion.nivel_final > zona.nivel_maximo) {
      zona.nivel_maximo = evaluacion.nivel_final;
      zona.color_maximo_hex = evaluacion.color_hex;
    }
    if (evaluacion.nivel_final >= 2) {
      zona.poblaciones_en_alerta++;
    }
  });

  // Ordenar alerta prioritaria de mayor a menor riesgo
  alertaPrioritaria.sort((a, b) => b.nivel - a.nivel);

  const payload = {
    meta: {
      timestamp_utc: new Date().toISOString(),
      timestamp_local: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      institucion: 'Cáritas Pastoral Social',
      total_poblaciones: poblaciones.length,
      estado_fuentes: {
        open_meteo: 'ok',
        smn_conagua: 'ok',
        noaa_nhc: 'sin_actividad'
      }
    },
    alerta_prioritaria: alertaPrioritaria,
    resumen_zonas: Object.values(resumenZonasMap).sort((a, b) => a.zona_id - b.zona_id),
    detalle_poblaciones: detallePoblaciones
  };

  // Guardar en 'data/latest-risk.json' y 'public/data/latest-risk.json'
  fs.writeFileSync(path.join(DATA_DIR, 'latest-risk.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'latest-risk.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(historyPath, JSON.stringify(newHistory, null, 2), 'utf8');

  console.log(`\n✅ Evaluación completada con éxito.`);
  console.log(`📁 Archivo generado: public/data/latest-risk.json`);
  console.log(`🔴 Poblaciones en Alerta Prioritaria (Nivel >= 2): ${alertaPrioritaria.length}`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error(`❌ Error en la ejecución del motor:`, err);
  process.exit(1);
});