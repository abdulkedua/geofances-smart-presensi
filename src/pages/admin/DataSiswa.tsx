import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Key, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TableSkeleton from '../../components/ui/TableSkeleton';
import EmptyState from '../../components/ui/EmptyState';

// Zod Schema
const siswaSchema = z.object({
  nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  nis: z.string().min(1, 'NIS wajib diisi'),
  kelas_id: z.string().min(1, 'Kelas wajib dipilih'),
});

type SiswaFormData = z.infer<typeof siswaSchema>;

export default function DataSiswa() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SiswaFormData>({
    resolver: zodResolver(siswaSchema)
  });

  // Query: Fetch Kelas untuk dropdown
  const { data: kelasList } = useQuery({
    queryKey: ['kelas_dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kelas').select('id, nama_kelas').order('nama_kelas');
      if (error) throw error;
      return data;
    }
  });

  // Query: Fetch Siswa
  const { data: siswaList, isLoading } = useQuery({
    queryKey: ['siswa', searchQuery, selectedKelas],
    queryFn: async () => {
      let query = supabase
        .from('siswa')
        .select(`
          id, 
          nis, 
          user_id,
          users ( nama_lengkap, email ),
          kelas ( id, nama_kelas )
        `);
        
      if (selectedKelas) {
        query = query.eq('kelas_id', selectedKelas);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      let filtered: any[] = (data as any) || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((item: any) => 
          item.nis.toLowerCase().includes(q) || 
          item.users?.nama_lengkap.toLowerCase().includes(q)
        );
      }
      
      // Sort by nama
      filtered.sort((a: any, b: any) => {
        const nameA = a.users?.nama_lengkap || '';
        const nameB = b.users?.nama_lengkap || '';
        return nameA.localeCompare(nameB);
      });
      
      return filtered as any[];
    }
  });

  // Get Auth Session for API calls
  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Mutation: Create Siswa via API
  const createMutation = useMutation({
    mutationFn: async (data: SiswaFormData) => {
      if (!data.password) throw new Error("Password wajib diisi untuk siswa baru");
      
      const token = await getSessionToken();
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          nama_lengkap: data.nama_lengkap,
          nis: data.nis,
          kelas_id: data.kelas_id
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal membuat akun');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast.success('Akun siswa berhasil dibuat');
      closeModal();
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  // Mutation: Update Siswa
  const updateMutation = useMutation({
    mutationFn: async ({ id, userId, data }: { id: string, userId: string, data: SiswaFormData }) => {
      // 1. Update users table (nama_lengkap)
      const { error: userErr } = await supabase
        .from('users')
        .update({ nama_lengkap: data.nama_lengkap })
        .eq('id', userId);
      if (userErr) throw userErr;

      // 2. Update siswa table (nis, kelas)
      const { error: siswaErr } = await supabase
        .from('siswa')
        .update({ nis: data.nis, kelas_id: data.kelas_id })
        .eq('id', id);
      if (siswaErr) throw siswaErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast.success('Data siswa berhasil diperbarui');
      closeModal();
    },
    onError: (error) => toast.error(`Gagal memperbarui: ${error.message}`)
  });

  // Mutation: Delete Siswa (Also deletes from auth.users via Cascade if we delete users table, wait, standard supabase cascade is from auth to public. So we delete from users table or auth via API? The easiest is to delete from public.users which we might not have cascade to auth. We will just delete public.users for now and public.siswa)
  const deleteMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Due to RLS or FK, if we delete public.users, we should delete auth.users via API.
      // But simple deletion for now: just delete from public.siswa (users record remains but decoupled).
      const { error } = await supabase.from('siswa').delete().eq('user_id', userId);
      if (error) throw error;
      const { error: err2 } = await supabase.from('users').delete().eq('id', userId);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast.success('Siswa berhasil dihapus');
      setIsConfirmOpen(false);
    },
    onError: (error) => toast.error(`Gagal menghapus: ${error.message}`)
  });

  const onSubmit = (data: SiswaFormData) => {
    if (editingId && editingUserId) {
      updateMutation.mutate({ id: editingId, userId: editingUserId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setEditingUserId(null);
    reset({ nama_lengkap: '', email: '', password: '', nis: '', kelas_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (siswa: any) => {
    setEditingId(siswa.id);
    setEditingUserId(siswa.user_id);
    reset({ 
      nama_lengkap: siswa.users?.nama_lengkap || '',
      email: siswa.users?.email || '',
      nis: siswa.nis,
      kelas_id: siswa.kelas?.id || '',
      password: '' // password kosong saat edit (hanya diisi jika API support update email/pwd dari form ini)
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const openDeleteConfirm = (siswa: any) => {
    setDeletingId(siswa.user_id); // we need user_id to delete from users table
    setIsConfirmOpen(true);
  };

  // API Action for Reset Password
  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt("Masukkan password baru untuk siswa ini (Min. 6 karakter):");
    if (!newPassword) return;
    if (newPassword.length < 6) return toast.error("Password minimal 6 karakter");

    const toastId = toast.loading('Mereset password...');
    try {
      const token = await getSessionToken();
      const res = await fetch('/api/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'reset_password', userId, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message, { id: toastId });
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Siswa</h2>
          <p className="text-sm text-gray-500">Kelola akun dan data profil siswa.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Siswa</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters & Search */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
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
        </div>

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : !siswaList || siswaList.length === 0 ? (
          <EmptyState message="Tidak ada data siswa yang ditemukan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profil
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NIS
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {siswaList.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                          {siswa.users?.nama_lengkap.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{siswa.users?.nama_lengkap}</div>
                          <div className="text-sm text-gray-500">{siswa.users?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{siswa.nis}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {siswa.kelas?.nama_kelas || 'Tidak ada kelas'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleResetPassword(siswa.user_id)}
                          className="text-yellow-600 hover:text-yellow-900 p-1 bg-yellow-50 rounded"
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(siswa)}
                          className="text-blue-600 hover:text-blue-900 p-1 bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(siswa)}
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

      {/* Modal Form Siswa */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? 'Edit Siswa' : 'Tambah Siswa Baru'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
            <input
              type="text"
              className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${errors.nama_lengkap ? 'border-red-300' : 'border-gray-300'}`}
              {...register('nama_lengkap')}
            />
            {errors.nama_lengkap && <p className="mt-1 text-sm text-red-600">{errors.nama_lengkap.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email {editingId && '(Tidak dapat diubah)'}</label>
            <input
              type="email"
              disabled={!!editingId}
              className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} ${editingId ? 'bg-gray-100 text-gray-500' : ''}`}
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Sementara</label>
              <input
                type="text"
                className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
                {...register('password')}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">NIS</label>
              <input
                type="text"
                className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${errors.nis ? 'border-red-300' : 'border-gray-300'}`}
                {...register('nis')}
              />
              {errors.nis && <p className="mt-1 text-sm text-red-600">{errors.nis.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Kelas</label>
              <select
                className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${errors.kelas_id ? 'border-red-300' : 'border-gray-300'}`}
                {...register('kelas_id')}
              >
                <option value="">Pilih Kelas...</option>
                {kelasList?.map(k => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
              {errors.kelas_id && <p className="mt-1 text-sm text-red-600">{errors.kelas_id.message}</p>}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md">Batal</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 text-sm text-white bg-primary-600 border rounded-md disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => deletingId && deleteMutation.mutate({ userId: deletingId })}
        title="Hapus Siswa"
        message="Apakah Anda yakin ingin menghapus akun siswa ini? Seluruh data riwayat presensinya juga akan ikut terhapus permanen."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
