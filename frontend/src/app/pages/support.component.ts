import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceService, formatDate, formatTime } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './support.component.html',
})
export class SupportComponent {
  readonly formatDate = formatDate;
  readonly formatTime = formatTime;
  busy = false;
  error = '';
  readonly faq = [
    { question: 'How long does a seat hold last?', answer: 'Your seat is held for 5 minutes. Pay before the timer expires.' },
    { question: 'Can I cancel a booking?', answer: 'Confirmed bookings can be cancelled from My Bookings. The eligible amount is refunded to your SeatReserve wallet in this demo.' },
    { question: 'What payment methods are supported?', answer: 'The checkout supports UPI, cards, net banking and the SeatReserve wallet flow. Non-wallet methods are simulated until a real payment provider is connected.' },
  ];
  readonly form = this.fb.nonNullable.group({
    category: ['Booking', Validators.required],
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  constructor(readonly data: WorkspaceService, private readonly fb: FormBuilder, private readonly router: Router) {}

  async submit(): Promise<void> {
    this.error = '';
    const payload = this.form.getRawValue();
    if (this.form.invalid || !payload.message.trim()) { this.form.markAllAsTouched(); this.error = 'Enter a message (up to 1,000 characters).'; return; }
    this.busy = true;
    try { await this.data.createSupport({ category: payload.category, message: payload.message.trim() }); this.form.patchValue({ message: '' }); }
    catch (error) {
      const failure = error as { status?: number; message?: string };
      if (failure.status === 401) { this.data.auth.logout(); this.data.clear(); await this.router.navigate(['/login']); }
      else this.error = failure.message || 'Could not create the support request.';
    } finally { this.busy = false; }
  }
}
