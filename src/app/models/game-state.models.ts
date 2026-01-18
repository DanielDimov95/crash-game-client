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
  // Add bet state properties as needed
  [key: string]: any;
}

export interface ICrashStateResponse {
  success: boolean;
  error: null | string;
  data: {
    gameRoundId: number;
    roundReferenceId: string;
    myBets: any[];
    allBets: any[];
    gameState: IGameState;
    historyMultipliers: number[];
    sequence: number | null;
    totalBetCount: number;
  };
}
