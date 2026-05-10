import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppNotification, Assignment, AssignmentAnswer, Profile } from '../types';
import type { EduSmartApi } from '../api/client';
import { hoursUntil, isWithinDays } from '../utils/date';

const DIGEST_KEY = 'edusmart.mobile.notificationDigest';

const taskAnswerMap = (answers: AssignmentAnswer[]) => {
  const map = new Map<number, AssignmentAnswer>();
  answers.forEach((answer) => {
    if (answer.tugas_id) map.set(Number(answer.tugas_id), answer);
  });
  return map;
};

const makeTaskNotifications = (tasks: Assignment[], answers: AssignmentAnswer[]) => {
  const answersByTask = taskAnswerMap(answers);
  const output: AppNotification[] = [];
  tasks.forEach((task) => {
    const answer = answersByTask.get(Number(task.id));
    if (answer?.waktu_submit || answer?.file_url || answer?.link_url) return;
    const hours = hoursUntil(task.deadline);
    if (hours === null) return;
    if (hours >= 0 && hours <= 24) {
      output.push({
        id: `task_due_${task.id}`,
        title: 'Deadline tugas dekat',
        body: `${task.judul || 'Tugas'} harus dikumpulkan sebelum ${task.deadline || '-'}.`,
        kind: 'task_due',
        createdAt: task.deadline || undefined,
        actionTab: 'tugas',
      });
      return;
    }
    const startsIn = hoursUntil(task.mulai);
    if (startsIn !== null && startsIn >= 0 && startsIn <= 48) {
      output.push({
        id: `task_upcoming_${task.id}`,
        title: 'Tugas akan dimulai',
        body: `${task.judul || 'Tugas'} segera dibuka untuk kelas ${task.kelas || '-'}.`,
        kind: 'task_upcoming',
        createdAt: task.mulai || undefined,
        actionTab: 'tugas',
      });
    }
  });
  return output;
};

export const useSmartNotifications = ({
  api,
  profile,
  lastLoginAt,
}: {
  api: EduSmartApi | null;
  profile: Profile | null;
  lastLoginAt: string | null;
}) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);

  const refresh = useCallback(async () => {
    if (!api || !profile) {
      setItems([]);
      return [];
    }

    setLoading(true);
    try {
      const next: AppNotification[] = [];

      const [tasks, answers, announcements] = await Promise.all([
        api
          .db<Assignment[]>({
            table: 'tugas',
            columns: 'id,kelas,judul,mapel,mulai,deadline,keterangan,file_url,link,created_by,created_at,updated_at',
            order: [{ field: 'deadline', dir: 'asc' }],
            limit: 30,
          })
          .catch(() => []),
        profile.role === 'siswa'
          ? api
              .db<AssignmentAnswer[]>({
                table: 'tugas_jawaban',
                columns: 'id,tugas_id,user_id,file_url,file_urls,link_url,waktu_submit,status,nilai',
                filters: { eq: { user_id: profile.id } },
                limit: 100,
              })
              .catch(() => [])
          : Promise.resolve([]),
        api
          .db<Array<{ id: number; judul?: string | null; isi?: string | null; created_at?: string | null }>>({
            table: 'pengumuman',
            columns: 'id,judul,isi,created_at',
            order: [{ field: 'created_at', dir: 'desc' }],
            limit: 5,
          })
          .catch(() => []),
      ]);

      if (profile.role === 'siswa') {
        next.push(...makeTaskNotifications(tasks || [], answers || []));
      }

      (announcements || []).forEach((row) => {
        if (!isWithinDays(row.created_at, 7)) return;
        next.push({
          id: `announcement_${row.id}`,
          title: 'Pengumuman baru',
          body: row.judul || 'Ada pengumuman baru dari sekolah.',
          kind: 'announcement',
          createdAt: row.created_at || undefined,
          actionTab: 'pengumuman',
        });
      });

      if (lastLoginAt && isWithinDays(lastLoginAt, 2)) {
        next.push({
          id: `account_login_${lastLoginAt}`,
          title: 'Login terbaru',
          body: 'Akun Anda baru saja login di aplikasi mobile ini.',
          kind: 'account',
          createdAt: lastLoginAt,
          actionTab: 'profil',
        });
      }

      const unique = Array.from(new Map(next.map((item) => [item.id, item])).values()).slice(0, 20);
      setItems(unique);
      if (unique.length > 0) {
        setPopupVisible(true);
        const digest = unique.map((item) => item.id).join('|');
        const lastDigest = await AsyncStorage.getItem(DIGEST_KEY);
        if (lastDigest !== digest) {
          await AsyncStorage.setItem(DIGEST_KEY, digest);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${unique.length} notifikasi EduSmart`,
              body: unique[0]?.body || 'Ada notifikasi baru.',
              badge: unique.length,
            },
            trigger: null,
          }).catch(() => undefined);
        }
      }
      return unique;
    } finally {
      setLoading(false);
    }
  }, [api, lastLoginAt, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unreadCount = useMemo(() => items.length, [items]);

  return {
    items,
    unreadCount,
    loading,
    popupVisible,
    setPopupVisible,
    refresh,
  };
};
