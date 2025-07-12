export const RANKS = [
  { id: 0, name: "Beggar", requiredRespect: 0 },
  { id: 1, name: "Bum", requiredRespect: 100 },
  { id: 2, name: "Thief", requiredRespect: 500 },
  { id: 3, name: "Dealer", requiredRespect: 2500 },
  { id: 4, name: "Bookie", requiredRespect: 7500 },
  { id: 5, name: "Thug", requiredRespect: 25000 },
  { id: 6, name: "Killer", requiredRespect: 100000 },
  { id: 7, name: "Bodyguard", requiredRespect: 350000 },
  { id: 8, name: "Smuggler", requiredRespect: 750000 },
  { id: 9, name: "Wheelman", requiredRespect: 2000000 },
  { id: 10, name: "Hitman", requiredRespect: 6500000 },
  { id: 11, name: "Associate", requiredRespect: 25000000 },
  { id: 12, name: "Soldier", requiredRespect: 100000000 },
  { id: 13, name: "Enforcer", requiredRespect: 500000000 },
  { id: 14, name: "Capo", requiredRespect: 1500000000 },
  { id: 15, name: "Underboss", requiredRespect: 10000000000 },
  { id: 16, name: "Consigliere", requiredRespect: 35000000000 },
  { id: 17, name: "Boss", requiredRespect: 100000000000 },
  { id: 18, name: "Godfather", requiredRespect: 500000000000 },
  { id: 19, name: "Mafioso", requiredRespect: 1000000000000 }
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
    baseSuccess: 95,
    basePayout: { min: 50, max: 200 },
    baseRespect: 1,
    requiredRank: 0,
    cooldown: 30, // seconds
    nerve: 1
  },
  {
    id: 1,
    name: "Shoplift",
    description: "Steal small items from stores",
    baseSuccess: 90,
    basePayout: { min: 100, max: 500 },
    baseRespect: 2,
    requiredRank: 0,
    cooldown: 60,
    nerve: 2
  },
  {
    id: 2,
    name: "Mug Someone",
    description: "Rob someone at gunpoint",
    baseSuccess: 85,
    basePayout: { min: 500, max: 2000 },
    baseRespect: 5,
    requiredRank: 2,
    cooldown: 120,
    nerve: 3
  },
  {
    id: 3,
    name: "Break & Enter",
    description: "Rob a house when the owners are away",
    baseSuccess: 75,
    basePayout: { min: 2000, max: 10000 },
    baseRespect: 15,
    requiredRank: 3,
    cooldown: 300,
    nerve: 5
  },
  {
    id: 4,
    name: "Car Theft",
    description: "Steal and sell expensive cars",
    baseSuccess: 70,
    basePayout: { min: 10000, max: 50000 },
    baseRespect: 35,
    requiredRank: 5,
    cooldown: 600,
    nerve: 8
  },
  {
    id: 5,
    name: "Drug Deal",
    description: "Sell drugs on the street",
    baseSuccess: 65,
    basePayout: { min: 25000, max: 100000 },
    baseRespect: 75,
    requiredRank: 7,
    cooldown: 900,
    nerve: 12
  },
  {
    id: 6,
    name: "Armed Robbery",
    description: "Rob a convenience store",
    baseSuccess: 60,
    basePayout: { min: 75000, max: 250000 },
    baseRespect: 150,
    requiredRank: 9,
    cooldown: 1200,
    nerve: 15
  },
  {
    id: 7,
    name: "Kidnapping",
    description: "Kidnap someone for ransom",
    baseSuccess: 50,
    basePayout: { min: 500000, max: 2000000 },
    baseRespect: 500,
    requiredRank: 12,
    cooldown: 1800,
    nerve: 25
  },
  {
    id: 8,
    name: "Bank Heist",
    description: "Rob a major bank",
    baseSuccess: 40,
    basePayout: { min: 2000000, max: 10000000 },
    baseRespect: 1500,
    requiredRank: 15,
    cooldown: 3600,
    nerve: 40
  },
  {
    id: 9,
    name: "Casino Heist",
    description: "Rob a high-end casino",
    baseSuccess: 30,
    basePayout: { min: 10000000, max: 50000000 },
    baseRespect: 5000,
    requiredRank: 17,
    cooldown: 7200,
    nerve: 60
  },
  {
    id: 10,
    name: "Government Heist",
    description: "Rob the federal reserve",
    baseSuccess: 20,
    basePayout: { min: 50000000, max: 500000000 },
    baseRespect: 25000,
    requiredRank: 19,
    cooldown: 14400,
    nerve: 100
  }
] as const;

export const CARS = [
  { id: 0, name: "Fiat 500", price: 15000, speed: 45, accel: 30 },
  { id: 1, name: "Ford Focus", price: 25000, speed: 55, accel: 40 },
  { id: 2, name: "Honda Civic", price: 35000, speed: 65, accel: 50 },
  { id: 3, name: "BMW 3 Series", price: 55000, speed: 75, accel: 65 },
  { id: 4, name: "Audi A4", price: 65000, speed: 80, accel: 70 },
  { id: 5, name: "Mercedes C-Class", price: 75000, speed: 85, accel: 75 },
  { id: 6, name: "Porsche 911", price: 150000, speed: 95, accel: 90 },
  { id: 7, name: "Ferrari 458", price: 300000, speed: 98, accel: 95 },
  { id: 8, name: "Lamborghini Huracán", price: 400000, speed: 99, accel: 97 },
  { id: 9, name: "Bugatti Veyron", price: 2000000, speed: 100, accel: 98 },
  { id: 10, name: "Ferrari LaFerrari", price: 5000000, speed: 100, accel: 100 }
] as const;

export const GAME_CONFIG = {
  STARTING_MONEY: 1000,
  STARTING_RESPECT: 0,
  STARTING_NERVE: 100,
  MAX_NERVE: 100,
  NERVE_REGEN_RATE: 1, // nerve per minute
  JAIL_TIME_BASE: 300, // 5 minutes base jail time
  HOSPITAL_TIME_BASE: 180, // 3 minutes base hospital time
  TRAVEL_COST_BASE: 1000,
  TRAVEL_TIME: 60, // 1 minute
} as const;

export const CRIME_OUTCOMES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  JAIL: 'jail',
  HOSPITAL: 'hospital'
} as const;

export type CrimeOutcome = typeof CRIME_OUTCOMES[keyof typeof CRIME_OUTCOMES];
export type RankType = typeof RANKS[number];
export type CityType = typeof CITIES[number];
export type CrimeType = typeof CRIMES[number];
export type CarType = typeof CARS[number];