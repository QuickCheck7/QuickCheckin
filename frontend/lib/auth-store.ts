'use client';

import { create } from 'zustand';
import { apiClient } from './api-client';
import { toast } from 'sonner';

export type UserRole = 'guest' | 'admin';

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  phoneNumber: string;
  currentStep: 'login' | 'otp' | 'authenticated';
  otp: string;
  isLoading: boolean;
  restaurantData: any | null;
  token: string | null;
  login: (phone: string, role: UserRole) => Promise<void>;
  verifyOtp: (enteredOtp: string) => Promise<boolean>;
  logout: () => void;
  setOtp: (otp: string) => void;
  hydrate: () => Promise<void>;
}

const TOKEN_KEY = 'sessionToken'; // Must match what verify-otp page uses

const getInitialRestaurant = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('restaurant');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sessionToken') || localStorage.getItem('token') || null;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const initialToken = getInitialToken();
  const initialRestaurant = getInitialRestaurant();

  return {
    isAuthenticated: !!initialToken,
    userRole: initialToken ? 'admin' : null,
    phoneNumber: '',
    currentStep: initialToken ? 'authenticated' : 'login',
    otp: '',
    isLoading: false,
    restaurantData: initialRestaurant,
    token: initialToken,

    login: async (phone: string, role: UserRole) => {
      set({ isLoading: true });
      
      const { data, error } = await apiClient.requestOTP(phone, role);
      
      set({ isLoading: false });
      
      if (error) {
        toast.error(error.message || 'Failed to send OTP');
        return;
      }

      set({
        phoneNumber: phone,
        userRole: role,
        currentStep: 'otp',
        otp: '',
      });

      toast.success('OTP sent to your phone number');
    },

    verifyOtp: async (enteredOtp: string) => {
      const { phoneNumber, userRole } = get();
      
      if (!phoneNumber || !userRole) {
        toast.error('Session expired. Please login again.');
        return false;
      }

      set({ isLoading: true });
      
      const { data, error } = await apiClient.verifyOTP(phoneNumber, userRole, enteredOtp);
      
      set({ isLoading: false });
      
      if (error) {
        toast.error(error.message || 'Invalid OTP');
        return false;
      }

      const authToken = data?.token || (data as any)?.sessionToken;
      if (authToken) {
        // Store token in localStorage under both keys for full compatibility
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem('token', authToken);
        if (data?.restaurant) {
          localStorage.setItem('restaurant', JSON.stringify(data.restaurant));
        }
        
        set({
          isAuthenticated: true,
          userRole: userRole || 'admin',
          currentStep: 'authenticated',
          otp: '',
          restaurantData: data?.restaurant || null,
          token: authToken,
        });

        toast.success('Login successful!');
        return true;
      }

      return false;
    },

    logout: () => {
      // Clear token from localStorage
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('restaurant');
      
      set({
        isAuthenticated: false,
        userRole: null,
        phoneNumber: '',
        currentStep: 'login',
        otp: '',
        isLoading: false,
        restaurantData: null,
        token: null,
      });
    },

    setOtp: (otp: string) => {
      set({ otp });
    },

    hydrate: async () => {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token'))
        : null;
      
      if (typeof window !== 'undefined') {
        const cachedRestaurant = getInitialRestaurant();
        if (cachedRestaurant) {
          set({ restaurantData: cachedRestaurant, isAuthenticated: true });
        }
      }

      if (!token) {
        return;
      }

      set({ isLoading: true });

      try {
        // Verify token with backend
        const { data, error } = await apiClient.validateToken(token);
        
        if (error || !data) {
          // Token is invalid, clear it
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('token');
          set({ isLoading: false, isAuthenticated: false, restaurantData: null, token: null });
          return;
        }

        // Token is valid, restore auth state
        if (data.restaurant) {
          localStorage.setItem('restaurant', JSON.stringify(data.restaurant));
        }
        set({
          isAuthenticated: true,
          userRole: data.role,
          phoneNumber: data.phone,
          restaurantData: data.restaurant,
          token: token,
          currentStep: 'authenticated',
          isLoading: false,
        });
      } catch (err) {
        console.error('Hydration error:', err);
        set({ isLoading: false });
      }
    },
  };
});