-- Hapus tabel jika sudah ada (hati-hati untuk production)
-- DROP TABLE IF EXISTS presensi, lokasi_presensi, siswa, kelas, users;

-- 1. Tabel users (Terhubung ke auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nama_lengkap TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'siswa')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabel kelas
CREATE TABLE public.kelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_kelas TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabel siswa
CREATE TABLE public.siswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  nis TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabel lokasi_presensi
CREATE TABLE public.lokasi_presensi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_lokasi TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meter INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabel presensi
CREATE TABLE public.presensi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  jam_masuk TIME NOT NULL,
  jam_pulang TIME,
  latitude_masuk DOUBLE PRECISION NOT NULL,
  longitude_masuk DOUBLE PRECISION NOT NULL,
  latitude_pulang DOUBLE PRECISION,
  longitude_pulang DOUBLE PRECISION,
  jarak_masuk DOUBLE PRECISION NOT NULL,
  jarak_pulang DOUBLE PRECISION,
  akurasi_gps_masuk DOUBLE PRECISION NOT NULL,
  akurasi_gps_pulang DOUBLE PRECISION,
  foto_selfie_masuk TEXT NOT NULL,
  foto_selfie_pulang TEXT,
  status TEXT NOT NULL CHECK (status IN ('hadir', 'terlambat', 'ditolak')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX idx_presensi_siswa_id ON public.presensi(siswa_id);
CREATE INDEX idx_presensi_tanggal ON public.presensi(tanggal);
CREATE INDEX idx_siswa_user_id ON public.siswa(user_id);
CREATE INDEX idx_siswa_kelas_id ON public.siswa(kelas_id);

-- Setup Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lokasi_presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presensi ENABLE ROW LEVEL SECURITY;

-- Policy untuk users
CREATE POLICY "Users dapat melihat profil mereka sendiri" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin dapat melihat semua users" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Policy untuk kelas
CREATE POLICY "Semua orang dapat melihat kelas" ON public.kelas FOR SELECT USING (true);
CREATE POLICY "Hanya admin dapat mengelola kelas" ON public.kelas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Policy untuk siswa
CREATE POLICY "Siswa dapat melihat data siswanya sendiri" ON public.siswa FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Admin dapat mengelola semua data siswa" ON public.siswa FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Policy untuk lokasi_presensi
CREATE POLICY "Semua orang dapat melihat lokasi presensi" ON public.lokasi_presensi FOR SELECT USING (true);
CREATE POLICY "Hanya admin dapat mengelola lokasi presensi" ON public.lokasi_presensi FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Policy untuk presensi
CREATE POLICY "Siswa dapat melihat dan membuat presensinya sendiri" ON public.presensi FOR ALL USING (
  siswa_id IN (SELECT id FROM public.siswa WHERE user_id = auth.uid())
);
CREATE POLICY "Admin dapat mengelola semua presensi" ON public.presensi FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Konfigurasi Storage untuk Foto Selfie
-- Pastikan Anda sudah membuat bucket bernama 'selfie' di menu Storage Supabase
-- CREATE BUCKET 'selfie' WITH PUBLIC ACCESS TRUE;

-- Policy Storage
-- CREATE POLICY "Siswa dapat mengunggah foto" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'selfie');
-- CREATE POLICY "Semua orang dapat melihat foto" ON storage.objects FOR SELECT USING (bucket_id = 'selfie');
