import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  mode: 'login' | 'register' = 'login';
  busy = false;
  error = '';
  readonly form = this.fb.nonNullable.group({
    fullName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(private readonly fb: FormBuilder, readonly api: ApiService, private readonly auth: AuthService, private readonly router: Router) {}

  toggleMode(mode?: 'login' | 'register'): void {
    this.mode = mode ?? (this.mode === 'login' ? 'register' : 'login');
    this.error = '';
  }

  async submit(): Promise<void> {
    this.error = '';
    const emailControl = this.form.controls.email;
    if (emailControl.value !== emailControl.value.trim()) emailControl.setValue(emailControl.value.trim());
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error = 'Enter a valid email and a password with at least 8 characters.'; return; }
    if (this.mode === 'register' && !this.form.controls.fullName.value.trim()) { this.error = 'Enter your full name.'; return; }
    this.busy = true;
    try {
      const { fullName, email, password } = this.form.getRawValue();
      const response = this.mode === 'login'
        ? await this.api.login({ username: email.trim(), password })
        : await this.api.register({ fullName: fullName.trim(), email: email.trim(), password });
      this.auth.save(response);
      await this.router.navigate(['/home']);
    } catch (error) {
      this.error = (error as Error).message || 'Unable to sign in. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
