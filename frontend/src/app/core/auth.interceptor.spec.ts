import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  it('sends no Authorization header while signed out', () => {
    http.get('/api/buses/popular').subscribe();
    const req = backend.expectOne('/api/buses/popular');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('adds the bearer token to authenticated calls', () => {
    auth.save({ token: 'jwt-1', username: 'u', expiresIn: 1, fullName: 'U', email: 'u@x.io' });
    http.get('/api/profile').subscribe();
    const req = backend.expectOne('/api/profile');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-1');
    req.flush({});
  });

  it('never attaches a token to login or register', () => {
    auth.save({ token: 'jwt-1', username: 'u', expiresIn: 1, fullName: 'U', email: 'u@x.io' });
    http.post('/api/auth/login', {}).subscribe();
    http.post('/api/auth/register', {}).subscribe();
    const login = backend.expectOne('/api/auth/login');
    const register = backend.expectOne('/api/auth/register');
    expect(login.request.headers.has('Authorization')).toBe(false);
    expect(register.request.headers.has('Authorization')).toBe(false);
    login.flush({}); register.flush({});
  });

  it('ends the session and redirects to /login on a 401 from an authenticated call', () => {
    auth.save({ token: 'expired', username: 'u', expiresIn: 1, fullName: 'U', email: 'u@x.io' });
    const workspace = TestBed.inject(WorkspaceService);
    workspace.notifications = [{ id: '1', title: 't', message: 'm', type: 'info', createdAt: '' }];
    let status = 0;
    http.get('/api/wallet').subscribe({ error: e => { status = e.status; } });
    backend.expectOne('/api/wallet').flush({ error: 'Authentication required' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('seat-reserve-auth')).toBeNull();
    expect(workspace.notifications).toEqual([]);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('does not log out on a 401 from the login endpoint (wrong password)', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/auth/login').flush({ error: 'Invalid username or password.' }, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rejects protected calls locally with a 401 (no network request) while signed out', () => {
    let status = 0;
    http.get('/api/wallet').subscribe({ error: e => { status = e.status; } });
    backend.expectNone('/api/wallet');
    expect(status).toBe(401);
  });

  it('keeps the session on non-401 errors such as 409 or 500', () => {
    auth.save({ token: 'jwt-1', username: 'u', expiresIn: 1, fullName: 'U', email: 'u@x.io' });
    http.post('/api/reservations/batch', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/reservations/batch').flush({ error: 'Seat unavailable' }, { status: 409, statusText: 'Conflict' });
    expect(auth.isAuthenticated).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
