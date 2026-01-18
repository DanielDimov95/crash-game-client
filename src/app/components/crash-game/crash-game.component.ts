import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SignalRService } from '../../services/signalr.service';
import { ApiService } from '../../services/api.service';
import { IActiveRoundState, IGameBetStateTransactionData, ERoundLifecycleState, ICrashStateResponse } from '../../models/game-state.models';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../layout/header/header.component';

@Component({
  selector: 'app-crash-game',
  templateUrl: './crash-game.component.html',
  styleUrls: ['./crash-game.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CrashGameComponent implements OnInit, OnDestroy {
  multiplier: number = 1.00;
  balance: number | null = null; // Will be set from server
  betAmount: number = 10.00;
  originalBetAmount: number = 0; // Store the bet amount when placing bet
  isConnected: boolean = false;
  isBetting: boolean = false;
  cashedOut: boolean = false;
  cashedOutMultiplier: number = 0;
  winAmount: number = 0; // Store the win amount when cashing out
  currentBetReferenceId: string | null = null;
  currentRoundId: number | null = null;
  phase: 'BETTING' | 'RUNNING' | 'CRASHED' = 'BETTING';
  countdown: number = 5;
  history: number[] = [];
  balanceFlash: boolean = false;

  private subscriptions: Subscription[] = [];
  private countdownInterval: any = null;
  private crashedRoundTimeout: any = null;

  constructor(
    private signalRService: SignalRService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.subscribeToSignals();
    this.loadInitialBalance();
    this.loadCrashState();
  }

  private loadInitialBalance(): void {
    this.apiService.getBalance().subscribe({
      next: (response) => {
        if (response.success && response.data !== undefined) {
          this.balance = response.data;
        }
      },
      error: (error) => {
        // Balance will remain null and show "---" until we get it from a transaction
      }
    });
  }

  private loadCrashState(): void {
    this.apiService.getCrashState().subscribe({
      next: (response: ICrashStateResponse) => {
        if (response.success && response.data) {
          const data = response.data;
          
          // Set current round ID
          this.currentRoundId = data.gameRoundId;
          
          // Update game state
          if (data.gameState) {
            const apiMultiplier = data.gameState.multiplier || 1.00;
            this.multiplier = apiMultiplier;
            
            // Set phase based on currentAction
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
          
          // Load history multipliers
          if (data.historyMultipliers && data.historyMultipliers.length > 0) {
            this.history = [...data.historyMultipliers].slice(0, 10);
          }
          
          // Check if user has active bets
          if (data.myBets && data.myBets.length > 0) {
            // User has active bets - set betting state
            const activeBet = data.myBets[0]; // Assuming first bet is the active one
            
            this.isBetting = true;
            this.currentBetReferenceId = activeBet.betReferenceId || null;
            this.originalBetAmount = activeBet.amount || 0;
            
            // Check if already cashed out
            if (activeBet.cashedOut) {
              this.cashedOut = true;
              this.cashedOutMultiplier = activeBet.cashoutMultiplier || 0;
              this.winAmount = this.originalBetAmount * (this.cashedOutMultiplier - 1);
            }
          }
        }
      },
      error: (error) => {
        // Handle error silently
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private subscribeToSignals(): void {
    // Subscribe to round updates
    const roundSub = this.signalRService.roundUpdate$.subscribe(
      (data: IActiveRoundState) => this.handleRoundUpdate(data)
    );
    this.subscriptions.push(roundSub);

    // Subscribe to credit results (bet placed)
    const creditSub = this.signalRService.creditResult$.subscribe(
      (data: IGameBetStateTransactionData) => this.handleCreditResult(data)
    );
    this.subscriptions.push(creditSub);

    // Subscribe to debit results (cashout)
    const debitSub = this.signalRService.debitResult$.subscribe(
      (data: IGameBetStateTransactionData) => this.handleDebitResult(data)
    );
    this.subscriptions.push(debitSub);

    // Subscribe to connection state
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

    // Update phase based on current action FIRST
    switch (gameState.currentAction) {
      case ERoundLifecycleState.RoundCreated:
        // Don't interrupt the 2-second CRASHED phase timer
        // If we're still in CRASHED phase, let the timeout handle the transition to betting
        // The finishRound() timeout will call startBettingPhase() after 2 seconds
        if (this.phase === 'CRASHED') {
          // Don't do anything - let the timeout from finishRound() handle it
        } else {
          // If we're not in CRASHED phase, start betting phase immediately
          // Clear any crashed round timeout if still running
          if (this.crashedRoundTimeout) {
            clearTimeout(this.crashedRoundTimeout);
            this.crashedRoundTimeout = null;
          }
          this.startBettingPhase();
        }
        // Multiplier is reset to 1.00 in startBettingPhase()
        break;
      case ERoundLifecycleState.RoundRunning:
        // Update multiplier from websocket during running phase
        const runningMultiplier = gameState.multiplier ?? 1.00;
        this.multiplier = runningMultiplier;
        this.startRunningPhase();
        break;
      case ERoundLifecycleState.RoundFinished:
        // Update multiplier from websocket (final crash value)
        const finalMultiplier = gameState.multiplier ?? 1.00;
        this.multiplier = finalMultiplier;
        this.finishRound();
        break;
      case ERoundLifecycleState.RoundRecovered:
        // Handle recovery if needed
        break;
    }
  }

  private startBettingPhase(): void {
    this.phase = 'BETTING';
    this.multiplier = 1.00;
    
    // Reset bet state for new round - allow placing new bet
    // BUT: Don't reset originalBetAmount and winAmount if we're still waiting for cashout confirmation
    // (debitResult might arrive after new round starts)
    const wasWaitingForCashout = this.cashedOut && this.originalBetAmount > 0;
    
    this.isBetting = false;
    this.currentBetReferenceId = null;
    this.cashedOut = false;
    
    // Only reset originalBetAmount and winAmount if we're not waiting for cashout confirmation
    // They will be reset in handleDebitResult after win is calculated
    if (!wasWaitingForCashout) {
      this.originalBetAmount = 0;
      this.winAmount = 0;
    }
    
    this.cashedOutMultiplier = 0;

    // Start countdown (hardcoded 5 seconds)
    this.countdown = 5;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
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
    
    // If bet wasn't cashed out, it's lost
    if (this.isBetting && !this.cashedOut) {
      this.isBetting = false;
      this.currentBetReferenceId = null;
      this.cashedOut = false;
      // Only reset originalBetAmount if bet was lost (not cashed out)
      // If cashed out, keep it until debitResult confirms
      this.originalBetAmount = 0;
    }
    // If cashed out, keep originalBetAmount until debitResult arrives

    // Add to history
    this.addToHistory(this.multiplier);

    // Clear any existing timeout
    if (this.crashedRoundTimeout) {
      clearTimeout(this.crashedRoundTimeout);
    }
    
    // After 2 seconds, transition to betting phase
    this.crashedRoundTimeout = setTimeout(() => {
      this.startBettingPhase();
    }, 2000); // 2 seconds
  }

  private handleCreditResult(data: IGameBetStateTransactionData): void {
    if (data.success) {
      this.isBetting = true;
      this.currentBetReferenceId = data.betReferenceId;
      // Update balance from server response - this is the balance after bet is placed
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
      this.isBetting = false; // Reset betting state after successful cashout
      // Use the multiplier from server response (should match what we stored)
      this.cashedOutMultiplier = data.gameState.multiplier ?? 0;
      
      // Store originalBetAmount before potentially resetting it
      // (It might have been reset if new round started before this message arrived)
      const betAmountForWin = this.originalBetAmount;
      
      // Recalculate win amount to ensure accuracy
      if (betAmountForWin > 0 && this.cashedOutMultiplier > 0) {
        this.winAmount = betAmountForWin * (this.cashedOutMultiplier - 1);
      } else if (this.winAmount > 0) {
        // If originalBetAmount was reset but winAmount is already set, keep it
        // Keep the existing winAmount
      } else {
        // If both are 0, set winAmount to 0
        this.winAmount = 0;
      }
      
      this.balance = data.balance;
      this.multiplier = data.gameState.multiplier ?? 1.00;
      
      // NOW we can safely reset originalBetAmount after calculating win
      this.originalBetAmount = 0;
      
      // Flash balance green
      this.balanceFlash = true;
      setTimeout(() => {
        this.balanceFlash = false;
      }, 500);
    } else {
      alert(`Cashout failed. Error code: ${data.errorCode}`);
      // Reset win amount on failure
      this.winAmount = 0;
      this.cashedOutMultiplier = 0;
      // Also reset originalBetAmount on failure
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

    // Store the original bet amount for win calculation
    this.originalBetAmount = this.betAmount;
    
    // Set betting state immediately to disable button while waiting for server confirmation
    this.isBetting = true;

    this.apiService.placeBet(this.currentRoundId, this.betAmount).subscribe({
      next: (response: any) => {
        // Extract betReferenceId from API response immediately
        // This allows cashout even if SignalR message hasn't arrived yet
        if (response && response.betReferenceId) {
          this.currentBetReferenceId = response.betReferenceId;
        }
        
        // Button is already disabled via isBetting = true
        // SignalR creditResult message will confirm and update balance
      },
      error: (error) => {
        alert('Failed to place bet. Please try again.');
        // Re-enable button on error
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

    // Store the multiplier at the time of cashout for win calculation
    this.cashedOutMultiplier = this.multiplier;
    // Calculate and store win amount: (bet * multiplier) - bet = bet * (multiplier - 1)
    this.winAmount = this.originalBetAmount * (this.multiplier - 1);

    this.apiService.cashOutBet(this.currentBetReferenceId).subscribe({
      next: () => {
        // Cashout request sent, waiting for confirmation
      },
      error: (error) => {
        alert('Failed to cash out. Please try again.');
        // Reset win amount on error
        this.winAmount = 0;
        this.cashedOutMultiplier = 0;
      }
    });
  }

  adjustBet(factor: number): void {
    if (this.phase !== 'BETTING' || this.isBetting) return;
    
    let newAmount = this.betAmount * factor;
    if (newAmount < 1) newAmount = 1;
    if (newAmount > 1000) newAmount = 1000;
    if (this.balance !== null && newAmount > this.balance) newAmount = this.balance;
    
    this.betAmount = parseFloat(newAmount.toFixed(2));
  }

  validateBetAmount(): void {
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
}
