import { Component } from '@angular/core';
import { CrashGameComponent } from './components/crash-game/crash-game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CrashGameComponent],
  template: '<app-crash-game></app-crash-game>',
  styles: []
})
export class AppComponent {
  title = 'Crash Game Client';
}
