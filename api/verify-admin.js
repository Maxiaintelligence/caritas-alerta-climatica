export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { password } = req.body || {};
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'emergencia';

  if (password === ADMIN_PASS) {
    return res.status(200).json({ authorized: true, token: 'satrc_auth_' + Date.now() });
  }

  return res.status(401).json({ authorized: false, error: 'Credenciales inválidas' });
}