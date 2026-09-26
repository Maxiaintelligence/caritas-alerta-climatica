<template>
  <div class="space-y-6">
    <!-- CABECERA RESUMEN DE COBERTURA -->
    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black">
          84
        </div>
        <div>
          <p class="text-xs font-bold text-white uppercase">Cobertura Regional SatRC</p>
          <p class="text-[11px] text-slate-400">84 nodos de alta resolución en 10 Zonas Operativas</p>
        </div>
      </div>
      <div v-if="poblacionEnRiesgoTotal > 0" class="text-right">
        <span class="text-xs font-black px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
          ⚠️ {{ poblacionEnRiesgoTotal.toLocaleString() }} hab. en Triaje Activo
        </span>
      </div>
    </div>

    <!-- SECCIÓN 1: TRIAJE DE RIESGO CON SIRENA GRÁFICA -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
          <h2 class="text-base md:text-lg font-bold text-white uppercase tracking-wide">
            Triaje de Alerta Temprana (Nivel 2, 3 y 4)
          </h2>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {{ alertaPrioritaria.length }} alertas activas
        </span>
      </div>

      <!-- Tarjetas de Vectores con Efecto Sirena en Nivel 3 y 4 -->
      <div v-if="alertaPrioritaria.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div
          v-for="item in alertaPrioritaria"
          :key="item.id"
          @click="$emit('select-poblacion', item.id)"
          :class="[
            'p-4 rounded-xl border bg-slate-900 transition-all cursor-pointer flex flex-col justify-between group',
            item.nivel === 4 ? 'sirena-roja' : (item.nivel === 3 ? 'sirena-naranja' : 'border-slate-800 hover:border-slate-600')
          ]"
          :style="{ borderLeftWidth: '6px', borderLeftColor: item.color_hex }"
        >
          <div>
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center space-x-1.5">
                  <span v-if="item.nivel >= 3" class="text-sm animate-bounce">🚨</span>
                  <h3 class="font-black text-white text-base group-hover:text-amber-300 transition-colors">{{ item.nombre }}</h3>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">{{ item.municipio }}, {{ item.estado }} (Zona {{ item.zona_id }})</p>
              </div>

              <!-- Etiqueta Parpadeante -->
              <span
                :class="[
                  'text-xs font-black px-2.5 py-1 rounded text-white tracking-wider shadow uppercase',
                  item.nivel >= 3 ? 'badge-sirena' : ''
                ]"
                :style="{ backgroundColor: item.color_hex }"
              >
                {{ item.nivel_nombre }}
              </span>
            </div>

            <!-- Vector Climático -->
            <div class="mt-3 space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <p class="text-slate-300">
                <strong class="text-amber-400 font-bold">Vector:</strong> {{ item.vector_dominante }}
              </p>
              <p class="text-slate-300">
                <strong class="text-slate-400">Magnitud:</strong> {{ item.magnitud }}
              </p>
              <p class="text-slate-300">
                <strong class="text-blue-400">Distancia Temporal:</strong> {{ item.distancia_temporal }}
              </p>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>👥 {{ item.poblacion_censo?.toLocaleString() }} hab.</span>
            <span class="text-amber-400 font-bold group-hover:underline">Ver Ficha y Plan 👉</span>
          </div>
        </div>
      </div>

      <!-- Pantalla limpia si no hay peligro real -->
      <div v-else class="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
        <p class="text-emerald-400 font-bold text-base">🟢 Triaje Normal: Sin Amenazas Meteorológicas Críticas</p>
        <p class="text-xs text-slate-400">Las 84 poblaciones monitoreadas se encuentran en Nivel 1 (Sin Riesgo).</p>
      </div>
    </section>

    <!-- SECCIÓN 2: EXPLORADOR DE LAS 10 ZONAS -->
    <section>
      <div class="flex items-center space-x-2 mb-3">
        <span class="w-3 h-3 rounded-full bg-blue-500"></span>
        <h2 class="text-base md:text-lg font-bold text-white uppercase tracking-wide">
          Explorador por Zonas Operativas
        </h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div
          v-for="zona in resumenZonas"
          :key="zona.zona_id"
          @click="$emit('select-zona', zona.zona_id)"
          class="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Zona {{ zona.zona_id }}</span>
            <h3 class="font-bold text-white text-sm mt-0.5 leading-snug">{{ zona.nucleo_territorial }}</h3>
            <p class="text-xs text-slate-400 mt-1">
              {{ zona.total_poblaciones }} localidades • {{ (zona.poblacion_total_zona / 1000).toFixed(0) }}k hab.
              <span v-if="zona.poblaciones_en_alerta > 0" class="text-amber-400 font-bold ml-1">
                ({{ zona.poblaciones_en_alerta }} en triaje)
              </span>
            </p>
          </div>

          <div
            :class="[
              'w-6 h-6 rounded-full shrink-0 border-2',
              zona.nivel_maximo >= 3 ? 'badge-sirena' : ''
            ]"
            :style="{ backgroundColor: zona.color_maximo_hex, borderColor: '#ffffff22' }"
          ></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  alertaPrioritaria: { type: Array, default: () => [] },
  resumenZonas: { type: Array, default: () => [] },
  poblacionEnRiesgoTotal: { type: Number, default: 0 }
});

defineEmits(['select-poblacion', 'select-zona']);
</script>