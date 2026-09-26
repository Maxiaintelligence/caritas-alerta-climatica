import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import nodemailer from 'nodemailer'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'api-server-local',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/send-zone-test' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { zonaId, zonaNombre, emails } = JSON.parse(body || '{}');
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

                await transporter.sendMail({
                  from: `"SatRC Alerta Temprana" <${SMTP_USER}>`,
                  to: listaDestinatarios.join(', '),
                  subject: `🧪 [SatRC VERIFICACIÓN] Enlace Activo — Zona ${zonaId} (${zonaNombre})`,
                  html: `
                    <div style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 20px; border-radius: 12px; max-width: 550px;">
                      <h2 style="color: #38bdf8; margin: 0 0 10px 0;">SatRC v1.0 — Verificación de Notificaciones</h2>
                      <p style="font-size: 14px; color: #cbd5e1;">Se ha verificado la vinculación de correos para <strong>Zona ${zonaId}: ${zonaNombre}</strong>.</p>
                      <div style="background: #020617; padding: 12px; border-radius: 8px; border: 1px solid #334155; font-size: 12px; margin: 15px 0;">
                        <p style="margin: 4px 0;"><strong>Correo Maestro:</strong> ${MASTER_EMAIL} (Permanente)</p>
                        <p style="margin: 4px 0;"><strong>Destinatarios de la Zona:</strong> ${listaDestinatarios.join(', ')}</p>
                        <p style="margin: 4px 0; color: #94a3b8;"><strong>Fecha:</strong> ${fechaActual}</p>
                      </div>
                      <p style="font-size: 11px; color: #64748b;">Cáritas Pastoral Social • Arquidiócesis de Tulancingo</p>
                    </div>
                  `,
                  text: `SatRC v1.0 — Verificación para Zona ${zonaId} (${zonaNombre}). Destinatarios: ${listaDestinatarios.join(', ')}`
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, destinatarios: listaDestinatarios }));
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