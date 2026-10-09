import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
  const response = { token: 't', username: 'u', expiresIn: 1, fullName: 'U', email: 'u@x.io' };
  let api: { login: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    api = { login: vi.fn().mockResolvedValue(response), register: vi.fn().mockResolvedValue(response) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ApiService, useValue: api }] });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  const create = () => TestBed.createComponent(AuthComponent).componentInstance;

  it('logs in with the e-mail as the username field, stores the session and goes home', async () => {
    const c = create();
    c.form.patchValue({ email: ' a@b.co ', password: 'password1' });
    await c.submit();
    expect(api.login).toHaveBeenCalledWith({ username: 'a@b.co', password: 'password1' });
    expect(TestBed.inject(AuthService).isAuthenticated).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('registers with fullName, email and password only', async () => {
    const c = create();
    c.toggleMode('register');
    c.form.patchValue({ fullName: ' Asha Rao ', email: 'a@b.co', password: 'password1' });
    await c.submit();
    expect(api.register).toHaveBeenCalledWith({ fullName: 'Asha Rao', email: 'a@b.co', password: 'password1' });
  });

  it('rejects an invalid e-mail or short password without calling the API', async () => {
    const c = create();
    c.form.patchValue({ email: 'nope', password: 'short' });
    await c.submit();
    expect(api.login).not.toHaveBeenCalled();
    expect(c.error).toContain('valid email');
  });

  it('requires a full name when registering', async () => {
    const c = create();
    c.toggleMode('register');
    c.form.patchValue({ email: 'a@b.co', password: 'password1' });
    await c.submit();
    expect(api.register).not.toHaveBeenCalled();
    expect(c.error).toBe('Enter your full name.');
  });

  it('shows the backend message and stays signed out on bad credentials', async () => {
    api.login.mockRejectedValue(Object.assign(new Error('Invalid username or password.'), { status: 401 }));
    const c = create();
    c.form.patchValue({ email: 'a@b.co', password: 'password1' });
    await c.submit();
    expect(c.error).toBe('Invalid username or password.');
    expect(TestBed.inject(AuthService).isAuthenticated).toBe(false);
    expect(c.busy).toBe(false);
  });
});
