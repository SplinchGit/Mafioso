import { useCallback, useEffect, useMemo, useState } from 'react';
import { CITIES } from '../../../shared/constants';
import { CityProp, PROPS, PropType } from '../../../shared/props';
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

  const city = useMemo(() => player ? CITIES[player.city] : null, [player]);

  const loadProps = useCallback(async () => {
    if (!player) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/props?cityId=${player.city}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: CityPropsResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load props');
      }
      setProps(data.props);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load props');
    } finally {
      setLoading(false);
    }
  }, [player]);

  useEffect(() => {
    loadProps();
  }, [loadProps]);

  const claimProp = async (type: PropType) => {
    if (!player) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setClaiming(type);
    setMessage(null);
    try {
      const response = await fetch('/api/props/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cityId: player.city, type }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to claim prop');
      }

      setMessage(data.message || 'Prop claimed');
      await loadProps();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to claim prop');
    } finally {
      setClaiming(null);
    }
  };

  if (!player || !city) return null;

  const propByType = new Map(props.map((prop) => [prop.type, prop]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-mafia-red uppercase tracking-[0.2em] text-sm font-semibold">Your Empire</p>
        <h1 className="text-3xl font-bold mt-1">{city.name} Props</h1>
        <p className="text-mafia-gray-400 mt-2">
          Five rackets. One of each in every city. Own the street, own the money.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-lg border border-mafia-gray-600 bg-mafia-gray-800 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-mafia-gray-400">Checking who owns the neighbourhood...</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PROPS.map((definition) => {
            const prop = propByType.get(definition.type);
            const owned = Boolean(prop?.ownerId);
            const ownedByYou = prop?.ownerId === player.worldId;
            const crewBossLocked = definition.ownership === 'crew_boss_only' && player.rank < 15;

            return (
              <section
                key={definition.type}
                className="rounded-xl border border-mafia-gray-700 bg-mafia-gray-800 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-3xl mb-3">{definition.icon}</div>
                    <h2 className="text-xl font-bold">{definition.name}</h2>
                  </div>
                  <span className={`text-xs uppercase tracking-wider px-2 py-1 rounded ${
                    owned ? 'bg-mafia-gray-700 text-mafia-gray-300' : 'bg-green-900/40 text-green-300'
                  }`}>
                    {owned ? 'Owned' : 'Available'}
                  </span>
                </div>

                <p className="text-mafia-gray-400 text-sm mt-3 min-h-10">{definition.description}</p>

                <div className="mt-5 border-t border-mafia-gray-700 pt-4">
                  {owned ? (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-mafia-gray-500">Owner</div>
                      <div className="font-semibold mt-1">
                        {ownedByYou ? 'You' : prop?.ownerUsername || 'Unknown Mafioso'}
                      </div>
                    </div>
                  ) : crewBossLocked ? (
                    <div className="text-amber-300 text-sm">Crew bosses only — Faction Boss rank required.</div>
                  ) : (
                    <button
                      onClick={() => claimProp(definition.type)}
                      disabled={claiming !== null}
                      className="w-full rounded-lg bg-mafia-red px-4 py-2 font-semibold text-white transition-opacity disabled:opacity-50"
                    >
                      {claiming === definition.type ? 'Taking over...' : `Claim ${definition.name}`}
                    </button>
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
