import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard, guestGuard, paymentFlowGuard, tripFlowGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });
  const run = (guard: typeof authGuard) => TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  const path = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard redirects anonymous users to /login', () => { expect(path(run(authGuard))).toBe('/login'); });
  it('authGuard admits signed-in users', () => {
    TestBed.inject(AuthService).save({ token: 't', username: 'u', expiresIn: 1, fullName: 'U', email: 'e' });
    expect(run(authGuard)).toBe(true);
  });
  it('guestGuard sends signed-in users to /home and admits guests', () => {
    expect(run(guestGuard)).toBe(true);
    TestBed.inject(AuthService).save({ token: 't', username: 'u', expiresIn: 1, fullName: 'U', email: 'e' });
    expect(path(run(guestGuard))).toBe('/home');
  });
  it('tripFlowGuard and paymentFlowGuard bounce to /search without state', () => {
    expect(path(run(tripFlowGuard))).toBe('/search');
    expect(path(run(paymentFlowGuard))).toBe('/search');
    const ws = TestBed.inject(WorkspaceService);
    ws.pendingReservations = [{ reservationId: 1 } as never];
    expect(run(paymentFlowGuard)).toBe(true);
  });
});
