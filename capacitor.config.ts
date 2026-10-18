import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.mashahir.support',
  appName: 'پشتیبانی مشاهیر دانش',
  webDir: 'public',
  server: {
    url: 'http://192.168.64.76:3000',
    cleartext: true,
  },
};

export default config;