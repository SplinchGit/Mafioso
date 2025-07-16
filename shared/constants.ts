export const RANKS = [
  { id: 0, name: "Beggar", requiredRespect: 0 },
  { id: 1, name: "Citizen", requiredRespect: 100 },
  { id: 2, name: "Runner", requiredRespect: 400 },
  { id: 3, name: "Trader", requiredRespect: 1200 },
  { id: 4, name: "Respected Trader", requiredRespect: 3500 },
  { id: 5, name: "Soldato", requiredRespect: 10000 },
  { id: 6, name: "Respected Soldato", requiredRespect: 30000 },
  { id: 7, name: "Enforcer", requiredRespect: 75000 },
  { id: 8, name: "Made Man", requiredRespect: 150000 },
  { id: 9, name: "Respected Made Man", requiredRespect: 350000 },
  { id: 10, name: "Lieutenant", requiredRespect: 800000 },
  { id: 11, name: "Caporegime", requiredRespect: 2000000 },
  { id: 12, name: "Respected Caporegime", requiredRespect: 5000000 },
  { id: 13, name: "Underboss", requiredRespect: 12000000 },
  { id: 14, name: "Respected Underboss", requiredRespect: 30000000 },
  { id: 15, name: "Faction Boss", requiredRespect: 80000000 },
  { id: 16, name: "Respected Faction Boss", requiredRespect: 200000000 },
  { id: 17, name: "Consigliere", requiredRespect: 500000000 },
  { id: 18, name: "Respected Consigliere", requiredRespect: 1500000000 },
  { id: 19, name: "Infamous Mafioso", requiredRespect: 5000000000 }
] as const;

export const CITIES = [
  { id: 0, name: "London", flag: "🇬🇧" },
  { id: 1, name: "Tokyo", flag: "🇯🇵" },
  { id: 2, name: "New York", flag: "🇺🇸" },
  { id: 3, name: "Moscow", flag: "🇷🇺" },
  { id: 4, name: "Palermo", flag: "🇮🇹" }
] as const;

export const CRIMES = [
  {
    id: 0,
    name: "Pickpocket",
    description: "Steal from unsuspecting victims",
    baseSuccess: 100,
    basePayout: { min: 0, max: 100 },
    baseRespect: 1,
    requiredRank: 0,
    cooldown: 10, // seconds
    jailTime: 0 // N/A (always succeeds)
  },
  {
    id: 1,
    name: "Shoplift",
    description: "Steal small items from stores",
    baseSuccess: 90,
    basePayout: { min: 100, max: 1000 },
    baseRespect: 5,
    requiredRank: 1,
    cooldown: 60,
    jailTime: 30
  },
  {
    id: 2,
    name: "Scam a Tourist",
    description: "Con unsuspecting tourists",
    baseSuccess: 85,
    basePayout: { min: 1000, max: 2000 },
    baseRespect: 10,
    requiredRank: 1,
    cooldown: 120,
    jailTime: 60
  },
  {
    id: 3,
    name: "Rob a Store",
    description: "Hold up a corner shop",
    baseSuccess: 80,
    basePayout: { min: 1000, max: 3000 },
    baseRespect: 25,
    requiredRank: 2,
    cooldown: 180,
    jailTime: 60
  },
  {
    id: 4,
    name: "Grand Theft Auto",
    description: "Steal cars for your collection",
    baseSuccess: 60,
    basePayout: { min: 0, max: 0 }, // Special: awards random car
    baseRespect: 100,
    requiredRank: 0,
    cooldown: 300,
    jailTime: 180,
    special: "car"
  },
  {
    id: 5,
    name: "Rob a Jewellery Store",
    description: "Hit a high-end jewelry store",
    baseSuccess: 70,
    basePayout: { min: 5000, max: 10000 },
    baseRespect: 250,
    requiredRank: 5,
    cooldown: 600,
    jailTime: 120
  },
  {
    id: 6,
    name: "Steal a Yacht",
    description: "Acquire luxury vessels illegally",
    baseSuccess: 65,
    basePayout: { min: 10000, max: 20000 },
    baseRespect: 500,
    requiredRank: 7,
    cooldown: 1200,
    jailTime: 120
  },
  {
    id: 7,
    name: "Bank Heist",
    description: "Rob a major bank",
    baseSuccess: 55,
    basePayout: { min: 20000, max: 50000 },
    baseRespect: 2500,
    requiredRank: 10,
    cooldown: 3600,
    jailTime: 180
  },
  {
    id: 8,
    name: "Art Gallery Heist",
    description: "Steal priceless artwork",
    baseSuccess: 55,
    basePayout: { min: 50000, max: 100000 },
    baseRespect: 10000,
    requiredRank: 12,
    cooldown: 7200,
    jailTime: 180
  },
  {
    id: 9,
    name: "Casino Heist",
    description: "Rob a high-end casino",
    baseSuccess: 50,
    basePayout: { min: 100000, max: 200000 },
    baseRespect: 50000,
    requiredRank: 14,
    cooldown: 14400,
    jailTime: 180
  },
  {
    id: 10,
    name: "Government Heist",
    description: "Rob the federal reserve",
    baseSuccess: 50,
    basePayout: { min: 150000, max: 250000 },
    baseRespect: 250000,
    requiredRank: 16,
    cooldown: 28800,
    jailTime: 210
  }
] as const;

