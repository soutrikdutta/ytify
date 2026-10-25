import { Capacitor } from '@capacitor/core';

const PROD_BASE = 'https://soutrik-ytify.vercel.app';

export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === ''))
  );
};

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (isNativePlatform()) {
    return `${PROD_BASE}${normalizedPath}`;
  }
  return normalizedPath;
};
