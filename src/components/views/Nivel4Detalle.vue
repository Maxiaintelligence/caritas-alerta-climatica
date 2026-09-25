<template>
  <div class="space-y-6">
    <!-- ENCABEZADO DE NIVEL 4 -->
    <div
      class="p-6 rounded-2xl border text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      :style="{ backgroundColor: poblacion.evaluacion.color_hex + '25', borderColor: poblacion.evaluacion.color_hex }"
    >
      <div>
        <div class="flex items-center space-x-2">
          <span class="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-black/50 text-amber-300">
            Nivel 4: Plan Operativo Táctico
          </span>
          <span class="text-xs text-slate-300">Zona {{ poblacion.zona_id }} • {{ poblacion.zona_nombre }}</span>
        </div>
        <h2 class="text-2xl md:text-3xl font-black mt-2 text-white">{{ poblacion.nombre }}</h2>
        <p class="text-xs text-slate-300 mt-1">
          {{ poblacion.municipio }}, {{ poblacion.estado }} • {{ poblacion.poblacion_censo?.toLocaleString() }} habitantes • {{ poblacion.coordenadas?.altitud_msnm }} msnm
        </p>
      </div>

      <div class="text-right">
        <span
          class="text-sm font-black px-4 py-2 rounded-xl text-white tracking-wider uppercase shadow"
          :style="{ backgroundColor: poblacion.evaluacion.color_hex }"
        >
          {{ poblacion.evaluacion.nivel_nombre }}
        </span>
      </div>
    </div>

    <!-- 1. ¿CUÁNDO OCURRIRÁ? (MARCO TEMPORAL) -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center space-x-2">
        <span>⏱️</span>
        <span>1. ¿Cuándo ocurrirá? (Marco Temporal)</span>
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <p class="text-[10px] text-slate-400 uppercase font-bold">Ventana de Impacto</p>
          <p class="text-sm font-bold text-white mt-1">{{ poblacion.evaluacion.temporalidad?.ventana_impacto || 'En monitoreo' }}</p>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <p class="text-[10px] text-slate-400 uppercase font-bold">Hora Pico de Riesgo</p>
          <p class="text-sm font-bold text-amber-300 mt-1">{{ poblacion.evaluacion.temporalidad?.hora_pico_estimada || 'Pendiente' }}</p>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <p class="text-[10px] text-slate-400 uppercase font-bold">Tiempo de Preparación</p>
          <p class="text-sm font-bold text-emerald-400 mt-1">
            ~{{ poblacion.evaluacion.temporalidad?.horas_disponibles_preparacion || 3 }} horas disponibles
          </p>
        </div>
      </div>
    </section>

    <!-- 2. ¿CÓMO OCURRIRÁ? (VECTOR FÍSICO Y CONSENSO) -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center space-x-2">
        <span>📊</span>
        <span>2. ¿Cómo ocurrirá y por qué? (Vector Físico y Consenso)</span>
      </h3>
      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <p class="text-xs text-slate-300 leading-relaxed">
          <strong class="text-white font-bold">Vector Dominante:</strong> {{ poblacion.evaluacion.vector_dominante }}
        </p>
        <p class="text-xs text-slate-300 leading-relaxed">
          <strong class="text-white font-bold">Magnitud Físico-Ambiental:</strong> {{ poblacion.evaluacion.magnitud_principal }}
        </p>
        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Consenso de Fuentes:</span>
          <span class="text-emerald-400 font-semibold">Open-Meteo + SMN / CONAGUA + NOAA</span>
        </div>
      </div>
    </section>

    <!-- SINERGIAS ACTIVAS SI EXISTEN -->
    <section
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
    </section>

    <!-- 3. PLAN TÁCTICO CÁRITAS PASTORAL SOCIAL (LOGÍSTICA) -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <h3 class="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
        <span>⛪</span>
        <span>3. Plan Táctico de Cáritas Pastoral Social</span>
      </h3>
      
      <!-- Cifras de Albergue y Raciones -->
      <div v-if="poblacion.evaluacion.logistica_caritas" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
          <p class="text-[10px] text-emerald-300 uppercase font-bold">Capacidad de Refugio Parroquial</p>
          <p class="text-base font-black text-emerald-200 mt-1">
            {{ poblacion.evaluacion.logistica_caritas.capacidad_albergue_estimada?.toLocaleString() }} personas
          </p>
        </div>
        <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
          <p class="text-[10px] text-emerald-300 uppercase font-bold">Comedor de Emergencia</p>
          <p class="text-base font-black text-emerald-200 mt-1">
            {{ poblacion.evaluacion.logistica_caritas.raciones_diarias_comedor?.toLocaleString() }} raciones / día
          </p>
        </div>
        <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
          <p class="text-[10px] text-emerald-300 uppercase font-bold">Reserva de Agua 72h</p>
          <p class="text-base font-black text-emerald-200 mt-1">
            {{ poblacion.evaluacion.logistica_caritas.reserva_agua_litros?.toLocaleString() }} litros
          </p>
        </div>
      </div>

      <!-- Protocolo Institucional -->
      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <p class="text-xs font-bold text-slate-300 uppercase tracking-wider">Protocolo de Operación:</p>
        <p class="text-xs text-slate-200 leading-relaxed">
          {{ poblacion.evaluacion.protocolo_caritas }}
        </p>
      </div>

      <!-- Checklist Operativo -->
      <div class="space-y-2 pt-1">
        <p class="text-xs font-bold text-slate-300 uppercase tracking-wider">Acciones Operativas Inmediatas:</p>
        <ul class="space-y-2 text-xs text-slate-200">
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">1.</span>
            <span>Habilitación y acondicionamiento preventivo de salones parroquiales como albergues temporales.</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">2.</span>
            <span>Verificación física de lámparas de emergencia/baterías, botiquines y reserva de alimentos no perecederos.</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">3.</span>
            <span>Establecimiento de enlace radial o telefónico directo con el Consejo Municipal de Protección Civil.</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 4. GUÍA DE PROTECCIÓN FAMILIAR -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center space-x-2">
        <span>👥</span>
        <span>4. Guía de Seguridad para la Familia</span>
      </h3>
      <p class="text-xs leading-relaxed text-slate-300">
        {{ poblacion.evaluacion.protocolo_comunitario }}
      </p>
      <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 italic">
        ⚠️ Si habita cerca de cauces de ríos, arroyos o al pie de laderas con historial de deslaves, realice su traslado preventivo con luz natural antes de la hora pico estimada ({{ poblacion.evaluacion.temporalidad?.hora_pico_estimada }}).
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  poblacion: { type: Object, required: true }
});
</script>