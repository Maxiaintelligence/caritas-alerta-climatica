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
      @open-metodologia="isMetodologiaOpen = true"
      @open-admin="handleOpenAdmin"
    />

    <!-- BANNER DE SIMULACRO ACTIVO SI SE DISPARÓ DESDE EL PANEL -->
    <div
      v-if="simulacroActivo"
      class="bg-purple-900 border-b border-purple-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg animate-pulse"
    >
      <div class="flex items-center space-x-2">
        <span class="text-base">🚨</span>
        <span>MODO SIMULACRO ACTIVO — {{ simulacroInfo?.nombre }} en {{ simulacroInfo?.nivel_nombre }} ({{ simulacroInfo?.vector }})</span>
      </div>
      <button
        @click="desactivarSimulacro"
        class="px-3 py-1 bg-black/40 hover:bg-black/60 rounded-lg text-purple-200 border border-purple-400/50 cursor-pointer"
      >
        ✕ Desactivar Simulacro
      </button>
    </div>

    <!-- Contenido Principal -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
      <!-- Estado de Carga -->
      <div v-if="loading && !riskData" class="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm">Evaluando vectores meteorológicos en SatRC...</p>
      </div>

      <!-- Error de Conexión -->
      <div v-else-if="error" class="p-6 rounded-2xl bg-red-950/50 border border-red-800 text-center space-y-3">
        <p class="text-red-400 font-bold">No se pudieron sincronizar los datos meteorológicos.</p>
        <p class="text-xs text-slate-400">Consulte a sus autoridades locales y medios oficiales para más información.</p>
        <button
          @click="loadRiskData"
          class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>

      <!-- Las 4 Vistas Jerárquicas -->
      <div v-else-if="displayRiskData">
        <!-- Nivel 1: Dashboard Triaje -->
        <Nivel1Home
          v-if="currentView === 'nivel1'"
          :alerta-prioritaria="displayRiskData.alerta_prioritaria"
          :resumen-zonas="displayRiskData.resumen_zonas"
          :poblacion-en-riesgo-total="displayRiskData.meta.poblacion_en_riesgo_total"
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

    <!-- Modal de Autenticación de Mando -->
    <div
      v-if="isLoginModalOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="text-center space-y-1">
          <div class="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-xl">
            🔐
          </div>
          <h3 class="text-base font-bold text-white">Consola de Mando Diocesano</h3>
          <p class="text-xs text-slate-400">Ingrese la clave de seguridad para continuar.</p>
        </div>

        <form @submit.prevent="submitPassword" class="space-y-3">
          <input
            v-model="passwordInput"
            type="password"
            placeholder="Clave de seguridad"
            class="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
            autofocus
          />
          <p v-if="passwordError" class="text-xs text-red-400 font-bold text-center">Clave incorrecta.</p>

          <div class="flex items-center space-x-2 pt-1">
            <button
              type="button"
              @click="isLoginModalOpen = false; passwordInput = ''; passwordError = false;"
              class="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow"
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de la Consola de Administración -->
    <AdminPanelModal
      v-if="isAdminPanelOpen"
      :risk-data="riskData"
      :simulacro-activo-global="simulacroActivo"
      @close="isAdminPanelOpen = false"
      @activar-simulacro="activarSimulacro"
      @desactivar-simulacro="desactivarSimulacro"
    />

    <!-- Modal de Metodología y Aviso Legal -->
    <MetodologiaModal
      v-if="isMetodologiaOpen"
      @close="isMetodologiaOpen = false"
    />

    <!-- Pie Institucional Oficial -->
    <footer class="bg-slate-900 border-t border-slate-800 py-5 text-center text-xs text-slate-400">
      <div class="max-w-5xl mx-auto px-4 space-y-2">
        <p class="font-medium text-slate-300">
          SatRC v1.0 • Cáritas Pastoral Social de la Arquidiócesis de Tulancingo • Cobertura Regional (91 Localidades)
        </p>
        <p class="text-[11px] text-slate-500">
          Consulte a sus autoridades locales y medios oficiales para más información.
        </p>
        <div class="pt-1 flex items-center justify-center space-x-4">
          <button
            @click="isMetodologiaOpen = true"
            class="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
          >
            Metodología y Aviso Legal
          </button>
          <span class="text-slate-600">•</span>
          <button
            @click="handleOpenAdmin"
            class="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            Consola de Mando 🔐
          </button>
        </div>
      </div>
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
import MetodologiaModal from './components/views/MetodologiaModal.vue';
import AdminPanelModal from './components/views/AdminPanelModal.vue';

