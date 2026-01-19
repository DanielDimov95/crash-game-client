export interface IActiveRoundState {
  roundReferenceId: string;
  roundId: number;
  gameState: IGameState;
}

export interface IGameState {
  currentAction: ERoundLifecycleState;
  startTime: number;
  multiplier: number | null;
}

export enum ERoundLifecycleState {
  RoundCreated = 200,
  RoundRunning = 210,
  RoundFinished = 220,
  RoundRecovered = 230
}

export interface IGameBetStateTransactionData extends IGameBetState {
  balance: number;
}

export interface IGameBetState {
  success: boolean;
  errorCode: number | null;
  betReferenceId: string;
  roundReferenceId: string;
  gameState: IGameState;
  betState: IBetState;
  sequence?: number;
  gameRoundId?: number;
}

export interface IBetState {
  // Bet state properties - can be extended as needed
  [key: string]: unknown;
}

export interface IBet {
  betReferenceId: string;
  amount: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  gameRoundId?: number;
  roundReferenceId?: string;
  [key: string]: unknown;
}

export interface IPlaceBetResponse {
  betReferenceId: string;
  success?: boolean;
  [key: string]: unknown;
}

export interface ICashOutBetResponse {
  success: boolean;
  betReferenceId?: string;
  [key: string]: unknown;
}

export interface IBalanceResponse {
  data: number;
  success: boolean;
  error: null;
}

export interface ICrashStateResponse {
  success: boolean;
  error: null | string;
  data: {
    gameRoundId: number;
    roundReferenceId: string;
    myBets: IBet[];
    allBets: IBet[];
    gameState: IGameState;
    historyMultipliers: number[];
    sequence: number | null;
    totalBetCount: number;
  };
}
