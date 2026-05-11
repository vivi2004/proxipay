import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { api, setAuthToken, type UserDto } from '../lib/api';
import { getOrCreateKeyPair, ensurePublicKeyMatchesServer } from '../lib/cryptoKeys';
import { setLocalBalancePaise, getLocalBalancePaise, getDb } from '../lib/db';
import { pushOfflineTransactions } from '../lib/syncService';

const TOKEN_KEY = 'proxipay_jwt';
const USER_JSON_KEY = 'proxipay_user_json';

type AuthContextValue = {
  token: string | null;
  user: UserDto | null;
  loading: boolean;
  localBalancePaise: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshLocalBalance: () => Promise<void>;
  syncNow: () => Promise<{ ok: boolean; message?: string }>;
  refreshUserFromServer: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [localBalancePaise, setLocalBal] = useState(0);

  const refreshLocalBalance = useCallback(async () => {
    await getDb();
    const b = await getLocalBalancePaise();
    setLocalBal(b);
  }, []);

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_JSON_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setLocalBal(0);
  }, []);

  const hydrate = useCallback(async () => {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    const cached = await SecureStore.getItemAsync(USER_JSON_KEY);
    if (!t || !cached) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }
    setAuthToken(t);
    setToken(t);
    try {
      const u = JSON.parse(cached) as UserDto;
      const keysOk = await ensurePublicKeyMatchesServer(u.publicKey);
      if (!keysOk) {
        await clearSession();
        setLoading(false);
        return;
      }
      const { data } = await api.get<{ walletBalancePaise: number }>('/wallet/balance');
      await getDb();
      const local = await getLocalBalancePaise();
      if (local === 0) {
        await setLocalBalancePaise(data.walletBalancePaise);
      }
      setUser({ ...u, walletBalancePaise: data.walletBalancePaise });
      await refreshLocalBalance();
    } catch {
      await clearSession();
    }
    setLoading(false);
  }, [clearSession, refreshLocalBalance]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      if (s.isConnected && s.isInternetReachable !== false && token) {
        void (async () => {
          await pushOfflineTransactions();
          await refreshLocalBalance();
          try {
            const { data } = await api.get<{ walletBalancePaise: number }>('/wallet/balance');
            setUser((prev) => (prev ? { ...prev, walletBalancePaise: data.walletBalancePaise } : prev));
          } catch {
            /* */
          }
        })();
      }
    });
    return () => sub();
  }, [token, refreshLocalBalance]);

  const login = useCallback(
    async (email: string, password: string) => {
      await getOrCreateKeyPair();
      const { data } = await api.post<{ token: string; user: UserDto }>('/auth/login', {
        email,
        password,
      });
      const keysOk = await ensurePublicKeyMatchesServer(data.user.publicKey);
      if (!keysOk) {
        throw new Error(
          'This account was registered on another device. Use the original device or register a new account.'
        );
      }
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_JSON_KEY, JSON.stringify(data.user));
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      await getDb();
      await setLocalBalancePaise(data.user.walletBalancePaise);
      await refreshLocalBalance();
    },
    [refreshLocalBalance]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { publicKeyBase64 } = await getOrCreateKeyPair();
      const { data } = await api.post<{ token: string; user: UserDto }>('/auth/register', {
        email,
        password,
        name,
        publicKey: publicKeyBase64,
      });
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_JSON_KEY, JSON.stringify(data.user));
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      await getDb();
      await setLocalBalancePaise(data.user.walletBalancePaise);
      await refreshLocalBalance();
    },
    [refreshLocalBalance]
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const syncNow = useCallback(async () => {
    const r = await pushOfflineTransactions();
    await refreshLocalBalance();
    try {
      const { data } = await api.get<{ walletBalancePaise: number }>('/wallet/balance');
      setUser((prev) => (prev ? { ...prev, walletBalancePaise: data.walletBalancePaise } : prev));
    } catch {
      /* */
    }
    if (r.error) return { ok: false, message: r.error };
    return { ok: true, message: `Updated. ${r.syncedIds.length} record(s) reconciled.` };
  }, [refreshLocalBalance]);

  const refreshUserFromServer = useCallback(async () => {
    const { data } = await api.get<{ walletBalancePaise: number }>('/wallet/balance');
    setUser((prev) => (prev ? { ...prev, walletBalancePaise: data.walletBalancePaise } : prev));
    await setLocalBalancePaise(data.walletBalancePaise);
    await refreshLocalBalance();
  }, [refreshLocalBalance]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      localBalancePaise,
      login,
      register,
      logout,
      refreshLocalBalance,
      syncNow,
      refreshUserFromServer,
    }),
    [
      token,
      user,
      loading,
      localBalancePaise,
      login,
      register,
      logout,
      refreshLocalBalance,
      syncNow,
      refreshUserFromServer,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
