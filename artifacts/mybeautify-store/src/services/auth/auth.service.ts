/**
 * Authentication and User Profile Service
 */

import {
  request,
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
} from '@/services/api/client';
import { STORAGE_KEYS } from '@/constants';
import type {
  UserResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  AuthResponse,
} from '@/types/auth.types';

export { getAuthToken, setAuthToken, getRefreshToken, setRefreshToken };

export function getCachedUser(): UserResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: UserResponse | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

export function logout(): void {
  setAuthToken(null);
  setCachedUser(null);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('malkaz_pending_verification');
    } catch {}
  }
}

function sanitizePendingVerificationOnUserChange(newUser: UserResponse | null): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = sessionStorage.getItem('malkaz_pending_verification');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        if (!newUser || (parsed.userId && parsed.userId !== newUser.id)) {
          sessionStorage.removeItem('malkaz_pending_verification');
        }
      } else {
        sessionStorage.removeItem('malkaz_pending_verification');
      }
    }
  } catch {
    sessionStorage.removeItem('malkaz_pending_verification');
  }
}

export async function login(
  payload: LoginRequest,
  remember = true
): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const token = res.accessToken || res.token;
  if (token) {
    setAuthToken(token, remember);
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken, remember);
    }
  }

  if (res.user) {
    setCachedUser(res.user);
  sanitizePendingVerificationOnUserChange(res.user);
    sanitizePendingVerificationOnUserChange(res.user);
  }

  return res;
}

export async function register(
  payload: RegisterRequest,
  remember = true
): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const token = res.accessToken || res.token;
  if (token) {
    setAuthToken(token, remember);
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken, remember);
    }
  }

  if (res.user) {
    setCachedUser(res.user);
  sanitizePendingVerificationOnUserChange(res.user);
    sanitizePendingVerificationOnUserChange(res.user);
  }

  return res;
}

export async function loginWithGoogle(
  credential: string,
  remember = true
): Promise<AuthResponse> {
  if (!credential.trim()) {
    throw new Error('Google did not return an identity token.');
  }

  const res = await request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  const token = res.accessToken || res.token;

  if (!token || !res.user) {
    throw new Error('The server returned an incomplete Google sign-in response.');
  }

  setAuthToken(token, remember);
  if (res.refreshToken) {
    setRefreshToken(res.refreshToken, remember);
  }
  setCachedUser(res.user);
  sanitizePendingVerificationOnUserChange(res.user);

  return { ...res, accessToken: token };
}

export async function forgotPassword(
  payload: ForgotPasswordRequest
): Promise<{ success?: boolean; message?: string }> {
  return request<{ success?: boolean; message?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(
  payload: ResetPasswordRequest
): Promise<{ success?: boolean; message?: string }> {
  return request<{ success?: boolean; message?: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshSessionToken(
  payload: RefreshTokenRequest
): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const token = res.accessToken || res.token;
  if (token) {
    const remember = Boolean(
      localStorage.getItem(STORAGE_KEYS.TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    );
    setAuthToken(token, remember);
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken, remember);
    }
  }

  return res;
}

export async function fetchCurrentUser(): Promise<UserResponse> {
  return request<UserResponse>('/auth/me');
}

export async function updateProfile(data: {
  phoneNumber?: string;
  profileImage?: string;
}): Promise<UserResponse> {
  return request<UserResponse>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
