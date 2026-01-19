import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalRService } from '../../services/signalr.service';
import { ApiService } from '../../services/api.service';
import { IActiveRoundState, IGameBetStateTransactionData, ERoundLifecycleState, ICrashStateResponse } from '../../models/game-state.models';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../layout/header/header.component';
import { GameHistoryComponent } from './game-history/game-history.component';
import { MultiplierDisplayComponent } from './multiplier-display/multiplier-display.component';
import { BetControlsComponent } from './bet-controls/bet-controls.component';
import { ActionButtonComponent } from './action-button/action-button.component';

@Component({
  selector: 'app-crash-game',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    GameHistoryComponent,
    MultiplierDisplayComponent,
    BetControlsComponent,
    ActionButtonComponent
  ],
  templateUrl: './crash-game.component.html',
  styleUrls: ['./crash-game.component.css']
})
export class CrashGameComponent implements OnInit, OnDestroy {
  // Game State
  multiplier: number = 1.00;
  balance: number | null = null;
  betAmount: number = 10.00;
  originalBetAmount: number = 0;
  isConnected: boolean = false;
  isBetting: boolean = false;
  cashedOut: boolean = false;
  cashedOutMultiplier: number = 0;
  winAmount: number = 0;
  currentBetReferenceId: string | null = null;
  currentRoundId: number | null = null;
  phase: 'BETTING' | 'RUNNING' | 'CRASHED' = 'BETTING';
  countdown: number = 5;
  history: number[] = [];
  balanceFlash: boolean = false;

