// Re-export shared types for frontend use
export * from '../../../shared/types';
export * from '../../../shared/constants';

// Frontend-specific types
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  requiresAuth: boolean;
  title: string;
}

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface FormError {
  field: string;
  message: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// MiniKit World ID verification types
export interface VerifyCommandInput {
  action: string;
  signal?: string;
  verification_level?: VerificationLevel;
}

export const VerificationLevel = {
  Orb: 'orb' as const,
  Device: 'device' as const
} as const;

export type VerificationLevel = typeof VerificationLevel[keyof typeof VerificationLevel];

export interface ISuccessResult {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: VerificationLevel;
  version: number;
}

export interface MiniAppVerifyActionSuccessPayload extends ISuccessResult {
  status: 'success';
}

export interface MiniAppVerifyActionErrorPayload {
  status: 'error';
  error_code: string;
  error_message: string;
}

// Window extension for World App environment
declare global {
  interface Window {
    WorldApp?: {
      world_app_version: number;
      device_os: string;
      safe_area_insets?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
      };
    };
  }
}

export interface GameCrime {
  id: number;
  name: string;
  description: string;
  baseSuccess: number;
  basePayout: {
    min: number;
    max: number;
  };
  baseRespect: number;
  requiredRank: number;
  cooldown: number;
}

export interface PlayerCar {
  id: string;           // unique identifier
  carType: number;      // 0-10 (which car model)
  damage: number;       // 0-100 (car's current damage)
  source: 'bought' | 'gta' | 'killed_player'; // how car was obtained
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
  searchingFor?: {       // current target search information
    targetId: string;
    searchStartTime: string;
    searchEndTime: string;
    targetUsername?: string;
    targetCity?: number;
    isComplete?: boolean;
  };
  lastMeltTime?: string; // timestamp of last car melt
  bulletFactoryId?: number; // city id 0-4 if they own a factory
}

// Game UI specific types
export interface CrimeCardProps {
  crime: GameCrime;
  onCommit: (crimeId: number) => void;
  disabled?: boolean;
  playerRank: number;
}

export interface PlayerStatsProps {
  player: Player;
  showDetailed?: boolean;
}

export interface NavigationProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

// Animation and interaction types
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface GameSound {
  id: string;
  src: string;
  volume: number;
  loop: boolean;
}

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'mafioso_auth_token',
  GAME_STATE: 'mafioso_game_state',
  USER_PREFERENCES: 'mafioso_user_prefs',
  SOUND_SETTINGS: 'mafioso_sound_settings'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    VERIFY_MINIAPP: '/api/auth/verify-miniapp',
    VALIDATE: '/api/auth/validate',
    LOGOUT: '/api/auth/logout'
  },
  PLAYER: {
    PROFILE: '/api/player/profile',
    STATS: '/api/player/stats',
    TRAVEL: '/api/player/travel',
    BUY_CAR: '/api/player/buy-car'
  },
  CRIMES: {
    LIST: '/api/crimes/list',
    COMMIT: '/api/crimes/commit',
    HISTORY: '/api/crimes/history'
  },
  GAME: {
    LEADERBOARD: '/api/game/leaderboard',
    GLOBAL_STATS: '/api/game/stats'
  }
} as const;