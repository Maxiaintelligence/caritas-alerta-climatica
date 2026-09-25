<template>
  <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white shadow-md">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Marca Institucional SatRC -->
      <div class="flex items-center space-x-3">
        <button
          v-if="currentView !== 'nivel1'"
          @click="$emit('back')"
          class="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
          title="Regresar"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>

        <div>
          <div class="flex items-center space-x-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 class="font-black tracking-wider text-base md:text-lg text-white">
              SatRC
            </h1>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 hidden sm:inline-block">
              Alerta Temprana
            </span>
          </div>
          <p class="text-xs text-slate-400 font-medium">
            Cáritas Pastoral Social • Arquidiócesis de Tulancingo
          </p>
        </div>
      </div>

      <!-- Acciones: Administración, Metodología y Refrescar -->
      <div class="flex items-center space-x-2">
        <!-- Botón Candado Administración -->
        <button
          @click="$emit('open-admin')"
          class="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-400 transition-colors cursor-pointer shadow-sm"
          title="Consola de Mando Diocesano"
        >
          🔐
        </button>

        <!-- Botón Metodología -->
        <button
          @click="$emit('open-metodologia')"
          class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm"
          title="Metodología y Aviso Legal"
        >
          <span>ℹ️</span>
          <span class="hidden md:inline">Metodología y Legal</span>
        </button>

        <!-- Botón Refrescar -->
        <button
          @click="$emit('refresh')"
          :disabled="loading"
          class="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-lg text-white transition-colors cursor-pointer flex items-center space-x-1 shadow-sm"
          title="Actualizar datos"
        >
          <svg :class="['w-4 h-4', { 'animate-spin': loading }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Advertencia Sin Conexión -->
    <div v-if="!isOnline" class="bg-amber-600 text-white text-xs text-center py-1.5 px-4 font-medium flex items-center justify-center space-x-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <span>Sin conexión a internet. Consulte a sus autoridades locales y medios oficiales.</span>
    </div>
  </header>
</template>

<script setup>
defineProps({
  currentView: { type: String, required: true },
  timestampLocal: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: true }
});

defineEmits(['back', 'refresh', 'open-metodologia', 'open-admin']);
</script>