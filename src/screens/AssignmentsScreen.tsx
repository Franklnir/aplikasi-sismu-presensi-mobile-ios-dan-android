import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Assignment, AssignmentAnswer, PickedUploadFile, Profile } from '../types';
import type { EduSmartApi } from '../api/client';
import { formatDateTime, hoursUntil } from '../utils/date';
import { pickDocument, pickFromCamera, pickFromGallery } from '../utils/upload';
import { safeFileName } from '../utils/text';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { AppIcon } from '../ui/Icon';
import { colors, shadow } from '../ui/theme';

const answerStatus = (task: Assignment) => {
  if (task.myAnswer?.nilai !== null && task.myAnswer?.nilai !== undefined) return `Dinilai ${task.myAnswer.nilai}`;
  if (task.myAnswer?.waktu_submit || task.myAnswer?.file_url || task.myAnswer?.link_url) return 'Terkumpul';
  const hours = hoursUntil(task.deadline);
  if (hours !== null && hours < 0) return 'Terlambat';
  if (hours !== null && hours <= 24) return 'Deadline dekat';
  return 'Belum dikumpulkan';
};

const canSubmit = (task: Assignment) => {
  if (task.myAnswer?.nilai !== null && task.myAnswer?.nilai !== undefined) return false;
  const hours = hoursUntil(task.deadline);
  return hours === null || hours >= 0;
};

export function AssignmentsScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [link, setLink] = useState('');
  const [file, setFile] = useState<PickedUploadFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const taskRows = await api
        .db<Assignment[]>({
          table: 'tugas',
          columns: 'id,kelas,judul,mapel,mulai,deadline,keterangan,file_url,link,created_by,created_at,updated_at',
          order: [{ field: 'deadline', dir: 'asc' }],
          limit: 80,
        })
        .catch(() => []);

      let answerRows: AssignmentAnswer[] = [];
      if (profile.role === 'siswa') {
        answerRows = await api
          .db<AssignmentAnswer[]>({
            table: 'tugas_jawaban',
            columns: 'id,tugas_id,user_id,file_url,file_urls,link_url,file_name,waktu_submit,status,nilai',
            filters: { eq: { user_id: profile.id } },
            limit: 120,
          })
          .catch(() => []);
      }
      const answersByTask = new Map(answerRows.map((answer) => [Number(answer.tugas_id), answer]));
      setTasks((taskRows || []).map((task) => ({ ...task, myAnswer: answersByTask.get(Number(task.id)) || null })));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, profile?.id]);

  const activeTasks = useMemo(() => tasks.filter((task) => canSubmit(task)), [tasks]);

  const openSubmit = (task: Assignment) => {
    setSelected(task);
    setLink(task.myAnswer?.link_url || '');
    setFile(null);
    setMessage('');
  };

  const chooseFile = async (source: 'camera' | 'gallery' | 'document') => {
    const picked =
      source === 'camera' ? await pickFromCamera() : source === 'gallery' ? await pickFromGallery() : await pickDocument();
    if (picked) setFile(picked);
  };

  const submitAnswer = async () => {
    if (!api || !profile || !selected) return;
    if (!file && !link.trim() && !selected.myAnswer?.file_url) {
      setMessage('Upload file atau isi link jawaban.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      let storedPath = selected.myAnswer?.file_url || null;
      if (file) {
        const path = `${selected.id}/${profile.id}-${Date.now()}-${safeFileName(file.name)}`;
        const uploaded = await api.uploadAssignment(file, path);
        storedPath = uploaded?.path || uploaded?.fullPath || path;
      }

      const payload = {
        tugas_id: selected.id,
        user_id: profile.id,
        file_url: storedPath,
        link_url: link.trim() || null,
        file_name: file?.name || selected.myAnswer?.file_name || null,
        status: 'menunggu',
        waktu_submit: new Date().toISOString(),
      };

      if (selected.myAnswer?.id) {
        await api.db({
          table: 'tugas_jawaban',
          action: 'update',
          filters: { eq: { id: selected.myAnswer.id, user_id: profile.id } },
          payload,
        });
      } else {
        await api.db({
          table: 'tugas_jawaban',
          action: 'insert',
          payload,
        });
      }
      setSelected(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal mengirim jawaban.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
      >
        <View style={styles.top}>
          <View>
            <Text style={styles.title}>Tugas</Text>
            <Text style={styles.subtitle}>
              {profile?.role === 'siswa' ? `${activeTasks.length} tugas masih bisa dikumpulkan` : `${tasks.length} tugas tampil`}
            </Text>
          </View>
          {refreshing ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        {tasks.length === 0 ? (
          <EmptyState title="Belum ada tugas" body="Tarik ke bawah untuk memuat ulang." />
        ) : (
          tasks.map((task) => (
            <Card key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleWrap}>
                  <Text style={styles.taskTitle}>{task.judul || 'Tugas'}</Text>
                  <Text style={styles.taskMeta}>{task.mapel || '-'} | {task.kelas || '-'}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{answerStatus(task)}</Text>
                </View>
              </View>
              <Text style={styles.description} numberOfLines={3}>
                {task.keterangan || 'Tidak ada keterangan.'}
              </Text>
              <Text style={styles.deadline}>Deadline {formatDateTime(task.deadline)}</Text>
              {profile?.role === 'siswa' ? (
                <Button
                  label={canSubmit(task) ? 'Kumpulkan Jawaban' : 'Tidak Bisa Dikumpulkan'}
                  onPress={() => openSubmit(task)}
                  disabled={!canSubmit(task)}
                  variant={canSubmit(task) ? 'primary' : 'secondary'}
                />
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal transparent animationType="slide" visible={Boolean(selected)} onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Kumpulkan Jawaban</Text>
              <Pressable style={styles.close} onPress={() => setSelected(null)}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>
            <Text style={styles.selectedTitle}>{selected?.judul || '-'}</Text>

            <View style={styles.pickRow}>
              <Pressable style={styles.pickButton} onPress={() => void chooseFile('camera')}>
                <AppIcon name="scan" size={20} color={colors.primary} />
                <Text style={styles.pickLabel}>Kamera</Text>
              </Pressable>
              <Pressable style={styles.pickButton} onPress={() => void chooseFile('gallery')}>
                <AppIcon name="school" size={20} color={colors.primary} />
                <Text style={styles.pickLabel}>Galeri</Text>
              </Pressable>
              <Pressable style={styles.pickButton} onPress={() => void chooseFile('document')}>
                <AppIcon name="book" size={20} color={colors.primary} />
                <Text style={styles.pickLabel}>File</Text>
              </Pressable>
            </View>

            {file ? <Text style={styles.fileName}>{file.name}</Text> : null}

            <Text style={styles.label}>Link jawaban</Text>
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="https://..."
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="#8A96A8"
            />
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <Button label="Kirim Jawaban" onPress={() => void submitAnswer()} loading={submitting} />
            <Button label="Batal" variant="secondary" onPress={() => setSelected(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontWeight: '700',
  },
  taskCard: {
    gap: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  taskTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  taskMeta: {
    color: colors.slate,
    marginTop: 2,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 8,
    backgroundColor: '#EEF4F1',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },
  description: {
    color: colors.slate,
    lineHeight: 20,
  },
  deadline: {
    color: colors.muted,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 18,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.muted,
    fontWeight: '900',
  },
  selectedTitle: {
    color: colors.slate,
    fontWeight: '800',
  },
  pickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B7D9D3',
    backgroundColor: '#F0F9F7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pickLabel: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  fileName: {
    color: colors.info,
    fontWeight: '800',
  },
  label: {
    color: colors.slate,
    fontWeight: '800',
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
});
