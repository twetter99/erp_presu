import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  firebaseUid: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: Usuario) => void;
  logout: () => Promise<void>;
  initAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUid: null,
  isAuthenticated: false,
  loading: true,

  setUser: (user) => {
    localStorage.setItem('erp_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem('erp_user');
    set({ user: null, firebaseUid: null, isAuthenticated: false });
  },

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userStr = localStorage.getItem('erp_user');
        const user = userStr ? JSON.parse(userStr) : null;
        set({
          firebaseUid: firebaseUser.uid,
          user,
          isAuthenticated: !!user,
          loading: false,
        });
      } else {
        localStorage.removeItem('erp_user');
        set({
          user: null,
          firebaseUid: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    });
    return unsubscribe;
  },
}));
