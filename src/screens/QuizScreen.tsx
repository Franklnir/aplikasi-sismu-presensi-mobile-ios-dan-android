import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { formatDateTime, toDate } from '../utils/date';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Id = string | number;

type QuizSubmission = {
  id?: Id;
  quiz_id?: Id | null;
  status?: string | null;
  score?: number | null;
  total_points?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type Quiz = {
  id: Id;
  nama?: string | null;
  judul?: string | null;
  mapel?: string | null;
  kelas_id?: string | null;
  starts_at?: string | null;
  deadline_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  mode?: string | null;
  is_live?: boolean | number | string | null;
  live_started_at?: string | null;
  duration_minutes?: number | string | null;
  security_mode?: string | null;
  access_device?: string | null;
  has_access_code?: boolean | number | string | null;
  question_count?: number | null;
  result_visible_to_students?: boolean | number | string | null;
  submission?: QuizSubmission | null;
};

type QuizQuestion = {
  id: Id;
  nomor?: number | string | null;
  soal?: string | null;
  type?: string | null;
  question_type?: string | null;
  poin?: number | string | null;
};

type QuizOption = {
  id: Id;
  question_id?: Id | null;
  label?: string | null;
  text?: string | null;
};

type QuizAnswer = {
  id?: Id;
  question_id?: Id | null;
  option_id?: Id | null;
  essay_answer?: string | null;
};

type QuizDashboardPayload = {
  rows?: Quiz[];
};

type QuizDetailPayload = {
  quiz?: Quiz;
  questions?: QuizQuestion[];
  options_by_question?: Record<string, QuizOption[]>;
  submission?: QuizSubmission | null;
  answers?: QuizAnswer[];
};

type QuizStartPayload = {
  submission?: QuizSubmission;
  questions?: QuizQuestion[];
  options_by_question?: Record<string, QuizOption[]>;
};

type QuizSubmitPayload = {
  submission_id?: Id;
  score?: number | null;
  total_points?: number | null;
};

const normalizeAccessDevice = (value?: string | null) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'web' || raw === 'browser' || raw === 'desktop') return 'web';
  if (raw === 'mobile' || raw === 'mobile_app' || raw === 'app' || raw === 'android' || raw === 'ios') return 'mobile';
  return 'both';
};

const accessDeviceLabel = (value?: string | null) => {
  const mode = normalizeAccessDevice(value);
  if (mode === 'web') return 'Web saja';
  if (mode === 'mobile') return 'Mobile saja';
  return 'Web & Mobile';
};

const isTruthy = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

const normalizeQuestionType = (question: QuizQuestion) => {
  const raw = String(question.question_type || question.type || '').toLowerCase();
  return raw.includes('essay') || raw.includes('esai') ? 'essay' : 'mcq';
};

const quizTitle = (quiz?: Quiz | null) => quiz?.nama || quiz?.judul || 'Quiz';

const liveEndDate = (quiz: Quiz) => {
  if (!isTruthy(quiz.is_live) || !quiz.live_started_at || !quiz.duration_minutes) return null;
  const startedAt = toDate(quiz.live_started_at);
  const minutes = Number(quiz.duration_minutes);
  if (!startedAt || !Number.isFinite(minutes) || minutes <= 0) return null;
  return new Date(startedAt.getTime() + minutes * 60 * 1000);
};

const quizEndDate = (quiz: Quiz) => liveEndDate(quiz) || toDate(quiz.deadline_at);

const quizStatus = (quiz: Quiz, now = new Date()) => {
  const submission = quiz.submission;
  if (submission?.status === 'finished') {
    return { label: 'Selesai', canStart: false, tone: 'success' as const };
  }
  if (quiz.closed_at) {
    return { label: 'Ditutup', canStart: false, tone: 'danger' as const };
  }
  const startsAt = toDate(quiz.starts_at);
  if (!startsAt) {
    return { label: 'Belum dijadwalkan', canStart: false, tone: 'warning' as const };
  }
  if (now < startsAt) {
    return { label: 'Belum dimulai', canStart: false, tone: 'warning' as const };
  }
  const endAt = quizEndDate(quiz);
  if (endAt && now > endAt) {
    return { label: 'Berakhir', canStart: false, tone: 'danger' as const };
  }
  return { label: submission?.status === 'ongoing' ? 'Sedang dikerjakan' : 'Aktif', canStart: true, tone: 'active' as const };
};

