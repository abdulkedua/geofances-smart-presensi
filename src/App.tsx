import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import PresensiMasuk from './pages/siswa/PresensiMasuk';
import PresensiPulang from './pages/siswa/PresensiPulang';
import AdminLayout from './components/AdminLayout';
import SiswaLayout from './components/SiswaLayout';
import DataSiswa from './pages/admin/DataSiswa';
import DataKelas from './pages/admin/DataKelas';
import DataLokasi from './pages/admin/DataLokasi';
import RiwayatPresensi from './pages/admin/RiwayatPresensi';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'admin' | 'siswa' }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/siswa'} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Check active session and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user role
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) {
            setUser({ id: data.id, role: data.role, email: data.email, nama_lengkap: data.nama_lengkap });
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) {
            setUser({ id: data.id, role: data.role, email: data.email, nama_lengkap: data.nama_lengkap });
          } else {
             setUser(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="siswa" element={<DataSiswa />} />
          <Route path="kelas" element={<DataKelas />} />
          <Route path="lokasi" element={<DataLokasi />} />
          <Route path="riwayat" element={<RiwayatPresensi />} />
        </Route>
        
        <Route path="/siswa" element={
          <ProtectedRoute allowedRole="siswa">
            <SiswaLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SiswaDashboard />} />
          <Route path="presensi/masuk" element={<PresensiMasuk />} />
          <Route path="presensi/pulang" element={<PresensiPulang />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