const riskData = ref(null);
const loading = ref(false);
const error = ref(null);
const isOnline = ref(navigator.onLine);

const isMetodologiaOpen = ref(false);
const isLoginModalOpen = ref(false);
const isAdminPanelOpen = ref(false);
const passwordInput = ref('');
const passwordError = ref(false);

const simulacroActivo = ref(false);
const simulacroInfo = ref(null);

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

// Simulador Reactivo en Toda la PWA
function activarSimulacro(payload) {
  const { poblacionId, nivel, vector } = payload;
  if (!riskData.value) return;

  simulacroActivo.value = true;
  const p = riskData.value.detalle_poblaciones[poblacionId];

  simulacroInfo.value = {
    poblacionId,
    nombre: p?.nombre || 'Localidad',
    nivel,
    nivel_nombre: nivel === 4 ? 'CRÍTICO' : 'ALTO',
    vector
  };
}

function desactivarSimulacro() {
  simulacroActivo.value = false;
  simulacroInfo.value = null;
}

// Datos calculados que inyectan el simulacro en vivo en las pantallas
const displayRiskData = computed(() => {
  if (!riskData.value) return null;
  if (!simulacroActivo.value || !simulacroInfo.value) return riskData.value;

  const clone = JSON.parse(JSON.stringify(riskData.value));
  const sim = simulacroInfo.value;
  const p = clone.detalle_poblaciones[sim.poblacionId];

  if (p) {
    const colorHex = sim.nivel === 4 ? '#EF4444' : '#F97316';
    p.evaluacion.nivel_final = sim.nivel;
    p.evaluacion.nivel_nombre = sim.nivel_nombre;
    p.evaluacion.color_hex = colorHex;
    p.evaluacion.vector_dominante = sim.vector + ' (SIMULACRO ACTIVO)';
    p.evaluacion.magnitud_principal = 'Escenario de prueba táctica diocesana inyectado';
    p.evaluacion.temporalidad.ventana_impacto = 'Impacto en 2 horas (Simulación)';
    p.evaluacion.temporalidad.hora_pico_estimada = '16:00 a 19:00 hrs';

    // Inyectar en Triaje Nivel 1
    clone.alerta_prioritaria = clone.alerta_prioritaria.filter(a => a.id !== p.id);
    clone.alerta_prioritaria.unshift({
      id: p.id,
      nombre: p.nombre,
      municipio: p.municipio,
      estado: p.estado,
      zona_id: p.zona_id,
      zona_nombre: p.zona_nombre,
      poblacion_censo: p.poblacion_censo,
      nivel: sim.nivel,
      nivel_nombre: sim.nivel_nombre,
      color_hex: colorHex,
      vector_dominante: sim.vector + ' (SIMULACRO)',
      magnitud: 'Escenario de prueba táctica diocesana inyectado',
      distancia_temporal: 'Pico estimado: 16:00 a 19:00 hrs (Simulación)',
      hora_pico: '16:00 a 19:00 hrs',
      accion_inmediata: sim.nivel === 4 ? '¡Emergencia simulada! Evacuación obligatoria a albergues.' : 'Movilización táctica de brigadas.'
    });

    // Inyectar en Zona Nivel 2
    const z = clone.resumen_zonas.find(item => item.zona_id === p.zona_id);
    if (z) {
      z.nivel_maximo = sim.nivel;
      z.color_maximo_hex = colorHex;
      z.poblaciones_en_alerta = 1;
      z.poblacion_en_riesgo = p.poblacion_censo;
    }
  }

  return clone;
});

function handleOpenAdmin() {
  passwordInput.value = '';
  passwordError.value = false;
  isLoginModalOpen.value = true;
}

function submitPassword() {
  if (passwordInput.value === 'emergencia') {
    isLoginModalOpen.value = false;
    isAdminPanelOpen.value = true;
    passwordInput.value = '';
    passwordError.value = false;
  } else {
    passwordError.value = true;
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
  if (!displayRiskData.value || !selectedZonaId.value) return null;
  return displayRiskData.value.resumen_zonas.find(z => z.zona_id === selectedZonaId.value);
});

const poblacionesDeZona = computed(() => {
  if (!displayRiskData.value || !selectedZona.value) return [];
  const ids = selectedZona.value.lista_poblaciones_ids || [];
  return ids.map(id => displayRiskData.value.detalle_poblaciones[id]).filter(Boolean);
});

const selectedPoblacion = computed(() => {
  if (!displayRiskData.value || !selectedPoblacionId.value) return null;
  return displayRiskData.value.detalle_poblaciones[selectedPoblacionId.value];
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