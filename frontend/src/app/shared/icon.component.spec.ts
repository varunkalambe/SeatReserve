import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: '<app-icon name="bus" /><app-icon name="search" /><app-icon name="does-not-exist" />',
})
class HostComponent {}

describe('IconComponent', () => {
  it('renders the SVG child shapes (Angular HTML sanitising used to strip them)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const svgs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('svg'));
    expect(svgs.length).toBe(3);
    expect(svgs[0].querySelectorAll('rect, path').length).toBeGreaterThan(0);
    expect(svgs[1].querySelector('circle')).not.toBeNull();
    expect(svgs[1].querySelector('path')).not.toBeNull();
  });

  it('falls back to the "more" icon for an unknown name', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const svgs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('svg'));
    expect(svgs[2].querySelectorAll('circle').length).toBe(3);
  });
});
