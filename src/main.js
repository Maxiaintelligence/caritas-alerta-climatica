import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// Manejador global de errores para prevenir pantallas blancas ante datos atípicos
app.config.errorHandler = (err, instance, info) => {
  console.error('🚨 Error interceptado por SatRC Error Boundary:', err, info);
}

app.mount('#app')