import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Profile } from '../core/models';
import { WorkspaceService, formatDate, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly formatDate = formatDate;
  readonly money = money;
  busy = false;
  message = '';
  passwordBusy = false;
  passwordMessage = '';
  showCurrentPassword = false;
  showNewPassword = false;
  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9._-]+$/)]],
    fullName: ['', Validators.maxLength(100)],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30), Validators.pattern(/^$|^[0-9+()\-\s]{7,30}$/)]],
  });
  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  constructor(readonly data: WorkspaceService, private readonly fb: FormBuilder, private readonly api: ApiService, private readonly router: Router) {}

  ngOnInit(): void {
    if (this.data.profile) this.patchForm(this.data.profile);
    else this.api.getProfile().then(profile => { this.data.profile = profile; this.patchForm(profile); }).catch(error => { this.data.globalError = (error as Error).message; });
  }

  private patchForm(profile: Profile): void {
    this.form.patchValue({ username: profile.username || '', fullName: profile.fullName || '', email: profile.email || '', phone: profile.phone || '' });
  }

  async save(): Promise<void> {
    this.message = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); this.message = 'Check the profile fields and try again.'; return; }
    this.busy = true;
    try { await this.data.saveProfile(this.form.getRawValue()); this.message = 'Profile updated successfully.'; }
    catch (error) { this.message = (error as Error).message || 'Profile could not be saved.'; }
    finally { this.busy = false; }
  }

  async changePassword(): Promise<void> {
    this.passwordMessage = '';
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); this.passwordMessage = 'Enter your current password and a new password with at least 8 characters.'; return; }
    this.passwordBusy = true;
    try { await this.data.changePassword(this.passwordForm.getRawValue()); this.passwordForm.reset(); this.showCurrentPassword = false; this.showNewPassword = false; this.passwordMessage = 'Password changed successfully.'; }
    catch (error) { this.passwordMessage = (error as Error).message || 'Password could not be changed.'; }
    finally { this.passwordBusy = false; }
  }
}
