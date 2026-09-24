<template>
  <div class="space-y-6">
    <!-- SECCIÓN 1: ALERTA PRIORITARIA (TRIAJE) -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full bg-red-500"></span>
          <h2 class="text-base md:text-lg font-bold text-white uppercase tracking-wide">
            Poblaciones en Alerta Prioritaria (Nivel ≥ 2)
          </h2>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {{ alertaPrioritaria.length }} activas
        </span>
      </div>

      <!-- Tarjetas de alerta -->
      <div v-if="alertaPrioritaria.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="item in alertaPrioritaria"
          :key="item.id"
          @click="$emit('select-poblacion', item.id)"
          class="p-4 rounded-xl border bg-slate-900 hover:border-slate-500 transition-all cursor-pointer flex flex-col justify-between"
          :style="{ borderColor: item.color_hex + '55', borderLeftWidth: '6px', borderLeftColor: item.color_hex }"
        >
          <div>
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-bold text-white text-base">{{ item.nombre }}</h3>
                <p class="text-xs text-slate-400">{{ item.municipio }}, {{ item.estado }} (Zona {{ item.zona_id }})</p>
              </div>
              <span
                class="text-xs font-black px-2.5 py-1 rounded text-white tracking-wider"
                :style="{ backgroundColor: item.color_hex }"
              >
                {{ item.nivel_nombre }}
              </span>
            </div>

            <!-- Módulo disparador -->
            <div class="mt-2.5 flex items-center space-x-2 text-xs text-slate-300">
              <span class="font-semibold text-slate-400">Riesgo:</span>
              <span class="capitalize px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{{ item.modulo_dominante }}</span>
            </div>

            <!-- Sinergias si existen -->
            <div v-if="item.sinergias && item.sinergias.length > 0" class="mt-2">
              <span class="text-[11px] font-bold text-amber-400 flex items-center space-x-1">
                <span>⚠️ {{ item.sinergias[0] }}</span>
              </span>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-800 text-xs text-slate-300 italic">
            👉 {{ item.accion_inmediata }}
          </div>
        </div>
      </div>

      <!-- Estado Seguro -->
      <div v-else class="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-slate-400">
        <p class="text-emerald-400 font-semibold mb-1">🟢 Todas las poblaciones se encuentran en niveles Verde / Azul</p>
        <p class="text-xs">No hay alertas meteorológicas críticas activas en este momento.</p>
      </div>
    </section>

    <!-- SECCIÓN 2: SELECTOR DE LAS 10 ZONAS OPERATIVAS -->
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
              {{ zona.total_poblaciones }} localidades
              <span v-if="zona.poblaciones_en_alerta > 0" class="text-amber-400 font-bold ml-1">
                ({{ zona.poblaciones_en_alerta }} en alerta)
              </span>
            </p>
          </div>

          <div
            class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2"
            :style="{ backgroundColor: zona.color_maximo_hex, borderColor: '#ffffff22' }"
            :title="`Nivel máximo: ${zona.nivel_maximo}`"
          ></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  alertaPrioritaria: { type: Array, default: () => [] },
  resumenZonas: { type: Array, default: () => [] }
});

defineEmits(['select-poblacion', 'select-zona']);
</script>