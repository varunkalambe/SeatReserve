import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Reservation } from '../core/models';
import { WorkspaceService, formatDate, formatTime, holdRemainingMs, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './bookings.component.html',
})
export class BookingsComponent {
  readonly money = money;
  readonly formatDate = formatDate;
  readonly formatTime = formatTime;
  tab: 'UPCOMING' | 'PAST' | 'CANCELLED' = 'UPCOMING';
  confirming: Reservation | null = null;
  constructor(readonly data: WorkspaceService, private readonly router: Router) {}

  hasDeparted(reservation: Reservation): boolean {
    if (typeof reservation.departed === 'boolean') return reservation.departed;
    return reservation.departureTime ? new Date(reservation.departureTime).getTime() <= Date.now() : false;
  }
  holdLapsed(reservation: Reservation): boolean { return reservation.status === 'PENDING' && holdRemainingMs(reservation) === 0; }
  get filtered(): Reservation[] {
    return this.data.reservations.filter(item => {
      if (this.tab === 'UPCOMING') return (item.status === 'CONFIRMED' && !this.hasDeparted(item)) || (item.status === 'PENDING' && !this.holdLapsed(item) && !this.hasDeparted(item));
      if (this.tab === 'PAST') return item.status === 'CONFIRMED' && this.hasDeparted(item);
      return ['CANCELLED', 'EXPIRED'].includes(item.status) || this.holdLapsed(item) || (item.status === 'PENDING' && this.hasDeparted(item));
    });
  }
  displayStatus(reservation: Reservation): string {
    if (reservation.status === 'CONFIRMED' && this.hasDeparted(reservation)) return 'COMPLETED';
    if (this.holdLapsed(reservation)) return 'EXPIRED';
    return reservation.status;
  }
  get dialogIsPaid(): boolean { return this.confirming?.status === 'CONFIRMED'; }

  async pay(reservation: Reservation): Promise<void> {
    try { await this.data.openPaymentForBooking(reservation); await this.router.navigate(['/payment']); }
    catch (error) { this.data.globalError = (error as Error).message; }
  }
  async viewTicket(reservation: Reservation): Promise<void> {
    try { await this.data.openTicket(reservation); }
    catch (error) { this.data.globalError = (error as Error).message; }
  }
  askCancel(reservation: Reservation): void { this.confirming = reservation; }
  async confirmAction(): Promise<void> {
    const target = this.confirming;
    if (!target) return;
    this.data.actionBusy = true;
    this.data.bookingNotice = null;
    this.data.globalError = '';
    try {
      if (target.status === 'PENDING') await this.data.releasePendingBooking(target);
      else await this.data.cancelBooking(target);
      this.confirming = null;
    } catch (error) {
      const failure = error as { status?: number; message?: string };
      if (failure.status === 401) { this.data.auth.logout(); this.data.clear(); await this.router.navigate(['/login']); }
      else this.data.bookingNotice = { type: 'error', title: target.status === 'PENDING' ? 'Could not release this hold' : 'Could not cancel this booking', text: failure.message || 'Please refresh and try again.' };
    } finally { this.data.actionBusy = false; }
  }
}
