export const PROP_TYPES = [
  'restaurant',
  'chop_shop',
  'blackjack',
  'roulette',
  'pool_hall',
] as const;

export type PropType = typeof PROP_TYPES[number];
export type HouseGameType = Extract<PropType, 'blackjack' | 'roulette'>;

export interface PropDefinition {
  type: PropType;
  name: string;
  icon: string;
  description: string;
  ownership: 'any_player' | 'crew_boss_only';
  economy: 'passive_income' | 'bullet_production' | 'house_game' | 'player_skill';
}

export const PROPS: readonly PropDefinition[] = [
  {
    type: 'restaurant',
    name: 'Restaurant',
    icon: '🍝',
    description: 'Produces steady passive income for its owner.',
    ownership: 'any_player',
    economy: 'passive_income',
  },
  {
    type: 'chop_shop',
    name: 'Chop Shop',
    icon: '🔧',
    description: 'Produces bullets for the family. Only a crew boss can own one.',
    ownership: 'crew_boss_only',
    economy: 'bullet_production',
  },
  {
    type: 'blackjack',
    name: 'Blackjack Table',
    icon: '🃏',
    description: 'Players wager against the owner acting as the house.',
    ownership: 'any_player',
    economy: 'house_game',
  },
  {
    type: 'roulette',
    name: 'Roulette Table',
    icon: '🎡',
    description: 'Players place roulette bets against the owner acting as the house.',
    ownership: 'any_player',
    economy: 'house_game',
  },
  {
    type: 'pool_hall',
    name: 'Pool Hall',
    icon: '🎱',
    description: 'A skill-based room where players can play one another for stakes.',
    ownership: 'any_player',
    economy: 'player_skill',
  },
] as const;

export const CREW_BOSS_MIN_RANK = 15;
export const HOUSE_WIN_PERCENT = 60;
export const DEFAULT_MAX_BET = 1000;
export const MIN_BET = 1;
export const BLACKJACK_NATURAL_WIN_SHARE = 0.12; // ~4.8% of all hands when players win 40%.

export const RESTAURANT_INCOME_PER_DAY = 25000;
export const CHOP_SHOP_BULLETS_PER_DAY = 2000;
export const DEFAULT_BULLET_PRICE = 100;
export const MIN_BULLET_PRICE = 1;

export interface CityProp {
  propId: string;
  cityId: number;
  type: PropType;
  ownerId?: string;
  ownerUsername?: string;
  claimedAt?: string;
  lastAccruedAt?: string;
  maxBet?: number;
  bulletPrice?: number;
  storedIncome?: number;
  storedBullets?: number;
}

export function propId(cityId: number, type: PropType): string {
  return `${cityId}#${type}`;
}

export function isPropType(value: unknown): value is PropType {
  return typeof value === 'string' && (PROP_TYPES as readonly string[]).includes(value);
}

export function isHouseGameType(value: unknown): value is HouseGameType {
  return value === 'blackjack' || value === 'roulette';
}
