import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser as firebaseDeleteUser,
  sendPasswordResetEmail,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { clearAppStorage } from '@/utils/storageUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginGuest: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const explicitLogout = useRef(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active) return;
      
      // If we just explicitly logged out, skip setting the user back momentarily
      if (explicitLogout.current && firebaseUser) {
        return;
      }
      
      if (explicitLogout.current && !firebaseUser) {
        explicitLogout.current = false;
      }

      setUser(firebaseUser);
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
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
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
      if (auth.currentUser?.isAnonymous) {
        const credential = EmailAuthProvider.credential(email, pass);
        const result = await linkWithCredential(auth.currentUser, credential);
        if (result.user) {
          await updateProfile(result.user, { displayName: name });
          setUser({ ...result.user, displayName: name });
        }
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email, pass);
        if (credential.user) {
          await updateProfile(credential.user, { displayName: name });
          // Force state update to capture display name immediately
          setUser({ ...credential.user, displayName: name });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Email registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
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
      clearAppStorage();
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
      resetPassword,
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
