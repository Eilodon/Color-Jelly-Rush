export type MatchmakingStatus = 'idle' | 'queuing' | 'matched' | 'failed';

export type MatchmakingState = {
  status: MatchmakingStatus;
  region?: string;
  queuedAt?: number;
  matchId?: string;
};

export const createMatchmakingState = (): MatchmakingState => ({
  status: 'idle'
});

export const startQueue = (state: MatchmakingState, region: string): MatchmakingState => ({
  status: 'queuing',
  region,
  queuedAt: Date.now()
});

export const cancelQueue = (): MatchmakingState => ({
  status: 'idle'
});

export const markMatched = (state: MatchmakingState, matchId: string): MatchmakingState => ({
  ...state,
  status: 'matched',
  matchId
});

export const markFailed = (state: MatchmakingState): MatchmakingState => ({
  ...state,
  status: 'failed'
});
