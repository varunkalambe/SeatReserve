import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated ? router.createUrlTree(['/home']) : true;
};

export const tripFlowGuard: CanActivateFn = () => {
  const workspace = inject(WorkspaceService);
  const router = inject(Router);
  return workspace.selectedTrip ? true : router.createUrlTree(['/search']);
};

export const paymentFlowGuard: CanActivateFn = () => {
  const workspace = inject(WorkspaceService);
  const router = inject(Router);
  return workspace.pendingReservations.length ? true : router.createUrlTree(['/search']);
};
