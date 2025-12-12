# Gapura Operations Dashboard MVP

> Sistem Pelaporan Operasional & Dashboard Monitoring untuk Gapura Angkasa

## 📋 Ringkasan

Gapura Operations Dashboard adalah aplikasi web untuk pelaporan dan monitoring kejadian/irregularity di lingkungan operasional. Sistem ini dirancang untuk memudahkan karyawan melaporkan kejadian dan admin untuk mengelola laporan serta persetujuan akun.

---

## 🏗️ Arsitektur Sistem

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 3.4 |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Custom JWT-based (bcryptjs + jose) |
| **Icons** | Lucide React |

### Struktur Folder

```
gapura-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, Register, Logout
│   │   ├── admin/         # Stats, Users, Reports management
│   │   └── reports/       # Report CRUD
│   ├── auth/              # Login & Register pages
│   ├── dashboard/
│   │   ├── admin/         # Admin dashboard, reports, users
│   │   └── employee/      # Employee dashboard, new report
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Sidebar.tsx
│   └── StatsCard.tsx
├── lib/
│   ├── auth-utils.ts      # JWT & password utilities
│   ├── supabase.ts        # Database client
│   └── utils.ts           # Helper functions
├── types/
│   └── index.ts           # TypeScript interfaces
└── public/
    └── logo.png
```

---

## 👥 Roles & Permissions

### 1. Administrator (Admin)
- Melihat analytics dashboard komprehensif
- Menyetujui/menolak pendaftaran user baru
- Mengelola semua laporan (view, update status)
- Mengelola semua user (activate/deactivate)

### 2. Karyawan (User)
- Membuat laporan kejadian baru
- Melihat riwayat laporan sendiri
- Upload bukti foto

---

## 🔐 Alur Autentikasi

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Register  │ ──▶ │   Pending   │ ──▶ │   Active    │
│   (User)    │     │   (Admin    │     │   (Login    │
│             │     │   Approval) │     │   Allowed)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Register**: User mendaftar dengan nama, email, password
2. **Pending**: Akun menunggu persetujuan admin
3. **Admin Approval**: Admin menyetujui atau menolak
4. **Active**: User dapat login dan menggunakan sistem

---

## 📊 Fitur Utama

### Dashboard Admin
- **Analytics Cards**: Total laporan, pending, resolved, user pending
- **Trend Reports**: Laporan hari ini, minggu ini, bulan ini
- **Status Distribution**: Bar chart distribusi status laporan
- **Resolution Rate**: Circle chart persentase penyelesaian
- **Top Locations**: Lokasi dengan laporan terbanyak
- **Recent Activity**: 5 laporan terbaru

### Kelola Laporan (Admin)
- Daftar semua laporan dengan filter status
- Detail laporan dengan bukti foto
- Update status: Menunggu → Ditinjau → Selesai
- Informasi pelapor

### Kelola User (Admin)
- Daftar semua user dengan search & filter
- Stats: Total, Aktif, Pending, Admin
- Approve/Reject user pending
- Activate/Deactivate user

### Dashboard Karyawan
- Welcome card dengan quick action
- Riwayat laporan yang disubmit
- Status badge untuk setiap laporan

### Buat Laporan (Karyawan)
- Form: Judul, Lokasi, Deskripsi
- Upload bukti foto
- Preview foto sebelum submit

---

## 🗄️ Database Schema

### Tabel `users`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Unique email |
| password | TEXT | Hashed password |
| full_name | TEXT | Nama lengkap |
| role | TEXT | 'admin' atau 'user' |
| status | TEXT | 'pending', 'active', 'rejected' |
| created_at | TIMESTAMPTZ | Waktu pendaftaran |
| updated_at | TIMESTAMPTZ | Waktu update terakhir |

### Tabel `reports`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key ke users |
| title | TEXT | Judul laporan |
| description | TEXT | Deskripsi detail |
| location | TEXT | Lokasi kejadian |
| evidence_url | TEXT | URL/Base64 bukti foto |
| status | TEXT | 'pending', 'reviewed', 'resolved' |
| created_at | TIMESTAMPTZ | Waktu laporan |
| updated_at | TIMESTAMPTZ | Waktu update terakhir |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrasi user baru |
| POST | `/api/auth/login` | Login dan generate JWT |
| POST | `/api/auth/logout` | Logout dan clear cookie |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Get reports (user's own) |
| POST | `/api/reports` | Create new report |
| GET | `/api/admin/reports` | Get all reports (admin) |
| PATCH | `/api/admin/reports` | Update report status |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get users with filter |
| PATCH | `/api/admin/users` | Update user status |
| GET | `/api/admin/stats` | Get dashboard statistics |

---

## 🚀 Cara Menjalankan

### Prerequisites
- Node.js 18+
- NPM atau Yarn
- Akun Supabase

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
# Buat file .env.local dengan:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_random_secret_key

# 3. Jalankan development server
npm run dev

# 4. Buka browser
# http://localhost:3000
```

### Membuat Admin Pertama

Jalankan SQL ini di Supabase SQL Editor setelah registrasi:

```sql
UPDATE users 
SET role = 'admin', status = 'active' 
WHERE email = 'your-email@example.com';
```

---

## 📱 Responsiveness

Aplikasi mendukung:
- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1023px)
- ✅ Mobile (< 768px) dengan sidebar collapsible

---

## 🔒 Security Features

- Password hashing dengan bcryptjs
- JWT token dengan expiry 7 hari
- HTTP-only cookies untuk session
- Middleware route protection
- Role-based access control

---

## 📝 Future Improvements

- [ ] Email notification untuk approval
- [ ] Export laporan ke PDF/Excel
- [ ] Dashboard real-time dengan WebSocket
- [ ] Upload foto ke Supabase Storage
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Audit log

---

## 📄 License

© 2025 Gapura Angkasa. All rights reserved.
