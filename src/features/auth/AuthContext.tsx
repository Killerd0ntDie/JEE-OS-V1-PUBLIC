import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { auth } from '@/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginGuest: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const explicitLogout = useRef(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;

      if (currentUser) {
        explicitLogout.current = false;
      }

      setUser(currentUser);
      setLoading(false);

    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const loginGuest = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setError(err.message || 'Email sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      if (credential.user) {
        await updateProfile(credential.user, { displayName: name });
        // Force state update to capture display name immediately
        setUser({ ...credential.user, displayName: name });
      }
    } catch (err: any) {
      setError(err.message || 'Email registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      explicitLogout.current = true;
      await signOut(auth);
    } catch (err: any) {
      explicitLogout.current = false;
      setError(err.message || 'Sign-out failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      setError(null);
      explicitLogout.current = true;
      await firebaseDeleteUser(auth.currentUser);
    } catch (err: any) {
      explicitLogout.current = false;
      setError(err.message || 'Account deletion failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      loginGuest,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      deleteAccount,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
