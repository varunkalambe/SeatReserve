import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { WorkspaceService, formatDate, formatTime, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  readonly destroyRef = inject(DestroyRef);
  readonly navItems = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/bookings', label: 'My Bookings', icon: 'ticket' },
    { path: '/search', label: 'Search Buses', icon: 'search' },
    { path: '/wallet', label: 'Wallet', icon: 'wallet' },
    { path: '/profile', label: 'Profile', icon: 'user' },
    { path: '/support', label: 'Support', icon: 'support' },
  ];
  readonly formatDate = formatDate;
  readonly formatTime = formatTime;
  readonly money = money;
  topSearch = '';

  constructor(readonly data: WorkspaceService, private readonly api: ApiService, readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    void this.load();
    interval(7000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.auth.isAuthenticated) return;
      this.data.pollRefresh().catch(error => this.handleError(error));
    });
  }

  @HostListener('window:srv-backend-stale')
  onStaleBackend(): void {
    this.data.globalError = 'Your backend may be running an old build. Rebuild and recreate the backend container, then retry.';
  }

  private async load(): Promise<void> {
    try {
      await this.data.loadInitial();
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    const failure = error as { status?: number; message?: string };
    if (failure?.status === 401) {
      this.signOut();
    } else {
      this.data.globalError = failure?.message || 'Something went wrong. Please try again.';
    }
  }

  async searchFromTopbar(): Promise<void> {
    const query = this.topSearch.trim();
    if (!query) { await this.router.navigate(['/search']); return; }
    this.data.searchParams = { ...this.data.searchParams, from: query };
    try {
      await this.data.search(this.data.searchParams);
      await this.router.navigate(['/search']);
      this.topSearch = '';
    } catch (error) { this.handleError(error); }
  }

  toggleNotifications(): void { this.data.showNotifications = !this.data.showNotifications; }
  closeNotifications(): void { this.data.showNotifications = false; }
  signOut(): void {
    this.auth.logout();
    this.data.clear();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
  closeTicket(): void { this.data.ticket = null; }
  printTicket(): void { window.print(); }
}

