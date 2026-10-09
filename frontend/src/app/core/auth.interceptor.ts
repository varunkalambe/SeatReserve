import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';

const PUBLIC_AUTH_PATHS = ['/api/auth/login', '/api/auth/register'];

function isPublicAuthRequest(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some(path => url.includes(path));
}

/**
 * Adds the bearer token to API calls and ends the session centrally when the backend rejects it
 * (HTTP 401 on any authenticated call: expired or invalid JWT). Login/register 401s are ordinary
 * "invalid credentials" errors and are left for the login form to display.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const injector = inject(Injector);
  const token = auth.token;
  if (!token || isPublicAuthRequest(request.url)) {
    return next(request);
  }
  const authorised = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authorised).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.token === token) {
        const router = injector.get(Router);
        const workspace = injector.get(WorkspaceService);
        auth.logout();
        workspace.clear();
        void router.navigate(['/login'], { replaceUrl: true });
      }
      return throwError(() => error);
    }),
  );
};