  private subscriptions: Subscription[] = [];
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private crashedRoundTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private signalRService: SignalRService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.subscribeToSignals();
    this.loadInitialBalance();
    this.loadCrashState();
  }

  ngOnDestroy(): void {
    // Unsubscribe from all SignalR observables
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Clear timers
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.crashedRoundTimeout) {
      clearTimeout(this.crashedRoundTimeout);
      this.crashedRoundTimeout = null;
    }
    
    // Disconnect SignalR connection
    // Note: SignalRService is a singleton, so this disconnects the shared connection.
    // In a single-page app where this component is always present, you might want
    // to keep the connection alive. However, proper cleanup is shown here.
    this.signalRService.disconnect().catch(() => {
      // Ignore disconnect errors during cleanup
    });
  }

  private loadInitialBalance(): void {
    this.apiService.getBalance().subscribe({
      next: (response) => {
        if (response.success && response.data !== undefined) {
          this.balance = response.data;
        }
      },
      error: () => {
        // Balance will remain null and show "---" until we get it from a transaction
      }
    });
  }

  private loadCrashState(): void {
    this.apiService.getCrashState().subscribe({
      next: (response: ICrashStateResponse) => {
        if (response.success && response.data) {
          const data = response.data;
          
          this.currentRoundId = data.gameRoundId;
          
          if (data.gameState) {
            const apiMultiplier = data.gameState.multiplier || 1.00;
            this.multiplier = apiMultiplier;
            
            switch (data.gameState.currentAction) {
              case ERoundLifecycleState.RoundCreated:
                this.phase = 'BETTING';
                this.startBettingPhase();
                break;
              case ERoundLifecycleState.RoundRunning:
                this.phase = 'RUNNING';
                this.startRunningPhase();
                break;
              case ERoundLifecycleState.RoundFinished:
                this.phase = 'CRASHED';
                break;
            }
          }
          
          if (data.historyMultipliers && data.historyMultipliers.length > 0) {
            this.history = [...data.historyMultipliers].slice(0, 10);
          }
          
          if (data.myBets && data.myBets.length > 0) {
            const activeBet = data.myBets[0];
            
            this.isBetting = true;
            this.currentBetReferenceId = activeBet.betReferenceId || null;
            this.originalBetAmount = activeBet.amount || 0;
            
            if (activeBet.cashedOut) {
              this.cashedOut = true;
              this.cashedOutMultiplier = activeBet.cashoutMultiplier || 0;
              this.winAmount = this.originalBetAmount * (this.cashedOutMultiplier - 1);
            }
          }
        }
      },
      error: () => {
        // Handle error silently
      }
    });
  }

  private subscribeToSignals(): void {
    const roundSub = this.signalRService.roundUpdate$.subscribe(
      (data: IActiveRoundState) => this.handleRoundUpdate(data)
    );
    this.subscriptions.push(roundSub);

    const creditSub = this.signalRService.creditResult$.subscribe(
      (data: IGameBetStateTransactionData) => this.handleCreditResult(data)
    );
    this.subscriptions.push(creditSub);

    const debitSub = this.signalRService.debitResult$.subscribe(
      (data: IGameBetStateTransactionData) => this.handleDebitResult(data)
    );
    this.subscriptions.push(debitSub);

    const connectionSub = this.signalRService.connectionState$.subscribe(
      (connected: boolean) => {
        this.isConnected = connected;
      }
    );
    this.subscriptions.push(connectionSub);
  }

  private handleRoundUpdate(data: IActiveRoundState): void {
    this.currentRoundId = data.roundId;
    const gameState = data.gameState;

    switch (gameState.currentAction) {
      case ERoundLifecycleState.RoundCreated:
        if (this.phase === 'CRASHED') {
          // Don't interrupt the 2-second CRASHED phase timer
        } else {
          if (this.crashedRoundTimeout) {
            clearTimeout(this.crashedRoundTimeout);
            this.crashedRoundTimeout = null;
          }
          this.startBettingPhase();
        }
        break;
      case ERoundLifecycleState.RoundRunning:
        const runningMultiplier = gameState.multiplier ?? 1.00;
        this.multiplier = runningMultiplier;
        this.startRunningPhase();
        break;
      case ERoundLifecycleState.RoundFinished:
        const finalMultiplier = gameState.multiplier ?? 1.00;
        this.multiplier = finalMultiplier;
        this.finishRound();
        break;
    }
  }

  private startBettingPhase(): void {
    this.phase = 'BETTING';
    this.multiplier = 1.00;
    
    const wasWaitingForCashout = this.cashedOut && this.originalBetAmount > 0;
    
    this.isBetting = false;
    this.currentBetReferenceId = null;
    this.cashedOut = false;
    
    if (!wasWaitingForCashout) {
      this.originalBetAmount = 0;
      this.winAmount = 0;
    }
    
    this.cashedOutMultiplier = 0;

    this.countdown = 5;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        this.countdownInterval = null;
      }
    }, 1000);
  }

  private startRunningPhase(): void {
    this.phase = 'RUNNING';
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private finishRound(): void {
    this.phase = 'CRASHED';
    
    if (this.isBetting && !this.cashedOut) {
      this.isBetting = false;
      this.currentBetReferenceId = null;
      this.cashedOut = false;
      this.originalBetAmount = 0;
    }

    this.addToHistory(this.multiplier);

    if (this.crashedRoundTimeout) {
      clearTimeout(this.crashedRoundTimeout);
    }
    
    this.crashedRoundTimeout = setTimeout(() => {
      this.startBettingPhase();
    }, 2000);
  }

  private handleCreditResult(data: IGameBetStateTransactionData): void {
    if (data.success) {
      this.isBetting = true;
      this.currentBetReferenceId = data.betReferenceId;
      this.balance = data.balance;
      this.multiplier = data.gameState.multiplier ?? 1.00;
    } else {
      alert(`Bet placement failed. Error code: ${data.errorCode}`);
      this.isBetting = false;
      this.currentBetReferenceId = null;
    }
  }

  private handleDebitResult(data: IGameBetStateTransactionData): void {
    if (data.success) {
      this.cashedOut = true;
      this.isBetting = false;
      this.cashedOutMultiplier = data.gameState.multiplier ?? 0;
      
      const betAmountForWin = this.originalBetAmount;
      
      if (betAmountForWin > 0 && this.cashedOutMultiplier > 0) {
        this.winAmount = betAmountForWin * (this.cashedOutMultiplier - 1);
      } else if (this.winAmount > 0) {
        // Keep existing winAmount
      } else {
        this.winAmount = 0;
      }
      
      this.balance = data.balance;
      this.multiplier = data.gameState.multiplier ?? 1.00;
      this.originalBetAmount = 0;
      
      this.balanceFlash = true;
      setTimeout(() => {
        this.balanceFlash = false;
      }, 500);
    } else {
      alert(`Cashout failed. Error code: ${data.errorCode}`);
      this.winAmount = 0;
      this.cashedOutMultiplier = 0;
      this.originalBetAmount = 0;
    }
  }

  onBetClick(): void {
    if (this.phase === 'BETTING' && !this.isBetting) {
      this.placeBet();
    } else if (this.phase === 'RUNNING' && this.isBetting && !this.cashedOut && this.currentBetReferenceId) {
      this.cashOut();
    }
  }

  private placeBet(): void {
    if (!this.currentRoundId || this.phase !== 'BETTING' || (this.balance !== null && this.betAmount > this.balance)) {
      if (this.balance !== null && this.betAmount > this.balance) {
        alert('Insufficient balance');
      } else {
        alert('Cannot place bet at this time. Please wait for the betting phase.');
      }
      return;
    }

    this.originalBetAmount = this.betAmount;
    this.isBetting = true;

    this.apiService.placeBet(this.currentRoundId, this.betAmount).subscribe({
      next: (response) => {
        if (response?.betReferenceId) {
          this.currentBetReferenceId = response.betReferenceId;
        }
      },
      error: () => {
        alert('Failed to place bet. Please try again.');
        this.isBetting = false;
        this.originalBetAmount = 0;
        this.currentBetReferenceId = null;
      }
    });
  }

  private cashOut(): void {
    if (!this.currentBetReferenceId || this.cashedOut) {
      alert('No active bet to cash out.');
      return;
    }

    this.cashedOutMultiplier = this.multiplier;
    this.winAmount = this.originalBetAmount * (this.multiplier - 1);

    this.apiService.cashOutBet(this.currentBetReferenceId).subscribe({
      next: () => {
        // Cashout request sent, waiting for confirmation
      },
      error: () => {
        alert('Failed to cash out. Please try again.');
        this.winAmount = 0;
        this.cashedOutMultiplier = 0;
      }
    });
  }

  onBetAmountChange(newAmount: number): void {
    this.betAmount = newAmount;
  }

  onAdjustBet(factor: number): void {
    if (this.phase !== 'BETTING' || this.isBetting) return;
    
    let newAmount = this.betAmount * factor;
    if (newAmount < 1) newAmount = 1;
    if (newAmount > 1000) newAmount = 1000;
    if (this.balance !== null && newAmount > this.balance) newAmount = this.balance;
    
    this.betAmount = parseFloat(newAmount.toFixed(2));
  }

  onValidateBetAmount(): void {
    if (this.betAmount < 1) {
      this.betAmount = 1;
    } else if (this.betAmount > 1000) {
      this.betAmount = 1000;
    } else if (this.balance !== null && this.betAmount > this.balance) {
      this.betAmount = this.balance;
    }
    this.betAmount = parseFloat(this.betAmount.toFixed(2));
  }

  private addToHistory(value: number): void {
    this.history.unshift(value);
    if (this.history.length > 10) {
      this.history.pop();
    }
  }
}
