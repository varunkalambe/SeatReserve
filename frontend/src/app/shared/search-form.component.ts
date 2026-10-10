import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchParams } from '../core/models';
import { todayInput } from '../core/workspace.service';
import { IconComponent } from './icon.component';

type CityField = 'from' | 'to';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './search-form.component.html',
  host: { style: 'display:block;position:relative;z-index:5' },
})
export class SearchFormComponent implements OnChanges {
  @Input() initial: SearchParams = { from: 'Pune', to: 'Mumbai', date: todayInput(1), passengers: 1 };
  @Output() search = new EventEmitter<SearchParams>();
  @Output() passengerChange = new EventEmitter<number>();
  @ViewChild('fromInput') private fromInput?: ElementRef<HTMLInputElement>;
  @ViewChild('toInput') private toInput?: ElementRef<HTMLInputElement>;

  readonly today = todayInput(0);
  readonly tomorrow = todayInput(1);
  error = '';
  openField: CityField | null = null;
  activeIndex = -1;
  readonly cities = ['Pune', 'Mumbai', 'Nashik', 'Goa', 'Bangalore', 'Delhi', 'Jaipur', 'Hyderabad', 'Ahmedabad', 'Surat', 'Chennai', 'Pondicherry'];
  readonly form = this.fb.nonNullable.group({
    from: ['Pune', Validators.required],
    to: ['Mumbai', Validators.required],
    date: [todayInput(1), Validators.required],
    passengers: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
  });

  private lastInitial: SearchParams | null = null;

  constructor(private readonly fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initial'] || !this.initial) return;
    const next = this.initial;
    const prev = this.lastInitial;
    // Only overwrite what the parent really changed. Re-patching everything on every change wiped the cities the
    // visitor had typed (but not yet searched) whenever the passenger stepper updated the shared search params.
    const patch: Partial<SearchParams> = {};
    if (!prev || prev.from !== next.from) patch.from = next.from;
    if (!prev || prev.to !== next.to) patch.to = next.to;
    if (!prev || prev.date !== next.date) patch.date = next.date;
    if (!prev || prev.passengers !== next.passengers) patch.passengers = next.passengers;
    this.lastInitial = { ...next };
    if (Object.keys(patch).length) this.form.patchValue(patch, { emitEvent: false });
  }

  get passengers(): number { return Number(this.form.controls.passengers.value || 1); }

  changePassengers(delta: number): void {
    const next = Math.min(6, Math.max(1, this.passengers + delta));
    this.form.controls.passengers.setValue(next);
    this.passengerChange.emit(next);
  }

  options(field: CityField): string[] {
    const query = this.form.controls[field].value.trim().toLowerCase();
    const other = this.form.controls[field === 'from' ? 'to' : 'from'].value.trim().toLowerCase();
    const exact = this.cities.some(city => city.toLowerCase() === query);
    return this.cities.filter(city => {
      const lower = city.toLowerCase();
      return lower !== other && (!query || exact || lower.includes(query));
    });
  }

  isSelected(field: CityField, city: string): boolean {
    return this.form.controls[field].value.trim().toLowerCase() === city.toLowerCase();
  }

  openMenu(field: CityField): void {
    this.openField = field;
    this.activeIndex = -1;
  }

  closeMenu(field: CityField): void {
    if (this.openField === field) { this.openField = null; this.activeIndex = -1; }
  }

  onType(field: CityField): void {
    this.openField = field;
    this.activeIndex = -1;
    this.error = '';
  }

  onKey(field: CityField, event: KeyboardEvent): void {
    const options = this.options(field);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.openField !== field) { this.openMenu(field); }
        if (options.length) this.activeIndex = (this.activeIndex + 1) % options.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.openField !== field) { this.openMenu(field); }
        if (options.length) this.activeIndex = (this.activeIndex - 1 + options.length) % options.length;
        break;
      case 'Enter':
        if (this.openField === field && this.activeIndex >= 0 && options[this.activeIndex]) {
          event.preventDefault();
          this.pick(field, options[this.activeIndex]);
        }
        break;
      case 'Escape':
        this.closeMenu(field);
        break;
      default:
        break;
    }
  }

  pick(field: CityField, city: string): void {
    this.form.controls[field].setValue(city);
    this.error = '';
    this.openField = null;
    this.activeIndex = -1;
    if (field === 'from' && !this.form.controls.to.value.trim()) this.toInput?.nativeElement.focus();
  }

  clearField(field: CityField): void {
    this.form.controls[field].setValue('');
    this.error = '';
    this.openMenu(field);
    (field === 'from' ? this.fromInput : this.toInput)?.nativeElement.focus();
  }

  swapCities(): void {
    const from = this.form.controls.from.value;
    this.form.patchValue({ from: this.form.controls.to.value, to: from });
    this.error = '';
    this.openField = null;
  }

  submit(): void {
    this.error = '';
    this.openField = null;
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

  clearCities(): void {
    this.form.patchValue({ from: '', to: '' });
    this.error = '';
    this.openField = null;
  }
}
