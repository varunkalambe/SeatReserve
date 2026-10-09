import { Injectable } from '@angular/core';
import { AuthResponse } from './models';

const AUTH_STORAGE_KEY = 'seat-reserve-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentAuth: AuthResponse | null = this.loadStoredAuth();

  get auth(): AuthResponse | null {
    return this.currentAuth;
  }

  get token(): string | null {
    return this.currentAuth?.token ?? null;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.currentAuth?.token);
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
    this.currentAuth = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // No-op when browser storage is unavailable.
    }
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
