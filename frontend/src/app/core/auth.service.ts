import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthResponse } from './models';

const AUTH_STORAGE_KEY = 'seat-reserve-auth';

/** Returns the JWT expiry in ms, or null when the token is not a decodable JWT. */
function jwtExpiryMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentAuth: AuthResponse | null = this.loadStoredAuth();

  /** Emits whenever the session ends so in-flight requests/retries can be cancelled. */
  readonly loggedOut$ = new Subject<void>();

  get auth(): AuthResponse | null {
    return this.currentAuth;
  }

  get token(): string | null {
    return this.currentAuth?.token ?? null;
  }

  /** True only for a stored token that has not expired (expired tokens are dropped immediately). */
  get isAuthenticated(): boolean {
    const token = this.currentAuth?.token;
    if (!token) return false;
    const expiry = jwtExpiryMs(token);
    if (expiry !== null && expiry <= Date.now()) {
      this.logout();
      return false;
    }
    return true;
  }

  save(auth: AuthResponse): void {
    this.currentAuth = auth;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Storage can be disabled by a browser policy; in-memory auth still works for this tab.
    }
  }

  update(auth: AuthResponse): void {
    this.save(auth);
  }

  logout(): void {
    const hadSession = this.currentAuth !== null;
    this.currentAuth = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // No-op when browser storage is unavailable.
    }
    if (hadSession) this.loggedOut$.next();
  }

  private loadStoredAuth(): AuthResponse | null {
    try {
      const localValue = localStorage.getItem(AUTH_STORAGE_KEY);
      if (localValue) return JSON.parse(localValue) as AuthResponse;
      const sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return sessionValue ? JSON.parse(sessionValue) as AuthResponse : null;
    } catch {
      return null;
    }
  }
}
