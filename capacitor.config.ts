import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.oneanother.app',
  appName: '1Another',
  webDir: 'public',
  server: isDev
    ? {
        // 10.0.2.2 maps to host machine's localhost in the Android emulator.
        // 192.168.0.3 is the host machine's local IP for physical devices.
        url: 'http://192.168.0.3:3000',
        cleartext: true,
      }
    : undefined,
};

export default config;
