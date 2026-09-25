import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const latestRiskPath = path.join(DATA_DIR, 'latest-risk.json');
const activeAlertsPath = path.join(DATA_DIR, 'active_alerts.json');

// Credenciales y URLs
const SMTP_USER = process.env.SMTP_USER || 'pescolaboral@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'ycqv kwsf rsmd iuwh';
const DESTINATION_EMAIL = process.env.ALERT_DESTINATION || 'antoniogmadrigal@gmail.com';
const VERCEL_URL = process.env.VERCEL_APP_URL || 'https://caritas-alerta-climatica.vercel.app';

if (!fs.existsSync(latestRiskPath)) {
  console.log('⚠️ No existe latest-risk.json para evaluar alertas.');
  process.exit(0);
}

const latestRisk = JSON.parse(fs.readFileSync(latestRiskPath, 'utf8'));

// Cargar o inicializar estado de alertas activas
let activeAlerts = {};
if (fs.existsSync(activeAlertsPath)) {
  try {
    activeAlerts = JSON.parse(fs.readFileSync(activeAlertsPath, 'utf8'));
  } catch (e) {
    activeAlerts = {};
  }
}

// Configurar transportador SMTP seguro (IPv4 y Puerto 587)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  family: 4 // Fuerza IPv4 para evitar el bloqueo ETIMEDOUT de IPv6
});

const isTestMode = process.argv.includes('--test');

