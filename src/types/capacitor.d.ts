declare module '@capacitor/cli' {
  export interface CapacitorConfig {
    appId: string;
    appName: string;
    webDir: string;
    server?: {
      url?: string;
      cleartext?: boolean;
      [key: string]: unknown;
    };
    bundledWebRuntime?: boolean;
    [key: string]: unknown;
  }
}
