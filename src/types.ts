export type Role = 'siswa' | 'guru' | 'admin';

export type School = {
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string;
  apiBaseUrl?: string;
  host?: string;
  status?: string;
};

export type User = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type Profile = {
  id: string;
  tenant_id?: string | null;
  role: Role;
  nama?: string | null;
  email?: string | null;
  kelas?: string | null;
  kelas_id?: string | null;
  semester?: string | null;
  semester_aktif?: string | null;
  angkatan?: string | null;
  tahun_ajaran?: string | null;
  jabatan?: string | null;
  mapel?: string | null;
  nis?: string | null;
  photo_url?: string | null;
  photo_path?: string | null;
  status?: string | null;
  must_change_password?: boolean | null;
  [key: string]: unknown;
};

export type Settings = {
  id?: string | number;
  nama_sekolah?: string | null;
  logo_url?: string | null;
  logo_path?: string | null;
  tahun_ajaran?: string | null;
  semester_aktif?: string | null;
  periode_mulai?: string | null;
  periode_selesai?: string | null;
  [key: string]: unknown;
};

export type AuthSession = {
  user: User;
  profile: Profile;
  settings?: Settings | null;
  isSuperAdmin?: boolean;
};

export type DbFilter = {
  eq?: Record<string, unknown>;
  neq?: Record<string, unknown>;
  is?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  gte?: Record<string, unknown>;
  lte?: Record<string, unknown>;
  gt?: Record<string, unknown>;
  lt?: Record<string, unknown>;
  ilike?: Record<string, string>;
};

export type DbOrder = {
  field: string;
  dir?: 'asc' | 'desc';
};

export type DbRequest = {
  table: string;
  action?: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  columns?: string;
  filters?: DbFilter;
  order?: DbOrder[];
  limit?: number | null;
  offset?: number | null;
  payload?: unknown;
  onConflict?: string | null;
};

export type MenuItem = {
  id: string;
  label: string;
  icon:
    | 'home'
    | 'calendar'
    | 'book'
    | 'brain'
    | 'pencil'
    | 'user'
    | 'chart'
    | 'school'
    | 'users'
    | 'settings'
    | 'shield'
    | 'megaphone'
    | 'check'
    | 'backup'
    | 'scan';
  role: Role;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  kind: 'task_due' | 'task_upcoming' | 'announcement' | 'account' | 'system';
  createdAt?: string;
  actionTab?: string;
};

export type Assignment = {
  id: number;
  kelas?: string | null;
  judul?: string | null;
  mapel?: string | null;
  mulai?: string | null;
  deadline?: string | null;
  keterangan?: string | null;
  file_url?: string | null;
  link?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  myAnswer?: AssignmentAnswer | null;
};

export type AssignmentAnswer = {
  id?: number;
  tugas_id?: number;
  user_id?: string;
  file_url?: string | null;
  file_urls?: string[] | string | null;
  link_url?: string | null;
  file_name?: string | null;
  waktu_submit?: string | null;
  status?: string | null;
  nilai?: number | null;
};

export type PickedUploadFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};
