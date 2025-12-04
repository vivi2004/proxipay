import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Resolve a sensible base URL for device, emulator, or web
function resolveBaseURL() {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  const hostUri = (Constants as any)?.expoConfig?.hostUri
    || (Constants as any)?.expoGoConfig?.hostUri
    || (Constants as any)?.manifest?.hostUri
    || (Constants as any)?.manifest?.debuggerHost
    || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri && typeof hostUri === "string") {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost") {
      return `http://${host}:3000/api`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000/api";
  }

  return "http://localhost:3000/api";
}

const API = axios.create({ baseURL: resolveBaseURL() });

// add token before requests
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

