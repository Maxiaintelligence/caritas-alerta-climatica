import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { zonaId, zonaNombre, emails, esSimulacro, poblacionNombre, nivel, vector } = req.body;
  const MASTER_EMAIL = 'antoniogmadrigal@gmail.com';
  const SMTP_USER = process.env.SMTP_USER || 'pescolaboral@gmail.com';
  const SMTP_PASS = process.env.SMTP_PASS || 'ycqv kwsf rsmd iuwh';

  const listaDestinatarios = Array.from(new Set([MASTER_EMAIL, ...(emails || [])]))
    .map(e => e.trim())
    .filter(e => e.length > 5 && e.includes('@'));

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
    family: 4
  });

  const fechaActual = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  const asunto = esSimulacro
    ? `🚨 [SIMULACRO DIOCESANO ACTIVADO] Nivel ${nivel || 4} en ${poblacionNombre || 'Zona ' + zonaId}`
    : `🧪 [SatRC VERIFICACIÓN] Enlace de Notificaciones — Zona ${zonaId} (${zonaNombre})`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 20px; }
      .card { max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background-color: ${esSimulacro ? '#ef4444' : '#2563eb'}; padding: 20px; text-align: center; color: #ffffff; }
      .content { padding: 24px; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
      .box { background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 16px 0; }
      .tag { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
      .footer { text-align: center; padding: 16px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="tag">SatRC v1.0 • ${esSimulacro ? 'EJERCICIO DE SIMULACRO' : 'VERIFICACIÓN DE ENLACE'}</div>
        <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 900;">${asunto}</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px;">${poblacionNombre || zonaNombre}</p>
      </div>

      <div class="content">
        <p>${esSimulacro ? 'Se ha activado un ejercicio de <strong>Simulacro Táctico Diocesano</strong> en la plataforma SatRC v1.0.' : 'Se ha verificado la vinculación de correos para esta zona operativa.'}</p>

        <div class="box">
          <p style="margin: 0 0 4px 0; color: #38bdf8;"><strong>Zona:</strong> Zona ${zonaId} — ${zonaNombre}</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Nivel Simulado:</strong> Nivel ${nivel || 4} (${nivel === 4 ? 'CRÍTICO' : 'ALTO'})</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Vector de Amenaza:</strong> ${vector || 'Inundaciones / Tormentas'}</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Destinatarios Notificados:</strong> ${listaDestinatarios.join(', ')}</p>
          <p style="margin: 0; color: #94a3b8;"><strong>Fecha de Emisión:</strong> ${fechaActual} (Centro de México)</p>
        </div>

        <p style="font-size: 11px; color: #94a3b8;">Este es un mensaje automático de control generado por la consola de mando de Cáritas Pastoral Social de la Arquidiócesis de Tulancingo.</p>
      </div>

      <div class="footer">
        <p style="margin: 0;">SatRC v1.0 • Cáritas Pastoral Social • Arquidiócesis de Tulancingo</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"SatRC Alerta Temprana" <${SMTP_USER}>`,
      to: listaDestinatarios.join(', '),
      subject: asunto,
      html: htmlContent,
      text: `${asunto}\nDestinatarios: ${listaDestinatarios.join(', ')}\nFecha: ${fechaActual}`
    });

    return res.status(200).json({ success: true, destinatarios: listaDestinatarios, messageId: info.messageId });
  } catch (error) {
    console.error('Error enviando correo:', error);
    return res.status(500).json({ error: error.message });
  }
}