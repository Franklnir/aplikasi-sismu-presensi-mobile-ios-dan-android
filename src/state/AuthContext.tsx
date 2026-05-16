import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, EduSmartApi, loadSelectedSchool, saveSelectedSchool } from '../api/client';
import type { AuthSession, Profile, Role, School, Settings, User } from '../types';

const LAST_LOGIN_KEY = 'edusmart.mobile.lastLoginAt';

type AuthContextValue = {
  api: EduSmartApi | null;
  school: School | null;
  user: User | null;
  profile: Profile | null;
  settings: Settings | null;
  initialized: boolean;
  loading: boolean;
  error: string;
  lastLoginAt: string | null;
  selectSchool: (school: School) => Promise<void>;
  clearSchool: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogleTicket: (ticket: string) => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const isRole = (value: unknown): value is Role =>
  value === 'siswa' || value === 'guru' || value === 'admin';

const normalizeProfile = (profile?: Profile | null): Profile | null => {
  if (!profile || !isRole(profile.role)) return null;
  return profile;
};

const normalizeSession = (raw: {
  user?: User;
  profile?: Profile;
  settings?: Settings | null;
  is_super_admin?: boolean;
} | null): AuthSession | null => {
  if (!raw?.user) return null;
  const profile = normalizeProfile(raw.profile);
  if (!profile) return null;
  return {
    user: raw.user,
    profile,
    settings: raw.settings || null,
    isSuperAdmin: Boolean(raw.is_super_admin),
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<EduSmartApi | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  const attachApi = useCallback(async (nextSchool: School) => {
    const nextApi = new EduSmartApi(nextSchool);
    await nextApi.init();
    setApi(nextApi);
    return nextApi;
  }, []);

  const applySession = useCallback((session: AuthSession | null) => {
    setUser(session?.user || null);
    setProfile(session?.profile || null);
    setSettings(session?.settings || null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!api) return null;
    try {
      const raw = await api.authMe();
      const session = normalizeSession(raw);
      applySession(session);
      return session;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 419)) {
        applySession(null);
        return null;
      }
      throw err;
    }
  }, [api, applySession]);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const [storedSchool, storedLastLogin] = await Promise.all([
          loadSelectedSchool(),
          AsyncStorage.getItem(LAST_LOGIN_KEY),
        ]);
        if (!mounted) return;
        setLastLoginAt(storedLastLogin);
        if (storedSchool) {
          setSchool(storedSchool);
          const nextApi = await attachApi(storedSchool);
          const session = normalizeSession(await nextApi.authMe().catch(() => null));
          if (mounted) applySession(session);
        }
      } finally {
        if (mounted) setInitialized(true);
      }
    };
    void boot();
    return () => {
      mounted = false;
    };
  }, [applySession, attachApi]);

  const selectSchool = useCallback(
    async (nextSchool: School) => {
      setLoading(true);
      setError('');
      try {
        await saveSelectedSchool(nextSchool);
        await api?.clearSession();
        applySession(null);
        setSchool(nextSchool);
        await attachApi(nextSchool);
      } finally {
        setLoading(false);
      }
    },
    [api, applySession, attachApi],
  );

  const clearSchool = useCallback(async () => {
    setLoading(true);
    try {
      await api?.clearSession();
      await saveSelectedSchool(null);
      applySession(null);
      setSchool(null);
      setApi(null);
    } finally {
      setLoading(false);
    }
  }, [api, applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!api) throw new Error('Sekolah belum dipilih');
      setLoading(true);
      setError('');
      try {
        const session = normalizeSession(await api.login(email.trim(), password));
        if (!session) throw new Error('Data sesi login tidak lengkap');
        if (String(session.profile.status || '').toLowerCase() === 'nonaktif') {
          await api.clearSession();
          throw new Error('Akun ini dinonaktifkan. Hubungi administrator.');
        }
        const hydratedSession = normalizeSession(await api.authMe().catch(() => null)) || session;
        applySession(hydratedSession);
        const now = new Date().toISOString();
        setLastLoginAt(now);
        await AsyncStorage.setItem(LAST_LOGIN_KEY, now);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login gagal';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, applySession],
  );

  const loginWithGoogleTicket = useCallback(
    async (ticket: string) => {
      if (!api) throw new Error('Sekolah belum dipilih');
      setLoading(true);
      setError('');
      try {
        const session = normalizeSession(await api.googleMobileExchange(ticket.trim()));
        if (!session) throw new Error('Data sesi login Google tidak lengkap');
        if (String(session.profile.status || '').toLowerCase() === 'nonaktif') {
          await api.clearSession();
          throw new Error('Akun ini dinonaktifkan. Hubungi administrator.');
        }
        const hydratedSession = normalizeSession(await api.authMe().catch(() => null)) || session;
        applySession(hydratedSession);
        const now = new Date().toISOString();
        setLastLoginAt(now);
        await AsyncStorage.setItem(LAST_LOGIN_KEY, now);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login Google gagal';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, applySession],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api?.logout();
      applySession(null);
    } finally {
      setLoading(false);
    }
  }, [api, applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      api,
      school,
      user,
      profile,
      settings,
      initialized,
      loading,
      error,
      lastLoginAt,
      selectSchool,
      clearSchool,
      login,
      loginWithGoogleTicket,
      refreshSession,
      logout,
      clearError: () => setError(''),
    }),
    [
      api,
      school,
      user,
      profile,
      settings,
      initialized,
      loading,
      error,
      lastLoginAt,
      selectSchool,
      clearSchool,
      login,
      loginWithGoogleTicket,
      refreshSession,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
