import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { AuthService, User } from "../lib/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await AuthService.login({ email, password });
            if (response.success) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              set({
                error: response.message || "Login failed",
                isLoading: false,
              });
            }
          } catch (error: any) {
            set({
              error: error.response?.data?.message || "Login failed",
              isLoading: false,
            });
            throw error;
          }
        },

        register: async (
          firstName: string,
          lastName: string,
          email: string,
          password: string
        ) => {
          set({ isLoading: true, error: null });
          try {
            const response = await AuthService.register({
              firstName,
              lastName,
              email,
              password,
            });
            if (response.success) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              set({
                error: response.message || "Registration failed",
                isLoading: false,
              });
            }
          } catch (error: any) {
            set({
              error: error.response?.data?.message || "Registration failed",
              isLoading: false,
            });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          try {
            await AuthService.logout();
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        loadUser: async () => {
          if (!AuthService.isAuthenticated()) {
            set({ isAuthenticated: false, user: null });
            return;
          }

          set({ isLoading: true });
          try {
            const user = await AuthService.getCurrentUser();
            if (user) {
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } catch (error) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: "auth-store",
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: "auth-store",
    }
  )
);
