import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { action, userId, password, ban_duration } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    if (action === 'reset_password') {
      if (!password) return res.status(400).json({ error: 'Missing new password' });
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Password berhasil direset' });
    }

    if (action === 'toggle_status') {
      // ban_duration = 'none' to unban, or '87600h' (10 years) to ban
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration });
      if (error) throw error;
      return res.status(200).json({ success: true, message: ban_duration === 'none' ? 'Akun diaktifkan' : 'Akun dinonaktifkan' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
