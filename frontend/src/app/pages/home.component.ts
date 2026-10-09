import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BusTrip, SearchParams } from '../core/models';
import { WorkspaceService, duration, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';
import { SearchFormComponent } from '../shared/search-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, IconComponent, SearchFormComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly money = money;
  readonly duration = duration;
  constructor(readonly data: WorkspaceService, private readonly router: Router) {}

  goSearch(): void { void this.router.navigate(['/search']); }

  async search(params: SearchParams): Promise<void> {
    try { await this.data.search(params); await this.router.navigate(['/search']); }
    catch (error) { this.data.globalError = (error as Error).message; }
  }

  async chooseTrip(trip: BusTrip): Promise<void> {
    try { await this.data.selectTrip(trip); await this.router.navigate(['/seats']); }
    catch (error) { this.data.globalError = (error as Error).message; }
  }
}
