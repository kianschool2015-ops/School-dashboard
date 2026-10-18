import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.mashahir.support',
  appName: 'پشتیبانی مشاهیر دانش',
  webDir: 'public',
  server: {
    url: 'https://support.mashahirdanesh.com',
    cleartext: false,
  },
};

export default config;