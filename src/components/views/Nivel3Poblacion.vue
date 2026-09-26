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
        <p class="text-xs text-slate-400 mt-0.5">Pormenores: Cuándo (T₀), Refugio Nodo, Raciones de Alimento y Formato EDAN.</p>
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

    <!-- DESGLOSE DE LOS 7 VECTORES CLIMÁTICOS (INTERACTIVOS CON CLIC) -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Diagnóstico de los 7 Vectores Climáticos
        </h3>
        <span class="text-[11px] text-amber-400 font-semibold">👉 Toca un vector para ver hora por hora</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div
          v-for="(vec, key) in poblacion.evaluacion.vectores"
          :key="key"
          @click="abrirVectorHorario(key)"
          class="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/80 transition-all cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md"
          :style="{ borderLeftWidth: '4px', borderLeftColor: colorNivel(vec.nivel) }"
        >
          <div>
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-white uppercase group-hover:text-amber-300 transition-colors">
                {{ vec.nombre }}
              </h4>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                :style="{ backgroundColor: colorNivel(vec.nivel) }"
              >
                Nivel {{ vec.nivel }}
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-300">{{ vec.magnitud }}</p>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-amber-400 transition-colors">
            <span>Evolución a futuro (24h)</span>
            <span>⏱️ ➔</span>
          </div>
        </div>
      </div>
    </section>

    <!-- MODAL DE DESGLOSE HORA POR HORA (A PARTIR DE LA HORA ACTUAL) -->
    <div
      v-if="vectorSeleccionado"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Encabezado Modal -->
        <div class="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Hora Actual ➔ Próximas 24 Horas
              </span>
            </div>
            <h3 class="text-base font-bold text-white mt-1">{{ poblacion.evaluacion.vectores[vectorSeleccionado]?.nombre }}</h3>
            <p class="text-xs text-slate-400">{{ poblacion.nombre }}, {{ poblacion.municipio }}</p>
          </div>
          <button
            @click="vectorSeleccionado = null"
            class="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Lista Horaria Desplazable con Separadores Hoy / Mañana -->
        <div class="p-4 overflow-y-auto space-y-2 flex-1">
          <template v-for="(item, idx) in poblacion.evaluacion.evolucion_horaria?.[vectorSeleccionado] || []" :key="idx">
            
            <!-- Separador Visual de Día cuando cambia de Hoy a Mañana -->
            <div
              v-if="idx === 0 || item.dia !== poblacion.evaluacion.evolucion_horaria?.[vectorSeleccionado]?.[idx - 1]?.dia"
              class="py-1 px-3 my-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between font-bold text-[11px] text-amber-400 uppercase tracking-wider"
            >
              <span>📅 {{ item.dia === 'Hoy' ? 'Evolución para el resto del día de Hoy' : 'Pronóstico para el día de Mañana' }}</span>
              <span class="text-[10px] text-slate-500 font-mono">{{ item.dia }}</span>
            </div>

            <!-- Fila Horaria -->
            <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
              <div class="flex items-center space-x-3">
                <span class="font-mono font-bold text-slate-100 text-sm w-12">{{ item.hora }}</span>
                <div>
                  <p class="font-bold text-white">{{ item.valor }}</p>
                  <p class="text-[11px] text-slate-400">{{ item.consejo }}</p>
                </div>
              </div>

              <span
                class="text-[10px] font-black px-2 py-0.5 rounded text-white"
                :style="{ backgroundColor: colorNivel(item.nivel) }"
              >
                Nivel {{ item.nivel }}
              </span>
            </div>
          </template>
        </div>

        <!-- Pie Modal -->
        <div class="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            @click="vectorSeleccionado = null"
            class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Cerrar cronología
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  poblacion: { type: Object, required: true }
});

defineEmits(['ver-plan-operativo']);

const vectorSeleccionado = ref(null);

function abrirVectorHorario(key) {
  vectorSeleccionado.value = key;
}

function colorNivel(nivel) {
  if (nivel === 4) return '#EF4444';
  if (nivel === 3) return '#F97316';
  if (nivel === 2) return '#F59E0B';
  return '#10B981';
}
</script>