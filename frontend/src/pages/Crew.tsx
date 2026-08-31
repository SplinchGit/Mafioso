import { useCallback, useEffect, useState } from 'react';
import { CREW_CONFIG, RANKS } from '../../../shared/constants';
import type { CrewStatusResponse } from '../../../shared/types';
import { useGameStore } from '../store/gameStore';
import { apiFetch } from '../utils/api';

const Crew = () => {
  const { player, setPlayer, setError } = useGameStore();
  const [status, setStatus] = useState<CrewStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [crewName, setCrewName] = useState('');
  const [crewId, setCrewId] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/crew/status');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load crew');
      setStatus(data);
      setPlayer(data.player);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load crew');
    } finally {
      setLoading(false);
    }
  }, [setError, setPlayer]);

  useEffect(() => { load(); }, [load]);

  const act = async (body: object) => {
    setLoading(true);
    try {
      const response = await apiFetch('/crew/manage', { method: 'POST', body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Crew action failed');
      setStatus(data);
      setPlayer(data.player);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Crew action failed');
    } finally {
      setLoading(false);
    }
  };

  if (!player || loading && !status) return <div className="max-w-7xl mx-auto px-4 py-12 text-mafia-gray-400">Loading crew…</div>;
  const crew = status?.crew;
  const activeUntil = crew?.gabbagoolActiveUntil ? Date.parse(crew.gabbagoolActiveUntil) : 0;
  const lastPurchase = crew?.gabbagoolLastPurchasedAt ? Date.parse(crew.gabbagoolLastPurchasedAt) : 0;
  const nextPurchase = lastPurchase + CREW_CONFIG.GABBAGOOL_COOLDOWN_SECONDS * 1000;
  const canBuy = player.crewRole === 'boss' && Date.now() >= nextPurchase && player.money >= CREW_CONFIG.GABBAGOOL_PRICE;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-mafia-gold mb-2">Strength in numbers</p>
        <h1 className="text-4xl font-bold text-mafia-red mb-2">🤝 Crew</h1>
        <p className="text-mafia-gray-400 text-lg">Members carry 25% more goods and kick 10% of run profits to their boss.</p>
      </div>

      {!crew ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="card-mafia">
            <h2 className="text-2xl font-bold text-white mb-2">Start a crew</h2>
            <p className="text-mafia-gray-400 mb-5">Become the boss and receive member kickbacks.</p>
            <input value={crewName} onChange={(event) => setCrewName(event.target.value)} placeholder="Crew name" className="w-full rounded-lg border border-mafia-gray-600 bg-mafia-gray-700 px-4 py-3 text-white mb-3" />
            <button disabled={loading || crewName.trim().length < 3} onClick={() => act({ action: 'create', name: crewName })} className="btn-mafia w-full disabled:opacity-40">Create Crew</button>
          </section>
          <section className="card-mafia">
            <h2 className="text-2xl font-bold text-white mb-2">Join a crew</h2>
            <p className="text-mafia-gray-400 mb-5">Ask a boss for their Crew ID and six-character join code.</p>
            <input value={crewId} onChange={(event) => setCrewId(event.target.value)} placeholder="Crew ID" className="w-full rounded-lg border border-mafia-gray-600 bg-mafia-gray-700 px-4 py-3 text-white mb-3" />
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Join code" maxLength={6} className="w-full rounded-lg border border-mafia-gray-600 bg-mafia-gray-700 px-4 py-3 text-white mb-3" />
            <button disabled={loading || !crewId.trim() || joinCode.length !== 6} onClick={() => act({ action: 'join', crewId, joinCode })} className="btn-mafia w-full disabled:opacity-40">Join Crew</button>
          </section>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-3">
            <div className="card-mafia"><div className="text-mafia-gray-400 text-sm">Crew</div><div className="text-2xl font-bold text-white mt-1">{crew.name}</div></div>
            <div className="card-mafia"><div className="text-mafia-gray-400 text-sm">Your position</div><div className="text-2xl font-bold text-mafia-gold mt-1">{player.crewRole === 'boss' ? 'Boss' : 'Member'}</div></div>
            <div className="card-mafia"><div className="text-mafia-gray-400 text-sm">Gabbagool</div><div className={`text-2xl font-bold mt-1 ${status.gabbagoolActive ? 'text-green-400' : 'text-mafia-gray-300'}`}>{status.gabbagoolActive ? `Active until ${new Date(activeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Inactive'}</div></div>
          </div>

          {player.crewRole === 'boss' && (
            <section className="card-mafia mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Boss controls</h2>
              <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-2">
                <div className="rounded-lg bg-mafia-gray-700 p-4"><div className="text-xs uppercase text-mafia-gray-400">Crew ID</div><div className="font-mono text-sm text-white mt-1 break-all">{crew.crewId}</div></div>
                <div className="rounded-lg bg-mafia-gray-700 p-4"><div className="text-xs uppercase text-mafia-gray-400">Join code</div><div className="font-mono text-xl font-bold text-mafia-gold mt-1">{crew.joinCode}</div></div>
              </div>
              <div className="rounded-lg border border-mafia-gold/40 bg-mafia-gold/10 p-5 mb-5">
                <h3 className="text-xl font-bold text-mafia-gold">🥩 Gabbagool</h3>
                <p className="text-mafia-gray-300 mt-2">Adds another 12.5% cargo capacity to every member for six hours. Available once every 24 hours.</p>
                <div className="mt-3 font-bold text-money">${CREW_CONFIG.GABBAGOOL_PRICE.toLocaleString()}</div>
                {Date.now() < nextPurchase && <div className="text-sm text-mafia-gray-400 mt-1">Next purchase: {new Date(nextPurchase).toLocaleString()}</div>}
                <button disabled={loading || !canBuy} onClick={() => act({ action: 'buy-gabbagool' })} className="btn-mafia mt-4 disabled:opacity-40">Buy Gabbagool</button>
              </div>
              <button disabled={loading} onClick={() => act({ action: 'disband' })} className="btn-secondary text-red-300">Disband Crew</button>
            </section>
          )}

          <section className="card-mafia">
            <div className="flex items-center justify-between mb-5"><h2 className="text-2xl font-bold text-white">Roster</h2><span className="text-mafia-gray-400">{status.members.length}/{CREW_CONFIG.MAX_MEMBERS}</span></div>
            <div className="space-y-2">
              {status.members.map((member) => <div key={member.userId} className="flex items-center justify-between rounded-lg bg-mafia-gray-700 px-4 py-3"><div><span className="font-bold text-white">{member.username}</span>{member.role === 'boss' && <span className="ml-2 text-xs font-bold text-mafia-gold">BOSS</span>}</div><span className="text-sm text-mafia-gray-400">{RANKS[member.rank]?.name ?? 'Unknown rank'}</span></div>)}
            </div>
            {player.crewRole === 'member' && <button disabled={loading} onClick={() => act({ action: 'leave' })} className="btn-secondary mt-5">Leave Crew</button>}
          </section>
        </>
      )}
    </div>
  );
};

export default Crew;
