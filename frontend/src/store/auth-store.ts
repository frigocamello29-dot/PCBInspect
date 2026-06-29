'use client';

import { create } from 'zustand';
import { User, fetchCurrentUser, logout as logoutApi } from '@/lib/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });
    const user = await fetchCurrentUser();
    set({ user, loading: false, initialized: true });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await logoutApi();
    set({ user: null, initialized: false });
  },
}));
