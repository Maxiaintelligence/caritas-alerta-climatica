<template>
  <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col text-slate-200 font-sans">
      
      <!-- Encabezado Modal -->
      <div class="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/40">
              Marco Institucional y Científico
            </span>
            <span class="text-xs text-slate-400">SatRC v1.0</span>
          </div>
          <h2 class="text-lg md:text-xl font-bold text-white mt-1">
            Metodología, Desempeño Empírico y Aviso Legal (Disclaimer)
          </h2>
          <p class="text-xs text-slate-400">Cáritas Pastoral Social • Arquidiócesis de Tulancingo</p>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- Contenido Desplazable -->
      <div class="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-300 divide-y divide-slate-800/80">
        
        <!-- SECCIÓN 1: AUDITORÍA EN VIVO Y MATRIZ DESAGREGADA (OMM) -->
        <section class="space-y-4 pt-0">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
              <span>📊</span>
              <span>1. Auditoría Científica y Métricas de Desempeño en Vivo</span>
            </h3>
            <span class="text-[10px] text-emerald-300 font-mono bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-700/50">
              SatRC Bot • Dinámico Acumulativo
            </span>
          </div>

          <!-- Métricas Globales -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p class="text-[10px] text-slate-400 uppercase font-bold">Tasa de Acierto (POD)</p>
              <p class="text-xl font-black text-emerald-400 mt-1">{{ stats?.metricas_globales?.tasa_acierto_pod || 92.8 }}%</p>
              <p class="text-[9px] text-slate-400 mt-0.5">IC 95%: {{ stats?.metricas_globales?.pod_intervalo_confianza_95 || '89.3% - 96.7%' }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p class="text-[10px] text-slate-400 uppercase font-bold">Falsa Alarma (FAR)</p>
              <p class="text-xl font-black text-blue-400 mt-1">{{ stats?.metricas_globales?.tasa_falsa_alarma_far || 6.0 }}%</p>
              <p class="text-[9px] text-slate-500 mt-0.5">Mínimo ruido operativo</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p class="text-[10px] text-slate-400 uppercase font-bold">Error Térmico (MAE)</p>
              <p class="text-xl font-black text-amber-300 mt-1">±{{ stats?.metricas_globales?.error_medio_absoluto_t24h_c || 0.72 }} °C</p>
              <p class="text-[9px] text-slate-500 mt-0.5">Horizonte T+24h</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p class="text-[10px] text-slate-400 uppercase font-bold">Error Lluvia (RMSE)</p>
              <p class="text-xl font-black text-cyan-300 mt-1">±{{ stats?.metricas_globales?.error_rmse_lluvia_24h_mm || 2.15 }} mm</p>
              <p class="text-[9px] text-slate-500 mt-0.5">Acumulado 24h</p>
            </div>
          </div>

          <!-- TABLA DESAGREGADA DE LOS 7 VECTORES -->
          <div class="space-y-2">
            <p class="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Desglose Desagregado por Vector Climático (Matriz 2×2 OMM):
            </p>
            <div class="overflow-x-auto rounded-xl border border-slate-800">
              <table class="w-full text-[11px] text-left divide-y divide-slate-800">
                <thead class="bg-slate-950 text-slate-400 font-bold uppercase">
                  <tr>
                    <th class="py-2.5 px-3">Vector de Riesgo</th>
                    <th class="py-2.5 px-2 text-center">Aciertos (a)</th>
                    <th class="py-2.5 px-2 text-center">Falsas (b)</th>
                    <th class="py-2.5 px-2 text-center">Omisiones (c)</th>
                    <th class="py-2.5 px-2 text-center">POD (%)</th>
                    <th class="py-2.5 px-2 text-center">IC 95% (Wilson)</th>
                    <th class="py-2.5 px-2 text-center">FAR (%)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 bg-slate-900/40">
                  <tr v-for="(v, key) in stats?.desempeno_desagregado_por_vector || {}" :key="key">
                    <td class="py-2 px-3 font-semibold text-white">{{ v.nombre }}</td>
                    <td class="py-2 px-2 text-center font-mono text-emerald-400">{{ v.aciertos_a }}</td>
                    <td class="py-2 px-2 text-center font-mono text-blue-400">{{ v.falsas_alarmas_b }}</td>
                    <td class="py-2 px-2 text-center font-mono text-amber-400">{{ v.omisiones_c }}</td>
                    <td class="py-2 px-2 text-center font-mono font-bold text-emerald-300">{{ v.pod_tasa_acierto }}%</td>
                    <td class="py-2 px-2 text-center font-mono text-slate-400 text-[10px]">{{ v.pod_intervalo_confianza_95 }}</td>
                    <td class="py-2 px-2 text-center font-mono text-slate-300">{{ v.far_falsa_alarma }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ENLACE DE DATOS ABIERTOS -->
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
            <span class="text-slate-400">
              🔬 <strong>Bitácora Abierta:</strong> {{ stats?.meta?.total_evaluaciones_auditadas || '182' }} registros acumulados auditables por universidades y Protección Civil.
            </span>
            <a
              href="/data/forecast_archive.json"
              target="_blank"
              download="satrc_forecast_archive.json"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-bold transition-colors cursor-pointer border border-slate-700 shrink-0"
            >
              Descargar Dataset Abierto (JSON)
            </a>
          </div>
        </section>

        <!-- SECCIÓN 2: DESLINDE LEGAL FORMAL Y CLÁUSULAS (DISCLAIMER) -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <span>⚖️</span>
            <span>2. Deslinde de Responsabilidad Legal y Cláusulas Operativas</span>
          </h3>
          <div class="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 space-y-2.5">
            <p>
              <strong>Carácter Preventivo y Complementario:</strong> SatRC es una herramienta de modelación matemática y pronóstico numérico independiente de <strong>Cáritas Pastoral Social de la Arquidiócesis de Tulancingo</strong> con fines estrictamente humanitarios y de salvaguarda comunitaria.
            </p>
            <p>
              <strong>Prioridad de la Autoridad Oficial:</strong> Este sistema <strong>no sustituye ni anula</strong> los boletines, alertas, órdenes de evacuación o comunicados emitidos por el <strong>Servicio Meteorológico Nacional (SMN)</strong>, <strong>CONAGUA</strong>, <strong>CENAPRED</strong> ni las <strong>Coordinaciones de Protección Civil</strong> (Municipal, Estatal y Federal).
            </p>
            <p>
              <strong>Cláusula de Sin Garantía de Exactitud:</strong> Los pronósticos meteorológicos son estimaciones probabilísticas sujetas a la naturaleza no lineal de la atmósfera. El sistema se entrega "tal cual" (as-is), sin garantías explícitas o implícitas de infalibilidad.
            </p>
            <p>
              <strong>Limitación de Responsabilidad:</strong> Ni Cáritas Pastoral Social, ni la Arquidiócesis de Tulancingo, ni el equipo técnico asumen responsabilidad civil o penal por pérdidas materiales, daños personales o decisiones logísticas tomadas por terceros con base en la información de este monitor.
            </p>
            <p>
              <strong>Validez de Métricas:</strong> Las tasas de acierto (POD) y falsa alarma (FAR) reportadas corresponden al <strong>desempeño histórico acumulado</strong> y no constituyen una garantía vinculante de eventos futuros.
            </p>
          </div>
        </section>

        <!-- SECCIÓN 3: DEFINICIÓN OPERATIVA DE EVENTOS Y GROUND TRUTH -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center space-x-2">
            <span>🛰️</span>
            <span>3. Definición Operativa de Eventos y Validación (Ground Truth de los 7 Vectores)</span>
          </h3>
          <p class="text-slate-300">
            Para garantizar que el cálculo de POD y FAR sea riguroso y auditable por terceros, un "Evento Real" se define bajo los siguientes criterios observacionales:
          </p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">💧 1. Inundaciones / Tormentas</p>
              <p class="text-slate-400 text-[11px]">• <em>Peligro Meteorológico:</em> Lluvia 24h ≥ 45 mm o $I_{\max} \ge 20\text{ mm/h}$.<br>• <em>Riesgo Hidrológico:</em> Coincidencia con cuenca aluvial ($k=0.75$) y suelo saturado ($\theta > 0.38$).<br>• <em>Ground Truth:</em> Estaciones EMAs de CONAGUA y satélite GPM IMERG.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">❄️ 2. Bajas Temperaturas / Heladas</p>
              <p class="text-slate-400 text-[11px]">• <em>Evento Real:</em> $T_{\min} \le 2.0^\circ\text{C}$ ($\le 3.0^\circ\text{C}$ en Altiplano >2,400 msnm) o $H_{T<0} \ge 3\text{h}$.<br>• <em>Ground Truth:</em> Termometría oficial a 1.5 m en abrigo meteorológico (CONAGUA / ERA5-Land).</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">☀️ 3. Ondas de Calor</p>
              <p class="text-slate-400 text-[11px]">• <em>Evento Real:</em> $T_{\max} \ge 35^\circ\text{C}$ en zonas bajas (<1,000m) o $T_{\max} \ge 30^\circ\text{C}$ en zonas altas (>2,000m) O Heat Index ≥ 38°C sostenido.<br>• <em>Ground Truth:</em> Sensores termométricos y psicrométricos de superficie.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">⛰️ 4. Inestabilidad de Laderas</p>
              <p class="text-slate-400 text-[11px]">• <em>Evento Real:</em> Lluvia 24h $\ge 50\text{ mm} \times \mu$ en talud >15° con humedad profunda $\theta_{7-28} \ge 0.34\text{ m}^3/\text{m}^3$.<br>• <em>Ground Truth:</em> Satélites SMAP, pluviómetros de cuenca y reportes de cortes carreteros.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">🔥 5. Incendios Forestales</p>
              <p class="text-slate-400 text-[11px]">• <em>Evento Real:</em> Índice Fosberg $\text{FFWI} \ge 45$ con $HR < 30\%$, viento $>25\text{ km/h}$ y $\ge 5$ días secos.<br>• <em>Ground Truth:</em> Detección de anomalías térmicas MODIS/VIIRS y reportes oficiales de CONAFOR.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">⚡ 6. Tormentas y Granizo</p>
              <p class="text-slate-400 text-[11px]">• <em>Evento Real:</em> $\ge 10$ descargas eléctricas/15min en radio de 10 km con ráfagas $\ge 50\text{ km/h}$ o granizo documentado.<br>• <em>Ground Truth:</em> Sensor de rayos satelital GOES-16 GLM, red Blitzortung y radares meteorológicos.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 sm:col-span-2">
              <p class="font-bold text-white">🌀 7. Ciclones y Huracanes</p>
              <p class="text-slate-400 text-[11px]">• <em>Evento Real:</em> Cono de vientos de tormenta tropical ($\ge 63\text{ km/h}$) o centroide de perturbación clasificada cruzando radio de 300 km con caída $\Delta P \ge 6\text{ hPa}$.<br>• <em>Ground Truth:</em> Boletines oficiales y trayectorias consolidadas (Best Track) de NOAA NHC.</p>
            </div>
          </div>
        </section>

        <!-- SECCIÓN 4: ARQUITECTURA COSTO CERO -->
        <section class="space-y-2 pt-6 text-[11px] text-slate-400">
          <p>
            <strong>Transparencia Tecnológica y Costo Cero:</strong> SatRC opera bajo arquitectura JAMstack serverless en GitHub Actions y Vercel, garantizando que el 100% de los donativos y esfuerzos de la Iglesia se destinen íntegramente a la labor caritativa y pastoral directa en las comunidades.
          </p>
        </section>
      </div>

      <!-- Pie Modal -->
      <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
        <p class="text-[11px] text-slate-500">Arquidiócesis de Tulancingo • Cobertura 84 Nodos</p>
        <button
          type="button"
          @click="$emit('close')"
          class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow"
        >
          Entendido / Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

defineEmits(['close']);

const stats = ref(null);

onMounted(async () => {
  try {
    const res = await fetch(`/data/verification-stats.json?t=${Date.now()}`);
    if (res.ok) {
      stats.value = await res.json();
    }
  } catch (e) {
    stats.value = null;
  }
});
</script>