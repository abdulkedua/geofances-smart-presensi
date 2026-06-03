import SiswaLayout from '../../components/SiswaLayout';
import { Link } from 'react-router-dom';
import { MapPin, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function SiswaDashboard() {
  const { user } = useAuthStore();

  return (
    <SiswaLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-2xl">
            {user?.nama_lengkap.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.nama_lengkap}</h2>
            <p className="text-gray-500">Kelas: XII RPL 1</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Status Presensi Hari Ini</h3>
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl mb-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-sm font-bold text-green-800">Belum Presensi</p>
              <p className="text-xs text-green-600">Silakan lakukan presensi masuk</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/siswa/presensi/masuk"
            className="flex flex-col items-center justify-center p-4 bg-primary-600 text-white rounded-xl shadow-sm hover:bg-primary-700 transition-colors"
          >
            <LogIn className="h-8 w-8 mb-2" />
            <span className="font-semibold">Presensi Masuk</span>
          </Link>
          
          <Link
            to="/siswa/presensi/pulang"
            className="flex flex-col items-center justify-center p-4 bg-gray-100 text-gray-700 rounded-xl shadow-sm hover:bg-gray-200 transition-colors cursor-not-allowed opacity-60"
            onClick={(e) => e.preventDefault()} // Disabled if haven't checked in
          >
            <LogOut className="h-8 w-8 mb-2" />
            <span className="font-semibold">Presensi Pulang</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Lokasi Anda Saat Ini</h3>
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <div className="h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 text-sm">
          Memuat Peta...
        </div>
      </div>
    </SiswaLayout>
  );
}
