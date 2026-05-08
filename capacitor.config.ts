import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.antigravity.runrecord',
  appName: 'Running Tracker',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BackgroundGeolocation: {
      android: {
        useLegacyBridge: true,
        foregroundService: true,
        notificationTitle: '跑步器 正在追蹤',
        notificationText: '正在記錄您的跑步路徑...',
        interval: 5000, // 5 seconds
        fastestInterval: 2000,
        distanceFilter: 5 // 5 meters
      }
    }
  }
};

export default config;
