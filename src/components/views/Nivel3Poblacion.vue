<template>
  <div class="space-y-6">
    <!-- BANNER SIAT PRINCIPAL -->
    <div
      class="p-6 rounded-2xl border text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      :style="{ backgroundColor: poblacion.evaluacion.color_hex + '22', borderColor: poblacion.evaluacion.color_hex }"
    >
      <div>
        <span class="text-xs font-bold tracking-widest uppercase opacity-80">
          Zona {{ poblacion.zona_id }} • {{ poblacion.zona_nombre }}
        </span>
        <h2 class="text-2xl md:text-3xl font-black mt-1">{{ poblacion.nombre }}</h2>
        <p class="text-xs opacity-90 mt-0.5">
          {{ poblacion.municipio }}, {{ poblacion.estado }} • {{ poblacion.poblacion_censo?.toLocaleString() }} hab. • {{ poblacion.coordenadas?.altitud_msnm }} msnm
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <span
          class="text-sm font-black px-4 py-2 rounded-xl text-white tracking-wider shadow-md uppercase"
          :style="{ backgroundColor: poblacion.evaluacion.color_hex }"
        >
          {{ poblacion.evaluacion.nivel_nombre }}
        </span>
      </div>
    </div>

    <!-- BOTÓN A NIVEL 4: PLAN OPERATIVO -->
    <div class="p-4 rounded-2xl bg-slate-900 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-bold text-white flex items-center space-x-1.5">
          <span>📋</span>
          <span>Plan Operativo Detallado de Emergencia (Nivel 4)</span>
        </h3>
        <p class="text-xs text-slate-400 mt-0.5">Pormenores: Cuándo (T₀), Cómo, Refugios Nodos, Raciones y Formato EDAN.</p>
      </div>
      <button
        @click="$emit('ver-plan-operativo', poblacion.id)"
        class="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-1.5"
      >
        <span>Consultar Pormenores</span>
        <span>👉</span>
      </button>
    </div>

    <!-- PRONÓSTICO EVOLUTIVO A 72 HORAS -->
    <section class="space-y-3">
      <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Evolución y Línea de Tiempo a 72 Horas
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          v-for="(item, idx) in poblacion.evaluacion.temporalidad?.pronostico_72h || []"
          :key="idx"
          class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
          :style="{ borderTopWidth: '4px', borderTopColor: item.color_hex }"
        >
          <div>
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-white text-sm">{{ item.dia }}</h4>
              <span class="text-[10px] font-black px-2 py-0.5 rounded text-white" :style="{ backgroundColor: item.color_hex }">
                {{ item.nivel_nombre }}
              </span>
            </div>
            <p class="text-xs text-slate-300 mt-2 font-medium">{{ item.resumen }}</p>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>🌡️ {{ item.temp_min }}° / {{ item.temp_max }}°C</span>
            <span>💧 {{ item.precip_mm }} mm</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SINERGIAS ACTIVAS SI EXISTEN -->
    <div
      v-if="poblacion.evaluacion.sinergias_activas && poblacion.evaluacion.sinergias_activas.length > 0"
      class="p-5 rounded-2xl bg-amber-950/40 border-2 border-amber-500 text-amber-100 space-y-2"
    >
      <div class="flex items-center space-x-2 text-amber-400 font-black text-sm uppercase">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>{{ poblacion.evaluacion.sinergias_activas[0].titulo }}</span>
      </div>
      <p class="text-xs leading-relaxed text-amber-200">
        {{ poblacion.evaluacion.sinergias_activas[0].peligro }}
      </p>
    </div>

    <!-- DESGLOSE DE LOS 7 VECTORES CLIMÁTICOS -->
    <section class="space-y-3">
      <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Diagnóstico de los 7 Vectores Climáticos
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div
          v-for="(vec, key) in poblacion.evaluacion.vectores"
          :key="key"
          class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
          :style="{ borderLeftWidth: '4px', borderLeftColor: colorNivel(vec.nivel) }"
        >
          <div>
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-white uppercase">{{ vec.nombre }}</h4>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                :style="{ backgroundColor: colorNivel(vec.nivel) }"
              >
                Nivel {{ vec.nivel }}
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-300">{{ vec.magnitud }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  poblacion: { type: Object, required: true }
});

defineEmits(['ver-plan-operativo']);

function colorNivel(nivel) {
  if (nivel === 4) return '#EF4444';
  if (nivel === 3) return '#F97316';
  if (nivel === 2) return '#F59E0B';
  return '#10B981';
}
</script>