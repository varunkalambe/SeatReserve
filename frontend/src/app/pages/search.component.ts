import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BusTrip, SearchParams } from '../core/models';
import { WorkspaceService, duration, formatTime, money } from '../core/workspace.service';
import { IconComponent } from '../shared/icon.component';
import { SearchFormComponent } from '../shared/search-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, IconComponent, SearchFormComponent],
  templateUrl: './search.component.html',
})
export class SearchComponent {
  readonly money = money;
  readonly duration = duration;
  readonly formatTime = formatTime;
  constructor(readonly data: WorkspaceService, private readonly router: Router) {}

  async search(params: SearchParams): Promise<void> {
    try { await this.data.search(params); }
    catch (error) { this.data.globalError = (error as Error).message; }
  }

  async chooseTrip(trip: BusTrip): Promise<void> {
    try { await this.data.selectTrip(trip); await this.router.navigate(['/seats']); }
    catch (error) { this.data.globalError = (error as Error).message; }
  }

  get trips(): BusTrip[] { return this.data.hasSearched ? this.data.searchTrips : this.data.popularTrips; }
}
