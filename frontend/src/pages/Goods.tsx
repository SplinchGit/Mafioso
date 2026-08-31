import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARS, CITIES, CREW_CONFIG, GAME_CONFIG, GOODS, RANKS, getGoodsCapacity } from '../../../shared/constants';
import type { GoodId } from '../../../shared/constants';
import type { CrewStatusResponse, GoodsInventory } from '../../../shared/types';
import { apiFetch } from '../utils/api';

const EMPTY_INVENTORY: GoodsInventory = {
  booze: 0,
  prozac: 0,
  weed: 0,
  crystal: 0,
  fashion: 0
};

const INITIAL_QUANTITIES: Record<GoodId, string> = {
  booze: '1',
  prozac: '1',
  weed: '1',
  crystal: '1',
  fashion: '1'
};

const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

const formatDuration = (seconds: number) => {
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
};

const Goods = () => {
  const { player, tradeGoods, isLoading } = useGameStore();
  const [crewStatus, setCrewStatus] = useState<CrewStatusResponse | null>(null);
  const [comparisonCity, setComparisonCity] = useState(player?.city ?? 0);
  const [destinationCity, setDestinationCity] = useState(((player?.city ?? 0) + 1) % CITIES.length);
  const [quantities, setQuantities] = useState(INITIAL_QUANTITIES);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!player?.crewId) { setCrewStatus(null); return; }
    apiFetch('/crew/status').then(async (response) => {
      if (response.ok) setCrewStatus(await response.json());
    }).catch(() => undefined);
  }, [player?.crewId]);

  if (!player) return null;

  const inventory = player.goods ?? EMPTY_INVENTORY;
  const usedCapacity = GOODS.reduce((total, good) => total + (inventory[good.id] ?? 0), 0);
  const currentRank = RANKS[player.rank] ?? RANKS[0];
  const cargoCapacity = getGoodsCapacity(player.rank, player.crewRole, crewStatus?.gabbagoolActive ?? false);
  const freeCapacity = cargoCapacity - usedCapacity;
  const currentCity = CITIES[player.city];
  const activeCar = player.cars.find((car) => car.id === player.activeCar);
  const activeCarInfo = activeCar ? CARS[activeCar.carType] : null;
  const routeTravelTime = activeCarInfo?.travelTimeSeconds ?? GAME_CONFIG.TRAVEL_TIME;
  const travelRemaining = Math.max(0, (player.travelUntil ? Date.parse(player.travelUntil) : 0) - now);
  const isTravelling = travelRemaining > 0;
  const bestReturnGood = GOODS.reduce((best, candidate) => {
    const bestSpread = best.prices[comparisonCity] - best.prices[destinationCity];
    const candidateSpread = candidate.prices[comparisonCity] - candidate.prices[destinationCity];
    return candidateSpread > bestSpread ? candidate : best;
  });
  const bestReturnSpread = Math.max(
    0,
    bestReturnGood.prices[comparisonCity] - bestReturnGood.prices[destinationCity]
  );

  const quantityFor = (goodId: GoodId) => {
    const quantity = Number.parseInt(quantities[goodId], 10);
    return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
  };

  const setQuantity = (goodId: GoodId, quantity: number | string) => {
    setQuantities((current) => ({ ...current, [goodId]: String(quantity) }));
  };

  const handleTrade = async (goodId: GoodId, action: 'buy' | 'sell') => {
    const quantity = quantityFor(goodId);
    if (!quantity) return;

    setNotice(null);
    const result = await tradeGoods(goodId, action, quantity);
    if (result) {
      setNotice(result.message);
      setQuantity(goodId, 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-mafia-gold mb-2">
            The Five-City Exchange
          </p>
          <h1 className="text-4xl font-bold text-mafia-red mb-2">📦 Goods Running</h1>
          <p className="text-mafia-gray-400 text-lg max-w-2xl">
            Buy low, travel, and sell high. Every product has one strongest route hidden in the market sheet.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 rounded-lg border border-mafia-red bg-mafia-red/10 px-4 py-3">
          <span className="text-3xl">{currentCity.flag}</span>
          <div>
            <div className="text-xs uppercase tracking-wider text-mafia-gray-400">Trading in</div>
            <div className="font-bold text-white">{currentCity.name}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
        <div className="card-mafia">
          <div className="text-sm text-mafia-gray-400">Cash available</div>
          <div className="mt-1 text-2xl text-money">{formatMoney(player.money)}</div>
        </div>
        <div className="card-mafia">
          <div className="text-sm text-mafia-gray-400">Cargo used</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {usedCapacity} <span className="text-base text-mafia-gray-400">/ {cargoCapacity}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mafia-gray-700">
            <div
              className="h-full rounded-full bg-mafia-red transition-all"
              style={{ width: `${Math.min(100, (usedCapacity / cargoCapacity) * 100)}%` }}
            />
          </div>
        </div>
        <div className="card-mafia">
          <div className="text-sm text-mafia-gray-400">Cargo space</div>
          <div className="mt-1 text-2xl font-bold text-mafia-gold">{freeCapacity} units free</div>
          <div className="mt-1 text-xs text-mafia-gray-400">
            {currentRank.name} capacity
            {player.crewRole === 'member' && ` · +25% crew${crewStatus?.gabbagoolActive ? ' · +12.5% Gabbagool' : ''}`}
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-300">
          {notice}
        </div>
      )}

      {isTravelling && (
        <div className="mb-6 rounded-lg border border-mafia-gold/50 bg-mafia-gold/10 px-4 py-3 text-mafia-gold">
          Market trading unlocks when your journey finishes in {formatDuration(Math.ceil(travelRemaining / 1000))}.
        </div>
      )}

      <section className="card-mafia mb-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Market sheet</h2>
            <p className="mt-1 text-sm text-mafia-gray-400">
              Smaller figures show the profit or loss per unit against your selected departure city.
            </p>
          </div>
          <label className="text-sm text-mafia-gray-400">
            Compare from
            <select
              value={comparisonCity}
              onChange={(event) => setComparisonCity(Number(event.target.value))}
              className="ml-3 rounded-lg border border-mafia-gray-600 bg-mafia-gray-700 px-3 py-2 font-semibold text-white"
            >
              {CITIES.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-mafia-gray-600 text-xs uppercase tracking-wider text-mafia-gray-400">
                <th className="px-3 py-3">Product</th>
                {CITIES.map((city) => (
                  <th
                    key={city.id}
                    className={`px-3 py-3 text-right ${city.id === player.city ? 'bg-mafia-red/10 text-mafia-gold' : ''}`}
                  >
                    <span className="mr-2">{city.flag}</span>{city.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GOODS.map((good) => {
                const departurePrice = good.prices[comparisonCity];
                return (
                  <tr key={good.id} className="border-b border-mafia-gray-700 last:border-0">
                    <th className="px-3 py-4">
                      <div className="font-bold text-white"><span className="mr-2">{good.icon}</span>{good.name}</div>
                      <div className="mt-1 text-xs font-normal text-mafia-gray-400">{good.description}</div>
                    </th>
                    {CITIES.map((city) => {
                      const price = good.prices[city.id];
                      const spread = price - departurePrice;
                      return (
                        <td
                          key={city.id}
                          className={`px-3 py-4 text-right ${city.id === player.city ? 'bg-mafia-red/10' : ''}`}
                        >
                          <div className="font-mono font-bold text-white">{formatMoney(price)}</div>
                          {city.id === comparisonCity ? (
                            <div className="mt-1 text-xs font-bold uppercase text-mafia-gray-500">Base</div>
                          ) : (
                            <div className={`mt-1 text-xs font-bold ${spread > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {spread > 0 ? '+' : ''}{formatMoney(spread)} / unit
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-mafia mb-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Route economics</h2>
            <p className="mt-1 text-sm text-mafia-gray-400">
              Test a city pair. Net figures include the {formatMoney(GAME_CONFIG.TRAVEL_COST_BASE)} travel charge.
              Hourly pace includes the best available return load and both travel charges.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-sm text-mafia-gray-400">
              Buy in
              <select
                value={comparisonCity}
                onChange={(event) => setComparisonCity(Number(event.target.value))}
                className="ml-2 rounded-lg border border-mafia-gray-600 bg-mafia-gray-700 px-3 py-2 font-semibold text-white"
              >
                {CITIES.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </label>
            <label className="text-sm text-mafia-gray-400">
              Sell in
              <select
                value={destinationCity}
                onChange={(event) => setDestinationCity(Number(event.target.value))}
                className="ml-2 rounded-lg border border-mafia-gray-600 bg-mafia-gray-700 px-3 py-2 font-semibold text-white"
              >
                {CITIES.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-mafia-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-mafia-gray-400">Vehicle</div>
            <div className="mt-1 font-bold text-white">{activeCarInfo?.name ?? 'No active car'}</div>
          </div>
          <div className="rounded-lg bg-mafia-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-mafia-gray-400">Travel time</div>
            <div className="mt-1 font-bold text-mafia-gold">{formatDuration(routeTravelTime)}</div>
          </div>
          <div className="rounded-lg bg-mafia-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-mafia-gray-400">Full cargo</div>
            <div className="mt-1 font-bold text-white">{cargoCapacity} units</div>
          </div>
          <div className="rounded-lg bg-mafia-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-mafia-gray-400">Best return load</div>
            <div className="mt-1 font-bold text-white">
              {bestReturnSpread > 0 ? `${bestReturnGood.name} (+${formatMoney(bestReturnSpread)})` : 'Travel empty'}
            </div>
          </div>
        </div>

        {comparisonCity === destinationCity ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-300">
            Choose two different cities to calculate a run.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-mafia-gray-600 text-xs uppercase tracking-wider text-mafia-gray-400">
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Buy</th>
                  <th className="px-3 py-3 text-right">Sell</th>
                  <th className="px-3 py-3 text-right">Spread</th>
                  <th className="px-3 py-3 text-right">Break-even</th>
                  <th className="px-3 py-3 text-right">Full-load net</th>
                  <th className="px-3 py-3 text-right">Your hourly</th>
                </tr>
              </thead>
              <tbody>
                {GOODS.map((good) => {
                  const buyPrice = good.prices[comparisonCity];
                  const sellPrice = good.prices[destinationCity];
                  const spread = sellPrice - buyPrice;
                  const breakEven = spread > 0
                    ? Math.floor(GAME_CONFIG.TRAVEL_COST_BASE / spread) + 1
                    : null;
                  const fullLoadNet = spread * cargoCapacity - GAME_CONFIG.TRAVEL_COST_BASE;
                  const roundTripNet = (
                    (spread + bestReturnSpread) * cargoCapacity
                    - (GAME_CONFIG.TRAVEL_COST_BASE * 2)
                  );
                  const hourlyNet = Math.floor(roundTripNet * (3600 / (routeTravelTime * 2)));
                  const playerHourly = player.crewRole === 'member'
                    ? hourlyNet - Math.floor(Math.max(0, hourlyNet) * CREW_CONFIG.BOSS_KICKBACK_RATE)
                    : hourlyNet;
                  return (
                    <tr key={good.id} className="border-b border-mafia-gray-700 last:border-0">
                      <th className="px-3 py-4 font-bold text-white"><span className="mr-2">{good.icon}</span>{good.name}</th>
                      <td className="px-3 py-4 text-right font-mono text-white">{formatMoney(buyPrice)}</td>
                      <td className="px-3 py-4 text-right font-mono text-white">{formatMoney(sellPrice)}</td>
                      <td className={`px-3 py-4 text-right font-bold ${spread > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {spread > 0 ? '+' : ''}{formatMoney(spread)}
                      </td>
                      <td className="px-3 py-4 text-right text-mafia-gray-300">
                        {breakEven && breakEven <= cargoCapacity ? `${breakEven} units` : 'No profit'}
                      </td>
                      <td className={`px-3 py-4 text-right font-bold ${fullLoadNet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fullLoadNet > 0 ? '+' : ''}{formatMoney(fullLoadNet)}
                      </td>
                      <td className={`px-3 py-4 text-right font-bold ${playerHourly > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {playerHourly > 0 ? '+' : ''}{formatMoney(playerHourly)}
                        {player.crewRole === 'member' && <div className="text-xs font-normal text-mafia-gray-400">after 10% boss kickback</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">Local trade desk</h2>
          <p className="mt-1 text-sm text-mafia-gray-400">All trades clear at the current {currentCity.name} price.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {GOODS.map((good) => {
            const price = good.prices[player.city];
            const quantity = quantityFor(good.id);
            const held = inventory[good.id] ?? 0;
            const maxBuy = Math.max(0, Math.min(freeCapacity, Math.floor(player.money / price)));
            const canBuy = quantity > 0 && quantity <= maxBuy;
            const canSell = quantity > 0 && quantity <= held;

            return (
              <article key={good.id} className="card-mafia">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="text-4xl">{good.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{good.name}</h3>
                      <p className="text-sm text-mafia-gray-400">{good.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl text-money">{formatMoney(price)}</div>
                    <div className="text-xs text-mafia-gray-400">per unit</div>
                  </div>
                </div>

                <div className="my-5 grid grid-cols-2 gap-3 rounded-lg bg-mafia-gray-700 p-3 text-sm">
                  <div>
                    <div className="text-mafia-gray-400">In cargo</div>
                    <div className="font-bold text-white">{held} units</div>
                  </div>
                  <div className="text-right">
                    <div className="text-mafia-gray-400">Trade total</div>
                    <div className="font-bold text-white">{formatMoney(price * quantity)}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1">
                    <input
                      type="number"
                      min="1"
                      max={cargoCapacity}
                      value={quantities[good.id]}
                      onChange={(event) => setQuantity(good.id, event.target.value)}
                      aria-label={`${good.name} quantity`}
                      className="min-w-0 flex-1 rounded-l-lg border border-mafia-gray-600 bg-mafia-gray-700 px-3 py-2 text-white outline-none focus:border-mafia-red"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(good.id, Math.max(maxBuy, held))}
                      className="rounded-r-lg border border-l-0 border-mafia-gray-600 bg-mafia-gray-700 px-3 text-xs font-bold text-mafia-gray-300 hover:text-white"
                    >
                      MAX
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTrade(good.id, 'buy')}
                    disabled={isLoading || isTravelling || !canBuy}
                    className="btn-mafia disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrade(good.id, 'sell')}
                    disabled={isLoading || isTravelling || !canSell}
                    className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sell
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Goods;
