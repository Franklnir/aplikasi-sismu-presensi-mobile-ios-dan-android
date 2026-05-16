import type { MenuItem, Role } from '../types';

export const roleMenus: Record<Role, MenuItem[]> = {
  siswa: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', role: 'siswa' },
    { id: 'absensi', label: 'Absensi', icon: 'calendar', role: 'siswa' },
    { id: 'tugas', label: 'Tugas', icon: 'pencil', role: 'siswa' },
    { id: 'quiz', label: 'Quiz', icon: 'brain', role: 'siswa' },
    { id: 'pengumuman', label: 'Info', icon: 'megaphone', role: 'siswa' },
    { id: 'profil', label: 'Profil', icon: 'user', role: 'siswa' },
  ],
  guru: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', role: 'guru' },
    { id: 'jadwal', label: 'Jadwal', icon: 'book', role: 'guru' },
    { id: 'absensi', label: 'Absensi', icon: 'check', role: 'guru' },
    { id: 'tugas', label: 'Tugas', icon: 'pencil', role: 'guru' },
    { id: 'quiz', label: 'Quiz', icon: 'brain', role: 'guru' },
    { id: 'laporan', label: 'Laporan', icon: 'chart', role: 'guru' },
    { id: 'profil', label: 'Profil', icon: 'user', role: 'guru' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', role: 'admin' },
    { id: 'kelas', label: 'Kelas', icon: 'school', role: 'admin' },
    { id: 'siswa', label: 'Siswa', icon: 'users', role: 'admin' },
    { id: 'guru', label: 'Guru', icon: 'users', role: 'admin' },
    { id: 'absensi', label: 'Scan', icon: 'scan', role: 'admin' },
    { id: 'pengumuman', label: 'Info', icon: 'megaphone', role: 'admin' },
    { id: 'approvals', label: 'Approval', icon: 'shield', role: 'admin' },
    { id: 'webadmin', label: 'Web Admin', icon: 'globe', role: 'admin' },
    { id: 'pengaturan', label: 'Pengaturan', icon: 'settings', role: 'admin' },
    { id: 'profil', label: 'Profil', icon: 'user', role: 'admin' },
  ],
};

export const bottomMenuLimit = 5;
