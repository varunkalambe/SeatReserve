import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import {
  AppNotification, BusTrip, Profile, Reservation, SearchParams, Seat,
  SupportTicket, Ticket, WalletInfo, WalletTransaction
} from './models';

export function todayInput(days = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function money(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...options }).format(parsed);
}

export function formatTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(parsed);
}

export function duration(minutes?: number | null): string {
  const value = Number(minutes || 0);
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export function stampReservations(items: Reservation[] = []): Reservation[] {
  const receivedAt = Date.now();
  return items.map(item => ({ ...item, _receivedAt: receivedAt }));
}

export function holdRemainingMs(reservation?: Reservation | null): number {
  if (!reservation) return 0;
  if (typeof reservation.holdSecondsRemaining === 'number' && reservation._receivedAt) {
    return Math.max(0, reservation.holdSecondsRemaining * 1000 - (Date.now() - reservation._receivedAt));
  }
  const parsed = new Date(reservation.expiresAt ?? '').getTime();
  return Number.isFinite(parsed) ? Math.max(0, parsed - Date.now()) : 0;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  profile: Profile | null = null;
  popularTrips: BusTrip[] = [];
  searchTrips: BusTrip[] = [];
  hasSearched = false;
  searchParams: SearchParams = { from: 'Pune', to: 'Mumbai', date: todayInput(1), passengers: 1 };
  selectedTrip: BusTrip | null = null;
  seats: Seat[] = [];
  selectedSeats: Seat[] = [];
  requestedPassengers = 1;
  reservations: Reservation[] = [];
  pendingReservations: Reservation[] = [];
  paymentOrigin: 'seats' | 'bookings' = 'seats';
  wallet: WalletInfo = { balance: 0, topUpEnabled: true, minTopUp: 1, maxTopUp: 50000, dailyTopUpRemaining: 50000 };
  transactions: WalletTransaction[] = [];
  supportTickets: SupportTicket[] = [];
  notifications: AppNotification[] = [];
  ticket: Ticket | null = null;
  globalError = '';
  bookingNotice: { type: string; title: string; text: string; showCancelledTab?: boolean } | null = null;
  actionBusy = false;
  loadingSearch = false;
  showNotifications = false;

  constructor(readonly api: ApiService, readonly auth: AuthService) {}

  async loadInitial(): Promise<void> {
    // allSettled: one slow or failing endpoint must not blank the whole dashboard.
    const [profile, popular, reservations, wallet, transactions, tickets, notifications] = await Promise.allSettled([
      this.api.getProfile(), this.api.popularBuses(), this.api.getMyReservations(),
      this.api.getWallet(), this.api.getWalletTransactions(), this.api.getSupportTickets(), this.api.getNotifications(),
    ]);
    const all = [profile, popular, reservations, wallet, transactions, tickets, notifications];
    const unauthorized = all.find(r => r.status === 'rejected' && (r.reason as { status?: number })?.status === 401) as PromiseRejectedResult | undefined;
    if (unauthorized) throw unauthorized.reason;
    if (profile.status === 'rejected') throw profile.reason;

    this.profile = profile.value;
    if (popular.status === 'fulfilled') this.popularTrips = popular.value || [];
    if (reservations.status === 'fulfilled') this.reservations = stampReservations(reservations.value || []);
    if (wallet.status === 'fulfilled') this.wallet = wallet.value || this.wallet;
    if (transactions.status === 'fulfilled') this.transactions = transactions.value || [];
    if (tickets.status === 'fulfilled') this.supportTickets = tickets.value || [];
    if (notifications.status === 'fulfilled') this.notifications = notifications.value || [];

    const failed = all.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) this.globalError = `Some data could not be loaded (${(failed.reason as Error)?.message || 'network error'}). It will refresh automatically.`;
  }

  async refreshReservations(): Promise<void> { this.reservations = stampReservations(await this.api.getMyReservations() || []); }
  async refreshWallet(): Promise<void> {
    const [wallet, transactions] = await Promise.all([this.api.getWallet(), this.api.getWalletTransactions()]);
    this.wallet = wallet || this.wallet;
    this.transactions = transactions || [];
  }
  async refreshSupport(): Promise<void> { this.supportTickets = await this.api.getSupportTickets() || []; }
  async refreshNotifications(): Promise<void> { this.notifications = await this.api.getNotifications() || []; }
  async pollRefresh(): Promise<void> {
    const results = await Promise.allSettled([this.refreshReservations(), this.refreshWallet(), this.refreshNotifications()]);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult | undefined;
    if (rejected) throw rejected.reason;
  }

  async search(params: SearchParams): Promise<void> {
    this.searchParams = { ...params };
    this.loadingSearch = true;
    this.hasSearched = true;
    this.globalError = '';
    try {
      this.searchTrips = await this.api.searchBuses(params as unknown as Record<string, string | number>) || [];
    } finally {
      this.loadingSearch = false;
    }
  }

  async selectTrip(trip: BusTrip): Promise<void> {
    this.actionBusy = true;
    this.globalError = '';
    try {
      const [details, seats] = await Promise.all([this.api.getBus(trip.id), this.api.getSeats(trip.id)]);
      this.selectedTrip = details;
      this.seats = seats || [];
      this.requestedPassengers = Math.min(6, Math.max(1, Number(this.searchParams.passengers) || 1));
      this.selectedSeats = [];
      this.pendingReservations = [];
    } finally {
      this.actionBusy = false;
    }
  }

  setPassengerCount(count: number): void {
    this.requestedPassengers = Math.min(6, Math.max(1, Number(count) || 1));
    this.searchParams = { ...this.searchParams, passengers: this.requestedPassengers };
    this.selectedSeats = this.selectedSeats.slice(0, this.requestedPassengers);
  }

  async holdSelectedSeats(): Promise<void> {
    if (!this.selectedTrip || !this.selectedSeats.length) return;
    const contactPhone = this.profile?.phone?.trim();
    if (!contactPhone) throw new Error('Add your real contact phone number in Profile before holding seats.');
    this.actionBusy = true;
    this.globalError = '';
    try {
      const held = await this.api.holdSeats({
        seatIds: this.selectedSeats.map(seat => seat.id),
        tripId: this.selectedTrip.id,
        passengerName: this.profile?.fullName?.trim() || this.auth.auth?.fullName?.trim() || this.auth.auth?.username || '',
        contactPhone,
      });
      this.pendingReservations = stampReservations(held || []);
      this.selectedSeats = [];
      this.paymentOrigin = 'seats';
    } catch (error) {
      try { this.seats = await this.api.getSeats(this.selectedTrip.id) || this.seats; } catch { /* keep last seat map */ }
      this.selectedSeats = [];
      throw error;
    } finally {
      this.actionBusy = false;
    }
  }

  async leavePayment(): Promise<'seats' | 'bookings'> {
    const pending = this.pendingReservations;
    const origin = this.paymentOrigin;
    this.pendingReservations = [];
    if (origin === 'seats' && pending.length) {
      try {
        const released = await this.api.releaseHolds(pending.map(item => item.reservationId));
        if ((released?.length ?? 0) < pending.length) this.globalError = 'Some seats could not be released immediately. They will free up automatically when the 5-minute lock ends.';
      } catch (error) {
        this.globalError = `Could not release your seats (${(error as Error).message}). They will free up automatically when the 5-minute lock ends.`;
      }
      try { await this.refreshReservations(); } catch { /* follow-up refresh is non-blocking */ }
      if (this.selectedTrip) {
        try { this.seats = await this.api.getSeats(this.selectedTrip.id) || this.seats; } catch { /* keep existing map */ }
      }
      return 'seats';
    }
    return 'bookings';
  }

  async payPending(method: string): Promise<void> {
    if (!this.pendingReservations.length) return;
    this.actionBusy = true;
    this.globalError = '';
    try {
      const response = await this.api.payBatch({
        reservationIds: this.pendingReservations.map(item => item.reservationId), method,
      });
      const firstId = response?.[0]?.reservationId || this.pendingReservations[0].reservationId;
      this.pendingReservations = [];
      const followUps = await Promise.allSettled([
        this.refreshReservations(), this.refreshWallet(), this.refreshNotifications(),
        this.api.getTicket(firstId).then(ticket => { this.ticket = ticket; }),
      ]);
      const unauthorized = followUps.find(result => result.status === 'rejected' && (result.reason as { status?: number })?.status === 401);
      if (unauthorized) throw Object.assign(new Error('Your session has expired. Please log in again.'), { status: 401 });
    } finally {
      this.actionBusy = false;
    }
  }

  async openPaymentForBooking(reservation: Reservation): Promise<void> {
    if (holdRemainingMs(reservation) === 0) throw new Error('The 5-minute seat lock for this booking has ended. Please search and select the seats again.');
    const remainingSeconds = holdRemainingMs(reservation) / 1000;
    this.pendingReservations = stampReservations([{ ...reservation, holdSecondsRemaining: remainingSeconds }]);
    this.paymentOrigin = 'bookings';
  }

  async openTicket(reservation: Reservation): Promise<void> { this.ticket = await this.api.getTicket(reservation.reservationId); }

  async cancelBooking(reservation: Reservation): Promise<void> {
    await this.api.cancelReservation(reservation.reservationId);
    this.reservations = this.reservations.map(item => item.reservationId === reservation.reservationId ? { ...item, status: 'CANCELLED', canCancel: false } : item);
    await Promise.allSettled([this.refreshReservations(), this.refreshWallet(), this.refreshNotifications()]);
    this.bookingNotice = {
      type: 'success',
      title: `Booking ${reservation.bookingReference || `#${reservation.reservationId}`} cancelled`,
      text: Number(reservation.fare || 0) > 0 ? 'The server has processed your cancellation and wallet refund, where applicable.' : 'The booking was cancelled.',
      showCancelledTab: true,
    };
  }

  async releasePendingBooking(reservation: Reservation): Promise<void> {
    const released = await this.api.releaseHolds([reservation.reservationId]);
    await this.refreshReservations();
    this.bookingNotice = (released?.length ?? 0) > 0
      ? { type: 'success', title: `Seat released for ${reservation.bookingReference || `#${reservation.reservationId}`}`, text: 'You were not charged. The seat is available to others again.', showCancelledTab: true }
      : { type: 'error', title: 'Could not release this hold', text: 'The hold may have expired already. The seat frees automatically when its lock expires.' };
  }

  async saveProfile(payload: Pick<Profile, 'username' | 'fullName' | 'email' | 'phone'>): Promise<void> {
    const updated = await this.api.updateProfile(payload);
    this.profile = updated;
    const previous = this.auth.auth;
    if (previous) {
      const nextAuth = {
        ...previous,
        token: updated.token || previous.token,
        expiresIn: updated.expiresIn ?? previous.expiresIn,
        username: updated.username,
        fullName: updated.fullName,
        email: updated.email,
      };
      this.auth.update(nextAuth);
    }
  }

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> { await this.api.changePassword(payload); }

  async topUp(amount: number): Promise<void> {
    const updated = await this.api.topUpWallet(amount);
    this.wallet = updated || this.wallet;
    const followUps = await Promise.allSettled([this.api.getWalletTransactions().then(value => { this.transactions = value || []; }), this.refreshNotifications()]);
    const unauthorized = followUps.find(result => result.status === 'rejected' && (result.reason as { status?: number })?.status === 401);
    if (unauthorized) throw Object.assign(new Error('Your session has expired. Please log in again.'), { status: 401 });
  }

  async createSupport(payload: { category: string; message: string }): Promise<void> {
    await this.api.createSupportTicket(payload);
    await Promise.all([this.refreshSupport(), this.refreshNotifications()]);
  }

  clear(): void {
    this.profile = null; this.popularTrips = []; this.searchTrips = []; this.hasSearched = false;
    this.selectedTrip = null; this.seats = []; this.selectedSeats = []; this.reservations = [];
    this.pendingReservations = []; this.transactions = []; this.supportTickets = []; this.notifications = [];
    this.ticket = null; this.globalError = ''; this.bookingNotice = null; this.showNotifications = false;
  }
}
