<template>
  <div class="space-y-6">
    <!-- Encabezado de Zona -->
    <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Zona {{ zona.zona_id }}</span>
        <h2 class="text-xl md:text-2xl font-black text-white mt-1">{{ zona.nucleo_territorial }}</h2>
        <p class="text-xs text-slate-400 mt-1">Panorama comparativo de las localidades que integran esta zona.</p>
      </div>

      <div class="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div class="text-right">
          <p class="text-[10px] text-slate-400 uppercase">Riesgo Máximo Zonal</p>
          <p class="text-xs font-bold text-white">Nivel {{ zona.nivel_maximo }} de 4</p>
        </div>
        <span
          class="w-5 h-5 rounded-full"
          :style="{ backgroundColor: zona.color_maximo_hex }"
        ></span>
      </div>
    </div>

    <!-- Lista de Poblaciones de la Zona -->
    <div class="space-y-2.5">
      <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Localidades Monitoreadas ({{ poblacionesZona.length }})</h3>

      <div
        v-for="pob in poblacionesZona"
        :key="pob.id"
        @click="$emit('select-poblacion', pob.id)"
        class="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-between"
        :style="{ borderLeftWidth: '5px', borderLeftColor: pob.evaluacion.color_hex }"
      >
        <div>
          <div class="flex items-center space-x-2">
            <h4 class="font-bold text-white text-base">{{ pob.nombre }}</h4>
            <span class="text-xs text-slate-400">({{ pob.municipio }}, {{ pob.estado }})</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Módulo activo: <strong class="text-slate-200 capitalize">{{ pob.evaluacion.modulo_dominante }}</strong>
          </p>
        </div>

        <div class="flex items-center space-x-3">
          <span
            class="text-xs font-bold px-2.5 py-1 rounded text-white"
            :style="{ backgroundColor: pob.evaluacion.color_hex }"
          >
            {{ pob.evaluacion.nivel_nombre }}
          </span>
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  zona: { type: Object, required: true },
  poblacionesZona: { type: Array, required: true }
});

defineEmits(['select-poblacion']);
</script>