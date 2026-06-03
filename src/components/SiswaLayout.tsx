import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Clock, LogOut, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SiswaLayout({ children }: { children?: React.ReactNode }) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Beranda', href: '/siswa', icon: LayoutDashboard },
    { name: 'Riwayat', href: '/siswa/riwayat', icon: Clock },
    { name: 'Profil', href: '/siswa/profil', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header Mobile */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-primary-600">Smart Presence</h1>
          <p className="text-xs text-gray-500">{user?.nama_lengkap}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors p-2"
          aria-label="Keluar"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
        {children || <Outlet />}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-10 sm:hidden">
        <div className="flex justify-around items-center h-16">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Side Navigation for Desktop (optional, as mobile-first is priority) */}
      {/* Not strictly needed for simple student dashboard, but good for scaling */}
    </div>
  );
}
