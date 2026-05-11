import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const hostUri = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
const metroHost = hostUri?.split(':')[0];
const inferredLanApiUrl = metroHost ? `http://${metroHost}:3000` : undefined;

/** Set API URL via EXPO_PUBLIC_API_URL or expo.extra.apiUrl. */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  inferredLanApiUrl ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
