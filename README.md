# EduSmart Mobile

React Native + Expo app untuk Android dan iOS. Folder ini berdiri sendiri dari frontend web dan backend.

## Versi

Versi release saat ini: `1.0.0`.

## Setup

```bash
npm install
cp .env.example .env
npm run start
```

Isi `.env` sesuai domain produksi. Untuk multi sekolah, app memakai subdomain sekolah lewat `EXPO_PUBLIC_API_BASE_URL=https://{slug}.domain.com` atau `EXPO_PUBLIC_ROOT_DOMAIN=domain.com`.

## Fitur

- Pilih sekolah berdasarkan nama/subdomain, dengan super admin/admin reserved slug tidak ditampilkan.
- Login untuk role `admin`, `guru`, dan `siswa`.
- Sesi tersimpan, jadi user tidak perlu login ulang kecuali logout.
- Header profil berisi foto, nama, kelas/semester/angkatan, notifikasi dengan badge, dan menu overflow.
- Bottom navigation maksimal 5 menu; sisanya muncul dari tombol garis tiga di header.
- Pop-up notifikasi untuk deadline tugas, tugas mendatang, pengumuman baru, dan aktivitas login.
- Permission kamera, galeri, file, dan notifikasi untuk Android/iOS.
- Upload jawaban tugas dari kamera, galeri, dokumen, atau link.

## Build Unduhan

```bash
npm run build:android
npm run build:ios
```

Profile Android `preview` menghasilkan APK internal yang bisa diunduh dari EAS. Build iOS membutuhkan akun Apple Developer.

## Catatan API

App ini mengikuti API Laravel yang sudah ada:

- `GET /sanctum/csrf-cookie`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/db`
- `POST /api/storage/upload`

Untuk rekomendasi sekolah publik, siapkan endpoint `EXPO_PUBLIC_SCHOOL_DIRECTORY_URL` yang mengembalikan `data: [{ name, slug, logoUrl, apiBaseUrl? }]`. Jika endpoint belum ada, app memakai `EXPO_PUBLIC_SCHOOLS_JSON` sebagai fallback.