async function sendEmailAlert(poblacion, isReminder = false) {
  const { evaluacion } = poblacion;
  const colorBadge = evaluacion.nivel_final === 4 ? '#EF4444' : '#F97316';
  const ackUrl = `${VERCEL_URL}/api/ack-alert?id=${poblacion.id}&level=${evaluacion.nivel_final}&ts=${Date.now()}`;

  const subject = isReminder
    ? `🚨 [RECORDATORIO URGENTE NO CONFIRMADO] ${evaluacion.nivel_nombre}: ${poblacion.nombre} (${poblacion.municipio})`
    : `🚨 ALERTA TEMPRANA SatRC: ${evaluacion.nivel_nombre} en ${poblacion.nombre} (${poblacion.municipio})`;

  const plainText = `
🚨 SatRC v1.0 — REPORTE DE EMERGENCIA CLIMÁTICA
Cáritas Pastoral Social • Arquidiócesis de Tulancingo

NIVEL: ${evaluacion.nivel_nombre} (Nivel ${evaluacion.nivel_final})
POBLACIÓN: ${poblacion.nombre}, ${poblacion.municipio} (${poblacion.estado})

1. DIAGNÓSTICO DEL VECTOR:
- Vector Dominante: ${evaluacion.vector_dominante}
- Magnitud: ${evaluacion.magnitud_principal}

2. HORIZONTE TEMPORAL (HORA CERO T0):
- Ventana de Impacto: ${evaluacion.temporalidad?.ventana_impacto}
- Hora Crítica Pico: ${evaluacion.temporalidad?.hora_pico_estimada}
- Tiempo de Preparación: ~${evaluacion.temporalidad?.horas_disponibles_preparacion} horas disponibles

3. LOGÍSTICA CÁRITAS:
- Población en la localidad: ${poblacion.poblacion_censo?.toLocaleString()} habitantes
- Capacidad Refugio Parroquial: ${evaluacion.logistica_caritas?.capacidad_albergue_estimada?.toLocaleString()} personas
- Raciones Comedor: ${evaluacion.logistica_caritas?.raciones_diarias_comedor?.toLocaleString()} raciones/día

4. ACCIONES TÁCTICAS OBLIGATORIAS:
${evaluacion.protocolo_caritas}

CONFIRMAR ACUSE DE RECIBO EN EL SIGUIENTE ENLACE:
${ackUrl}

Consulte a sus autoridades locales y medios oficiales para más información.
  `;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
      .card { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background-color: ${colorBadge}; padding: 24px; text-align: center; color: #ffffff; }
      .content { padding: 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
      .section { background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .btn { display: block; text-align: center; background-color: #10b981; color: #ffffff !important; font-weight: bold; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-size: 16px; margin-top: 24px; box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
      .footer { text-align: center; padding: 16px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
      .tag { display: inline-block; background-color: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="tag">SatRC v1.0 • ALERTA DE EMERGENCIA</div>
        <h1 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900;">${evaluacion.nivel_nombre} (Nivel ${evaluacion.nivel_final})</h1>
        <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold;">${poblacion.nombre}, ${poblacion.municipio} (${poblacion.estado})</p>
      </div>

      <div class="content">
        <div class="section">
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">1. Diagnóstico del Vector Climático</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Vector Dominante:</strong> ${evaluacion.vector_dominante}</p>
          <p style="margin: 0; color: #f8fafc;"><strong>Magnitud Físico-Ambiental:</strong> ${evaluacion.magnitud_principal}</p>
        </div>

        <div class="section">
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">2. Horizonte Temporal (Hora Cero T₀)</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Ventana de Impacto:</strong> ${evaluacion.temporalidad?.ventana_impacto}</p>
          <p style="margin: 0 0 4px 0; color: #fbbf24;"><strong>Hora Crítica Estimada:</strong> ${evaluacion.temporalidad?.hora_pico_estimada}</p>
          <p style="margin: 0; color: #34d399;"><strong>Tiempo Disponible para Preparación:</strong> ~${evaluacion.temporalidad?.horas_disponibles_preparacion} horas</p>
        </div>

        <div class="section">
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">3. Logística Cáritas Pastoral Social</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Población en la Localidad:</strong> ${poblacion.poblacion_censo?.toLocaleString()} habitantes</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Capacidad Refugio Parroquial:</strong> ${evaluacion.logistica_caritas?.capacidad_albergue_estimada?.toLocaleString()} personas</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Comedor de Emergencia:</strong> ${evaluacion.logistica_caritas?.raciones_diarias_comedor?.toLocaleString()} raciones / día</p>
        </div>

        <div class="section">
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">4. Acciones Tácticas Obligatorias</p>
          <p style="margin: 0; color: #f8fafc;">${evaluacion.protocolo_caritas}</p>
        </div>

        <a href="${ackUrl}" class="btn" target="_blank">
          ✅ CONFIRMAR DE RECIBIDO Y ACTIVAR PROTOCOLO
        </a>
        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px;">
          (Al pulsar este botón registra su acuse de lectura y detiene los recordatorios para este evento).
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0;">SatRC v1.0 • Cáritas Pastoral Social de la Arquidiócesis de Tulancingo</p>
        <p style="margin: 4px 0 0 0;">Consulte a sus autoridades locales y medios oficiales para más información.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"SatRC Alerta Temprana" <${SMTP_USER}>`,
    to: DESTINATION_EMAIL,
    replyTo: SMTP_USER,
    subject: subject,
    text: plainText,
    html: htmlContent,
    priority: 'high',
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  });

  console.log(`✉️ Correo entregado exitosamente para ${poblacion.nombre} a ${DESTINATION_EMAIL}`);
}

async function processAlerts() {
  console.log(`\n========================================================================`);
  console.log(`🚨 SatRC — DESPACHADOR DE ALERTAS POR CORREO ELECTRÓNICO`);
  console.log(`De: ${SMTP_USER} ➔ Para: ${DESTINATION_EMAIL}`);
  console.log(`========================================================================`);

  const poblacionesAlerta = Object.values(latestRisk.detalle_poblaciones).filter(p => p.evaluacion.nivel_final >= 3);

  // MODO TEST MANUAL: Simulación de prueba con --test
  if (isTestMode && poblacionesAlerta.length === 0) {
    const primeraPoblacion = Object.values(latestRisk.detalle_poblaciones)[0];
    const poblacionTest = JSON.parse(JSON.stringify(primeraPoblacion));
    poblacionTest.evaluacion.nivel_final = 4;
    poblacionTest.evaluacion.nivel_nombre = 'CRÍTICO';
    poblacionTest.evaluacion.vector_dominante = 'Inundaciones / Tormentas Torrenciales (SIMULACIÓN)';
    poblacionTest.evaluacion.magnitud_principal = 'Lluvia torrencial simulada de 125 mm en 24h';
    poblacionTest.evaluacion.temporalidad.ventana_impacto = 'Próximas 3 horas (Prueba de conectividad)';
    poblacionTest.evaluacion.temporalidad.hora_pico_estimada = '16:00 a 19:00 hrs';

    console.log(`🧪 Modo de prueba activo: Enviando correo de simulación para ${poblacionTest.nombre}...`);
    await sendEmailAlert(poblacionTest, false);
    console.log(`✅ Correo de prueba entregado exitosamente a ${DESTINATION_EMAIL}.\n`);
    return;
  }

  if (poblacionesAlerta.length === 0) {
    console.log(`🟢 Sin poblaciones en Nivel 3 o 4. No se requiere envío de correos.`);
    return;
  }

  console.log(`🚨 Se detectaron ${poblacionesAlerta.length} poblaciones en Nivel 3 o 4.`);

  for (const p of poblacionesAlerta) {
    const estadoPrevio = activeAlerts[p.id];

    if (!estadoPrevio) {
      // Alerta nueva: Enviar primer aviso
      await sendEmailAlert(p, false);
      activeAlerts[p.id] = {
        nivel: p.evaluacion.nivel_final,
        primer_envio: new Date().toISOString(),
        ultimo_envio: new Date().toISOString(),
        acknowledged: false,
        ack_timestamp: null
      };
    } else if (estadoPrevio.acknowledged === false) {
      // Reincidencia no confirmada: Enviar recordatorio
      console.log(`⏰ Reenviando recordatorio no confirmado para ${p.nombre}...`);
      await sendEmailAlert(p, true);
      activeAlerts[p.id].ultimo_envio = new Date().toISOString();
    } else {
      console.log(`✓ Alerta para ${p.nombre} ya fue confirmada previamente. Envío suprimido.`);
    }
  }

  // Limpiar poblaciones que ya volvieron a Nivel 1 o 2
  const idsActualesAlerta = poblacionesAlerta.map(p => p.id);
  Object.keys(activeAlerts).forEach(id => {
    if (!idsActualesAlerta.includes(id)) {
      delete activeAlerts[id];
    }
  });

  fs.writeFileSync(activeAlertsPath, JSON.stringify(activeAlerts, null, 2), 'utf8');
}

processAlerts().catch(err => {
  console.error(`❌ Error en despachador de correos:`, err);
});