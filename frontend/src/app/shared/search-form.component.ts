import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchParams } from '../core/models';
import { todayInput } from '../core/workspace.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './search-form.component.html',
})
export class SearchFormComponent implements OnChanges {
  @Input() initial: SearchParams = { from: 'Pune', to: 'Mumbai', date: todayInput(1), passengers: 1 };
  @Output() search = new EventEmitter<SearchParams>();
  @Output() passengerChange = new EventEmitter<number>();

  readonly today = todayInput(0);
  readonly tomorrow = todayInput(1);
  error = '';
  readonly cities = ['Pune', 'Mumbai', 'Nashik', 'Goa', 'Bangalore', 'Delhi', 'Jaipur', 'Hyderabad', 'Ahmedabad', 'Surat', 'Chennai', 'Pondicherry'];
  readonly form = this.fb.nonNullable.group({
    from: ['Pune', Validators.required],
    to: ['Mumbai', Validators.required],
    date: [todayInput(1), Validators.required],
    passengers: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
  });

  constructor(private readonly fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initial'] && this.initial) this.form.patchValue({ ...this.initial }, { emitEvent: false });
  }

  get passengers(): number { return Number(this.form.controls.passengers.value || 1); }
  changePassengers(delta: number): void {
    const next = Math.min(6, Math.max(1, this.passengers + delta));
    this.form.controls.passengers.setValue(next);
    this.passengerChange.emit(next);
  }

  swapCities(): void {
    const from = this.form.controls.from.value;
    this.form.patchValue({ from: this.form.controls.to.value, to: from });
    this.error = '';
  }

  submit(): void {
    this.error = '';
    const value = this.form.getRawValue();
    const from = value.from.trim();
    const to = value.to.trim();
    if (!from || !to) { this.error = 'Enter both departure and destination cities.'; return; }
    if (from.toLowerCase() === to.toLowerCase()) { this.error = 'From and To cannot be the same city.'; return; }
    if (!value.date) { this.error = 'Pick a travel date.'; return; }
    if (value.date < this.today) { this.error = 'The travel date cannot be in the past.'; return; }
    this.search.emit({ from, to, date: value.date, passengers: Math.min(6, Math.max(1, Number(value.passengers) || 1)) });
  }

  setDate(date: string): void { this.form.controls.date.setValue(date); this.error = ''; }
  clearCities(): void { this.form.patchValue({ from: '', to: '' }); this.error = ''; }
}
