import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from './api.service';
import { authInterceptor } from './auth.interceptor';

/** Each case asserts the exact method, path, query and body the Spring controllers/DTOs expect. */
describe('ApiService backend contract', () => {
  let api: ApiService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  async function expectCall<T>(call: Promise<T>, method: string, url: string, body: unknown, reply: unknown = {}): Promise<T> {
    const req = backend.expectOne(r => r.method === method && r.urlWithParams === url);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    req.flush(reply as never, { headers: { 'X-SRV-Build': 'test' } });
    return call;
  }

  it('POST /api/auth/register', () => expectCall(api.register({ fullName: 'A B', email: 'a@b.co', password: 'password1' }), 'POST', '/api/auth/register', { fullName: 'A B', email: 'a@b.co', password: 'password1' }));
  it('POST /api/auth/login', () => expectCall(api.login({ username: 'a@b.co', password: 'password1' }), 'POST', '/api/auth/login', { username: 'a@b.co', password: 'password1' }));
  it('GET /api/buses/search?from&to&date (drops empty params)', () => expectCall(api.searchBuses({ from: 'Pune', to: 'Mumbai', date: '2026-10-10', passengers: '' as never }), 'GET', '/api/buses/search?from=Pune&to=Mumbai&date=2026-10-10', undefined, []));
  it('GET /api/buses/popular', () => expectCall(api.popularBuses(), 'GET', '/api/buses/popular', undefined, []));
  it('GET /api/buses/{id}', () => expectCall(api.getBus(7), 'GET', '/api/buses/7', undefined));
  it('GET /api/seats?tripId=', () => expectCall(api.getSeats(7), 'GET', '/api/seats?tripId=7', undefined, []));
  it('POST /api/reservations/batch (BatchHoldSeatsRequest)', () => expectCall(api.holdSeats({ seatIds: [1, 2], tripId: 7, passengerName: 'A', contactPhone: '9999999999' }), 'POST', '/api/reservations/batch', { seatIds: [1, 2], tripId: 7, passengerName: 'A', contactPhone: '9999999999' }, []));
  it('POST /api/reservations/release (ReleaseHoldsRequest)', () => expectCall(api.releaseHolds([4, 5]), 'POST', '/api/reservations/release', { reservationIds: [4, 5] }, []));
  it('POST /api/reservations/{id}/cancel', () => expectCall(api.cancelReservation(9), 'POST', '/api/reservations/9/cancel', null));
  it('GET /api/reservations/me', () => expectCall(api.getMyReservations(), 'GET', '/api/reservations/me', undefined, []));
  it('POST /api/payments/batch (BatchPaymentRequest)', () => expectCall(api.payBatch({ reservationIds: [4], method: 'WALLET' }), 'POST', '/api/payments/batch', { reservationIds: [4], method: 'WALLET' }, []));
  it('GET /api/tickets/{id}', () => expectCall(api.getTicket(4), 'GET', '/api/tickets/4', undefined));
  it('PATCH /api/profile and /api/profile/password', async () => {
    await expectCall(api.updateProfile({ username: 'u', fullName: 'U', email: 'u@x.io', phone: '9999999' }), 'PATCH', '/api/profile', { username: 'u', fullName: 'U', email: 'u@x.io', phone: '9999999' });
    await expectCall(api.changePassword({ currentPassword: 'old', newPassword: 'newpassword' }), 'PATCH', '/api/profile/password', { currentPassword: 'old', newPassword: 'newpassword' }, null);
  });
  it('wallet endpoints', async () => {
    await expectCall(api.getWallet(), 'GET', '/api/wallet', undefined);
    await expectCall(api.getWalletTransactions(), 'GET', '/api/wallet/transactions', undefined, []);
    await expectCall(api.topUpWallet(500), 'POST', '/api/wallet/top-up', { amount: 500 });
  });
  it('support and notification endpoints', async () => {
    await expectCall(api.getSupportTickets(), 'GET', '/api/support/tickets', undefined, []);
    await expectCall(api.createSupportTicket({ category: 'Booking', message: 'Help' }), 'POST', '/api/support/tickets', { category: 'Booking', message: 'Help' });
    await expectCall(api.getNotifications(), 'GET', '/api/notifications', undefined, []);
  });

  it('surfaces the backend {"error": "..."} message', async () => {
    const call = api.login({ username: 'x', password: 'y' });
    backend.expectOne('/api/auth/login').flush({ error: 'Invalid username or password.', status: 401 }, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toMatchObject({ message: 'Invalid username or password.', status: 401 });
  });
  it('maps 429 to a friendly message', async () => {
    const call = api.topUpWallet(10);
    backend.expectOne('/api/wallet/top-up').flush(null, { status: 429, statusText: 'Too Many Requests' });
    await expect(call).rejects.toMatchObject({ status: 429, message: expect.stringContaining('Too many requests') });
  });
  it('retries a GET twice on network failure, then reports an unreachable server', async () => {
    vi.useFakeTimers();
    try {
      const settled = api.getWallet().then(() => null, (error: Error) => error);
      for (let attempt = 0; attempt < 3; attempt++) {
        backend.expectOne('/api/wallet').error(new ProgressEvent('error'));
        await vi.advanceTimersByTimeAsync(5000);
      }
      expect((await settled)?.message).toContain('Cannot reach the server');
    } finally { vi.useRealTimers(); }
  });
  it('never retries a POST (a payment must not be sent twice)', async () => {
    const settled = api.topUpWallet(10).then(() => null, (error: Error) => error);
    backend.expectOne('/api/wallet/top-up').error(new ProgressEvent('error'));
    expect((await settled)?.message).toContain('Cannot reach the server');
    backend.expectNone('/api/wallet/top-up');
  });
});
