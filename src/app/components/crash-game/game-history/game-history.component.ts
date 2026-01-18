import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-history.component.html',
  styleUrls: ['./game-history.component.css']
})
export class GameHistoryComponent {
  @Input() history: number[] = [];
}
