import { CARS, CREW_CONFIG, GAME_CONFIG, GOODS, RANKS, getGoodsCapacity } from '../../shared/constants';

describe('goods-running economy', () => {
  test('keeps the requested product price order in every city', () => {
    for (let city = 0; city < 5; city += 1) {
      const prices = GOODS.map((good) => good.prices[city]);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    }
  });

  test('rank cargo and car travel improve monotonically', () => {
    expect(RANKS[0].cargoCapacity).toBe(100);
    expect(RANKS.at(-1)?.cargoCapacity).toBe(520);
    for (let i = 1; i < RANKS.length; i += 1) {
      expect(RANKS[i].cargoCapacity).toBeGreaterThan(RANKS[i - 1].cargoCapacity);
    }
    for (let i = 1; i < CARS.length; i += 1) {
      expect(CARS[i].travelTimeSeconds).toBeLessThan(CARS[i - 1].travelTimeSeconds);
    }
    expect(CARS.at(-1)?.travelTimeSeconds).toBe(60);
    expect(GAME_CONFIG.TRAVEL_COST_BASE).toBe(0);
  });

  test('tops out at about one million per hour before crew bonuses', () => {
    const capacity = getGoodsCapacity(RANKS.length - 1);
    const tripSeconds = CARS.at(-1)!.travelTimeSeconds;
    let bestHourly = 0;

    for (let from = 0; from < 5; from += 1) {
      for (let to = from + 1; to < 5; to += 1) {
        const outward = Math.max(0, ...GOODS.map((good) => good.prices[to] - good.prices[from]));
        const returning = Math.max(0, ...GOODS.map((good) => good.prices[from] - good.prices[to]));
        const hourly = (outward + returning) * capacity * (3600 / (tripSeconds * 2));
        bestHourly = Math.max(bestHourly, hourly);
      }
    }

    expect(bestHourly).toBe(998_400);
  });

  test('applies crew, Gabbagool, and boss-share settings exactly', () => {
    const rank = RANKS.length - 1;
    expect(getGoodsCapacity(rank, 'member')).toBe(650);
    expect(getGoodsCapacity(rank, 'member', true)).toBe(715);
    expect(CREW_CONFIG.BOSS_KICKBACK_RATE).toBe(0.10);
    expect(CREW_CONFIG.GABBAGOOL_DURATION_SECONDS).toBe(6 * 60 * 60);
    expect(CREW_CONFIG.GABBAGOOL_COOLDOWN_SECONDS).toBe(24 * 60 * 60);
  });
});
