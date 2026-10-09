import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Seat } from '../core/models';
import { WorkspaceService, duration, formatDate, formatTime, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './seats.component.html',
})
export class SeatsComponent {
  readonly money = money;
  readonly formatDate = formatDate;
  readonly formatTime = formatTime;
  readonly duration = duration;
  constructor(readonly data: WorkspaceService, private readonly router: Router) {}

  get availableCount(): number { return this.data.seats.filter(seat => seat.status === 'AVAILABLE').length; }
  get total(): number { return this.data.selectedSeats.reduce((sum, seat) => sum + Number(this.data.selectedTrip?.price || 0), 0); }
  isSelected(seat: Seat): boolean { return this.data.selectedSeats.some(item => item.id === seat.id); }

  toggleSeat(seat: Seat): void {
    if (seat.status !== 'AVAILABLE') return;
    if (this.isSelected(seat)) {
      this.data.selectedSeats = this.data.selectedSeats.filter(item => item.id !== seat.id);
      return;
    }
    if (this.data.selectedSeats.length >= this.data.requestedPassengers) return;
    this.data.selectedSeats = [...this.data.selectedSeats, seat];
  }

  async hold(): Promise<void> {
    if (!this.data.selectedSeats.length || !this.data.selectedTrip) return;
    if (!this.data.profile?.phone?.trim()) {
      this.data.globalError = 'Add your real contact phone number in Profile before holding seats.';
      await this.router.navigate(['/profile']);
      return;
    }
    try { await this.data.holdSelectedSeats(); await this.router.navigate(['/payment']); }
    catch (error) {
      const failure = error as { status?: number; message?: string };
      if (failure.status === 401) { this.data.auth.logout(); this.data.clear(); await this.router.navigate(['/login']); }
      else this.data.globalError = failure.message || 'Could not lock the selected seats.';
    }
  }
}
