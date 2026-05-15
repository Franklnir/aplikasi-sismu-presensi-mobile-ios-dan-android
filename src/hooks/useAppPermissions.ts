import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

type PermissionState = {
  camera: boolean;
  media: boolean;
  notifications: boolean;
  screenCapture: boolean;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useAppPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: false,
    media: false,
    notifications: false,
    screenCapture: false,
  });

  const refresh = useCallback(async () => {
    const [camera, media, notifications, screenCapture] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Notifications.getPermissionsAsync(),
      ScreenCapture.getPermissionsAsync(),
    ]);

    setPermissions({
      camera: camera.granted,
      media: media.granted,
      notifications: notifications.granted,
      screenCapture: screenCapture.granted,
    });
  }, []);

  const requestAll = useCallback(async () => {
    const [camera, media, notifications, screenCapture] = await Promise.all([
      ImagePicker.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync(),
      Notifications.requestPermissionsAsync(),
      ScreenCapture.requestPermissionsAsync(),
    ]);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'EduSmart',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    setPermissions({
      camera: camera.granted,
      media: media.granted,
      notifications: notifications.granted,
      screenCapture: screenCapture.granted,
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { permissions, refresh, requestAll };
};
