import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  constructor(api: ApiService) {
    // Start waking the (possibly sleeping) Render backend the moment the page opens.
    void api.ensureAwake().catch(() => undefined);
  }
}
