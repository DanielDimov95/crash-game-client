import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './action-button.component.html',
  styleUrls: ['./action-button.component.css']
})
export class ActionButtonComponent {
  @Input() phase: 'BETTING' | 'RUNNING' | 'CRASHED' = 'BETTING';
  @Input() isBetting: boolean = false;
  @Input() cashedOut: boolean = false;
  @Input() isConnected: boolean = false;
  @Input() currentBetReferenceId: string | null = null;

  @Output() buttonClick = new EventEmitter<void>();

  getButtonLabel(): string {
    if (this.phase === 'BETTING') {
      return this.isBetting ? 'Bet Placed' : 'Place Bet';
    } else if (this.phase === 'RUNNING') {
      if (this.isBetting && !this.cashedOut) {
        return 'Cashout';
      } else if (this.cashedOut) {
        return 'Cashed Out';
      } else {
        return 'Round in Progress';
      }
    } else {
      return 'Crashed';
    }
  }

  getButtonSubLabel(): string {
    if (this.phase === 'BETTING') {
      return this.isBetting ? 'Waiting for round to start...' : 'Next round starts soon';
    } else if (this.phase === 'RUNNING') {
      if (this.isBetting && !this.cashedOut) {
        return 'Secure your winnings';
      } else if (this.cashedOut) {
        return 'Wait for next round';
      } else {
        return 'Wait for next round';
      }
    } else {
      return 'Preparing next round...';
    }
  }

  getButtonDisabled(): boolean {
    if (this.phase === 'BETTING') {
      return !this.isConnected || this.isBetting;
    } else if (this.phase === 'RUNNING') {
      return !this.isBetting || this.cashedOut || !this.isConnected || !this.currentBetReferenceId;
    } else {
      return true; // CRASHED phase
    }
  }

  getButtonClasses(): string {
    let classes = '';

    if (this.phase === 'BETTING' && !this.isBetting) {
      classes = 'bg-[#20B4C6] hover:bg-[#1CA0B0] text-white';
    } else if (this.phase === 'BETTING' && this.isBetting) {
      classes = 'bg-[#262828] border border-white/10 text-slate-400';
    } else if (this.phase === 'RUNNING' && this.isBetting && !this.cashedOut) {
      classes = 'bg-[#F97316] hover:bg-[#EA580C] text-white pulse-ring';
    } else if (this.phase === 'RUNNING' && this.cashedOut) {
      classes = 'bg-[#262828] border border-[#22C55E]/30 text-[#22C55E]';
    } else if (this.phase === 'RUNNING' && !this.isBetting) {
      classes = 'bg-[#262828] border border-white/10 text-slate-500';
    } else if (this.phase === 'CRASHED') {
      classes = 'bg-[#262828] border border-white/10 text-slate-500';
    }

    return classes;
  }

  onClick(): void {
    if (!this.getButtonDisabled()) {
      this.buttonClick.emit();
    }
  }
}
