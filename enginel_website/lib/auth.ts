/**
 * Authentication utilities for Enginel
 * 
 * Manages user authentication state, token storage, and login/logout flows.
 */

import ApiClient from './api/client';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_us_person: boolean;
  security_clearance_level: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  organization: string;
  phone_number?: string;
  department?: string;
  job_title?: string;
  date_joined: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

const TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'enginel_auth_token';
const REFRESH_KEY = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'enginel_refresh_token';
const USER_KEY = 'enginel_user';

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<User> {
    try {
      console.log('Making login request to /auth/login/');
      const response = await ApiClient.post<LoginResponse>('/auth/login/', credentials);
      console.log('Login response received:', { user: response.user.username });

      // Store tokens and user data
      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_KEY, response.refresh_token);

      // Map response user to our User interface
      const user: User = {
        id: response.user.id.toString(),
        username: response.user.username,
        email: response.user.email,
        first_name: response.user.first_name,
        last_name: response.user.last_name,
        is_us_person: false, // Will be populated from user profile endpoint
        security_clearance_level: 'UNCLASSIFIED',
        organization: '',
        date_joined: new Date().toISOString(), // Default to now, will be populated from API
      };

      localStorage.setItem(USER_KEY, JSON.stringify(user));
      console.log('User data stored in localStorage');

      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);

    // Optional: Call logout endpoint
    ApiClient.post('/auth/logout/', {}).catch(() => {
      // Ignore errors on logout
    });
  }

  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(TOKEN_KEY);
  }

  static async getCurrentUserFromAPI(): Promise<User> {
    const user = await ApiClient.get<User>('/users/me/');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  static async verifyToken(): Promise<boolean> {
    try {
      await ApiClient.post('/auth/verify/', {
        token: localStorage.getItem(TOKEN_KEY),
      });
      return true;
    } catch {
      return false;
    }
  }
}

export default AuthService;
