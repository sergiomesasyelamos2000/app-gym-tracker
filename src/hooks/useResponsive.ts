import { useWindowDimensions } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface ResponsiveConfig {
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  isSmallPhone: boolean;
  isLandscape: boolean;
  // Grid columns para diferentes secciones
  statsColumns: number;
  sessionColumns: number;
}

/**
 * Hook para manejar responsive design
 *
 * Breakpoints:
 * - Phone: < 600px
 * - Tablet: 600px - 1024px
 * - Desktop: > 1024px
 */
export function useResponsive(): ResponsiveConfig {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 375;
  const isLandscape = width > height;

  let deviceType: DeviceType = 'phone';
  let statsColumns = 3;
  let sessionColumns = 1;

  if (width >= 1024) {
    deviceType = 'desktop';
    statsColumns = 3;
    sessionColumns = 2;
  } else if (width >= 600) {
    deviceType = 'tablet';
    statsColumns = 3;
    sessionColumns = 2;
  } else {
    deviceType = 'phone';
    statsColumns = 3;
    sessionColumns = 1;
  }

  return {
    deviceType,
    isPhone: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    width,
    height,
    isSmallPhone,
    isLandscape,
    statsColumns,
    sessionColumns,
  };
}
