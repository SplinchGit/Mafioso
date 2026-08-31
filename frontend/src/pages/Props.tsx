import { useCallback, useEffect, useMemo, useState } from 'react';
import { CITIES } from '../../../shared/constants';
import {
  CHOP_SHOP_BULLETS_PER_DAY,
  CityProp,
  DEFAULT_BULLET_PRICE,
  DEFAULT_MAX_BET,
  PROPS,
  PropType,
  isHouseGameType,
} from '../../../shared/props';
import { useGameStore } from '../store/gameStore';

interface CityPropsResponse {
  success: boolean;
  cityId: number;
  props: CityProp[];
  error?: string;
}

const Props = () => {
  const { player } = useGameStore();
  const [props, setProps] = useState<CityProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<PropType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const city = useMemo(() => player ? CITIES[player.city] : null, [player]);

  const loadProps = useCallback(async () => {
    if (!player) return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setLoading(true);
    try {
      await fetch('/api/props/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'cleanup_dead_props' }),
      });

      const response = await fetch(`/api/props?cityId=${player.city}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: CityPropsResponse = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load props');
      setProps(data.props);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load props');
    } finally {
      setLoading(false);
    }
  }, [player]);

  useEffect(() => { loadProps(); }, [loadProps]);

  const postAction = async (body: Record<string, unknown>) => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required');
    const response = await fetch('/api/props/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Action failed');
    return data;
  };

  const runAction = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setMessage(null);
    try {
      const data = await postAction(body);
      setMessage(data.message || 'Done');
      await loadProps();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const claimProp = async (type: PropType) => {
    if (!player) return;
    setClaiming(type);
    setMessage(null);
    try {
      const data = await postAction({ cityId: player.city, type });
      setMessage(data.message || 'Prop claimed');
      await loadProps();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to claim prop');
    } finally {
      setClaiming(null);
    }
  };

  const setMaxBet = async (type: PropType) => {
    if (!player || !isHouseGameType(type)) return;
    const maxBet = Number(values[`max:${type}`]);
    await runAction(`max:${type}`, { action: 'set_max_bet', cityId: player.city, type, maxBet });
  };

  const placeBet = async (type: PropType) => {
    if (!player || !isHouseGameType(type)) return;
    const bet = Number(values[`bet:${type}`]);
    await runAction(`bet:${type}`, { action: 'play_house_game', cityId: player.city, type, bet });
  };

  const collectRestaurant = async () => {
    if (!player) return;
    await runAction('restaurant:collect', { action: 'collect_restaurant', cityId: player.city });
  };

  const setBulletPrice = async () => {
    if (!player) return;
    const bulletPrice = Number(values['bullet:price']);
    await runAction('bullet:price', { action: 'set_bullet_price', cityId: player.city, bulletPrice });
  };

  const buyBullets = async () => {
    if (!player) return;
    const quantity = Number(values['bullet:quantity']);
    await runAction('bullet:buy', { action: 'buy_bullets', cityId: player.city, quantity });
  };

  if (!player || !city) return null;
  const propByType = new Map(props.map((prop) => [prop.type, prop]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-mafia-red uppercase tracking-[0.2em] text-sm font-semibold">Your Empire</p>
        <h1 className="text-3xl font-bold mt-1">{city.name} Props</h1>
        <p className="text-mafia-gray-400 mt-2">Five rackets. One of each in every city. Ownership survives travel and only ends on death.</p>
      </div>

      {message && <div className="mb-6 rounded-lg border border-mafia-gray-600 bg-mafia-gray-800 px-4 py-3 text-sm">{message}</div>}

      {loading ? <div className="text-mafia-gray-400">Checking who owns the neighbourhood...</div> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PROPS.map((definition) => {
            const prop = propByType.get(definition.type);
            const owned = Boolean(prop?.ownerId);
            const ownedByYou = prop?.ownerId === player.worldId;
            const crewBossLocked = definition.ownership === 'crew_boss_only' && player.rank < 15;
            const houseGame = isHouseGameType(definition.type);
            const maxBet = prop?.maxBet ?? DEFAULT_MAX_BET;
            const bulletPrice = prop?.bulletPrice ?? DEFAULT_BULLET_PRICE;
            const bulletQuantity = Math.max(0, Math.floor(Number(values['bullet:quantity']) || 0));
            const bulletTotal = bulletQuantity * bulletPrice;

            return (
              <section key={definition.type} className="rounded-xl border border-mafia-gray-700 bg-mafia-gray-800 p-5 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div><div className="text-3xl mb-3">{definition.icon}</div><h2 className="text-xl font-bold">{definition.name}</h2></div>
                  <span className={`text-xs uppercase tracking-wider px-2 py-1 rounded ${owned ? 'bg-mafia-gray-700 text-mafia-gray-300' : 'bg-green-900/40 text-green-300'}`}>{owned ? 'Owned' : 'Available'}</span>
                </div>

                <p className="text-mafia-gray-400 text-sm mt-3 min-h-10">{definition.description}</p>

                <div className="mt-5 border-t border-mafia-gray-700 pt-4 space-y-4">
                  {owned ? (
                    <>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-mafia-gray-500">Owner</div>
                        <div className="font-semibold mt-1">{ownedByYou ? 'You' : prop?.ownerUsername || 'Unknown Mafioso'}</div>
                      </div>

                      {definition.type === 'restaurant' && (
                        <div className="space-y-3">
                          <div className="text-sm text-mafia-gray-400">Till: ${(prop?.storedIncome || 0).toLocaleString()}</div>
                          {ownedByYou && (
                            <button onClick={collectRestaurant} disabled={busy !== null} className="w-full rounded bg-mafia-red px-3 py-2 font-semibold disabled:opacity-50">Collect Income</button>
                          )}
                        </div>
                      )}

                      {definition.type === 'chop_shop' && (
                        <div className="space-y-4 rounded-lg border border-mafia-gray-700 bg-mafia-gray-900/40 p-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.15em] text-mafia-gray-500">Bullet Exchange</div>
                            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                              <div><span className="text-mafia-gray-500">Production</span><div className="font-semibold">{CHOP_SHOP_BULLETS_PER_DAY.toLocaleString()}/day</div></div>
                              <div><span className="text-mafia-gray-500">In stock</span><div className="font-semibold">{(prop?.storedBullets || 0).toLocaleString()}</div></div>
                              <div><span className="text-mafia-gray-500">Price</span><div className="font-semibold">${bulletPrice.toLocaleString()} each</div></div>
                              {ownedByYou && <div><span className="text-mafia-gray-500">Sales</span><div className="font-semibold text-money">${(prop?.salesRevenue || 0).toLocaleString()}</div></div>}
                            </div>
                          </div>

                          {ownedByYou ? (
                            <div className="space-y-2">
                              <div className="text-xs uppercase tracking-wider text-mafia-gray-500">Set sale price</div>
                              <div className="flex gap-2">
                                <input type="number" min="1" placeholder={String(bulletPrice)} value={values['bullet:price'] ?? ''} onChange={(e) => setValues((v) => ({ ...v, 'bullet:price': e.target.value }))} className="min-w-0 flex-1 rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2" />
                                <button onClick={setBulletPrice} disabled={busy !== null} className="rounded bg-mafia-red px-3 py-2 font-semibold disabled:opacity-50">Set Price</button>
                              </div>
                              <div className="text-xs text-mafia-gray-500">Players buy this stock here; sale cash goes directly to you.</div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <input type="number" min="1" max={prop?.storedBullets || undefined} placeholder="Bullets" value={values['bullet:quantity'] ?? ''} onChange={(e) => setValues((v) => ({ ...v, 'bullet:quantity': e.target.value }))} className="min-w-0 flex-1 rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2" />
                                <button onClick={buyBullets} disabled={busy !== null || bulletQuantity < 1} className="rounded bg-mafia-red px-3 py-2 font-semibold disabled:opacity-50">Buy</button>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-mafia-gray-500">Total</span>
                                <span className="font-bold text-money">${bulletTotal.toLocaleString()}</span>
                              </div>
                              <div className="text-xs text-mafia-gray-500">Your cash: ${player.money.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {houseGame && (
                        <div className="space-y-3">
                          <div className="text-sm text-mafia-gray-400">Max bet: ${maxBet.toLocaleString()}</div>
                          {ownedByYou ? (
                            <div className="flex gap-2">
                              <input type="number" min="1" placeholder={String(maxBet)} value={values[`max:${definition.type}`] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [`max:${definition.type}`]: e.target.value }))} className="min-w-0 flex-1 rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2" />
                              <button onClick={() => setMaxBet(definition.type)} disabled={busy !== null} className="rounded bg-mafia-red px-3 py-2 font-semibold disabled:opacity-50">Set</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input type="number" min="1" max={maxBet} placeholder="Bet" value={values[`bet:${definition.type}`] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [`bet:${definition.type}`]: e.target.value }))} className="min-w-0 flex-1 rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2" />
                              <button onClick={() => placeBet(definition.type)} disabled={busy !== null} className="rounded bg-mafia-red px-3 py-2 font-semibold disabled:opacity-50">Bet</button>
                            </div>
                          )}
                        </div>
                      )}

                      {definition.type === 'pool_hall' && (
                        <div className="text-sm text-mafia-gray-400">Pool wagers are next: the hall is owned and ready for the PvP match layer.</div>
                      )}
                    </>
                  ) : crewBossLocked ? (
                    <div className="text-amber-300 text-sm">Crew bosses only — Faction Boss rank required.</div>
                  ) : (
                    <button onClick={() => claimProp(definition.type)} disabled={claiming !== null} className="w-full rounded-lg bg-mafia-red px-4 py-2 font-semibold text-white transition-opacity disabled:opacity-50">{claiming === definition.type ? 'Taking over...' : `Claim ${definition.name}`}</button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Props;
