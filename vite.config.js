import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'api-server-local',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Endpoint de prueba de telemetría completa
          if (req.url.startsWith('/api/test-telemetry')) {
            const urlObj = new URL(req.url, 'http://localhost');
            const timeoutMs = Number(urlObj.searchParams.get('timeout')) || 15000;

            const fuentes = [
              { id: 'ecmwf', nombre: '🇪🇺 ECMWF IFS (9km - Europa)', url: 'https://api.open-meteo.com/v1/forecast?latitude=20.08&longitude=-98.36&hourly=temperature_2m' },
              { id: 'gfs', nombre: '🇺🇸 NOAA GFS (13km - EE.UU.)', url: 'https://api.open-meteo.com/v1/gfs?latitude=20.08&longitude=-98.36&hourly=temperature_2m' },
              { id: 'icon', nombre: '🇩🇪 DWD ICON Global (13km - Alemania)', url: 'https://api.open-meteo.com/v1/dwd-icon?latitude=20.08&longitude=-98.36&hourly=temperature_2m' },
              { id: 'smn', nombre: '🇲🇽 SMN / CONAGUA (Avisos de Alerta)', url: 'https://smn.conagua.gob.mx/tools/GUI/webservices/?method=3' },
              { id: 'nhc', nombre: '🌀 NOAA NHC (Centro Huracanes)', url: 'https://www.nhc.noaa.gov/CurrentStorms.json' }
            ];

            const resultados = await Promise.all(fuentes.map(async f => {
              const start = Date.now();
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), timeoutMs);
                const resp = await fetch(f.url, {
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://smn.conagua.gob.mx/'
                  }
                });
                clearTimeout(timeout);
                const latencia = Date.now() - start;
                return {
                  id: f.id,
                  nombre: f.nombre,
                  status: resp.ok ? 'ok' : 'degradado',
                  httpCode: resp.status,
                  latencia_ms: latencia,
                  mensaje: resp.ok ? `Operativo (${latencia} ms)` : `HTTP ${resp.status} (${latencia} ms)`
                };
              } catch (err) {
                return {
                  id: f.id,
                  nombre: f.nombre,
                  status: 'fuera_de_linea',
                  httpCode: 0,
                  latencia_ms: Date.now() - start,
                  mensaje: `Tiempo de espera agotado (>${timeoutMs / 1000}s) o servidor inaccesible`
                };
              }
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ timestamp: new Date().toISOString(), timeout_usado: timeoutMs, resultados }));
            return;
          }

          // Guardado permanente de correos
          if (req.url === '/api/save-zone-contacts' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { zonas } = JSON.parse(body || '{}');
                const payload = {
                  master_email: 'antoniogmadrigal@gmail.com',
                  zonas: zonas || {},
                  ultima_actualizacion: new Date().toISOString()
                };
                const dataPath = path.join(__dirname, 'data', 'zone_contacts.json');
                const publicPath = path.join(__dirname, 'public', 'data', 'zone_contacts.json');
                fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2), 'utf8');
                fs.writeFileSync(publicPath, JSON.stringify(payload, null, 2), 'utf8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // Envío de correos de prueba o simulacro
          if (req.url === '/api/send-zone-test' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { zonaId, zonaNombre, emails, esSimulacro, poblacionNombre, nivel, vector } = JSON.parse(body || '{}');
                const MASTER_EMAIL = 'antoniogmadrigal@gmail.com';
                const SMTP_USER = 'pescolaboral@gmail.com';
                const SMTP_PASS = 'ycqv kwsf rsmd iuwh';

                const listaDestinatarios = Array.from(new Set([MASTER_EMAIL, ...(emails || [])]))
                  .map(e => e.trim())
                  .filter(e => e.length > 5 && e.includes('@'));

                const transporter = nodemailer.createTransport({
                  host: 'smtp.gmail.com',
                  port: 587,
                  secure: false,
                  auth: { user: SMTP_USER, pass: SMTP_PASS },
                  tls: { rejectUnauthorized: false },
                  family: 4
                });

                const fechaActual = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
                const asunto = esSimulacro
                  ? `🚨 [SIMULACRO DIOCESANO ACTIVADO] Nivel ${nivel || 4} en ${poblacionNombre || 'Zona ' + zonaId}`
                  : `🧪 [SatRC VERIFICACIÓN] Enlace Activo — Zona ${zonaId} (${zonaNombre})`;

                const info = await transporter.sendMail({
                  from: `"SatRC Alerta Temprana" <${SMTP_USER}>`,
                  to: listaDestinatarios.join(', '),
                  subject: asunto,
                  html: `
                    <div style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 20px; border-radius: 12px; max-width: 550px;">
                      <h2 style="color: ${esSimulacro ? '#ef4444' : '#38bdf8'}; margin: 0 0 10px 0;">${asunto}</h2>
                      <p style="font-size: 14px; color: #cbd5e1;">${esSimulacro ? 'Se ha activado un ejercicio de simulacro táctico diocesano en la PWA.' : 'Se ha verificado la vinculación de correos para esta zona.'}</p>
                      <div style="background: #020617; padding: 12px; border-radius: 8px; border: 1px solid #334155; font-size: 12px; margin: 15px 0;">
                        <p style="margin: 4px 0;"><strong>Población:</strong> ${poblacionNombre || 'Zona ' + zonaId}</p>
                        <p style="margin: 4px 0;"><strong>Vector Simulado:</strong> ${vector || 'General'}</p>
                        <p style="margin: 4px 0;"><strong>Destinatarios:</strong> ${listaDestinatarios.join(', ')}</p>
                        <p style="margin: 4px 0; color: #94a3b8;"><strong>Fecha:</strong> ${fechaActual}</p>
                      </div>
                      <p style="font-size: 11px; color: #64748b;">SatRC v1.0 • Cáritas Pastoral Social • Arquidiócesis de Tulancingo</p>
                    </div>
                  `,
                  text: `${asunto} • Destinatarios: ${listaDestinatarios.join(', ')}`
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, destinatarios: listaDestinatarios, messageId: info.messageId }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
})