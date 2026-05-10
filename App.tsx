import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { SchoolSelectionScreen } from './src/screens/SchoolSelectionScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MainApp } from './src/MainApp';
import { useAppPermissions } from './src/hooks/useAppPermissions';
import { colors } from './src/ui/theme';

function AppShell() {
  const { initialized, school, profile } = useAuth();
  useAppPermissions();

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!school) return <SchoolSelectionScreen />;
  if (!profile) return <LoginScreen />;
  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
