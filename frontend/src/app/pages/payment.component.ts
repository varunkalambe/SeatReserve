import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceService, formatDate, formatTime, holdRemainingMs, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './payment.component.html',
})
export class PaymentComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly money = money;
  readonly formatDate = formatDate;
  readonly formatTime = formatTime;
  method = 'WALLET';
  walletNote = '';
  now = Date.now();
  expired = false;
  constructor(readonly data: WorkspaceService, private readonly router: Router) {}

  ngOnInit(): void {
    this.updateExpiry();
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.now = Date.now(); this.updateExpiry(); });
  }

  get fare(): number { return this.data.pendingReservations.reduce((sum, item) => sum + Number(item.fare || 0), 0); }
  get fee(): number { return this.data.pendingReservations.reduce((sum, item) => sum + Math.round(Number(item.fare || 0) * 0.035), 0); }
  get total(): number { return this.fare + this.fee; }
  get walletShort(): boolean { return this.method === 'WALLET' && Number(this.data.wallet.balance || 0) < this.total; }
  get cannotPay(): boolean { return this.data.actionBusy || this.expired || this.walletShort; }
  get seatNames(): string { return this.data.pendingReservations.map(item => item.seatNumber).join(', '); }
  get remainingMs(): number { this.now; return this.data.pendingReservations.reduce((smallest, item) => Math.min(smallest, holdRemainingMs(item)), Number.POSITIVE_INFINITY); }
  get countdown(): string {
    if (!Number.isFinite(this.remainingMs) || this.remainingMs <= 0) return 'Expired';
    const seconds = Math.ceil(this.remainingMs / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  private updateExpiry(): void { if (this.data.pendingReservations.length && this.remainingMs <= 0) this.expired = true; }

  async pay(): Promise<void> {
    this.walletNote = '';
    if (this.expired) return;
    if (this.walletShort) { this.walletNote = `Your wallet balance is ${money(this.data.wallet.balance)}, but this booking needs ${money(this.total)}.`; return; }
    try { await this.data.payPending(this.method); await this.router.navigate(['/bookings']); }
    catch (error) {
      const failure = error as { status?: number; message?: string };
      if (failure.status === 401) { this.data.auth.logout(); this.data.clear(); await this.router.navigate(['/login']); }
      else if (this.method === 'WALLET') this.walletNote = failure.message || 'Wallet payment failed.';
      else this.data.globalError = failure.message || 'Payment failed. Please try again.';
    }
  }

  async goBack(): Promise<void> {
    const destination = await this.data.leavePayment();
    await this.router.navigate([destination === 'seats' ? '/seats' : '/bookings']);
  }
}
