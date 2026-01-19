import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { IActiveRoundState, IGameBetStateTransactionData } from '../models/game-state.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | null = null;
  private readonly hubUrl = environment.hubUrl;
  private readonly hubName = environment.hubName;
  private readonly sessionToken = environment.sessionToken;
  
  private roundUpdateSubject = new Subject<IActiveRoundState>();
  private creditResultSubject = new Subject<IGameBetStateTransactionData>();
  private debitResultSubject = new Subject<IGameBetStateTransactionData>();
  private connectionStateSubject = new Subject<boolean>();

  public roundUpdate$: Observable<IActiveRoundState> = this.roundUpdateSubject.asObservable();
  public creditResult$: Observable<IGameBetStateTransactionData> = this.creditResultSubject.asObservable();
  public debitResult$: Observable<IGameBetStateTransactionData> = this.debitResultSubject.asObservable();
  public connectionState$: Observable<boolean> = this.connectionStateSubject.asObservable();

  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.startConnection();
  }

  private startConnection(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}${this.hubName}`, {
        accessTokenFactory: () => this.sessionToken
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
          return null;
        }
      })
      .build();

    this.setupHandlers();
    this.start();
  }

  private setupHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('roundUpdate', (data: IActiveRoundState) => {
      this.roundUpdateSubject.next(data);
    });

    this.hubConnection.on('creditResult', (data: IGameBetStateTransactionData) => {
      this.creditResultSubject.next(data);
    });

    this.hubConnection.on('debitResult', (data: IGameBetStateTransactionData) => {
      this.debitResultSubject.next(data);
    });

    this.hubConnection.onreconnecting((error) => {
      console.warn('SignalR reconnecting...', error);
      this.connectionStateSubject.next(false);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.reconnectAttempts = 0;
      this.connectionStateSubject.next(true);
    });

    this.hubConnection.onclose((error) => {
      console.error('SignalR connection closed:', error);
      this.connectionStateSubject.next(false);
      this.handleReconnect();
    });
  }

  private async start(): Promise<void> {
    try {
      await this.hubConnection?.start();
      this.connectionStateSubject.next(true);
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      this.connectionStateSubject.next(false);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.hubConnection?.state === HubConnectionState.Disconnected) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.start();
      }
    }, delay);
  }

  public getConnectionState(): HubConnectionState {
    return this.hubConnection?.state ?? HubConnectionState.Disconnected;
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }
}