const formatSeconds = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

const screenCaptureApi = ScreenCapture as typeof ScreenCapture & {
  addScreenshotListener?: (listener: () => void) => { remove?: () => void };
};
const QUIZ_SCREEN_CAPTURE_KEY = 'edusmart-quiz';

type StatusTone = ReturnType<typeof quizStatus>['tone'];

const pillToneStyle = (tone: StatusTone) => {
  if (tone === 'active') return styles.pill_active;
  if (tone === 'success') return styles.pill_success;
  if (tone === 'danger') return styles.pill_danger;
  return styles.pill_warning;
};

const pillTextToneStyle = (tone: StatusTone) => {
  if (tone === 'active') return styles.pillText_active;
  if (tone === 'success') return styles.pillText_success;
  if (tone === 'danger') return styles.pillText_danger;
  return styles.pillText_warning;
};

export function QuizScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [items, setItems] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, QuizOption[]>>({});
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerIds, setAnswerIds] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [accessCode, setAccessCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [screenProtected, setScreenProtected] = useState(false);
  const [securityOverlayVisible, setSecurityOverlayVisible] = useState(false);
  const [nowTick, setNowTick] = useState(() => new Date());
  const securityCooldownRef = useRef<Record<string, number>>({});

  const selectedStatus = useMemo(() => (selected ? quizStatus({ ...selected, submission: submission || selected.submission }, nowTick) : null), [
    nowTick,
    selected,
    submission,
  ]);
  const isStrictQuiz = selected?.security_mode === 'strict';
  const isTaking = Boolean(sessionActive && submission?.status === 'ongoing' && questions.length > 0);
  const activeQuestion = questions[activeIndex] || null;
  const activeQuestionId = activeQuestion ? String(activeQuestion.id) : '';
  const selectedEndDate = selected ? quizEndDate(selected) : null;
  const remainingSeconds = selectedEndDate ? Math.floor((selectedEndDate.getTime() - nowTick.getTime()) / 1000) : null;
  const isFinished = submission?.status === 'finished';
  const canSeeScore = Boolean(isFinished && isTruthy(selected?.result_visible_to_students));

  const load = useCallback(async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const payload = await api.quizDashboard<QuizDashboardPayload>({ page: 1, per_page: 80, client: 'mobile' }).catch(() => ({ rows: [] }));
      const rows = Array.isArray(payload) ? payload : payload?.rows || [];
      setItems(rows);
    } finally {
      setRefreshing(false);
    }
  }, [api, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isTaking) return;
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isTaking]);

  const disableSecureScreen = useCallback(async () => {
    try {
      await ScreenCapture.allowScreenCaptureAsync(QUIZ_SCREEN_CAPTURE_KEY);
      if (Platform.OS === 'ios') {
        await ScreenCapture.disableAppSwitcherProtectionAsync();
      }
    } catch {
      // Best effort only. Android/iOS can ignore this when the native module is unavailable.
    }
    setScreenProtected(false);
  }, []);

  useEffect(() => () => {
    void disableSecureScreen();
  }, [disableSecureScreen]);

  useEffect(() => {
    if (!isStrictQuiz || sessionActive) return;
    void disableSecureScreen();
  }, [disableSecureScreen, isStrictQuiz, sessionActive]);

  const enableSecureScreen = useCallback(async () => {
    try {
      await ScreenCapture.preventScreenCaptureAsync(QUIZ_SCREEN_CAPTURE_KEY);
      if (Platform.OS === 'ios') {
        await ScreenCapture.enableAppSwitcherProtectionAsync(1);
      }
      setScreenProtected(true);
      return true;
    } catch {
      setScreenProtected(false);
      return false;
    }
  }, []);

  const clientMeta = useCallback((protectedScreen = screenProtected) => ({
    client: 'mobile_app',
    device: 'mobile',
    platform: Platform.OS,
    secure_screen: protectedScreen,
    screen_capture_protected: protectedScreen,
  }), [screenProtected]);

  const logSecurityEvent = useCallback(async (
    eventType: string,
    eventMessage: string,
    eventMeta: Record<string, unknown> = {},
    cooldownMs = 1500,
  ) => {
    if (!api || !selected?.id || !submission?.id) return;
    const now = Date.now();
    const lastAt = securityCooldownRef.current[eventType] || 0;
    if (cooldownMs > 0 && now - lastAt < cooldownMs) return;
    securityCooldownRef.current[eventType] = now;

    await api.quizViolation({
      quiz_id: selected.id,
      submission_id: submission.id,
      event_type: eventType,
      event_message: eventMessage,
      event_meta: {
        ...eventMeta,
        incident_id: `${eventType}-${now}`,
        client: 'mobile_app',
        platform: Platform.OS,
      },
    }).catch(() => null);
  }, [api, selected?.id, submission?.id]);

  useEffect(() => {
    if (!isTaking || !isStrictQuiz) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      setSecurityOverlayVisible(true);
      void logSecurityEvent('mobile_app_hidden', 'Aplikasi quiz keluar dari layar aktif.', { app_state: state }, 2500);
    });
    return () => subscription.remove();
  }, [isStrictQuiz, isTaking, logSecurityEvent]);

  useEffect(() => {
    if (!isTaking || !isStrictQuiz || !screenCaptureApi.addScreenshotListener) return undefined;
    const subscription = screenCaptureApi.addScreenshotListener(() => {
      setSecurityOverlayVisible(true);
      void logSecurityEvent('mobile_screenshot', 'Percobaan screenshot terdeteksi di aplikasi mobile.', {}, 0);
    });
    return () => subscription?.remove?.();
  }, [isStrictQuiz, isTaking, logSecurityEvent]);

  const applyAnswers = (rows?: QuizAnswer[]) => {
    const nextAnswers: Record<string, string> = {};
    const nextAnswerIds: Record<string, string> = {};
    (rows || []).forEach((row) => {
      if (!row.question_id) return;
      const questionId = String(row.question_id);
      if (row.id) nextAnswerIds[questionId] = String(row.id);
      if (row.option_id) nextAnswers[questionId] = String(row.option_id);
      else if (row.essay_answer) nextAnswers[questionId] = row.essay_answer;
    });
    setAnswers(nextAnswers);
    setAnswerIds(nextAnswerIds);
  };

  const loadQuizDetail = async (quiz: Quiz) => {
    if (!api) return;
    setSelected(quiz);
    setQuestions([]);
    setOptionsByQuestion({});
    setSubmission(quiz.submission || null);
    setAnswers({});
    setAnswerIds({});
    setActiveIndex(0);
    setAccessCode('');
    setMessage('');
    setSessionActive(false);
    setDetailLoading(true);
    try {
      const detail = await api.quizDetail<QuizDetailPayload>(quiz.id, { client: 'mobile' });
      setSelected((prev) => ({ ...(prev || quiz), ...(detail.quiz || {}) }));
      setQuestions(detail.questions || []);
      setOptionsByQuestion(detail.options_by_question || {});
      setSubmission(detail.submission || quiz.submission || null);
      applyAnswers(detail.answers);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gagal memuat detail quiz.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openQuiz = (quiz: Quiz) => {
    if (normalizeAccessDevice(quiz.access_device) === 'web') {
      Alert.alert('Akses Web Saja', 'Quiz ini hanya dapat dikerjakan melalui web/browser.');
      return;
    }
    void loadQuizDetail(quiz);
  };

  const closeQuizDetail = () => {
    const finishClose = () => {
      setSelected(null);
      setQuestions([]);
      setOptionsByQuestion({});
      setSubmission(null);
      setSessionActive(false);
      setSecurityOverlayVisible(false);
      void disableSecureScreen();
    };

    if (isTaking && isStrictQuiz) {
      Alert.alert(
        'Quiz masih berjalan',
        'Tetap di halaman quiz sampai selesai. Keluar dari halaman dapat tercatat sebagai peringatan.',
        [
          { text: 'Tetap di Quiz', style: 'cancel' },
          {
            text: 'Keluar Detail',
            style: 'destructive',
            onPress: () => {
              void logSecurityEvent('mobile_leave_quiz_screen', 'Siswa keluar dari detail quiz strict.', {}, 0);
              finishClose();
            },
          },
        ],
      );
      return;
    }

    finishClose();
  };

  const beginOrContinueQuiz = async () => {
    if (!api || !selected) return;
    if (normalizeAccessDevice(selected.access_device) === 'web') {
      setMessage('Quiz ini hanya dapat dikerjakan melalui web/browser.');
      return;
    }
    if (!selectedStatus?.canStart) {
      setMessage('Quiz belum bisa dimulai.');
      return;
    }
    setStartLoading(true);
    setMessage('');
    try {
      let protectedScreen = screenProtected;
      if (isStrictQuiz) {
        protectedScreen = await enableSecureScreen();
        if (!protectedScreen) {
          setMessage('Proteksi layar gagal diaktifkan. Tutup aplikasi lain lalu coba lagi.');
          return;
        }
      }

      const payload = await api.quizStart<QuizStartPayload>({
        quiz_id: selected.id,
        access_code: accessCode.trim() || undefined,
        client_meta: clientMeta(protectedScreen),
      });
      if (payload.submission) setSubmission(payload.submission);
      if (payload.questions) setQuestions(payload.questions);
      if (payload.options_by_question) setOptionsByQuestion(payload.options_by_question);
      setSessionActive(true);
      setActiveIndex(0);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gagal memulai quiz.'));
      if (isStrictQuiz) void disableSecureScreen();
    } finally {
      setStartLoading(false);
    }
  };

  const saveAnswer = async (question: QuizQuestion, value: string) => {
    if (!api || !selected || !submission?.id || !sessionActive) return;
    const questionId = String(question.id);
    const type = normalizeQuestionType(question);
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    setSavingQuestionId(questionId);
    try {
      const result = await api.quizSaveAnswer<{ answer_id?: Id }>({
        id: answerIds[questionId],
        quiz_id: selected.id,
        submission_id: submission.id,
        question_id: question.id,
        option_id: type === 'mcq' ? value : null,
        essay_answer: type === 'essay' ? value : null,
        client_meta: clientMeta(),
      });
      if (result?.answer_id) {
        setAnswerIds((prev) => ({ ...prev, [questionId]: String(result.answer_id) }));
      }
      setMessage('Jawaban tersimpan.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gagal menyimpan jawaban.'));
    } finally {
      setSavingQuestionId(null);
    }
  };

  const submitQuiz = async () => {
    if (!api || !selected || !submission?.id) return;
    setSubmitting(true);
    setMessage('');
    try {
      const answerPayload = questions.map((question) => {
        const questionId = String(question.id);
        const type = normalizeQuestionType(question);
        return {
          id: answerIds[questionId],
          question_id: question.id,
          option_id: type === 'mcq' ? answers[questionId] || null : null,
          essay_answer: type === 'essay' ? answers[questionId] || null : null,
        };
      });
      const result = await api.quizSubmit<QuizSubmitPayload>({
        quiz_id: selected.id,
        submission_id: submission.id,
        answers: answerPayload,
        client_meta: clientMeta(),
      });
      setSubmission((prev) => ({
        ...(prev || {}),
        status: 'finished',
        score: result.score ?? prev?.score ?? null,
        total_points: result.total_points ?? prev?.total_points ?? null,
        finished_at: new Date().toISOString(),
      }));
      setSessionActive(false);
      setSecurityOverlayVisible(false);
      setMessage('Quiz berhasil diselesaikan.');
      await disableSecureScreen();
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gagal menyelesaikan quiz.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSubmitQuiz = () => {
    Alert.alert('Selesaikan Quiz', 'Jawaban akan dikirim final dan tidak bisa diubah.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Selesaikan', onPress: () => void submitQuiz() },
    ]);
  };

  const renderQuizCard = (item: Quiz) => {
    const status = quizStatus(item, nowTick);
    const accessMode = normalizeAccessDevice(item.access_device);
    const mobileBlocked = accessMode === 'web';
    return (
      <Card key={String(item.id)} style={styles.card}>
        <Pressable onPress={() => openQuiz(item)} style={styles.cardPress}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.itemTitle}>{quizTitle(item)}</Text>
              <Text style={styles.meta}>{item.mapel || '-'} | {item.kelas_id || '-'}</Text>
            </View>
            <View style={[styles.pill, pillToneStyle(status.tone)]}>
              <Text style={[styles.pillText, pillTextToneStyle(status.tone)]}>{status.label}</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, mobileBlocked ? styles.badgeDanger : styles.badgeInfo]}>
              Akses {accessDeviceLabel(item.access_device)}
            </Text>
            <Text style={styles.badge}>Keamanan {item.security_mode === 'strict' ? 'Strict' : 'Standard'}</Text>
            <Text style={styles.badge}>{item.question_count || 0} soal</Text>
          </View>
          <Text style={styles.time}>Mulai {formatDateTime(item.starts_at || item.created_at)}</Text>
          <Text style={styles.time}>Selesai {formatDateTime(item.deadline_at)}</Text>
          {mobileBlocked ? <Text style={styles.warning}>Quiz ini wajib dikerjakan lewat web/browser.</Text> : null}
        </Pressable>
      </Card>
    );
  };

  if (selected) {
    const status = selectedStatus;
    const accessMode = normalizeAccessDevice(selected.access_device);
    const startDisabled = startLoading || detailLoading || accessMode === 'web' || !status?.canStart;
    const showPreparation = !isTaking && !isFinished;

    return (
      <>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadQuizDetail(selected)} />}
        >
          <View style={styles.detailTop}>
            <Pressable style={styles.backButton} onPress={closeQuizDetail}>
              <Text style={styles.backText}>Kembali</Text>
            </Pressable>
            {detailLoading ? <ActivityIndicator color={colors.primary} /> : null}
          </View>

          <Card style={styles.heroCard}>
            <Text style={styles.title}>{quizTitle(selected)}</Text>
            <Text style={styles.subtitle}>{selected.mapel || '-'} | {selected.kelas_id || '-'}</Text>
            <View style={styles.badgeRow}>
              {status ? (
                <Text style={[styles.badge, styles.badgeStrong]}>{status.label}</Text>
              ) : null}
              <Text style={[styles.badge, accessMode === 'web' ? styles.badgeDanger : styles.badgeInfo]}>
                {accessDeviceLabel(selected.access_device)}
              </Text>
              <Text style={styles.badge}>{isStrictQuiz ? 'Strict' : 'Standard'}</Text>
            </View>
            <View style={styles.timeGrid}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Mulai</Text>
                <Text style={styles.timeValue}>{formatDateTime(selected.starts_at)}</Text>
              </View>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Selesai</Text>
                <Text style={styles.timeValue}>{formatDateTime(selected.deadline_at)}</Text>
              </View>
              {remainingSeconds !== null && remainingSeconds >= 0 ? (
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Sisa</Text>
                  <Text style={styles.timeValue}>{formatSeconds(remainingSeconds)}</Text>
                </View>
              ) : null}
            </View>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </Card>

          {showPreparation ? (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Persiapan Quiz</Text>
              <Text style={styles.description}>
                Pastikan baterai, koneksi, dan fokus siap sebelum mulai. Quiz strict akan mengaktifkan proteksi layar.
              </Text>
              {selected.has_access_code ? (
                <>
                  <Text style={styles.label}>Kode Akses</Text>
                  <TextInput
                    value={accessCode}
                    onChangeText={setAccessCode}
                    placeholder="Masukkan kode dari guru"
                    placeholderTextColor="#8A96A8"
                    secureTextEntry
                    style={styles.input}
                  />
                </>
              ) : null}
              {accessMode === 'web' ? (
                <Text style={styles.warning}>Quiz ini disetel Web saja oleh guru. Buka browser untuk mengerjakan.</Text>
              ) : null}
              <Button
                label={submission?.status === 'ongoing' ? 'Lanjutkan Quiz' : 'Mulai Quiz'}
                onPress={() => void beginOrContinueQuiz()}
                loading={startLoading}
                disabled={startDisabled}
              />
            </Card>
          ) : null}

          {isTaking && activeQuestion ? (
            <Card style={styles.section}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionCounter}>Soal {activeIndex + 1} dari {questions.length}</Text>
                <Text style={styles.pointText}>{activeQuestion.poin || 0} poin</Text>
              </View>
              <Text style={styles.questionText}>{activeQuestion.soal || '-'}</Text>

              {normalizeQuestionType(activeQuestion) === 'essay' ? (
                <>
                  <TextInput
                    value={answers[activeQuestionId] || ''}
                    onChangeText={(text) => setAnswers((prev) => ({ ...prev, [activeQuestionId]: text }))}
                    placeholder="Tulis jawaban esai"
                    placeholderTextColor="#8A96A8"
                    multiline
                    style={[styles.input, styles.essayInput]}
                  />
                  <Button
                    label={savingQuestionId === activeQuestionId ? 'Menyimpan...' : 'Simpan Jawaban'}
                    onPress={() => void saveAnswer(activeQuestion, answers[activeQuestionId] || '')}
                    loading={savingQuestionId === activeQuestionId}
                    variant="secondary"
                  />
                </>
              ) : (
                <View style={styles.optionList}>
                  {(optionsByQuestion[activeQuestionId] || []).map((option) => {
                    const selectedOption = answers[activeQuestionId] === String(option.id);
                    return (
                      <Pressable
                        key={String(option.id)}
                        style={[styles.option, selectedOption && styles.optionSelected]}
                        onPress={() => void saveAnswer(activeQuestion, String(option.id))}
                      >
                        <Text style={[styles.optionLabel, selectedOption && styles.optionLabelSelected]}>{option.label || '-'}</Text>
                        <Text style={[styles.optionText, selectedOption && styles.optionTextSelected]}>{option.text || '-'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={styles.navigationRow}>
                <Button
                  label="Sebelumnya"
                  variant="secondary"
                  onPress={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeIndex === 0}
                  style={styles.navButton}
                />
                {activeIndex < questions.length - 1 ? (
                  <Button
                    label="Berikutnya"
                    onPress={() => setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    style={styles.navButton}
                  />
                ) : (
                  <Button
                    label="Selesaikan Quiz"
                    onPress={confirmSubmitQuiz}
                    loading={submitting}
                    style={styles.navButton}
                  />
                )}
              </View>
            </Card>
          ) : null}

          {isFinished ? (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Quiz Selesai</Text>
              <Text style={styles.description}>Jawaban sudah dikirim final.</Text>
              <Text style={styles.resultScore}>
                {canSeeScore ? `Nilai ${submission?.score ?? '-'} / ${submission?.total_points ?? '-'}` : 'Nilai disembunyikan guru'}
              </Text>
            </Card>
          ) : null}
        </ScrollView>

        <Modal transparent animationType="fade" visible={securityOverlayVisible} onRequestClose={() => setSecurityOverlayVisible(false)}>
          <View style={styles.securityBackdrop}>
            <View style={styles.securitySheet}>
              <Text style={styles.securityTitle}>Peringatan Keamanan</Text>
              <Text style={styles.securityBody}>
                Aktivitas di luar layar quiz terdeteksi. Tetap kerjakan quiz di aplikasi sampai selesai.
              </Text>
              <Button label="Saya Mengerti" onPress={() => setSecurityOverlayVisible(false)} />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View style={styles.top}>
        <View>
          <Text style={styles.title}>Quiz</Text>
          <Text style={styles.subtitle}>Pilih quiz yang tersedia untuk akun Anda.</Text>
        </View>
        {refreshing ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      {items.length === 0 ? (
        <EmptyState title="Belum ada quiz" body="Tarik ke bawah untuk memuat ulang." />
      ) : (
        items.map(renderQuizCard)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontWeight: '900', fontSize: 24 },
  subtitle: { color: colors.muted, fontWeight: '700', marginTop: 3 },
  card: { gap: 0 },
  cardPress: { gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.slate, fontWeight: '700', marginTop: 3 },
  time: { color: colors.muted, fontWeight: '600' },
  pill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1 },
  pill_active: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  pill_success: { backgroundColor: '#E7F4F1', borderColor: '#B7D9D3' },
  pill_warning: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  pill_danger: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  pillText: { fontSize: 11, fontWeight: '900' },
  pillText_active: { color: colors.success },
  pillText_success: { color: colors.primaryDark },
  pillText_warning: { color: colors.accent },
  pillText_danger: { color: colors.danger },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    color: colors.slate,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
  },
  badgeInfo: { backgroundColor: '#DBEAFE', color: colors.info },
  badgeDanger: { backgroundColor: '#FEE2E2', color: colors.danger },
  badgeStrong: { backgroundColor: '#E7F4F1', color: colors.primaryDark },
  warning: {
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: '800',
    padding: 10,
    lineHeight: 18,
  },
  detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    borderRadius: 8,
    backgroundColor: '#E7F4F1',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  backText: { color: colors.primaryDark, fontWeight: '900' },
  heroCard: { gap: 10 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeBox: { flexGrow: 1, flexBasis: '30%', minWidth: 96, borderRadius: 8, backgroundColor: '#F8FAFC', padding: 10 },
  timeLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  timeValue: { color: colors.text, marginTop: 3, fontWeight: '900' },
  message: {
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    color: colors.info,
    fontWeight: '800',
    padding: 10,
    lineHeight: 18,
  },
  section: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  description: { color: colors.muted, fontWeight: '600', lineHeight: 20 },
  label: { color: colors.slate, fontWeight: '900', fontSize: 12 },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontWeight: '700',
  },
  essayInput: { minHeight: 130, textAlignVertical: 'top' },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionCounter: { color: colors.primaryDark, fontWeight: '900' },
  pointText: { color: colors.accent, fontWeight: '900' },
  questionText: { color: colors.text, fontWeight: '800', fontSize: 17, lineHeight: 24 },
  optionList: { gap: 8 },
  option: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#ECFDF5' },
  optionLabel: { color: colors.primaryDark, fontWeight: '900', minWidth: 24 },
  optionLabelSelected: { color: colors.primary },
  optionText: { color: colors.slate, flex: 1, lineHeight: 20 },
  optionTextSelected: { color: colors.text, fontWeight: '800' },
  navigationRow: { flexDirection: 'row', gap: 8 },
  navButton: { flex: 1 },
  resultScore: { color: colors.primaryDark, fontWeight: '900', fontSize: 18 },
  securityBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    justifyContent: 'center',
    padding: 18,
  },
  securitySheet: { backgroundColor: '#fff', borderRadius: 8, padding: 18, gap: 12 },
  securityTitle: { color: colors.danger, fontSize: 20, fontWeight: '900' },
  securityBody: { color: colors.slate, fontWeight: '700', lineHeight: 20 },
});
