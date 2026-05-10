import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type PermissionState = {
  camera: boolean;
  media: boolean;
  notifications: boolean;
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
  });

  const requestAll = useCallback(async () => {
    const [camera, media, notifications] = await Promise.all([
      ImagePicker.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync(),
      Notifications.requestPermissionsAsync(),
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
    });
  }, []);

  useEffect(() => {
    void requestAll();
  }, [requestAll]);

  return { permissions, requestAll };
};
