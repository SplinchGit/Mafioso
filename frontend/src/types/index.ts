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

// World ID specific types for frontend
export interface WorldIdConfig {
  appId: string;
  actionId: string;
  signal?: string;
}

export interface WorldIdModalProps {
  isOpen: boolean;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

// Game UI specific types
export interface CrimeCardProps {
  crime: GameCrime;
  onCommit: (crimeId: number) => void;
  disabled?: boolean;
  playerRank: number;
  playerNerve: number;
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
    VERIFY_WORLD_ID: '/api/auth/verify-worldid',
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