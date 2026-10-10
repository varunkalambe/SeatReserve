import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { EmptyError, firstValueFrom, takeUntil, timeout } from 'rxjs';
import { BUILD_API_BASE_URL } from './api-base.generated';
import { AuthService } from './auth.service';
import {
  AppNotification, AuthResponse, BusTrip, Profile, Reservation, Seat,
  SupportTicket, Ticket, WalletInfo, WalletTransaction
} from './models';

const GATEWAY_STATUSES = new Set([502, 503, 504]);
const REQUEST_TIMEOUT_MS = 60_000;
const GET_ATTEMPTS = 3;
/** Render's free tier needs up to ~3 minutes to boot this Spring app after it has gone to sleep. */
const WAKE_MAX_MS = 240_000;
const WAKE_POLL_MS = 3_000;
const WAKE_PROBE_TIMEOUT_MS = 8_000;
const HEALTH_PATH = '/actuator/health/liveness';

type ApiError = Error & { status?: number; data?: unknown };

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = this.readBaseUrl();
  private backendBuildChecked = false;
  private awake = false;
  private wakePromise: Promise<void> | null = null;

  /** True while the (sleeping) backend is booting; the UI shows a "waking up" notice. */
  warmingUp = false;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  private readBaseUrl(): string {
    const metaValue = document.querySelector<HTMLMetaElement>('meta[name="api-base-url"]')?.content?.trim() ?? '';
    const runtimeValue = (window as unknown as { __SEATRESERVE_CONFIG__?: { apiBaseUrl?: string } }).__SEATRESERVE_CONFIG__?.apiBaseUrl ?? '';
    return (runtimeValue || metaValue || BUILD_API_BASE_URL).trim().replace(/\/+$/, '');
  }

  private debug(scope: string, ...details: unknown[]): void {
    let enabled = isDevMode();
    try {
      const flag = localStorage.getItem('srvDebug');
      if (flag === '1') enabled = true;
      if (flag === '0') enabled = false;
    } catch { /* Storage is optional. */ }
    if (enabled) console.log(`[SRV:${scope}]`, ...details);
  }

  /**
   * Resolves once the backend answers. Render free instances sleep after ~15 min idle and reset every
   * connection while booting (ERR_CONNECTION_RESET), so we poll a cheap health endpoint instead of
   * firing the real requests into a server that is not listening yet. Skipped for same-origin use.
   */
  ensureAwake(): Promise<void> {
    if (this.awake || !this.baseUrl) return Promise.resolve();
    this.wakePromise ??= this.pollUntilAwake().finally(() => { this.wakePromise = null; });
    return this.wakePromise;
  }

  private async pollUntilAwake(): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < WAKE_MAX_MS) {
      try {
        const response = await fetch(`${this.baseUrl}${HEALTH_PATH}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(WAKE_PROBE_TIMEOUT_MS),
        });
        // Render's own "starting" page has no X-SRV-Build header; our app always sends it.
        if (response.ok || response.headers.get('X-SRV-Build')) {
          this.awake = true;
          this.warmingUp = false;
          this.debug('WAKE', 'backend is up after', Date.now() - startedAt, 'ms');
          return;
        }
      } catch { /* connection reset / timeout while the instance boots */ }
      this.warmingUp = true;
      await sleep(WAKE_POLL_MS);
    }
    this.warmingUp = false;
    throw Object.assign(new Error('The server is taking too long to start. Please wait a minute and try again.'), { status: 503 });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const maxAttempts = method === 'GET' ? GET_ATTEMPTS : 1;

    for (let attempt = 1; ; attempt++) {
      if (!this.awake && this.baseUrl) await this.ensureAwake();
      this.debug('API', '→', method, path, body ?? '');
      try {
        const response = await firstValueFrom(
          this.http.request<T>(method, url, { body, observe: 'response' }).pipe(
            timeout(REQUEST_TIMEOUT_MS),
            takeUntil(this.auth.loggedOut$),
          ),
        );
        this.awake = true;
        this.checkBackendBuild(response, path);
        this.debug('API', '←', response.status, method, path, response.body);
        return response.body as T;
      } catch (error) {
        if (error instanceof EmptyError) {
          throw Object.assign(new Error('Your session has ended. Please log in again.'), { status: 401 });
        }
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        const transient = !status || GATEWAY_STATUSES.has(status);
        if (transient) this.awake = false;
        if (transient && attempt < maxAttempts) {
          await sleep(1500 * attempt);
          continue;
        }
        throw this.toApiError(error, method, path);
      }
    }
  }

  private checkBackendBuild(response: HttpResponse<unknown>, path: string): void {
    const build = response.headers.get('X-SRV-Build');
    if (build) {
      if (!this.backendBuildChecked) this.debug('BUILD', `backend build = ${build}`);
      this.backendBuildChecked = true;
      return;
    }
    if (this.backendBuildChecked || path.startsWith('/actuator')) return;
    this.backendBuildChecked = true;
    console.warn('[SRV] The backend did not send X-SRV-Build. It may be an old build (or CORS may hide the header).');
  }

  private toApiError(error: unknown, method: string, path: string): ApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return Object.assign(new Error('Cannot reach the server. Check your internet connection and try again.'), { status: 0 });
    }
    const status = error.status;
    const data = error.error;
    let message = typeof data?.error === 'string' ? data.error : '';
    if (!message) {
      if (status === 0) message = 'Cannot reach the server. Check your internet connection and try again.';
      else if (status === 401) message = 'Your session has expired. Please log in again.';
      else if (status === 429) message = 'Too many requests. Please wait a minute and try again.';
      else if (GATEWAY_STATUSES.has(status)) message = 'The server is starting up or temporarily unavailable. Please wait a few seconds and try again.';
      else if (status === 404 && !this.baseUrl && !isDevMode()) message = 'The app is not connected to its backend. Set VITE_API_BASE_URL on Vercel and redeploy.';
      else message = `Request failed with status ${status}`;
    }
    this.debug('API', 'failed', method, path, status, message, data);
    return Object.assign(new Error(message), { status, data });
  }

  register(payload: { fullName: string; email: string; password: string }): Promise<AuthResponse> {
    return this.request('POST', '/api/auth/register', payload);
  }
  login(payload: { username: string; password: string }): Promise<AuthResponse> {
    return this.request('POST', '/api/auth/login', payload);
  }
  searchBuses(params: Record<string, string | number>): Promise<BusTrip[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    return this.request('GET', `/api/buses/search?${query.toString()}`);
  }
  popularBuses(): Promise<BusTrip[]> { return this.request('GET', '/api/buses/popular'); }
  getBus(tripId: number): Promise<BusTrip> { return this.request('GET', `/api/buses/${tripId}`); }
  getSeats(tripId: number): Promise<Seat[]> { return this.request('GET', `/api/seats?${new URLSearchParams({ tripId: String(tripId) })}`); }
  getMyReservations(): Promise<Reservation[]> { return this.request('GET', '/api/reservations/me'); }
  holdSeats(payload: { seatIds: number[]; tripId: number; passengerName: string; contactPhone: string }): Promise<Reservation[]> {
    return this.request('POST', '/api/reservations/batch', payload);
  }
  holdSeat(payload: { seatId: number; tripId: number; passengerName: string; contactPhone: string }): Promise<Reservation> {
    return this.request('POST', '/api/reservations', payload);
  }
  releaseHolds(reservationIds: number[]): Promise<Reservation[]> { return this.request('POST', '/api/reservations/release', { reservationIds }); }
  cancelReservation(reservationId: number): Promise<Reservation> { return this.request('POST', `/api/reservations/${reservationId}/cancel`); }
  payBatch(payload: { reservationIds: number[]; method: string }): Promise<Array<{ reservationId: number; pnr: string }>> {
    return this.request('POST', '/api/payments/batch', payload);
  }
  pay(payload: { reservationId: number; method: string }): Promise<unknown> { return this.request('POST', '/api/payments', payload); }
  getPayment(reservationId: number): Promise<unknown> { return this.request('GET', `/api/payments/${reservationId}`); }
  getTicket(reservationId: number): Promise<Ticket> { return this.request('GET', `/api/tickets/${reservationId}`); }
  getProfile(): Promise<Profile> { return this.request('GET', '/api/profile'); }
  updateProfile(payload: Pick<Profile, 'username' | 'fullName' | 'email' | 'phone'>): Promise<Profile> { return this.request('PATCH', '/api/profile', payload); }
  changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> { return this.request('PATCH', '/api/profile/password', payload); }
  getWallet(): Promise<WalletInfo> { return this.request('GET', '/api/wallet'); }
  getWalletTransactions(): Promise<WalletTransaction[]> { return this.request('GET', '/api/wallet/transactions'); }
  topUpWallet(amount: number): Promise<WalletInfo> { return this.request('POST', '/api/wallet/top-up', { amount }); }
  getSupportTickets(): Promise<SupportTicket[]> { return this.request('GET', '/api/support/tickets'); }
  createSupportTicket(payload: { category: string; message: string }): Promise<SupportTicket> { return this.request('POST', '/api/support/tickets', payload); }
  getNotifications(): Promise<AppNotification[]> { return this.request('GET', '/api/notifications'); }
}
