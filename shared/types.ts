import type { CrimeOutcome, RankType, CityType, CrimeType, CarType } from './constants';

export interface Player {
  walletAddress: string; // Primary key - permanent identifier
  worldId: string;       // Internal game ID
  username: string;      // Can change on death
  money: number;
  respect: number;
  rank: number;
  city: number;
  cars: PlayerCar[];     // Array of owned cars
  activeCar?: string;    // Unique ID of currently selected car
  lastActive: string;
  createdAt: string;
  jailUntil?: string;
  hospitalUntil?: string;
  stats: PlayerStats;
  gunId?: number;        // 0-8, which gun they own (null if none)
  protectionId?: number; // 0-8, which protection they own (null if none)
  bullets: number;       // how many bullets they have
  kills: number;         // total kills
  deaths: number;        // total deaths - when shot, account resets
  swissBank: number;     // money stored in swiss bank - safe from death
  searchingFor?: SearchData; // current target search information
  lastMeltTime?: string; // timestamp of last car melt
  bulletFactoryId?: number; // city id 0-4 if they own a factory (null if none)
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

export interface SearchData {
  targetId: string;
  searchStartTime: string;
  searchEndTime: string;
  targetUsername?: string;
  targetCity?: number;
  isComplete?: boolean;
}

export interface PlayerCar {
  id: string;           // unique identifier
  carType: number;      // 0-10 (which car model)
  damage: number;       // 0-100 (car's current damage)
  source: 'bought' | 'gta' | 'killed_player'; // how car was obtained
}

export interface CarListing {
  id: string;           // unique identifier
  sellerId: string;     // player worldId
  carId: string;        // unique car id from seller's inventory
  carType: number;      // 0-10 (which car model)
  damage: number;       // 0-100 (car's current damage)
  price: number;        // listing price in dollars
  listedAt: string;     // timestamp
  active: boolean;      // whether listing is still active
}

export interface BulletFactory {
  cityId: number;       // 0-4 (one per city)
  ownerId?: string;     // player worldId (null if unowned)
  lastCollectionTime: string; // timestamp for owner
  storedBullets: number; // current bullets in city store
}

export interface CrimeResult {
  success: boolean;
  outcome: CrimeOutcome;
  moneyGained?: number;
  respectGained?: number;
  message: string;
  jailTime?: number;
  hospitalTime?: number;
  carAwarded?: number;
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

export interface ShootResult {
  success: boolean;
  bulletsCost: number;
  target?: string;
  message: string;
  carsGained?: number;
}

export interface SearchResult {
  success: boolean;
  targetFound?: {
    username: string;
    city: number;
  };
  searchEndTime?: string;
  message: string;
}

export interface StoreItem {
  id: number;
  name: string;
  price: number;
  type: 'gun' | 'protection';
  divisor?: number;     // For guns - reduces bullets needed
  multiplier?: number;  // For protection - increases bullets needed to kill
  description?: string;
}

export interface StorePurchaseResponse {
  success: boolean;
  item?: StoreItem;
  player: Player;
  message: string;
}

export interface SwissBankResponse {
  success: boolean;
  player: Player;
  message: string;
}

export interface CarMarketplaceResponse {
  success: boolean;
  listings?: CarListing[];
  player?: Player;
  message: string;
}

export interface CarMeltResponse {
  success: boolean;
  bulletsGained: number;
  player: Player;
  message: string;
}

export interface BulletFactoryResponse {
  success: boolean;
  factories?: BulletFactory[];
  player?: Player;
  bulletsCollected?: number;
  message: string;
}

// MiniKit World ID types
export interface MiniAppVerifyRequest {
  payload: {
    proof: string;
    merkle_root: string;
    nullifier_hash: string;
    verification_level: 'orb' | 'device';
    version: number;
  };
  action: string;
  signal?: string;
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