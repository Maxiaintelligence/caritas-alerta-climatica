<template>
  <div class="space-y-6">
    <!-- ENCABEZADO TÁCTICO DE NIVEL 4 -->
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

    <!-- 1. ¿CUÁNDO OCURRIRÁ? (TEMPORALIDAD DESDE HORA CERO T0) -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center space-x-2">
        <span>⏱️</span>
        <span>1. ¿Cuándo ocurrirá? (Horizonte desde Hora Cero T₀)</span>
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <p class="text-[10px] text-slate-400 uppercase font-bold">Ventana de Impacto</p>
          <p class="text-sm font-bold text-white mt-1">{{ poblacion.evaluacion.temporalidad?.ventana_impacto || 'En monitoreo' }}</p>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <p class="text-[10px] text-slate-400 uppercase font-bold">Hora Crítica Estimada</p>
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

    <!-- 2. ¿CÓMO OCURRIRÁ? (VECTOR Y CONSENSO MULTI-MODELO) -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center space-x-2">
        <span>📊</span>
        <span>2. ¿Cómo ocurrirá y por qué? (Vector Físico y Consenso)</span>
      </h3>
      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
        <p class="text-xs text-slate-300 leading-relaxed">
          <strong class="text-white font-bold">Vector Dominante:</strong> {{ poblacion.evaluacion.vector_dominante }}
        </p>
        <p class="text-xs text-slate-300 leading-relaxed">
          <strong class="text-white font-bold">Magnitud Físico-Ambiental:</strong> {{ poblacion.evaluacion.magnitud_principal }}
        </p>
        <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Consenso de Ensamble:</span>
          <span class="text-emerald-400 font-semibold">ECMWF (9km) + NOAA GFS (13km) + SMN + NOAA NHC</span>
        </div>
      </div>
    </section>

    <!-- 3. FICHA DE UBICACIÓN Y LOGÍSTICA GEORREFERENCIADA -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
        <span>📍</span>
        <span>3. Ficha de Ubicación y Refugio Nodo</span>
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
          <p class="text-[10px] text-cyan-300 uppercase font-bold">Refugio Parroquial Nodo</p>
          <p class="font-bold text-white text-sm">{{ poblacion.nombre }} - Salón Parroquial</p>
          <p class="text-slate-400">Capacidad estimada: {{ poblacion.evaluacion.logistica_caritas?.capacidad_albergue_estimada?.toLocaleString() }} personas (Losa firme)</p>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
          <p class="text-[10px] text-cyan-300 uppercase font-bold">Punto de Encuentro y Rutas</p>
          <p class="font-bold text-white text-sm">Explanada / Atrio Parroquial Seguro</p>
          <p class="text-slate-400">Evacuación hacia cotas altas fuera de cuencas aluviales.</p>
        </div>
      </div>
    </section>

    <!-- 4. PLAN TÁCTICO CÁRITAS PASTORAL SOCIAL -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <h3 class="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
        <span>⛪</span>
        <span>4. Plan Táctico de Cáritas Pastoral Social</span>
      </h3>
      
      <!-- Cifras de Albergue y Raciones -->
      <div v-if="poblacion.evaluacion.logistica_caritas" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
          <p class="text-[10px] text-emerald-300 uppercase font-bold">Capacidad de Albergue</p>
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

      <!-- Checklist Operativo con Población Asistida -->
      <div class="space-y-2 pt-1">
        <p class="text-xs font-bold text-slate-300 uppercase tracking-wider">Acciones Operativas Inmediatas:</p>
        <ul class="space-y-2 text-xs text-slate-200">
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">1.</span>
            <span>Habilitación y sanitización preventiva de salones parroquiales como albergues temporales seguros.</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">2.</span>
            <span><strong>Evacuación Asistida</strong>: Registro y apoyo inmediato para personas con discapacidad, mujeres embarazadas y enfermos crónicos.</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">3.</span>
            <span>Verificación de reservas de agua embotellada, alimentos no perecederos y lámparas de emergencia.</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-emerald-400 font-bold">4.</span>
            <span>Establecimiento de enlace directo con el Consejo Municipal de Protección Civil y radios comunitarias.</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 5. GUÍA FAMILIAR Y GRUPOS ESPECÍFICOS -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center space-x-2">
        <span>👥</span>
        <span>5. Guía de Autoprotección Comunitaria</span>
      </h3>
      <p class="text-xs leading-relaxed text-slate-300">
        {{ poblacion.evaluacion.protocolo_comunitario }}
      </p>
      <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 italic space-y-1">
        <p>⚠️ <strong>Jornaleros y trabajadores al aire libre</strong>: Suspender faenas pesadas ante alertas de calor o tormentas.</p>
        <p>⚠️ <strong>Ganado y mascotas</strong>: Desplazar animales de granja a zonas altas antes del pico de lluvia.</p>
      </div>
    </section>

    <!-- 6. PROTOCOLO POST-EVENTO (FICHA EDAN CÁRITAS) -->
    <section class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h3 class="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center space-x-2">
        <span>📋</span>
        <span>6. Protocolo de Recuperación Post-Evento (EDAN Cáritas)</span>
      </h3>
      <div class="space-y-2 text-xs text-slate-300">
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <p class="font-bold text-white">Cronograma Humanitario:</p>
          <p>• <strong>0 a 24h post-impacto</strong>: Censo rápido de familias damnificadas y personas en albergue.</p>
          <p>• <strong>24 a 72h</strong>: Distribución de despensas, agua purificada y cobijas.</p>
          <p>• <strong>72h a 7 días</strong>: Levantamiento del Formato EDAN Cáritas para gestión de ayuda diocesana.</p>
          <p>• <strong>Día 15 en adelante</strong>: Plan de reconstrucción y lecciones aprendidas.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  poblacion: { type: Object, required: true }
});
</script>