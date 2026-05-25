import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  ActionCodeSettings
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { sendPasswordResetNotification } from '../utils/emailService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAIL = 'admin@smartzone.com.lk';
const googleProvider = new GoogleAuthProvider();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const profile = profileDoc.data() as UserProfile;
            setUserProfile(profile);
            setIsAdmin(profile.isAdmin || firebaseUser.email === ADMIN_EMAIL);
          } else {
            const isAdminUser = firebaseUser.email === ADMIN_EMAIL;
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isAdminUser ? 'Admin' : ''),
              isAdmin: isAdminUser,
              createdAt: Date.now(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUserProfile(newProfile);
            setIsAdmin(isAdminUser);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: 'Admin' });
          const adminProfile: UserProfile = {
            uid: cred.user.uid,
            email: email,
            displayName: 'Admin',
            isAdmin: true,
            createdAt: Date.now(),
          };
          await setDoc(doc(db, 'users', cred.user.uid), adminProfile);
          return;
        } catch (createError: any) {
          if (createError.code === 'auth/email-already-in-use') {
            throw { code: 'auth/wrong-password', message: 'Incorrect password' };
          }
          throw createError;
        }
      } else {
        throw error;
      }
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const isAdminUser = email === ADMIN_EMAIL;
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: email,
      displayName: name,
      isAdmin: isAdminUser,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    
    // Check if user profile exists
    const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!profileDoc.exists()) {
      const isAdminUser = firebaseUser.email === ADMIN_EMAIL;
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        isAdmin: isAdminUser,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
    }
  };

  const resetPassword = async (email: string) => {
    // Firebase generates and sends the reset email from its own servers.
    // We also send a branded copy from admin@smartzone.com.lk via EmailJS.
    await sendPasswordResetEmail(auth, email);

    // Try to look up the user's display name for a personalised email
    try {
      // Generate a fresh action link URL for the branded email
      const actionCodeSettings: ActionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      };
      // Note: generatePasswordResetLink is server-side only.
      // We send a friendly notification instead, directing them to check inbox.
      await sendPasswordResetNotification(
        email,
        '',  // name unknown at this stage; the function will use "Valued Customer"
        window.location.origin + '/login'
      );
    } catch (err) {
      // Non-critical — Firebase already sent the official reset email
      console.warn('Branded reset email failed:', err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      isAdmin, 
      login, 
      adminLogin, 
      register, 
      loginWithGoogle,
      resetPassword,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
