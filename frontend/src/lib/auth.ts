import apiClient, { API_ENDPOINTS } from "../lib/api";
import Cookies from "js-cookie";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    const authData = response.data;

    if (authData.success && authData.data.tokens) {
      // Store access token in cookie
      Cookies.set("authToken", authData.data.tokens.accessToken, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      // Store refresh token in cookie
      Cookies.set("refreshToken", authData.data.tokens.refreshToken, {
        expires: 30, // 30 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    return authData;
  }

  static async register(
    credentials: RegisterCredentials
  ): Promise<AuthResponse> {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.REGISTER,
      credentials
    );
    const authData = response.data;

    if (authData.success && authData.data.tokens) {
      // Store access token in cookie
      Cookies.set("authToken", authData.data.tokens.accessToken, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      // Store refresh token in cookie
      Cookies.set("refreshToken", authData.data.tokens.refreshToken, {
        expires: 30, // 30 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    return authData;
  }

  static async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Even if server logout fails, clear local tokens
      console.error("Logout error:", error);
    } finally {
      Cookies.remove("authToken");
      Cookies.remove("refreshToken");
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      return response.data.data.user;
    } catch (error) {
      return null;
    }
  }

  static getToken(): string | undefined {
    return Cookies.get("authToken");
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