export const CARS = [
  { id: 0, name: "Fiat 500", price: 15000, speed: 45, accel: 30, baseBullets: 1 },
  { id: 1, name: "Ford Focus", price: 25000, speed: 55, accel: 40, baseBullets: 5 },
  { id: 2, name: "Honda Civic", price: 35000, speed: 65, accel: 50, baseBullets: 10 },
  { id: 3, name: "BMW 3 Series", price: 55000, speed: 75, accel: 65, baseBullets: 25 },
  { id: 4, name: "Audi A4", price: 65000, speed: 80, accel: 70, baseBullets: 35 },
  { id: 5, name: "Mercedes C-Class", price: 75000, speed: 85, accel: 75, baseBullets: 50 },
  { id: 6, name: "BMW X5", price: 150000, speed: 95, accel: 90, baseBullets: 80 },
  { id: 7, name: "Nissan R35", price: 300000, speed: 98, accel: 95, baseBullets: 120 },
  { id: 8, name: "Lamborghini Huracán", price: 400000, speed: 99, accel: 97, baseBullets: 160 },
  { id: 9, name: "Bugatti Veyron", price: 2000000, speed: 100, accel: 98, baseBullets: 200 },
  { id: 10, name: "Ferrari LaFerrari", price: 5000000, speed: 100, accel: 100, baseBullets: 220 }
] as const;

export const GUNS = [
  { id: 0, name: "Röhm RG-14", price: 500, divisor: 1 },
  { id: 1, name: "MP-25", price: 2500, divisor: 1.5 },
  { id: 2, name: "MAC-10", price: 10000, divisor: 2 },
  { id: 3, name: "Beretta 92", price: 25000, divisor: 2.5 },
  { id: 4, name: "Colt 1911", price: 100000, divisor: 3 },
  { id: 5, name: "Colt Model 1921A", price: 250000, divisor: 3.5 },
  { id: 6, name: "AK-47", price: 750000, divisor: 4 },
  { id: 7, name: ".44 Magnum", price: 2000000, divisor: 4.5 },
  { id: 8, name: "Barrett .50 Cal", price: 5000000, divisor: 5 }
] as const;

export const PROTECTION = [
  { id: 0, name: "Potato Sack", price: 1000, multiplier: 1 },
  { id: 1, name: "Surplus Vest Model-1", price: 5000, multiplier: 1.5 },
  { id: 2, name: "Standard Issue V-20", price: 20000, multiplier: 2 },
  { id: 3, name: "Urban Guard MK-III", price: 50000, multiplier: 2.5 },
  { id: 4, name: "Tactical Defence T-45", price: 150000, multiplier: 3 },
  { id: 5, name: "Military Grade M-70", price: 500000, multiplier: 3.5 },
  { id: 6, name: "Advanced Protection AP-90", price: 1250000, multiplier: 4 },
  { id: 7, name: "Elite Guard EG-120", price: 3000000, multiplier: 4.5 },
  { id: 8, name: "Fortress F-500", price: 7500000, multiplier: 5 }
] as const;

export const GAME_CONFIG = {
  STARTING_MONEY: 1000,
  STARTING_RESPECT: 0,
  JAIL_TIME_BASE: 300, // 5 minutes base jail time
  TRAVEL_COST_BASE: 1000,
  TRAVEL_TIME: 60, // 1 minute
  STARTING_BULLETS: 0,
  STARTING_SWISS_BANK: 0,
  BULLETS_ON_RANKUP: 1337,
  SEARCH_TIME: 10800, // 3 hours in seconds
  SEARCH_RESULT_VALID_TIME: 3600, // 1 hour in seconds
  MAX_CONCURRENT_SEARCHES: 250,
  CAR_MELT_COOLDOWN: 300, // 5 minutes in seconds
  CAR_DAMAGE_PER_TRAVEL: 5, // 5% damage per travel
  BULLET_FACTORY_PRODUCTION_PER_DAY: 3600,
  BULLET_FACTORY_OWNER_PERCENTAGE: 60, // 60% to owner, 40% to city store
} as const;

export const RANK_DIFFERENCE_MULTIPLIERS = {
  0: 5,     // Same rank
  1: 4,     // 1 rank difference
  2: 3.5,   // 2 rank difference
  3: 3,     // 3 rank difference
  4: 2.5,   // 4 rank difference
  5: 2,     // 5 rank difference
  6: 1.75,  // 6 rank difference
  7: 1.5,   // 7 rank difference
  8: 1.25,  // 8 rank difference
  9: 1.1,   // 9 rank difference
  10: 1,    // 10+ rank difference
} as const;

export const CRIME_OUTCOMES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  JAIL: 'jail'
} as const;

export type CrimeOutcome = typeof CRIME_OUTCOMES[keyof typeof CRIME_OUTCOMES];
export type RankType = typeof RANKS[number];
export type CityType = typeof CITIES[number];
export type CrimeType = typeof CRIMES[number];
export type CarType = typeof CARS[number];
export type GunType = typeof GUNS[number];
export type ProtectionType = typeof PROTECTION[number];