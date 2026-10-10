import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchParams } from '../core/models';
import { SearchFormComponent } from './search-form.component';

@Component({
  standalone: true,
  imports: [SearchFormComponent],
  template: '<app-search-form [initial]="params" (search)="last = $event" (passengerChange)="setPassengers($event)" />',
})
class HostComponent {
  params: SearchParams = { from: 'Pune', to: 'Mumbai', date: '2099-01-02', passengers: 1 };
  last: SearchParams | null = null;
  setPassengers(count: number): void { this.params = { ...this.params, passengers: count }; }
}

describe('SearchFormComponent', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, input: (id: string) => root.querySelector<HTMLInputElement>(id)! };
  };

  it('renders both city inputs with their icons', () => {
    const { root, input } = setup();
    expect(input('#from-city').value).toBe('Pune');
    expect(input('#to-city').value).toBe('Mumbai');
    expect(root.querySelectorAll('.sb-control svg path, .sb-control svg circle, .sb-control svg rect').length).toBeGreaterThan(3);
  });

  it('opens a dropdown with every other city on focus and picks one', () => {
    const { fixture, root, input } = setup();
    input('#from-city').dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const labels = Array.from(root.querySelectorAll('#sb-menu-from .sb-option span')).map(el => el.textContent?.trim());
    expect(labels).toContain('Pune');
    expect(labels).toContain('Goa');
    expect(labels).not.toContain('Mumbai');
    const goa = Array.from(root.querySelectorAll<HTMLButtonElement>('#sb-menu-from .sb-option')).find(el => el.textContent?.includes('Goa'))!;
    goa.click();
    fixture.detectChanges();
    expect(input('#from-city').value).toBe('Goa');
    expect(root.querySelector('#sb-menu-from')).toBeNull();
  });

  it('filters the dropdown while typing', () => {
    const { fixture, root, input } = setup();
    const field = input('#to-city');
    field.value = 'ban';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const labels = Array.from(root.querySelectorAll('#sb-menu-to .sb-option span')).map(el => el.textContent?.trim());
    expect(labels).toEqual(['Bangalore']);
  });

  it('keeps typed cities when only the passenger count changes', () => {
    const { fixture, root, input } = setup();
    const from = input('#from-city');
    from.value = 'Delhi';
    from.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button[aria-label="More passengers"]')!.click();
    fixture.detectChanges();
    expect(input('#from-city').value).toBe('Delhi');
    expect(root.querySelector('.sb-stepper strong')?.textContent?.trim()).toBe('2');
  });

  it('validates and emits a search', () => {
    const { fixture, root, input } = setup();
    input('#to-city').value = 'pune';
    input('#to-city').dispatchEvent(new Event('input'));
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.querySelector('.sb-error')?.textContent).toContain('cannot be the same');
    input('#to-city').value = 'Goa';
    input('#to-city').dispatchEvent(new Event('input'));
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.componentInstance.last).toEqual({ from: 'Pune', to: 'Goa', date: '2099-01-02', passengers: 1 });
  });
});
