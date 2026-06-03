import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TableSkeleton from '../../components/ui/TableSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Zod Schema
const lokasiSchema = z.object({
  nama_lokasi: z.string().min(1, 'Nama lokasi wajib diisi').max(100),
  latitude: z.number({ invalid_type_error: 'Latitude harus berupa angka' }).min(-90).max(90),
  longitude: z.number({ invalid_type_error: 'Longitude harus berupa angka' }).min(-180).max(180),
  radius_meter: z.number({ invalid_type_error: 'Radius harus berupa angka' }).min(10, 'Minimal radius 10 meter').max(5000),
});

type LokasiFormData = z.infer<typeof lokasiSchema>;

export default function DataLokasi() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LokasiFormData>({
    resolver: zodResolver(lokasiSchema)
  });

  // Query: Fetch Lokasi
  const { data: lokasiList, isLoading } = useQuery({
    queryKey: ['lokasi_presensi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lokasi_presensi')
        .select('*')
        .order('nama_lokasi');
      
      if (error) throw error;
      return data;
    }
  });

  // Mutation: Create
  const createMutation = useMutation({
    mutationFn: async (data: LokasiFormData) => {
      const { error } = await supabase.from('lokasi_presensi').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokasi_presensi'] });
      toast.success('Lokasi berhasil ditambahkan');
      closeModal();
    },
    onError: (error) => toast.error(`Gagal menambah lokasi: ${error.message}`)
  });

  // Mutation: Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: LokasiFormData }) => {
      const { error } = await supabase.from('lokasi_presensi').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokasi_presensi'] });
      toast.success('Lokasi berhasil diperbarui');
      closeModal();
    },
    onError: (error) => toast.error(`Gagal memperbarui lokasi: ${error.message}`)
  });

  // Mutation: Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lokasi_presensi').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokasi_presensi'] });
      toast.success('Lokasi berhasil dihapus');
      setIsConfirmOpen(false);
    },
    onError: (error) => toast.error(`Gagal menghapus lokasi: ${error.message}`)
  });

  const onSubmit = (data: LokasiFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    reset({ nama_lokasi: '', latitude: 0, longitude: 0, radius_meter: 50 });
    setIsModalOpen(true);
  };

  const openEditModal = (lokasi: any) => {
    setEditingId(lokasi.id);
    reset({ 
      nama_lokasi: lokasi.nama_lokasi,
      latitude: lokasi.latitude,
      longitude: lokasi.longitude,
      radius_meter: lokasi.radius_meter
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const openDeleteConfirm = (id: string) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation tidak didukung oleh browser ini.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        reset((formValues) => ({
          ...formValues,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast.success('Koordinat saat ini berhasil diambil');
      },
      (error) => {
        toast.error(`Gagal mengambil koordinat: ${error.message}`);
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Lokasi Presensi</h2>
          <p className="text-sm text-gray-500">Kelola titik lokasi (geofence) presensi siswa.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Lokasi</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : !lokasiList || lokasiList.length === 0 ? (
          <EmptyState message="Belum ada data lokasi presensi yang ditambahkan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Lokasi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Koordinat
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Radius
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dibuat Pada
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lokasiList.map((lokasi) => (
                  <tr key={lokasi.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lokasi.nama_lokasi}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">
                        {lokasi.latitude.toFixed(6)}, {lokasi.longitude.toFixed(6)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {lokasi.radius_meter} Meter
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(lokasi.created_at), 'dd MMM yyyy', { locale: localeId })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(lokasi)}
                          className="text-blue-600 hover:text-blue-900 p-1 bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(lokasi.id)}
                          className="text-red-600 hover:text-red-900 p-1 bg-red-50 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Lokasi */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Edit Lokasi' : 'Tambah Lokasi'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="nama_lokasi" className="block text-sm font-medium text-gray-700">
              Nama Lokasi
            </label>
            <input
              type="text"
              id="nama_lokasi"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.nama_lokasi ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
              placeholder="Gedung Utama"
              {...register('nama_lokasi')}
            />
            {errors.nama_lokasi && (
              <p className="mt-1 text-sm text-red-600">{errors.nama_lokasi.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                id="latitude"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.latitude ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
                {...register('latitude', { valueAsNumber: true })}
              />
              {errors.latitude && (
                <p className="mt-1 text-sm text-red-600">{errors.latitude.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                id="longitude"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.longitude ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
                {...register('longitude', { valueAsNumber: true })}
              />
              {errors.longitude && (
                <p className="mt-1 text-sm text-red-600">{errors.longitude.message}</p>
              )}
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Gunakan lokasi saat ini
            </button>
          </div>
          <div>
            <label htmlFor="radius_meter" className="block text-sm font-medium text-gray-700">
              Radius (Meter)
            </label>
            <input
              type="number"
              id="radius_meter"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.radius_meter ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
              {...register('radius_meter', { valueAsNumber: true })}
            />
            {errors.radius_meter && (
              <p className="mt-1 text-sm text-red-600">{errors.radius_meter.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Toleransi jarak presensi siswa dari pusat koordinat.</p>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Hapus Lokasi"
        message="Apakah Anda yakin ingin menghapus lokasi presensi ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
