import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { zonaId, zonaNombre, emails } = req.body;
  const MASTER_EMAIL = 'antoniogmadrigal@gmail.com';
  const SMTP_USER = process.env.SMTP_USER || 'pescolaboral@gmail.com';
  const SMTP_PASS = process.env.SMTP_PASS || 'ycqv kwsf rsmd iuwh';

  // Combinar el correo maestro permanente con los correos de la zona
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
    family: 4 // Fuerza IPv4
  });

  const fechaActual = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 20px; }
      .card { max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background-color: #2563eb; padding: 20px; text-align: center; color: #ffffff; }
      .content { padding: 24px; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
      .box { background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 16px 0; }
      .tag { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
      .footer { text-align: center; padding: 16px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="tag">SatRC v1.0 • VERIFICACIÓN DE ENLACE</div>
        <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 900;">Confirmación de Notificaciones — Zona ${zonaId}</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px;">${zonaNombre}</p>
      </div>

      <div class="content">
        <p>Este correo confirma que su dirección electrónica ha sido registrada y validada exitosamente en la consola de mando de <strong>Cáritas Pastoral Social (Arquidiócesis de Tulancingo)</strong>.</p>

        <div class="box">
          <p style="margin: 0 0 4px 0; color: #38bdf8;"><strong>Zona Asignada:</strong> Zona ${zonaId} — ${zonaNombre}</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Correo Maestro Diocesano:</strong> ${MASTER_EMAIL} (Permanente)</p>
          <p style="margin: 0 0 4px 0; color: #f8fafc;"><strong>Destinatarios de esta Zona:</strong> ${listaDestinatarios.join(', ')}</p>
          <p style="margin: 0; color: #94a3b8;"><strong>Fecha de Verificación:</strong> ${fechaActual} (Centro de México)</p>
        </div>

        <p>A partir de este momento, este canal recibirá de forma automática los reportes de emergencia cuando cualquier localidad de la <strong>Zona ${zonaId}</strong> entre en <strong>Nivel 3 (Alto)</strong> o <strong>Nivel 4 (Crítico)</strong>.</p>
      </div>

      <div class="footer">
        <p style="margin: 0;">SatRC v1.0 • Cáritas Pastoral Social de la Arquidiócesis de Tulancingo</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await transporter.sendMail({
      from: `"SatRC Alerta Temprana" <${SMTP_USER}>`,
      to: listaDestinatarios.join(', '),
      subject: `🧪 [SatRC VERIFICACIÓN] Enlace Activo — Zona ${zonaId} (${zonaNombre})`,
      html: htmlContent,
      text: `SatRC v1.0 — Verificación exitosa para Zona ${zonaId} (${zonaNombre}). Destinatarios vinculados: ${listaDestinatarios.join(', ')}`
    });

    return res.status(200).json({ success: true, destinatarios: listaDestinatarios });
  } catch (error) {
    console.error('Error enviando correo de prueba de zona:', error);
    return res.status(500).json({ error: error.message });
  }
}