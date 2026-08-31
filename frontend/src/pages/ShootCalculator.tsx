import { useMemo, useState } from 'react';
import { GUNS, PROTECTION, RANKS } from '../../../shared/constants';
import { calculateBulletKillCost } from '../../../shared/bullets';
import { useGameStore } from '../store/gameStore';

const ShootCalculator = () => {
  const { player } = useGameStore();
  const [attackerRank, setAttackerRank] = useState(player?.rank ?? 0);
  const [targetRank, setTargetRank] = useState(10);
  const [gunId, setGunId] = useState<number | null>(player?.gunId ?? null);
  const [protectionId, setProtectionId] = useState<number | null>(null);

  const bullets = useMemo(() => calculateBulletKillCost({ attackerRank, targetRank, gunId, protectionId }), [attackerRank, targetRank, gunId, protectionId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-mafia-red uppercase tracking-[0.2em] text-sm font-semibold">Combat Intel</p>
      <h1 className="text-3xl font-bold mt-1">Shoot Calculator</h1>
      <p className="text-mafia-gray-400 mt-2">Uses the same rank, weapon and protection multipliers as the kill system.</p>

      <div className="mt-8 rounded-xl border border-mafia-gray-700 bg-mafia-gray-800 p-6 grid gap-5 md:grid-cols-2">
        <label className="space-y-2"><span className="text-sm text-mafia-gray-400">Your rank</span><select value={attackerRank} onChange={(e) => setAttackerRank(Number(e.target.value))} className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2">{RANKS.map((r) => <option key={r.id} value={r.id}>{r.id}. {r.name}</option>)}</select></label>
        <label className="space-y-2"><span className="text-sm text-mafia-gray-400">Target rank</span><select value={targetRank} onChange={(e) => setTargetRank(Number(e.target.value))} className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2">{RANKS.map((r) => <option key={r.id} value={r.id}>{r.id}. {r.name}</option>)}</select></label>
        <label className="space-y-2"><span className="text-sm text-mafia-gray-400">Your gun</span><select value={gunId ?? ''} onChange={(e) => setGunId(e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2"><option value="">No gun</option>{GUNS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label className="space-y-2"><span className="text-sm text-mafia-gray-400">Target protection</span><select value={protectionId ?? ''} onChange={(e) => setProtectionId(e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-2"><option value="">No protection</option>{PROTECTION.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>

      <div className="mt-6 rounded-xl border border-mafia-red/40 bg-mafia-gray-800 p-6 text-center">
        <div className="text-sm uppercase tracking-wider text-mafia-gray-400">Bullets required</div>
        <div className="text-5xl font-black mt-2">{bullets.toLocaleString()}</div>
      </div>
    </div>
  );
};

export default ShootCalculator;
