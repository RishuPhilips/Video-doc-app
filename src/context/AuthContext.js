import React, { createContext, useEffect, useMemo, useState } from 'react';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      setUser(currentUser || null);

      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          await AsyncStorage.setItem('@id_token', token);
        } catch (e) {
        }
      } else {
        setIdToken(null);
        await AsyncStorage.removeItem('@id_token');
      }

      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  const register = async ({ name, email, password }) => {
    const trimmedEmail = (email || '').trim();
    const trimmedName = (name || '').trim();

    setLoading(true);
    try {
      const cred = await auth().createUserWithEmailAndPassword(trimmedEmail, password);
      try {
        await cred.user.updateProfile({ displayName: trimmedName });
      } catch (e) {
      }

      return { ok: true, user: cred.user };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    const trimmedEmail = (email || '').trim();
    setLoading(true);
    try {
      const cred = await auth().signInWithEmailAndPassword(trimmedEmail, password);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      await AsyncStorage.setItem('@id_token', token);
      return { ok: true, user: cred.user };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('@id_token');
      await auth().signOut();
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const u = auth().currentUser;
      if (!u) return { ok: false, error: new Error('Not signed in') };
      const token = await u.getIdToken(true); 
      setIdToken(token);
      await AsyncStorage.setItem('@id_token', token);
      return { ok: true, idToken: token };
    } catch (error) {
      return { ok: false, error };
    }
  };

  const value = useMemo(
    () => ({
      initializing,
      loading,
      user,
      idToken,
      register,
      login,
      logout,
      refreshToken,
    }),
    [initializing, loading, user, idToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
