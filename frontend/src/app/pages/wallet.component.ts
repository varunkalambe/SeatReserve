import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceService, formatDate, formatTime, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './wallet.component.html',
})
export class WalletComponent {
  readonly money = money;
  readonly formatDate = formatDate;
  readonly formatTime = formatTime;
  readonly abs = (value: unknown): number => Math.abs(Number(value || 0));
  busy = false;
  error = '';
  success = '';
  readonly form = this.fb.nonNullable.group({ amount: ['', [Validators.required, Validators.min(1), Validators.max(50000)]] });
  constructor(readonly data: WorkspaceService, private readonly fb: FormBuilder, private readonly router: Router) {}

  get topUpEnabled(): boolean { return this.data.wallet?.topUpEnabled !== false; }
  get minTopUp(): number { return Number(this.data.wallet?.minTopUp ?? 1); }
  get maxTopUp(): number { return Number(this.data.wallet?.maxTopUp ?? 50000); }
  get remainingToday(): number | null { return this.data.wallet?.dailyTopUpRemaining === undefined || this.data.wallet?.dailyTopUpRemaining === null ? null : Number(this.data.wallet.dailyTopUpRemaining); }
  get limitFor(): number { return this.remainingToday === null ? this.maxTopUp : Math.min(this.maxTopUp, this.remainingToday); }

  async add(amountInput: number | string): Promise<void> {
    const amount = Math.round(Number(amountInput) * 100) / 100;
    this.success = '';
    this.error = '';
    if (!Number.isFinite(amount) || amount <= 0) this.error = 'Enter a valid amount.';
    else if (amount < this.minTopUp) this.error = `Minimum top-up is ${money(this.minTopUp)}.`;
    else if (amount > this.maxTopUp) this.error = `Maximum top-up per transaction is ${money(this.maxTopUp)}.`;
    else if (this.remainingToday !== null && amount > this.remainingToday) this.error = this.remainingToday <= 0 ? 'Your daily top-up limit has been reached. Try again tomorrow.' : `You can add up to ${money(this.remainingToday)} more today.`;
    if (this.error) return;
    this.busy = true;
    try {
      await this.data.topUp(amount);
      this.success = `${money(amount)} added to your wallet.`;
      this.form.reset({ amount: '' });
    } catch (error) {
      const failure = error as { status?: number; message?: string };
      if (failure.status === 401) { this.data.auth.logout(); this.data.clear(); await this.router.navigate(['/login']); }
      else this.error = failure.message || 'Top-up failed. Please try again.';
    } finally { this.busy = false; }
  }

  submitCustom(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error = 'Enter a valid top-up amount.'; return; }
    void this.add(this.form.controls.amount.value);
  }
}
