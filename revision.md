✈️ Analisa Mendalam & Roadmap Pengembangan: Gapura Integrated Irregularity Reporting System

Dokumen ini berisi tinjauan kritis terhadap MVP yang telah dibangun dan roadmap menuju sistem Enterprise-Grade. Analisa ini berfokus pada skalabilitas, keamanan, dan business logic spesifik industri Ground Handling.

1. Analisa Form Registrasi & Data Karyawan

Status MVP: Hanya Nama, Email, Password.
Masalah: Tidak cukup untuk perusahaan korporat. Email saja tidak memvalidasi unit kerja atau jabatan.

🔴 Apa yang Harus Ditambahkan (Wajib):

Form registrasi harus menangkap data operasional yang krusial untuk Role Mapping.

NIK (Nomor Induk Karyawan): Primary identifier unik selain email.

Station / Cabang: (Dropdown) Contoh: CGK (Cengkareng), DPS (Bali), KNO (Medan). Gapura ada di banyak bandara. User CGK tidak boleh melihat data DPS kecuali role nasional.

Unit / Divisi: (Dropdown) Contoh: Ramp Handling, Passenger Service, Cargo, GSE (Ground Support Equipment), Security.

Jabatan (Position): Staff, Supervisor, Duty Manager, General Manager.

No. WhatsApp / HP: Untuk notifikasi urgent (OTP atau Alert kasus kritis).

2. Redefinisi Role & Restriction (RBAC Matang)

Status MVP: Hanya Admin dan User.
Masalah: Terlalu datar. Di lapangan, alur pelaporan berjenjang. Staff melapor -> Supervisor validasi -> Manager memantau.

Usulan Struktur Role Baru:

Role

Deskripsi

Hak Akses & Restriction

1. Reporter (Basic Staff)

Petugas lapangan (Porter, Check-in staff).

• Create: Hanya bisa buat laporan.



• View: Hanya bisa lihat laporan sendiri.



• Edit: Tidak bisa edit setelah submit (untuk integritas data).

2. Supervisor (Unit Head)

Atasan langsung di unit tersebut.

• Validate: Wajib memvalidasi laporan masuk dari staffnya.



• View: Bisa lihat semua laporan di Unit-nya dan Station-nya.



• Action: Assign ke investigator atau menolak laporan palsu.

3. Investigator / Safety

Tim Safety/Quality Control.

• Full Edit: Bisa update status investigasi, tambah root cause, dan upload dokumen investigasi.



• View: Lintas unit dalam satu Station.

4. Station Manager (GM)

Kepala Cabang.

• View Only (Dashboard): Melihat statistik makro cabang.



• Approve: Penyetujuan penutupan kasus (Closing) untuk insiden besar.

5. Super Admin (HQ)

Tim IT Pusat / Admin Pusat.

• Global Access: Manage master data (lokasi, user, tipe insiden).



• User Management: Approve registrasi user baru.

3. Fitur Krusial yang Belum Terpikirkan (The "Blind Spots")

Ini adalah fitur yang membedakan aplikasi "latihan kuliah" dengan aplikasi "bisnis nyata" di dunia penerbangan:

A. Konteks Penerbangan (Flight Context)

Irregularity di Gapura hampir selalu terkait dengan penerbangan atau alat.

Field Wajib Tambahan di Form Laporan:

Nomor Penerbangan (Flight Number): Misal GA-404, QZ-202.

Registrasi Pesawat (Aircraft Reg): Misal PK-GIA.

Nomor Alat (GSE Number): Jika insiden melibatkan tabrakan alat (misal BTT-01).

B. Klasifikasi Tingkat Keparahan (Severity Level)

Tidak semua laporan sama rata.

Level: Low (Hazard), Medium (Incident), High (Accident).

Logika: Jika user memilih "High/Accident", sistem harus otomatis kirim Email/WA Blast ke Manager. Di MVP sekarang, semua laporan dianggap datar urgensinya.

C. Geo-Tagging & Timestamp Valid

Masalah: User bisa upload foto dari galeri yang diambil 3 hari lalu.

Solusi:

