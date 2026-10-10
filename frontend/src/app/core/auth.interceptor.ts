import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';

const PUBLIC_AUTH_PATHS = ['/api/auth/login', '/api/auth/register'];
/** GET endpoints the backend serves without a token (see SecurityConfig). */
const PUBLIC_GET_PREFIXES = ['/api/buses', '/api/seats', '/actuator'];

function pathOf(url: string): string {
  try {
    return new URL(url, 'http://local.invalid').pathname;
  } catch {
    return url;
  }
}

function isPublicAuthRequest(url: string): boolean {
  const path = pathOf(url);
  return PUBLIC_AUTH_PATHS.some(candidate => path === candidate || path.startsWith(`${candidate}/`));
}

function isPublicGet(method: string, url: string): boolean {
  if (method !== 'GET') return false;
  const path = pathOf(url);
  return PUBLIC_GET_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Adds the bearer token to API calls and ends the session centrally when the backend rejects it
 * (HTTP 401 on any authenticated call: expired or invalid JWT).
 *
 * Protected calls made while signed out are rejected locally with a 401 and never reach the network.
 * Previously they were sent without a token, which produced the endless "[token=no] -> 401" flood
 * in the backend log whenever a logout happened while retries were still queued.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const injector = inject(Injector);

  if (isPublicAuthRequest(request.url)) {
    return next(request);
  }

  const token = auth.token;
  if (!token) {
    if (isPublicGet(request.method, request.url)) return next(request);
    return throwError(() => new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: request.url,
      error: { error: 'Please log in to continue.', status: 401 },
    }));
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
