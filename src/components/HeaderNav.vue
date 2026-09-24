<template>
  <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Marca y Navegación -->
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
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h1 class="font-bold tracking-wide text-sm md:text-base text-slate-100 uppercase">
              Cáritas Pastoral Social
            </h1>
          </div>
          <p class="text-xs text-slate-400">Sistema de Alerta Temprana y Riesgo Climático</p>
        </div>
      </div>

      <!-- Estado y Actualización -->
      <div class="flex items-center space-x-3">
        <div class="text-right hidden sm:block">
          <p class="text-[10px] text-slate-400 uppercase tracking-wider">Última evaluación</p>
          <p class="text-xs font-mono text-slate-200">{{ timestampLocal || 'Sincronizando...' }}</p>
        </div>

        <button
          @click="$emit('refresh')"
          :disabled="loading"
          class="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-lg text-white transition-colors cursor-pointer flex items-center space-x-1"
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
      <span>Sin conexión a internet. Verifique canales locales de Protección Civil.</span>
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

defineEmits(['back', 'refresh']);
</script>