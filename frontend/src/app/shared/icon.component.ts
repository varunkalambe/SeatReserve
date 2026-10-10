import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-icon',
  standalone: true,
  host: { style: 'display:inline-flex;flex:none;align-items:center;justify-content:center;line-height:0' },
  template: '<svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="flex:none" [innerHTML]="markup"></svg>',
})
export class IconComponent {
  @Input() set name(value: string) {
    this.current = value;
    this.markup = this.resolve(value);
  }
  get name(): string { return this.current; }
  @Input() size = 20;
  @Input() strokeWidth = 1.8;

  markup: SafeHtml;
  private current = 'more';

  constructor(private readonly sanitizer: DomSanitizer) {
    this.markup = this.resolve(this.current);
  }

  private static readonly paths: Record<string, string> = {
    home: '<path d="m3 10 9-7 9 7"/><path d="M5 9v10h14V9"/><path d="M9 19v-6h6v6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M7 2.5v4M17 2.5v4M3 9h18"/><path d="M7 13h3M14 13h3M7 17h3"/>',
    wallet: '<path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 12h5M17 12a1 1 0 1 0 0 2"/>',
    user: '<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21c.7-4.2 3-6 7.5-6s6.8 1.8 7.5 6"/>',
    support: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5h7M8.5 10.5h7M12 3.5V2"/>',
    bell: '<path d="M6.5 17.5h11l-1.2-2.1V10a4.3 4.3 0 0 0-8.6 0v5.4Z"/><path d="M10 19.5c.4 1 1.1 1.5 2 1.5s1.6-.5 2-1.5"/>',
    bus: '<rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 11h16M7 16h.01M17 16h.01M7 20v2M17 20v2M7 6h10v3H7z"/>',
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    swap: '<path d="M7 7h11M15 4l3 3-3 3M17 17H6M9 14l-3 3 3 3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    star: '<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.7-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>',
    ticket: '<path d="M4 6.5A2.5 2.5 0 0 0 6.5 4h11A2.5 2.5 0 0 0 20 6.5v1.2a2.8 2.8 0 0 0 0 5.6v1.2a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 16.5v-1.2a2.8 2.8 0 0 0 0-5.6z"/><path d="M12 7v1M12 10v1M12 13v1M12 16v1"/>',
    logout: '<path d="M10 5H5v14h5M15 8l4 4-4 4M8 12h11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    more: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
    shield: '<path d="M12 3 19 6v5c0 4.7-2.5 7.5-7 10-4.5-2.5-7-5.3-7-10V6z"/><path d="m8.5 12 2.2 2.2L15.5 9"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
    phone: '<path d="M7 3.5 9.5 5 8 8c1.2 2.3 2.7 3.8 5 5l3-1.5L17.5 14c.5.3 1 .8 1.3 1.3l-1.4 3.1c-.3.7-1 1.1-1.8 1-4.6-.6-9.8-5.8-10.4-10.4-.1-.8.3-1.5 1-1.8z"/>',
    edit: '<path d="m4 16 10.8-10.8a2.1 2.1 0 0 1 3 3L7 19H4zM13.5 6.5l4 4"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.5 2.5 0 1 1 4.8 1.2c-.5 1-1.8 1.2-2.3 2.1-.2.3-.2.8-.2 1.2M12 17h.01"/>',
    download: '<path d="M12 3v11M8 10l4 4 4-4M4 19v2h16v-2"/>',
    card: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 9h18M7 15h4"/>',
    bank: '<path d="m3 9 9-6 9 6M4 10h16M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  };

  private static readonly cache = new Map<string, SafeHtml>();

  /** The markup is a static, hard-coded allow-list (never user input). Angular's HTML sanitizer strips every SVG child element, so it is marked trusted once per icon and cached. */
  private resolve(name: string): SafeHtml {
    const key = Object.prototype.hasOwnProperty.call(IconComponent.paths, name) ? name : 'more';
    let safe = IconComponent.cache.get(key);
    if (!safe) {
      safe = this.sanitizer.bypassSecurityTrustHtml(IconComponent.paths[key]);
      IconComponent.cache.set(key, safe);
    }
    return safe;
  }
}
