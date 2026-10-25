import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ytify.music',
  appName: 'ytify',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'soutrik-ytify.vercel.app',
    allowNavigation: [
      'https://soutrik-ytify.vercel.app',
      '*.youtube.com',
      '*.ytimg.com',
      '*.googlevideo.com',
      '*.google.com',
      '*.firebaseapp.com'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
  }
};

export default config;
