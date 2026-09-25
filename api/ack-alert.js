export default function handler(req, res) {
  const { id, level, ts } = req.query;
  const fechaConfirmacion = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SatRC — Acuse de Recibo Confirmado</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
      .card { max-width: 520px; width: 100%; background-color: #0f172a; border-radius: 20px; border: 1px solid #334155; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
      .icon { width: 64px; height: 64px; background-color: rgba(16,185,129,0.2); border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 28px; }
      h1 { font-size: 22px; font-weight: 900; margin: 0 0 8px 0; color: #ffffff; }
      p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; }
      .box { background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; text-align: left; font-size: 12px; margin-bottom: 24px; }
      .box p { margin: 4px 0; color: #cbd5e1; }
      .btn { display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✓</div>
      <h1>Acuse de Recibo Confirmado</h1>
      <p>La coordinación de Cáritas Pastoral Social ha tomado conocimiento formal de la alerta meteorológica.</p>
      
      <div class="box">
        <p><strong>Identificador:</strong> ${id || 'Regional'}</p>
        <p><strong>Nivel Registrado:</strong> Nivel ${level || '3/4'}</p>
        <p><strong>Fecha y Hora de Confirmación:</strong> ${fechaConfirmacion} (Centro de México)</p>
        <p><strong>Estado:</strong> Protocolo Activado • Reenvíos automáticos detenidos</p>
      </div>

      <a href="/" class="btn">Abrir Monitor SatRC v1.0</a>
    </div>
  </body>
  </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}