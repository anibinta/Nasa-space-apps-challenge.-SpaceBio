import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signOut(auth);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  };

  // Retrieve Firebase ID token in memory only (never stored in localStorage)
  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        authBusy,
        authError,
        signInWithGoogle,
        signOutUser,
        getIdToken,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
