import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly sessionToken = environment.sessionToken;

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': this.sessionToken, // Send token as Authorization header value
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) {}

  placeBet(gameRoundId: number, amount: number = 1.00): Observable<any> {
    const body = {
      gameRoundId,
      amount,
      isFreeBet: false,
      sequence: 0,
      betIndex: 0,
      autoCashoutMultiplier: undefined
    };

    return this.http.post(
      `${this.baseUrl}/crash-games/request-place-bet`,
      body,
      { headers: this.headers }
    );
  }

  cashOutBet(betReferenceId: string, sequence: number = 1): Observable<any> {
    const body = {
      betReferenceId,
      partialCashout: false,
      sequence
    };

    return this.http.post(
      `${this.baseUrl}/crash-games/request-cashout-bet`,
      body,
      { headers: this.headers }
    );
  }

  getBalance(): Observable<{ data: number; success: boolean; error: null }> {
    return this.http.get<{ data: number; success: boolean; error: null }>(
      `${this.baseUrl}/players/me/balance`,
      { headers: this.headers }
    );
  }

  getCrashState(): Observable<any> {
    const body = {};
    return this.http.post(
      `${this.baseUrl}/crash-games/crash-state`,
      body,
      { headers: this.headers }
    );
  }
}
