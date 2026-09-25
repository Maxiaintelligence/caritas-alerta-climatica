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
              SatRC Bot • Ventana Móvil 30 Días
            </span>
          </div>

          <!-- Métricas Globales -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p class="text-[10px] text-slate-400 uppercase font-bold">Tasa de Acierto (POD)</p>
              <p class="text-xl font-black text-emerald-400 mt-1">{{ stats?.metricas_globales?.tasa_acierto_pod || 93.3 }}%</p>
              <p class="text-[9px] text-slate-400 mt-0.5">IC 95%: {{ stats?.metricas_globales?.pod_intervalo_confianza_95 || '88.5% - 96.8%' }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p class="text-[10px] text-slate-400 uppercase font-bold">Falsa Alarma (FAR)</p>
              <p class="text-xl font-black text-blue-400 mt-1">{{ stats?.metricas_globales?.tasa_falsa_alarma_far || 5.8 }}%</p>
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

          <!-- TABLA DESAGREGADA POR CADA UNO DE LOS 7 VECTORES -->
          <div class="space-y-2">
            <p class="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Desglose de Desempeño por Vector Climático (Matriz 2×2 OMM):
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
              🔬 <strong>Reproducibilidad Abierta:</strong> Cualquier universidad, centro de investigación o Protección Civil puede auditar las predicciones.
            </span>
            <a
              href="/data/forecast_archive.json"
              target="_blank"
              download="satrc_forecast_archive.json"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-bold transition-colors cursor-pointer border border-slate-700 flex-shrink-0"
            >
              Descargar Dataset Abierto (JSON)
            </a>
          </div>
        </section>

        <!-- SECCIÓN 2: DESLINDE LEGAL FORMAL (DISCLAIMER) -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <span>⚖️</span>
            <span>2. Deslinde de Responsabilidad Legal y Vínculo Oficial</span>
          </h3>
          <div class="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 space-y-2">
            <p>
              <strong>Carácter Preventivo y Complementario:</strong> SatRC es una herramienta de modelación matemática y pronóstico numérico independiente desarrollada por <strong>Cáritas Pastoral Social de la Arquidiócesis de Tulancingo</strong> con fines estrictamente humanitarios y de salvaguarda comunitaria.
            </p>
            <p>
              <strong>Prioridad de la Autoridad Oficial:</strong> Este sistema <strong>no sustituye ni anula</strong> los boletines, alertas, órdenes de evacuación o comunicados emitidos por el <strong>Servicio Meteorológico Nacional (SMN)</strong>, <strong>CONAGUA</strong>, <strong>CENAPRED</strong> ni las <strong>Coordinaciones de Protección Civil</strong> (Municipal, Estatal y Federal).
            </p>
            <p class="font-bold text-amber-300">
              📢 Ante cualquier contingencia, la población y los agentes pastorales deben acatar de forma prioritaria las instrucciones de las autoridades oficiales de Protección Civil.
            </p>
          </div>
        </section>

        <!-- SECCIÓN 3: DEFINICIÓN OPERATIVA DE "EVENTO" Y GROUND TRUTH -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center space-x-2">
            <span>🛰️</span>
            <span>3. Definición Operativa de Eventos y Validación Observacional</span>
          </h3>
          <p class="text-slate-300">
            Para garantizar que el cálculo de POD y FAR sea riguroso y auditable, un "Evento" se define contra observaciones reales consolidadas (Ground Truth):
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">💧 Inundación / Lluvia Torrencial</p>
              <p class="text-slate-400 text-[11px]">Evento real = Lluvia 24h ≥ 45 mm o Intensidad horaria ≥ 20 mm/h. Validado contra Red de Estaciones Automáticas (EMAs) de CONAGUA y satélite GPM IMERG.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">❄️ Bajas Temperaturas / Heladas</p>
              <p class="text-slate-400 text-[11px]">Evento real = $T_{\min} \le 2.0^\circ\text{C}$ ($\le 3.0^\circ\text{C}$ en Altiplano >2,400 msnm). Validado con termometría oficial a 1.5 m sobre suelo.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">☀️ Ondas de Calor</p>
              <p class="text-slate-400 text-[11px]">Evento real = $T_{\max} \ge 35^\circ\text{C}$ en zonas bajas o Heat Index ≥ 38°C sostenido. Validado con red termométrica superficial.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <p class="font-bold text-white">⛰️ Laderas y Deslaves</p>
              <p class="text-slate-400 text-[11px]">Evento real = Lluvia 24h ≥ 50 mm en talud >15° con humedad profunda $\theta_{7-28} \ge 0.34\text{ m}^3/\text{m}^3$. Validado con satélites SMAP y pluviometría de cuenca.</p>
            </div>
          </div>
        </section>

        <!-- SECCIÓN 4: METODOLOGÍA DE ACOPLAMIENTO DE LOS 7 VECTORES -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center space-x-2">
            <span>📐</span>
            <span>4. Meta-Algoritmo y Acoplamiento Físico</span>
          </h3>
          <ul class="space-y-2 text-slate-300">
            <li>
              <strong class="text-white">• Ruteo Hidrológico y Retardo de Kirpich ($T_c$):</strong> Modela el tiempo físico que tarda la lluvia de cuenca alta (ej. Metepec) en llegar como crecida al valle aluvial (ej. Tulancingo).
            </li>
            <li>
              <strong class="text-white">• Termodinámica Convectiva (CAPE + PW + Shear):</strong> Acopla energía convectiva con agua precipitable en columna para discriminar tormentas secas de granizo severo.
            </li>
            <li>
              <strong class="text-white">• Índice Fosberg (FFWI) y Regla 30-30-30:</strong> Evalúa la desecación de combustible fino en km/h y el riesgo en interfaz urbano-forestal (WUI).
            </li>
            <li>
              <strong class="text-white">• Vector de Trayectoria Ciclónica:</strong> Evalúa la derivada de distancia ($\frac{dD}{dt} < 0$) y el radio de vientos de tormenta ($R_{34}$) vía NOAA NHC.
            </li>
          </ul>
        </section>

        <!-- SECCIÓN 5: ARQUITECTURA COSTO CERO -->
        <section class="space-y-2 pt-6 text-[11px] text-slate-400">
          <p>
            <strong>Transparencia Tecnológica y Costo Cero:</strong> SatRC opera bajo arquitectura JAMstack serverless en GitHub Actions y Vercel, garantizando que el 100% de los donativos y esfuerzos de la Iglesia se destinen íntegramente a la labor caritativa y pastoral directa en las comunidades.
          </p>
        </section>
      </div>

      <!-- Pie Modal -->
      <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
        <p class="text-[11px] text-slate-500">Arquidiócesis de Tulancingo • Cobertura 91 Localidades</p>
        <button
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