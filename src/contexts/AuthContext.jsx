import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { app } from '../firebase';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { setUser(user); setLoading(false); });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => { await signInWithPopup(auth, googleProvider); };
  const signInWithEmail = async (email, password) => { await signInWithEmailAndPassword(auth, email, password); };
  
  const signUpWithEmail = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) { await updateProfile(result.user, { displayName: name }); setUser({ ...result.user, displayName: name }); }
  };

  const resetPassword = async (email) => { await sendPasswordResetEmail(auth, email); };

  const updateUserProfile = async (displayName) => {
    if (auth.currentUser) { await updateProfile(auth.currentUser, { displayName }); setUser({ ...auth.currentUser, displayName }); }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const logout = async () => { await signOut(auth); };

  const value = {
    user, loading,
    signInWithGoogle, signInWithEmail, signUpWithEmail,
    resetPassword, updateUserProfile, changePassword, logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}