import { Reservation } from './models';
import { duration, formatDate, holdRemainingMs, money, stampReservations, todayInput } from './workspace.service';

describe('workspace helpers', () => {
  it('formats rupees with Indian grouping', () => { expect(money(1234567)).toBe('₹12,34,567'); expect(money(null)).toBe('₹0'); });
  it('formats durations', () => { expect(duration(135)).toBe('2h 15m'); expect(duration(undefined)).toBe('0h 0m'); });
  it('returns an em dash for missing or invalid dates', () => { expect(formatDate(null)).toBe('—'); expect(formatDate('not-a-date')).toBe('—'); });
  it('todayInput returns an ISO date', () => { expect(todayInput(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
  it('counts a hold down from the server-supplied seconds, not the client clock', () => {
    const [held] = stampReservations([{ holdSecondsRemaining: 300, expiresAt: '2000-01-01T00:00:00+05:30' } as Reservation]);
    expect(holdRemainingMs(held)).toBeGreaterThan(299_000);
    expect(holdRemainingMs({ ...held, holdSecondsRemaining: 0 })).toBe(0);
  });
  it('treats a missing reservation as expired', () => { expect(holdRemainingMs(null)).toBe(0); });
});
