import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, firstValueFrom, map, retry, throwError, timer } from 'rxjs';
import { BUILD_API_BASE_URL } from './api-base.generated';
import {
  AppNotification, AuthResponse, BusTrip, Profile, Reservation, Seat,
  SupportTicket, Ticket, WalletInfo, WalletTransaction
} from './models';

const GATEWAY_STATUSES = new Set([502, 503, 504]);
const REQUEST_TIMEOUT_MS = 100_000;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = this.readBaseUrl();
  private backendBuildChecked = false;

  constructor(private readonly http: HttpClient) {}

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

  private request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.debug('API', '→', method, path, body ?? '');
    const source = this.http.request<T>(method, url, {
      body,
      observe: 'response',
      timeout: REQUEST_TIMEOUT_MS,
    } as never).pipe(
      retry({
        count: method === 'GET' ? 2 : 0,
        delay: (error: unknown, attempt: number) => {
          const status = error instanceof HttpErrorResponse ? error.status : 0;
          if (method === 'GET' && (!status || GATEWAY_STATUSES.has(status))) return timer(1500 * attempt);
          return throwError(() => error);
        },
      }),
      map((value: unknown) => {
        const response = value as HttpResponse<T>;
        this.checkBackendBuild(response, path);
        this.debug('API', '←', response.status, method, path, response.body);
        return response.body as T;
      }),
      catchError((error: unknown) => throwError(() => this.toApiError(error, method, path))),
    );
    return firstValueFrom(source);
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
    console.error('[SRV] The backend did not send X-SRV-Build. It may be an old build (or CORS may hide the header).');
    window.dispatchEvent(new CustomEvent('srv-backend-stale'));
  }

  private toApiError(error: unknown, method: string, path: string): Error & { status?: number; data?: unknown } {
    if (!(error instanceof HttpErrorResponse)) {
      return Object.assign(new Error('Cannot reach the server. Check your internet connection and try again.'), { status: 0 });
    }
    const status = error.status;
    const data = error.error;
    let message = typeof data?.error === 'string' ? data.error : '';
    if (!message) {
      if (status === 0) message = 'Cannot reach the server. Check your internet connection and try again.';
      else if (status === 429) message = 'Too many requests. Please wait a minute and try again.';
      else if (GATEWAY_STATUSES.has(status)) message = 'The server is starting up or temporarily unavailable. Please wait a few seconds and try again.';
      else if (status === 404 && !this.baseUrl && !isDevMode()) message = 'The app is not connected to its backend. Set the api-base-url meta value or window.__SEATRESERVE_CONFIG__.apiBaseUrl and redeploy.';
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

