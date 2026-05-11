import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const hostUri = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
const metroHost = hostUri?.split(':')[0];
const inferredLanApiUrl = metroHost ? `http://${metroHost}:3000` : undefined;

/** Physical device: set `expo.extra.apiUrl` to your PC LAN IP:PORT. */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  inferredLanApiUrl ??
  extra?.apiUrl ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
