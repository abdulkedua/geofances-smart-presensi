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
import { id } from 'date-fns/locale';

// Zod Schema
const kelasSchema = z.object({
  nama_kelas: z.string().min(1, 'Nama kelas tidak boleh kosong').max(50, 'Nama kelas terlalu panjang'),
});

type KelasFormData = z.infer<typeof kelasSchema>;

export default function DataKelas() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<KelasFormData>({
    resolver: zodResolver(kelasSchema)
  });

  // Query: Fetch Kelas
  const { data: kelasList, isLoading } = useQuery({
    queryKey: ['kelas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kelas')
        .select(`
          id, 
          nama_kelas, 
          created_at,
          siswa (count)
        `)
        .order('nama_kelas');
      
      if (error) throw error;
      return data;
    }
  });

  // Mutation: Create Kelas
  const createMutation = useMutation({
    mutationFn: async (data: KelasFormData) => {
      const { error } = await supabase.from('kelas').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      toast.success('Kelas berhasil ditambahkan');
      closeModal();
    },
    onError: (error) => toast.error(`Gagal menambah kelas: ${error.message}`)
  });

  // Mutation: Update Kelas
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: KelasFormData }) => {
      const { error } = await supabase.from('kelas').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      toast.success('Kelas berhasil diperbarui');
      closeModal();
    },
    onError: (error) => toast.error(`Gagal memperbarui kelas: ${error.message}`)
  });

  // Mutation: Delete Kelas
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kelas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      toast.success('Kelas berhasil dihapus');
      setIsConfirmOpen(false);
    },
    onError: (error) => toast.error(`Gagal menghapus kelas: ${error.message}`)
  });

  const onSubmit = (data: KelasFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    reset({ nama_kelas: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (kelas: any) => {
    setEditingId(kelas.id);
    reset({ nama_kelas: kelas.nama_kelas });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Kelas</h2>
          <p className="text-sm text-gray-500">Kelola data kelas yang ada di sekolah.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kelas</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : !kelasList || kelasList.length === 0 ? (
          <EmptyState message="Belum ada data kelas yang ditambahkan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Kelas
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah Siswa
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
                {kelasList.map((kelas) => (
                  <tr key={kelas.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{kelas.nama_kelas}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {kelas.siswa[0].count} Siswa
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(kelas.created_at), 'dd MMM yyyy', { locale: id })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(kelas)}
                          className="text-blue-600 hover:text-blue-900 p-1 bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(kelas.id)}
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

      {/* Modal Form Kelas */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Edit Kelas' : 'Tambah Kelas'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="nama_kelas" className="block text-sm font-medium text-gray-700">
              Nama Kelas
            </label>
            <input
              type="text"
              id="nama_kelas"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.nama_kelas ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
              placeholder="Contoh: XII RPL 1"
              {...register('nama_kelas')}
            />
            {errors.nama_kelas && (
              <p className="mt-1 text-sm text-red-600">{errors.nama_kelas.message}</p>
            )}
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
        title="Hapus Kelas"
        message="Apakah Anda yakin ingin menghapus kelas ini? Data siswa yang terhubung dengan kelas ini akan diubah kelasnya menjadi kosong (NULL)."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
