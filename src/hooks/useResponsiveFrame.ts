import { useMemo } from 'react';
import { useWindowDimensions, ViewStyle } from 'react-native';

export const useResponsiveFrame = (maxWidth = 560): ViewStyle => {
  const { width } = useWindowDimensions();

  return useMemo(
    () => ({
      width: '100%',
      maxWidth,
      alignSelf: 'center',
      paddingHorizontal: width < 360 ? 14 : 20,
    }),
    [maxWidth, width],
  );
};
