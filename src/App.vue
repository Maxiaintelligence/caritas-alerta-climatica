<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
    <!-- Barra Superior -->
    <HeaderNav
      :current-view="currentView"
      :timestamp-local="riskData?.meta?.timestamp_local"
      :loading="loading"
      :is-online="isOnline"
      @back="goBack"
      @refresh="loadRiskData"
    />

    <!-- Contenido Principal -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
      <!-- Estado de Carga -->
      <div v-if="loading && !riskData" class="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm">Evaluando vectores climáticos...</p>
      </div>

      <!-- Error de Conexión -->
      <div v-else-if="error" class="p-6 rounded-2xl bg-red-950/50 border border-red-800 text-center space-y-3">
        <p class="text-red-400 font-bold">No se pudieron sincronizar los datos meteorológicos.</p>
        <p class="text-xs text-slate-400">{{ error }}</p>
        <button
          @click="loadRiskData"
          class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>

      <!-- Las 4 Vistas Jerárquicas -->
      <div v-else-if="riskData">
        <!-- Nivel 1: Dashboard Triaje -->
        <Nivel1Home
          v-if="currentView === 'nivel1'"
          :alerta-prioritaria="riskData.alerta_prioritaria"
          :resumen-zonas="riskData.resumen_zonas"
          :poblacion-en-riesgo-total="riskData.meta.poblacion_en_riesgo_total"
          @select-zona="onSelectZona"
          @select-poblacion="onSelectPoblacion"
        />

        <!-- Nivel 2: Panorama Zonal -->
        <Nivel2Zona
          v-else-if="currentView === 'nivel2' && selectedZona"
          :zona="selectedZona"
          :poblaciones-zona="poblacionesDeZona"
          @select-poblacion="onSelectPoblacion"
        />

        <!-- Nivel 3: Ficha Población 72h -->
        <Nivel3Poblacion
          v-else-if="currentView === 'nivel3' && selectedPoblacion"
          :poblacion="selectedPoblacion"
          @ver-plan-operativo="onVerPlanOperativo"
        />

        <!-- Nivel 4: Plan Operativo Detallado (Pormenores) -->
        <Nivel4Detalle
          v-else-if="currentView === 'nivel4' && selectedPoblacion"
          :poblacion="selectedPoblacion"
        />
      </div>
    </main>

    <!-- Pie Institucional -->
    <footer class="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
      <p>Cáritas Pastoral Social • Sistema Vectorial de Alerta Temprana v2.0 • 71 Localidades Monitoreadas</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import HeaderNav from './components/HeaderNav.vue';
import Nivel1Home from './components/views/Nivel1Home.vue';
import Nivel2Zona from './components/views/Nivel2Zona.vue';
import Nivel3Poblacion from './components/views/Nivel3Poblacion.vue';
import Nivel4Detalle from './components/views/Nivel4Detalle.vue';

const riskData = ref(null);
const loading = ref(false);
const error = ref(null);
const isOnline = ref(navigator.onLine);

const currentView = ref('nivel1');
const selectedZonaId = ref(null);
const selectedPoblacionId = ref(null);

async function loadRiskData() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(`/data/latest-risk.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    riskData.value = await res.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function onSelectZona(zonaId) {
  selectedZonaId.value = zonaId;
  currentView.value = 'nivel2';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onSelectPoblacion(poblacionId) {
  selectedPoblacionId.value = poblacionId;
  currentView.value = 'nivel3';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onVerPlanOperativo(poblacionId) {
  selectedPoblacionId.value = poblacionId;
  currentView.value = 'nivel4';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (currentView.value === 'nivel4') {
    currentView.value = 'nivel3';
  } else if (currentView.value === 'nivel3') {
    currentView.value = selectedZonaId.value ? 'nivel2' : 'nivel1';
  } else if (currentView.value === 'nivel2') {
    currentView.value = 'nivel1';
    selectedZonaId.value = null;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const selectedZona = computed(() => {
  if (!riskData.value || !selectedZonaId.value) return null;
  return riskData.value.resumen_zonas.find(z => z.zona_id === selectedZonaId.value);
});

const poblacionesDeZona = computed(() => {
  if (!riskData.value || !selectedZona.value) return [];
  const ids = selectedZona.value.lista_poblaciones_ids || [];
  return ids.map(id => riskData.value.detalle_poblaciones[id]).filter(Boolean);
});

const selectedPoblacion = computed(() => {
  if (!riskData.value || !selectedPoblacionId.value) return null;
  return riskData.value.detalle_poblaciones[selectedPoblacionId.value];
});

function updateOnlineStatus() {
  isOnline.value = navigator.onLine;
}

onMounted(() => {
  loadRiskData();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>