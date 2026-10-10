import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceService } from '../core/workspace.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent password fields', () => {
  function create() {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(WorkspaceService).profile = { id: 1, username: 'asha', fullName: 'Asha Rao', email: 'a@b.co', phone: '', walletBalance: 0, createdAt: '2026-10-01T10:00:00' } as never;
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, current: root.querySelector<HTMLInputElement>('#current-password')!, next: root.querySelector<HTMLInputElement>('#new-password')!, toggles: Array.from(root.querySelectorAll<HTMLButtonElement>('.password-toggle')) };
  }

  it('hides both passwords by default and labels the toggles', () => {
    const { current, next, toggles } = create();
    expect(current.type).toBe('password');
    expect(next.type).toBe('password');
    expect(toggles.map(b => b.getAttribute('aria-label'))).toEqual(['Show current password', 'Show new password']);
    expect(toggles.every(b => b.type === 'button')).toBe(true);
  });

  it('reveals and re-hides each field independently', () => {
    const { fixture, current, next, toggles } = create();
    toggles[0].click(); fixture.detectChanges();
    expect(current.type).toBe('text');
    expect(next.type).toBe('password');
    expect(toggles[0].getAttribute('aria-pressed')).toBe('true');
    expect(toggles[0].getAttribute('aria-label')).toBe('Hide current password');
    toggles[0].click(); fixture.detectChanges();
    expect(current.type).toBe('password');
    toggles[1].click(); fixture.detectChanges();
    expect(next.type).toBe('text');
    expect(current.type).toBe('password');
  });

  it('keeps the typed value when toggling visibility', () => {
    const { fixture, next, toggles } = create();
    next.value = 'secret-pass-1'; next.dispatchEvent(new Event('input'));
    toggles[1].click(); fixture.detectChanges();
    expect(next.value).toBe('secret-pass-1');
    expect(fixture.componentInstance.passwordForm.controls.newPassword.value).toBe('secret-pass-1');
  });

  it('shows the length error once the new password was touched and is too short', () => {
    const { fixture, root, next } = create();
    next.value = 'short'; next.dispatchEvent(new Event('input')); next.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(root.querySelector('.field-hint')?.textContent).toContain('8 to 72');
    expect(root.querySelector('.field-hint')?.classList.contains('error')).toBe(true);
  });
});
