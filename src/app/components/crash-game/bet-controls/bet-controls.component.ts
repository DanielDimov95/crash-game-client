import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bet-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bet-controls.component.html',
  styleUrls: ['./bet-controls.component.css']
})
export class BetControlsComponent {
  @Input() betAmount: number = 10.00;
  @Input() balance: number | null = null;
  @Input() phase: 'BETTING' | 'RUNNING' | 'CRASHED' = 'BETTING';
  @Input() isBetting: boolean = false;

  @Output() betAmountChange = new EventEmitter<number>();
  @Output() adjustBet = new EventEmitter<number>();
  @Output() validateBetAmount = new EventEmitter<void>();

  onBetAmountChange(value: number): void {
    this.betAmountChange.emit(value);
  }

  onAdjustBet(factor: number): void {
    this.adjustBet.emit(factor);
  }

  onValidateBetAmount(): void {
    this.validateBetAmount.emit();
  }
}
