# Smart Presence

Aplikasi Web Presensi Sekolah Berbasis Geofence dan Foto Selfie.

## Fitur Utama

- **Geofencing**: Presensi hanya dapat dilakukan jika siswa berada di dalam radius lokasi sekolah yang telah ditentukan. Menggunakan Haversine Formula untuk akurasi jarak.
- **Validasi Wajah (Selfie)**: Meminimalisir penitipan presensi dengan wajib mengambil foto selfie secara real-time melalui kamera perangkat.
- **Anti Kecurangan**: Membutuhkan akses GPS aktif, akurasi tinggi, serta akses kamera fisik.
- **Mobile First**: Desain Enterprise Dashboard berbahasa Indonesia yang dirancang mengutamakan kenyamanan di perangkat mobile (smartphone) namun tetap sangat fungsional di Desktop.

## Panduan Setup (Khusus Admin / Developer)

Aplikasi ini menggunakan **Supabase** untuk backend lengkap (Database, Auth, dan Storage) serta **Vercel** untuk kemudahan Deployment.

### 1. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com/).
2. Masuk ke menu **SQL Editor**.
3. Buka file `supabase_migration.sql` dari repository ini, salin semua isinya, lalu jalankan (Run) di SQL Editor Supabase. Ini akan otomatis membuat seluruh tabel, indeks, dan pengaturan keamanan Row Level Security (RLS).
4. Masuk ke menu **Storage**.
5. Buat bucket baru dengan nama **`selfie`** dan pastikan **Public Access** diaktifkan (Centang Public).
6. Masuk ke menu **Authentication** > **Providers** > Pastikan Email enabled.

#### Membuat Akun Admin Pertama

Sesuai aturan keamanan, tidak ada form pendaftaran umum. Anda harus membuat admin pertama secara manual:
1. Pergi ke **Authentication** > **Users** > Klik **Add User** > **Create New User**. Masukkan email dan password.
2. Setelah user terbuat, salin `User UID` tersebut.
3. Pergi ke **Table Editor** > pilih tabel `users` > Klik **Insert row**.
   - Masukkan `id` (paste UID tadi).
   - Masukkan `nama_lengkap` (misal: "Super Admin").
   - Masukkan `email` yang sama.
   - Atur `role` menjadi `admin`.
   - Simpan.

### 2. Setup Environment Variables

Di Dashboard Vercel (atau `.env.local` jika running lokal), pastikan menambahkan 2 variabel berikut:

```env
VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON-KEY-ANDA]
```

Anda bisa mendapatkan kunci ini di Supabase: **Project Settings** -> **API**.

### 3. Deploy ke Vercel

Repository ini sudah dirancang siap dideploy ke Vercel:
1. Hubungkan repository GitHub ini ke Vercel.
2. Framework Preset akan otomatis terdeteksi sebagai `Vite`.
3. Masukkan Environment Variables di langkah 2.
4. Klik **Deploy**.

## Teknologi yang Digunakan

- React (Vite)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Supabase (PostgreSQL, Auth, Storage)
- React Router DOM
- React Hook Form + Zod
- TanStack Query
- Lucide React (Icons)
- React Webcam
