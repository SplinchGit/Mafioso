import { useCallback, useEffect, useState } from 'react';
import { GAME_CONFIG } from '../../../shared/constants';
import { useGameStore } from '../store/gameStore';
import { apiFetch } from '../utils/api';

interface FactoryStatus {
  cityId: number; cityName: string; cityFlag: string; isOwned: boolean;
  ownerUsername: string | null; isOwnedByPlayer: boolean; bulletsAvailableToCollect: number; cityStoreBullets: number;
}

const BulletFactory = () => {
  const { player, setPlayer } = useGameStore();
  const [factories, setFactories] = useState<FactoryStatus[]>([]);
  const [canTakeover, setCanTakeover] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const response = await apiFetch('/bulletfactory/status'); const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load factories');
    setFactories(data.factories || []); setCanTakeover(Boolean(data.playerCanTakeover));
  }, []);
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);
  if (!player) return null;

  const act = async (path: string, body?: object) => {
    setLoading(true); setNotice('');
    try {
      const response = await apiFetch(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Factory action failed');
      if (data.player) setPlayer(data.player); setNotice(data.message); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Factory action failed'); }
    finally { setLoading(false); }
  };

  return <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="mb-8"><h1 className="text-4xl font-bold text-mafia-red mb-2">🏭 Bullet Factories</h1><p className="text-mafia-gray-400 text-lg">One factory per city. Owners receive {GAME_CONFIG.BULLET_FACTORY_OWNER_PERCENTAGE}% of production.</p></div>
    {notice && <div className="mb-6 rounded-lg border border-mafia-gold/40 bg-mafia-gold/10 px-4 py-3 text-mafia-gold">{notice}</div>}
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{factories.map((factory) => <article key={factory.cityId} className="card-mafia"><div className="text-4xl">{factory.cityFlag}</div><h2 className="mt-2 text-xl font-bold text-white">{factory.cityName}</h2><p className="mt-2 text-mafia-gray-400">{factory.isOwned ? `Owned by ${factory.ownerUsername || 'Unknown'}` : 'Unclaimed factory'}</p><dl className="my-5 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-mafia-gray-400">Owner bullets ready</dt><dd className="text-white">{factory.isOwnedByPlayer ? factory.bulletsAvailableToCollect : '—'}</dd></div><div className="flex justify-between"><dt className="text-mafia-gray-400">City store</dt><dd className="text-white">{factory.cityStoreBullets}</dd></div></dl>{factory.isOwnedByPlayer ? <button disabled={loading || factory.bulletsAvailableToCollect < 1} onClick={() => act('/bulletfactory/collect')} className="btn-mafia w-full disabled:opacity-40">Collect bullets</button> : !factory.isOwned ? <button disabled={loading || !canTakeover} onClick={() => act('/bulletfactory/takeover', { cityId: factory.cityId })} className="btn-mafia w-full disabled:opacity-40">Take over</button> : null}</article>)}</div>
    <div className="card-mafia mt-8 text-sm text-mafia-gray-400">A takeover requires Faction Boss rank or higher and a player may own one factory.</div>
  </div>;
};

export default BulletFactory;
