'use client';

const TOKEN_KEYS = ['qc_sa_token', 'superAdminToken', 'token'] as const;
const AUTH_FLAG = 'superAdminAuth';

/**
 * Safely retrieve the Super Admin token from sessionStorage or localStorage.
 */
export function getSuperAdminToken(): string | null {
  if (typeof window === 'undefined') return null;

  for (const key of TOKEN_KEYS) {
    const val = sessionStorage.getItem(key);
    if (val && val !== 'null' && val !== 'undefined') return val;
  }

  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key);
    if (val && val !== 'null' && val !== 'undefined') return val;
  }

  return null;
}

/**
 * Check if the current user has an active, valid Super Admin session.
 */
export function isSuperAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const hasToken = !!getSuperAdminToken();
  const hasFlag =
    sessionStorage.getItem(AUTH_FLAG) === 'true' ||
    localStorage.getItem(AUTH_FLAG) === 'true';
  return hasToken && hasFlag;
}

/**
 * Persist Super Admin credentials across both sessionStorage and localStorage.
 */
export function setSuperAdminAuth(
  token: string,
  superAdmin?: { id?: string; email?: string } | null
) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem('qc_sa_token', token);
    sessionStorage.setItem('superAdminToken', token);
    sessionStorage.setItem('token', token);
    sessionStorage.setItem(AUTH_FLAG, 'true');

    localStorage.setItem('qc_sa_token', token);
    localStorage.setItem('superAdminToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem(AUTH_FLAG, 'true');

    if (superAdmin?.email) {
      sessionStorage.setItem('qc_sa_email', superAdmin.email);
      localStorage.setItem('qc_sa_email', superAdmin.email);
    }
    if (superAdmin?.id) {
      sessionStorage.setItem('qc_sa_id', superAdmin.id);
      localStorage.setItem('qc_sa_id', superAdmin.id);
    }
  } catch (e) {
    console.error('[setSuperAdminAuth] Failed to persist auth:', e);
  }
}

/**
 * Remove all Super Admin credentials from storage.
 */
export function clearSuperAdminAuth() {
  if (typeof window === 'undefined') return;

  try {
    for (const key of TOKEN_KEYS) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
    sessionStorage.removeItem(AUTH_FLAG);
    localStorage.removeItem(AUTH_FLAG);
    sessionStorage.removeItem('qc_sa_email');
    localStorage.removeItem('qc_sa_email');
    sessionStorage.removeItem('qc_sa_id');
    localStorage.removeItem('qc_sa_id');
  } catch (e) {
    console.error('[clearSuperAdminAuth] Failed to clear auth:', e);
  }
}

/**
 * Clear credentials and redirect immediately to the Super Admin login page.
 */
export function redirectToSuperAdminLogin() {
  clearSuperAdminAuth();
  if (typeof window !== 'undefined') {
    if (window.location.pathname !== '/super-admin/auth') {
      window.location.href = '/super-admin/auth';
    }
  }
}
