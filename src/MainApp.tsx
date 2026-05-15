import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { roleMenus, bottomMenuLimit } from './config/menu';
import { useAppPermissions } from './hooks/useAppPermissions';
import { useSmartNotifications } from './hooks/useSmartNotifications';
import { useAuth } from './state/AuthContext';
import type { AppNotification } from './types';
import { AnnouncementsScreen } from './screens/AnnouncementsScreen';
import { AssignmentsScreen } from './screens/AssignmentsScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DirectoryScreen } from './screens/DirectoryScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ApprovalsScreen } from './screens/ApprovalsScreen';
import { ReportScreen } from './screens/ReportScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AppHeader } from './ui/AppHeader';
import { BottomNav } from './ui/BottomNav';
import { NotificationModal } from './ui/NotificationModal';
import { PermissionPromptModal } from './ui/PermissionPromptModal';
import { colors } from './ui/theme';

export function MainApp() {
  const { api, profile, settings, lastLoginAt } = useAuth();
  const menus = useMemo(() => (profile?.role ? roleMenus[profile.role] : roleMenus.siswa), [profile?.role]);
  const [activeTab, setActiveTab] = useState(menus[0]?.id || 'dashboard');
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);
  const [permissionPromptDismissedFor, setPermissionPromptDismissedFor] = useState<string | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const { permissions, refresh: refreshPermissions, requestAll: requestAppPermissions } = useAppPermissions();
  const notifications = useSmartNotifications({ api, profile, lastLoginAt });
  const allPermissionsGranted = permissions.camera && permissions.media && permissions.notifications && permissions.screenCapture;

  useEffect(() => {
    if (!menus.some((item) => item.id === activeTab)) {
      setActiveTab(menus[0]?.id || 'dashboard');
    }
  }, [activeTab, menus]);

  useEffect(() => {
    if (!profile?.id) {
      setPermissionPromptVisible(false);
      setPermissionPromptDismissedFor(null);
      return;
    }
    void refreshPermissions();
  }, [profile?.id, refreshPermissions]);

  useEffect(() => {
    if (!profile?.id || allPermissionsGranted) {
      setPermissionPromptVisible(false);
      return;
    }
    if (permissionPromptDismissedFor !== profile.id) {
      setPermissionPromptVisible(true);
    }
  }, [allPermissionsGranted, permissionPromptDismissedFor, profile?.id]);

  const bottomItems = menus.slice(0, bottomMenuLimit);
  const overflowItems = menus.slice(bottomMenuLimit);

  const openNotification = (item: AppNotification) => {
    if (item.actionTab && menus.some((menu) => menu.id === item.actionTab)) {
      setActiveTab(item.actionTab);
    }
  };

  const closePermissionPrompt = () => {
    setPermissionPromptVisible(false);
    setPermissionPromptDismissedFor(profile?.id || null);
  };

  const allowAppPermissions = async () => {
    setPermissionLoading(true);
    try {
      await requestAppPermissions();
      setPermissionPromptDismissedFor(profile?.id || null);
      setPermissionPromptVisible(false);
    } finally {
      setPermissionLoading(false);
    }
  };

  const screen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen api={api} profile={profile} settings={settings} />;
      case 'tugas':
        return <AssignmentsScreen api={api} profile={profile} />;
      case 'absensi':
        return <AttendanceScreen api={api} profile={profile} />;
      case 'quiz':
        return <QuizScreen api={api} profile={profile} />;
      case 'pengumuman':
        return <AnnouncementsScreen api={api} />;
      case 'profil':
        return <ProfileScreen />;
      case 'siswa':
      case 'guru':
      case 'kelas':
        return <DirectoryScreen api={api} profile={profile} tab={activeTab} />;
      case 'jadwal':
        return <ScheduleScreen api={api} profile={profile} />;
      case 'laporan':
        return <ReportScreen api={api} profile={profile} />;
      case 'approvals':
        return <ApprovalsScreen api={api} profile={profile} />;
      case 'backup':
        return <PlaceholderScreen title="Backup" />;
      case 'pengaturan':
        return <SettingsScreen settings={settings} />;
      default:
        return <DashboardScreen api={api} profile={profile} settings={settings} />;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.app}>
        <AppHeader
          profile={profile}
          settings={settings}
          overflowItems={overflowItems}
          onSelectOverflow={setActiveTab}
          notificationCount={notifications.unreadCount}
          notifications={notifications.items}
          onOpenNotifications={() => notifications.setPopupVisible(true)}
          overflowVisible={overflowVisible}
          setOverflowVisible={setOverflowVisible}
        />
        <View style={styles.body}>{screen()}</View>
        <BottomNav items={bottomItems} active={activeTab} onChange={setActiveTab} />
        <NotificationModal
          visible={notifications.popupVisible}
          items={notifications.items}
          onClose={() => notifications.setPopupVisible(false)}
          onOpenItem={openNotification}
        />
        <PermissionPromptModal
          visible={permissionPromptVisible}
          permissions={permissions}
          loading={permissionLoading}
          onAllow={() => void allowAppPermissions()}
          onClose={closePermissionPrompt}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
});
