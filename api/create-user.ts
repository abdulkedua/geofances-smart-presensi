import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase client with the Service Role key
// This bypasses RLS and allows creating users without signing in
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Verify Admin Role from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: userData, error: userDbError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDbError || userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // 2. Parse Request Body
    const { email, password, nama_lengkap, nis, kelas_id } = req.body;

    if (!email || !password || !nama_lengkap || !nis || !kelas_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 3. Check if NIS already exists
    const { data: existingSiswa } = await supabaseAdmin
      .from('siswa')
      .select('id')
      .eq('nis', nis)
      .single();
      
    if (existingSiswa) {
      return res.status(400).json({ error: 'NIS sudah terdaftar' });
    }

    // 4. Create Auth User
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama_lengkap }
    });

    if (createAuthError) {
      return res.status(400).json({ error: createAuthError.message });
    }

    const newUserId = authData.user.id;

    // 5. Create Public User Record
    const { error: createUserError } = await supabaseAdmin
      .from('users')
      .insert([
        { id: newUserId, email, nama_lengkap, role: 'siswa' }
      ]);

    if (createUserError) {
      // Rollback Auth User if failed
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return res.status(500).json({ error: 'Failed to create user profile: ' + createUserError.message });
    }

    // 6. Create Siswa Record
    const { error: createSiswaError } = await supabaseAdmin
      .from('siswa')
      .insert([
        { user_id: newUserId, kelas_id, nis }
      ]);

    if (createSiswaError) {
      // Rollback Auth and User if failed (Users will be cascaded automatically)
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return res.status(500).json({ error: 'Failed to create siswa profile: ' + createSiswaError.message });
    }

    return res.status(200).json({ success: true, message: 'Akun siswa berhasil dibuat', user: authData.user });

  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
