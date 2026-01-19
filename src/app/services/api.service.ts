import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IPlaceBetResponse, ICashOutBetResponse, IBalanceResponse, ICrashStateResponse } from '../models/game-state.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly sessionToken = environment.sessionToken;

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': this.sessionToken,
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) {}

  placeBet(gameRoundId: number, amount: number = 1.00): Observable<IPlaceBetResponse> {
    const body = {
      gameRoundId,
      amount,
      isFreeBet: false,
      sequence: 0,
      betIndex: 0,
      autoCashoutMultiplier: undefined
    };

    return this.http.post<IPlaceBetResponse>(
      `${this.baseUrl}/crash-games/request-place-bet`,
      body,
      { headers: this.headers }
    );
  }

  cashOutBet(betReferenceId: string, sequence: number = 1): Observable<ICashOutBetResponse> {
    const body = {
      betReferenceId,
      partialCashout: false,
      sequence
    };

    return this.http.post<ICashOutBetResponse>(
      `${this.baseUrl}/crash-games/request-cashout-bet`,
      body,
      { headers: this.headers }
    );
  }

  getBalance(): Observable<IBalanceResponse> {
    return this.http.get<IBalanceResponse>(
      `${this.baseUrl}/players/me/balance`,
      { headers: this.headers }
    );
  }

  getCrashState(): Observable<ICrashStateResponse> {
    const body = {};
    return this.http.post<ICrashStateResponse>(
      `${this.baseUrl}/crash-games/crash-state`,
      body,
      { headers: this.headers }
    );
  }
}