Paksa ambil foto dari kamera (bukan galeri) jika via mobile web.

Ambil koordinat GPS saat submit laporan untuk memvalidasi lokasi (apakah benar di Apron atau di kantin?).

D. SLA (Service Level Agreement) Tracking

Fitur: Menghitung durasi dari "Pending" ke "Resolved".

Tujuan: KPI Karyawan/Unit. "Kenapa laporan ini statusnya Pending sudah 3 hari?" -> Dashboard harus memerah.

E. Mode Offline (PWA)

Kenyataan: Sinyal di area Apron/Bawah Pesawat sering buruk.

Solusi: Gunakan next-pwa. User bisa input form + foto saat offline, dan otomatis sync saat dapat sinyal.

4. Kritik Arsitektur MVP (Tech Stack Review)

Database (Schema Optimization)

Tabel reports di MVP terlalu sederhana. Perlu dinormalisasi:

-- Tambahan Tabel Master Data (Supaya tidak hardcode text)
CREATE TABLE stations (id SERIAL, code TEXT, name TEXT); -- CGK, DPS
CREATE TABLE units (id SERIAL, name TEXT); -- Ramp, Pax, Cargo
CREATE TABLE incident_types (id SERIAL, name TEXT, severity TEXT); -- Kerusakan Alat, Cidera, Delay

-- Update Tabel Reports
ALTER TABLE reports
ADD COLUMN flight_number TEXT,
ADD COLUMN aircraft_reg TEXT,
ADD COLUMN severity_level TEXT, -- Low, Med, High
ADD COLUMN station_id INTEGER REFERENCES stations(id),
ADD COLUMN unit_id INTEGER REFERENCES units(id),
ADD COLUMN investigator_notes TEXT; -- Catatan hasil investigasi


Autentikasi (Security Warning)

Kamu menggunakan Custom JWT-based (bcryptjs + jose).

Resiko: Mengelola session security sendiri itu rawan (CSRF, XSS, Token rotation).

Saran: Jika memang hanya pakai Supabase untuk MVP dan database, pertimbangkan pakai Supabase Auth dulu untuk MVP agar aman, TAPI buat wrapper di kode Next.js.

Jangka Panjang: Jika ingin lepas dari Supabase auth, implementasikan NextAuth.js (Auth.js). Ini standar industri untuk Next.js, mendukung banyak provider, dan lebih aman daripada bikin JWT handler manual.

5. Area yang "Terlupakan" (What You Missed)

Audit Trail (Log Aktivitas):

Siapa yang mengubah status dari "Pending" ke "Resolved"?

Siapa yang menolak registrasi user?

Tanpa ini, jika ada audit insiden pesawat, sistem kamu tidak valid.

Export Data:

Manajemen butuh laporan bulanan. Fitur Export to Excel/PDF dengan filter tanggal adalah kewajiban mutlak.

Master Data Management:

Jangan biarkan user mengetik "Lokasi" manual (Text input). Nanti ada yang nulis "Apron", "Lapang Parkir", "Parkiran Pesawat". Data jadi kotor dan tidak bisa di-statistik.

Buat Master Data Lokasi yang dikelola Admin, User tinggal pilih Dropdown.

Feedback Loop:

Saat laporan diselesaikan (Resolved), pelapor asli harus dapat notifikasi dan alasan penyelesaiannya.

6. Ringkasan Action Plan (Roadmap to V2)

Database: Refactor schema users (tambah NIK, Station, Unit) dan reports (tambah Flight No, Severity). Buat tabel master data.

Auth: Migrasi form register untuk menampung data baru. Implementasi Role Middleware yang lebih ketat (bukan sekadar if admin, tapi if role >= supervisor).

Feature: Tambahkan Master Data Management di Admin Dashboard agar input user terstandarisasi.

UX: Tambahkan indikator warna (Merah/Kuning/Hijau) berdasarkan Severity Level di Dashboard.

Sistem pelaporan operasional penerbangan adalah tentang Akurasi dan Kecepatan Respon. MVP kamu sudah punya "Kecepatan" (Next.js), sekarang tambahkan "Akurasi" (Data Structure & Roles).