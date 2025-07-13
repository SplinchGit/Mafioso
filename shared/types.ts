import type { CrimeOutcome, RankType, CityType, CrimeType, CarType } from './constants';

export interface Player {
  worldId: string;
  username: string;
  money: number;
  respect: number;
  nerve: number;
  rank: number;
  city: number;
  carId?: number;
  lastActive: string;
  createdAt: string;
  jailUntil?: string;
  hospitalUntil?: string;
  stats: PlayerStats;
}

export interface PlayerStats {
  crimesCommitted: number;
  crimesSuccessful: number;
  crimesFailed: number;
  timesJailed: number;
  timesHospitalized: number;
  totalMoneyEarned: number;
  totalRespectEarned: number;
  rankUps: number;
}

export interface CrimeResult {
  success: boolean;
  outcome: CrimeOutcome;
  moneyGained?: number;
  respectGained?: number;
  message: string;
  jailTime?: number;
  hospitalTime?: number;
}

export interface CrimeAttempt {
  playerId: string;
  crimeId: number;
  timestamp: string;
  result: CrimeResult;
}

export interface PlayerCooldown {
  playerId: string;
  crimeId: number;
  expiresAt: string;
}

export interface WorldIdVerification {
  worldId: string;
  nullifierHash: string;
  proof: string;
  verified: boolean;
  timestamp: string;
}

export interface GameState {
  player: Player | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  player: Player;
  token: string;
}

export interface CrimeResponse {
  result: CrimeResult;
  player: Player;
  cooldownUntil: string;
}

// World ID types
export interface WorldIdConfig {
  app_id: string;
  action: string;
  signal?: string;
}

export interface WorldIdSuccessResponse {
  nullifier_hash: string;
  merkle_root: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

// Frontend-specific types
export interface NavigationItem {
  path: string;
  label: string;
  icon?: string;
  requiresAuth?: boolean;
}

export interface GameAction {
  type: string;
  payload?: any;
  timestamp: string;
}

// Utility types
export type PlayerRank = RankType;
export type GameCity = CityType;
export type GameCrime = CrimeType;
export type GameCar = CarType;