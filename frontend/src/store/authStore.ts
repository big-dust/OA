import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee } from '@/types';

interface AuthState {
  token: string | null;
  employee: Employee | null;
  isAuthenticated: boolean;
  setAuth: (token: string, employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      employee: null,
      isAuthenticated: false,
      setAuth: (token: string, employee: Employee) =>
        set({
          token,
          employee,
          isAuthenticated: true,
        }),
      updateEmployee: (employee: Employee) =>
        set({
          employee,
        }),
      logout: () =>
        set({
          token: null,
          employee: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
