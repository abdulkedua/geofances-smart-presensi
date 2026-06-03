import AdminLayout from '../../components/AdminLayout';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Admin</h2>
        <p className="text-gray-600">Ringkasan data presensi hari ini.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder for Stats Cards */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <span className="text-primary-600 font-bold text-xl">120</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Siswa</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">120</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-green-500">
          <div className="p-5">
             <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Hadir Hari Ini</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">95</dd>
              </dl>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-yellow-500">
          <div className="p-5">
             <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Terlambat</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">15</dd>
              </dl>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-red-500">
          <div className="p-5">
             <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tidak Hadir</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">10</dd>
              </dl>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Presensi Terbaru</h3>
        <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
          {/* Table placeholder */}
          <div className="p-6 text-center text-gray-500">
            Modul Manajemen Data dan Tabel akan diimplementasikan.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
