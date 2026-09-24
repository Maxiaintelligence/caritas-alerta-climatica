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
        <p class="text-sm opacity-90">{{ poblacion.municipio }}, {{ poblacion.estado }} • {{ poblacion.coordenadas.altitud_msnm }} msnm</p>
      </div>

      <div class="flex items-center space-x-3">
        <span
          class="text-sm font-black px-4 py-2 rounded-xl text-white tracking-widest shadow-md uppercase"
          :style="{ backgroundColor: poblacion.evaluacion.color_hex }"
        >
          {{ poblacion.evaluacion.nivel_nombre }} (Nivel {{ poblacion.evaluacion.nivel_final }})
        </span>
      </div>
    </div>

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
        <strong>Diagnóstico:</strong> {{ poblacion.evaluacion.sinergias_activas[0].diagnostico }}
      </p>
      <p class="text-xs leading-relaxed text-amber-200">
        <strong>Peligro Identificado:</strong> {{ poblacion.evaluacion.sinergias_activas[0].peligro }}
      </p>
      <div class="mt-3 pt-3 border-t border-amber-500/30">
        <p class="text-xs font-bold text-amber-300 mb-1 uppercase">Medidas Preventivas Inmediatas:</p>
        <ul class="list-disc list-inside text-xs space-y-1 text-amber-100">
          <li v-for="(medida, idx) in poblacion.evaluacion.sinergias_activas[0].medidas" :key="idx">{{ medida }}</li>
        </ul>
      </div>
    </div>

    <!-- PROTOCOLOS INSTITUCIONALES CÁRITAS PASTORAL SOCIAL -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <h3 class="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
          <span>👥</span>
          <span>Protocolo Comunitario (Población)</span>
        </h3>
        <p class="text-xs leading-relaxed text-slate-200">
          {{ poblacion.evaluacion.protocolo_comunitario }}
        </p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <h3 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
          <span>⛪</span>
          <span>Acción Cáritas Pastoral Social</span>
        </h3>
        <p class="text-xs leading-relaxed text-slate-200">
          {{ poblacion.evaluacion.protocolo_caritas }}
        </p>
      </div>
    </div>

    <!-- DESGLOSE TRANSPARENTE DE LOS 7 MÓDULOS -->
    <div class="space-y-3">
      <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Diagnóstico por Módulos Meteorológicos (7 Módulos)
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div
          v-for="(modRes, modKey) in poblacion.evaluacion.modulos"
          :key="modKey"
          class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
          :style="{ borderLeftWidth: '4px', borderLeftColor: modRes.color_hex }"
        >
          <div>
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-white uppercase">{{ nombresModulos[modKey] || modKey }}</h4>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                :style="{ backgroundColor: modRes.color_hex }"
              >
                Nivel {{ modRes.nivel }}
              </span>
            </div>

            <!-- Variables disparadoras -->
            <div class="mt-2 text-[11px] text-slate-400 space-y-1">
              <div v-if="modRes.variables_disparadoras.length > 0">
                <p v-for="(v, idx) in modRes.variables_disparadoras" :key="idx" class="text-slate-300">
                  • {{ v }}
                </p>
              </div>
              <p v-else class="text-slate-500 italic">Parámetros dentro del rango seguro.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  poblacion: { type: Object, required: true }
});

const nombresModulos = {
  inundacion: 'Inundaciones',
  heladas: 'Bajas Temp. / Heladas',
  calor: 'Ondas de Calor',
  laderas: 'Inestabilidad Laderas',
  incendios: 'Incendios Forestales',
  tormentas: 'Tormentas Eléctricas',
  ciclones: 'Ciclones Tropicales'
};
</script>