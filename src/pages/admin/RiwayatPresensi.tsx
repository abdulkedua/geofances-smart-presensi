import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Download, Search, Image as ImageIcon } from 'lucide-react';
import TableSkeleton from '../../components/ui/TableSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function RiwayatPresensi() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Query: Fetch Kelas
  const { data: kelasList } = useQuery({
    queryKey: ['kelas_dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('kelas').select('id, nama_kelas').order('nama_kelas');
      return data || [];
    }
  });

  // Query: Fetch Presensi
  const { data: presensiList, isLoading } = useQuery({
    queryKey: ['presensi', selectedDate, selectedStatus, selectedKelas],
    queryFn: async () => {
      let query = supabase
        .from('presensi')
        .select(`
          id, tanggal, jam_masuk, jam_pulang, status,
          foto_selfie_masuk, foto_selfie_pulang,
          siswa ( id, nis, kelas_id, 
            users ( nama_lengkap ),
            kelas ( nama_kelas )
          )
        `)
        .order('tanggal', { ascending: false })
        .order('jam_masuk', { ascending: false });

      if (selectedDate) query = query.eq('tanggal', selectedDate);
      if (selectedStatus) query = query.eq('status', selectedStatus);

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data;
      // Filter manually for join tables if selectedKelas exists
      if (selectedKelas) {
        filtered = filtered.filter(p => p.siswa?.kelas_id === selectedKelas);
      }
      return filtered;
    }
  });

  // Handle Search Filtering Client Side
  const filteredList = presensiList?.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nama = p.siswa?.users?.nama_lengkap.toLowerCase() || '';
    const nis = p.siswa?.nis.toLowerCase() || '';
    return nama.includes(q) || nis.includes(q);
  }) || [];

  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const exportData = filteredList.map((p, index) => ({
      No: index + 1,
      Tanggal: format(new Date(p.tanggal), 'dd MMMM yyyy', { locale: localeId }),
      NIS: p.siswa?.nis,
      'Nama Siswa': p.siswa?.users?.nama_lengkap,
      Kelas: p.siswa?.kelas?.nama_kelas,
      'Jam Masuk': p.jam_masuk,
      'Jam Pulang': p.jam_pulang || '-',
      Status: p.status.toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Presensi');
    XLSX.writeFile(workbook, \`Data_Presensi_\${selectedDate}.xlsx\`);
    toast.success('File Excel berhasil diunduh');
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'hadir': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Hadir</span>;
      case 'terlambat': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Terlambat</span>;
      case 'ditolak': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Presensi</h2>
          <p className="text-sm text-gray-500">Pantau dan kelola riwayat kehadiran siswa.</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Cari nama / NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <input
              type="date"
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <select
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
            >
              <option value="">Semua Kelas</option>
              {kelasList?.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : filteredList.length === 0 ? (
          <EmptyState message="Tidak ada data presensi yang sesuai kriteria." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Siswa
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jam Masuk
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jam Pulang
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Foto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredList.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{p.siswa?.users?.nama_lengkap}</div>
                      <div className="text-xs text-gray-500">{p.siswa?.kelas?.nama_kelas} • {p.siswa?.nis}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(p.tanggal), 'dd MMM yyyy', { locale: localeId })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-mono text-gray-900">{p.jam_masuk}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-mono text-gray-900">{p.jam_pulang || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setPreviewImage(p.foto_selfie_masuk)}
                        className="text-primary-600 hover:text-primary-900 bg-primary-50 p-1.5 rounded-md inline-flex items-center justify-center"
                        title="Lihat Selfie Masuk"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Foto Selfie */}
      <Modal 
        isOpen={!!previewImage} 
        onClose={() => setPreviewImage(null)} 
        title="Preview Foto Selfie"
      >
        <div className="mt-4 flex justify-center">
          {previewImage && (
             <img src={previewImage} alt="Selfie Presensi" className="max-w-full h-auto rounded-lg shadow-sm" />
          )}
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Foto selfie yang diambil saat presensi masuk.
        </div>
      </Modal>
    </div>
  );
}
