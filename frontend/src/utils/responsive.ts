import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Custom hooks for responsive design
 * These hooks make it easier to create responsive layouts
 */

// Hook to check if the screen is mobile
export const useIsMobile = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};

// Hook to check if the screen is a tablet
export const useIsTablet = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.between('sm', 'md'));
};

// Hook to check if the screen is a desktop
export const useIsDesktop = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('md'));
};

// Hook to check if the screen is a large desktop
export const useIsLargeDesktop = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('lg'));
};

// Types of screen sizes for responsive utilities
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Responsive object type for defining different values based on screen size
export type ResponsiveValue<T> = {
  [key in ScreenSize]?: T;
} & {
  default: T;
};

// Function to get a responsive value based on current screen size
export const getResponsiveValue = <T>(
  responsiveValue: ResponsiveValue<T>,
  currentSize: ScreenSize
): T => {
  if (responsiveValue[currentSize] !== undefined) {
    return responsiveValue[currentSize] as T;
  }
  
  // Fallback logic for smaller screen sizes
  const sizeOrder: ScreenSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  const currentIndex = sizeOrder.indexOf(currentSize);
  
  // Try to find the closest smaller size with a defined value
  for (let i = currentIndex - 1; i >= 0; i--) {
    const size = sizeOrder[i];
    if (responsiveValue[size] !== undefined) {
      return responsiveValue[size] as T;
    }
  }
  
  // Default value as fallback
  return responsiveValue.default;
};

// Hook to get the current screen size
export const useScreenSize = (): ScreenSize => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  
  if (isXs) return 'xs';
  if (isSm) return 'sm';
  if (isMd) return 'md';
  if (isLg) return 'lg';
  return 'xl';
};

// Hook to get a responsive value based on current screen size
export const useResponsiveValue = <T>(responsiveValue: ResponsiveValue<T>): T => {
  const currentSize = useScreenSize();
  return getResponsiveValue(responsiveValue, currentSize);
};
