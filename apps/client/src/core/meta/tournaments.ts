export type TournamentParticipant = {
  id: string;
  name: string;
  rating: number;
};

export type TournamentMatch = {
  id: string;
  round: number;
  participants: TournamentParticipant[];
  winnerId?: string;
  scheduledAt?: number;
};

export type Tournament = {
  id: string;
  name: string;
  status: 'scheduled' | 'active' | 'completed';
  format: 'elimination' | 'round_robin' | 'swiss';
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  createdAt: number;
};

export type TournamentQueueStatus = 'idle' | 'queued' | 'ready' | 'failed';

export type TournamentQueueState = {
  status: TournamentQueueStatus;
  tournamentId?: string;
  queuedAt?: number;
  readyAt?: number;
  participants?: TournamentParticipant[];
};

export const createTournament = (
  name: string,
  format: Tournament['format'],
  participants: TournamentParticipant[]
): Tournament => ({
  id: `tourney_${Math.random().toString(36).slice(2, 10)}`,
  name,
  status: 'scheduled',
  format,
  participants,
  matches: [],
  createdAt: Date.now(),
});

export const seedEliminationMatches = (tourney: Tournament): Tournament => {
  const matches: TournamentMatch[] = [];
  const shuffled = [...tourney.participants].sort(() => 0.5 - Math.random());
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      id: `match_${tourney.id}_${i}`,
      round: 1,
      participants: shuffled.slice(i, i + 2),
    });
  }
  return { ...tourney, matches };
};

export const reportMatchResult = (
  tourney: Tournament,
  matchId: string,
  winnerId: string
): Tournament => ({
  ...tourney,
  matches: tourney.matches.map(match => (match.id === matchId ? { ...match, winnerId } : match)),
});

export const createTournamentQueue = (): TournamentQueueState => ({
  status: 'idle',
});

export const enqueueTournament = (tournamentId: string): TournamentQueueState => ({
  status: 'queued',
  tournamentId,
  queuedAt: Date.now(),
});

export const markTournamentReady = (
  state: TournamentQueueState,
  participants: TournamentParticipant[]
): TournamentQueueState => ({
  ...state,
  status: 'ready',
  readyAt: Date.now(),
  participants,
});

export const failTournamentQueue = (): TournamentQueueState => ({
  status: 'failed',
});

export const resetTournamentQueue = (): TournamentQueueState => ({
  status: 'idle',
});
