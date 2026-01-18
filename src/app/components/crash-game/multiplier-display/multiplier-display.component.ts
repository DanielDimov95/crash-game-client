import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-multiplier-display',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './multiplier-display.component.html',
  styleUrls: ['./multiplier-display.component.css']
})
export class MultiplierDisplayComponent {
  @Input() multiplier: number = 1.00;
  @Input() phase: 'BETTING' | 'RUNNING' | 'CRASHED' = 'BETTING';
  @Input() countdown: number = 5;
  @Input() isBetting: boolean = false;
  @Input() cashedOut: boolean = false;
  @Input() betAmount: number = 0;
  @Input() winAmount: number = 0;
}
