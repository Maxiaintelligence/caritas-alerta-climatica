<template>
  <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col text-slate-200 font-sans">
      <!-- Encabezado Modal -->
      <div class="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/40">
              Marco Institucional
            </span>
            <span class="text-xs text-slate-400">SatRC v1.0</span>
          </div>
          <h2 class="text-lg md:text-xl font-bold text-white mt-1">
            Metodología, Transparencia y Aviso Legal (Disclaimer)
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
        
        <!-- 1. NATURALEZA Y DESLINDE LEGAL -->
        <section class="space-y-3 pt-0">
          <h3 class="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <span>⚖️</span>
            <span>1. Deslinde de Responsabilidad Legal (Disclaimer)</span>
          </h3>
          <div class="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 space-y-2">
            <p>
              <strong>Carácter Preventivo y Complementario:</strong> SatRC es una herramienta de modelación matemática y pronóstico numérico independiente de <strong>Cáritas Pastoral Social de la Arquidiócesis de Tulancingo</strong> con fines estrictamente humanitarios y de salvaguarda comunitaria.
            </p>
            <p>
              <strong>Prioridad de la Autoridad Oficial:</strong> Este sistema <strong>no sustituye ni anula</strong> los boletines, órdenes de evacuación o comunicados emitidos por el <strong>Servicio Meteorológico Nacional (SMN)</strong>, <strong>CONAGUA</strong>, <strong>CENAPRED</strong> ni las <strong>Coordinaciones de Protección Civil</strong> (Municipal, Estatal y Federal).
            </p>
            <p class="font-bold text-amber-300">
              📢 Ante cualquier contingencia, la población y los agentes pastorales deben seguir de forma prioritaria las instrucciones de las autoridades oficiales de Protección Civil.
            </p>
          </div>
        </section>

        <!-- 2. TRANSPARENCIA DE FUENTES -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center space-x-2">
            <span>🛰️</span>
            <span>2. Transparencia de Fuentes y Redundancia (Failover)</span>
          </h3>
          <p class="text-slate-300">
            SatRC consulta de forma simultánea cada 3 horas un ensamble multi-modelo para garantizar máxima certidumbre y resiliencia a costo cero:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p class="font-bold text-white">🇪🇺 ECMWF (IFS - 9 km)</p>
              <p class="text-slate-400 text-[11px]">Modelo numérico europeo principal de alta resolución para precipitación y capas atmosféricas.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p class="font-bold text-white">🇺🇸 NOAA GFS (13 km)</p>
              <p class="text-slate-400 text-[11px]">Modelo numérico global estadounidense para validación de ensamble y convergencia de pronóstico.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p class="font-bold text-white">🇲🇽 SMN / CONAGUA & CENAPRED</p>
              <p class="text-slate-400 text-[11px]">Validación oficial nacional de México y verificación de alertas de tiempo severo en Hidalgo, Puebla y Veracruz.</p>
            </div>
            <div class="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p class="font-bold text-white">🌀 NOAA NHC (Centro de Huracanes)</p>
              <p class="text-slate-400 text-[11px]">Seguimiento satelital de disturbios tropicales activos en Golfo de México y Pacífico (<300 km).</p>
            </div>
          </div>
        </section>

        <!-- 3. METODOLOGÍA DE LOS 7 VECTORES -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
            <span>📐</span>
            <span>3. Metodología de los 7 Vectores Climáticos</span>
          </h3>
          <ul class="space-y-2 text-slate-300">
            <li>
              <strong class="text-white">• Inundaciones / Tormentas Torrenciales:</strong> Integra intensidades horarias (≥25 mm/h) y ruteo hidrológico de cuencas con la fórmula de <strong>Tiempo de Concentración de Kirpich ($T_c$)</strong> para modelar el retardo de crecida desde cuencas altas.
            </li>
            <li>
              <strong class="text-white">• Bajas Temperaturas / Heladas:</strong> Diferencia entre heladas radiativas (irradiación nocturna con cielo despejado) y heladas advectivas polares (Wind Chill con viento >20 km/h). Incluye contador de horas continuas bajo cero ($H_{T<0} \ge 3\text{h}$) y offset altitudinal (+1.0°C en Altiplano).
            </li>
            <li>
              <strong class="text-white">• Ondas de Calor:</strong> Calcula el <strong>Índice de Calor NOAA (Heat Index)</strong> diferenciado por piso altitudinal (zonas bajas <1,000 msnm base 35°C vs zonas altas >2,000 msnm base 30°C) y monitorea noches tropicales ($T_{\min} \ge 24^\circ\text{C}$).
            </li>
            <li>
              <strong class="text-white">• Inestabilidad de Laderas:</strong> Mecánica de suelos de Mohr-Coulomb según Atlas de Riesgo local: pendiente topográfica ($\mu$), litología (arcilla vs roca) y saturación profunda ($\theta_{7-28} \ge 0.36\text{ m}^3/\text{m}^3$).
            </li>
            <li>
              <strong class="text-white">• Incendios Forestales:</strong> Evalúa en tiempo real el <strong>Índice de Peligro Fosberg (FFWI)</strong> en km/h junto a la regla 30-30-30 de CONAFOR y zonas de interfaz urbano-forestal (WUI).
            </li>
            <li>
              <strong class="text-white">• Tormentas y Granizo:</strong> Acopla Energía Potencial Disponible ($\text{CAPE} \ge 2000\text{ J/kg}$) con Agua Precipitable ($\text{PW} \ge 35\text{ mm}$) y cizalladura vertical.
            </li>
            <li>
              <strong class="text-white">• Ciclones y Huracanes:</strong> Evalúa proximidad del ojo (<300 km), vector de aproximación ($\frac{dD}{dt} < 0$) y caída barométrica rápida en 24 horas.
            </li>
          </ul>
        </section>

        <!-- 4. TRIAJE Y PROTOCOLO HUMANO CÁRITAS -->
        <section class="space-y-3 pt-6">
          <h3 class="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center space-x-2">
            <span>⛪</span>
            <span>4. Triaje Operativo de Cáritas Pastoral Social</span>
          </h3>
          <p class="text-slate-300">
            El sistema opera en 4 niveles de respuesta proporcional:
          </p>
          <div class="space-y-1.5 font-medium">
            <p><span class="text-emerald-400 font-bold">🟢 Nivel 1 (Sin Riesgo):</span> Operación normal y monitoreo rutinario.</p>
            <p><span class="text-amber-400 font-bold">🟡 Nivel 2 (Alistamiento):</span> Verificación pasiva de stock de emergencia para 50 personas (300L agua, 450 raciones, cobijas) sin despliegue físico.</p>
            <p><span class="text-orange-400 font-bold">🟠 Nivel 3 (Movilización):</span> Preposicionamiento en parroquias nodo y censo de personas con discapacidad o embarazadas para evacuación asistida.</p>
            <p><span class="text-red-400 font-bold">🔴 Nivel 4 (Emergencia):</span> Operación al 100% de albergues y comedores parroquiales, auxilio y levantamiento del <strong>Formato EDAN Cáritas</strong>.</p>
          </div>
        </section>

        <!-- 5. COMPROMISO COSTO CERO -->
        <section class="space-y-2 pt-6 text-[11px] text-slate-400">
          <p>
            <strong>Arquitectura de Costo Cero:</strong> SatRC está desarrollado bajo estándares abiertos JAMstack con funciones serverless y almacenamiento estático en GitHub Actions y Vercel, garantizando que el 100% de los recursos se destinen a la labor caritativa y pastoral directa.
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
defineEmits(['close']);
</script>