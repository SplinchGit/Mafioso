import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { GUNS, PROTECTION, RANK_DIFFERENCE_MULTIPLIERS } from '../../../shared/constants';

const Shoot = () => {
  const { player, searchPlayer, shootPlayer, cancelSearch, isLoading } = useGameStore();
  const [targetUsername, setTargetUsername] = useState('');
  const [searchTimeRemaining, setSearchTimeRemaining] = useState(0);

  if (!player) return null;

  const playerGun = player.gunId !== undefined ? GUNS[player.gunId] : null;
  const isSearching = player.searchingFor && new Date(player.searchingFor.searchEndTime) > new Date();
  const searchComplete = player.searchingFor && new Date(player.searchingFor.searchEndTime) <= new Date();

  // Update search countdown timer
  useEffect(() => {
    if (!isSearching || !player.searchingFor) return;

    const interval = setInterval(() => {
      const endTime = new Date(player.searchingFor!.searchEndTime).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, endTime - now);
      setSearchTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching, player.searchingFor]);

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateBulletsNeeded = (targetRank: number = 0, targetProtection: number = 0) => {
    let bullets = 1000;
    
    // Apply rank difference multiplier
    const rankDiff = Math.abs(player.rank - targetRank);
    const multiplierKey = Math.min(rankDiff, 10) as keyof typeof RANK_DIFFERENCE_MULTIPLIERS;
    bullets *= RANK_DIFFERENCE_MULTIPLIERS[multiplierKey];
    
    // Apply target protection
    if (targetProtection >= 0 && targetProtection < PROTECTION.length) {
      bullets *= PROTECTION[targetProtection].multiplier;
    }
    
    // Apply gun divisor
    if (playerGun) {
      bullets /= playerGun.divisor;
    }
    
    return Math.ceil(bullets);
  };

  const handleStartSearch = async () => {
    if (!targetUsername.trim()) return;
    const success = await searchPlayer(targetUsername.trim());
    if (success) {
      setTargetUsername('');
    }
  };

  const handleCancelSearch = async () => {
    await cancelSearch();
  };

  const handleShoot = async () => {
    await shootPlayer();
  };

  const canShoot = searchComplete && player.searchingFor && playerGun;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-mafia-red mb-2">🎯 Shooting Range</h1>
        <p className="text-mafia-gray-400 text-lg">
          Hunt down your enemies and eliminate the competition
        </p>
      </div>

      {/* Current Equipment */}
      <div className="card-mafia mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Your Arsenal</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gun */}
          <div className="bg-mafia-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">🔫 Weapon</h3>
            {playerGun ? (
              <div>
                <div className="text-mafia-gold font-semibold">{playerGun.name}</div>
                <div className="text-sm text-mafia-gray-400">Damage: ÷{playerGun.divisor}</div>
              </div>
            ) : (
              <div className="text-mafia-gray-400">No weapon equipped</div>
            )}
          </div>

          {/* Bullets */}
          <div className="bg-mafia-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">🔴 Bullets</h3>
            <div className="text-mafia-gold font-semibold text-xl">{player.bullets}</div>
            <div className="text-sm text-mafia-gray-400">Available ammunition</div>
          </div>

          {/* Stats */}
          <div className="bg-mafia-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">📊 Kill Stats</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-mafia-gray-400">Kills:</span>
                <span className="text-white font-semibold">{player.kills}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mafia-gray-400">Deaths:</span>
                <span className="text-white font-semibold">{player.deaths}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="card-mafia mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">🔍 Target Search</h2>
        
        {!isSearching && !searchComplete ? (
          <div>
            <p className="text-mafia-gray-400 mb-4">
              Hire a private investigator to locate your target. Search takes exactly 3 hours.
            </p>
            
            <div className="flex space-x-4">
              <input
                type="text"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="Enter target username"
                className="flex-1 bg-mafia-gray-700 text-white border border-mafia-gray-600 rounded px-4 py-2 focus:outline-none focus:border-mafia-red"
                disabled={isLoading}
              />
              <button
                onClick={handleStartSearch}
                disabled={isLoading || !targetUsername.trim()}
                className="btn-mafia px-6"
              >
                {isLoading ? 'Searching...' : 'Start Search'}
              </button>
            </div>
          </div>
        ) : isSearching ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🕵️‍♂️</div>
            <h3 className="text-xl font-bold text-white mb-2">Searching for {player.searchingFor?.targetUsername}...</h3>
            <div className="text-3xl font-bold text-mafia-red mb-4">
              {formatTime(searchTimeRemaining)}
            </div>
            <p className="text-mafia-gray-400 mb-6">
              Your private investigator is tracking down the target. This cannot be rushed.
            </p>
            <button
              onClick={handleCancelSearch}
              disabled={isLoading}
              className="btn-secondary"
            >
              Cancel Search
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-mafia-gold mb-2">Target Located!</h3>
            <p className="text-white mb-4">
              Your PI found <strong>{player.searchingFor?.targetUsername}</strong> in <strong>
                {player.searchingFor?.targetCity !== undefined ? `City ${player.searchingFor.targetCity}` : 'Unknown Location'}
              </strong>
            </p>
            <p className="text-mafia-gray-400 text-sm mb-6">
              Search results expire in 1 hour. Act fast!
            </p>
          </div>
        )}
      </div>

      {/* Shooting Section */}
      {canShoot && (
        <div className="card-mafia mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🎯 Take the Shot</h2>
          
          <div className="bg-mafia-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Shot Calculation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-white font-semibold mb-2">Base Requirements</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-mafia-gray-400">Base bullets:</span>
                    <span className="text-white">1,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mafia-gray-400">Rank multiplier:</span>
                    <span className="text-white">×{RANK_DIFFERENCE_MULTIPLIERS[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mafia-gray-400">Target protection:</span>
                    <span className="text-white">×? (hidden)</span>
                  </div>
                  {playerGun && (
                    <div className="flex justify-between">
                      <span className="text-mafia-gray-400">Your gun bonus:</span>
                      <span className="text-mafia-gold">÷{playerGun.divisor}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">Estimated Cost</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-mafia-gray-400">Minimum bullets:</span>
                    <span className="text-white">{calculateBulletsNeeded(player.rank, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mafia-gray-400">Maximum bullets:</span>
                    <span className="text-white">{calculateBulletsNeeded(player.rank, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mafia-gray-400">Your bullets:</span>
                    <span className={player.bullets >= calculateBulletsNeeded(player.rank, 0) ? 'text-mafia-gold' : 'text-blood'}>
                      {player.bullets}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-mafia-red/20 border border-mafia-red rounded p-4 mb-6">
              <h4 className="text-mafia-red font-bold mb-2">⚠️ Warning</h4>
              <ul className="text-sm text-mafia-red space-y-1">
                <li>• This will permanently kill {player.searchingFor?.targetUsername}</li>
                <li>• They will lose all money, respect, rank, and possessions</li>
                <li>• You will steal all their cars</li>
                <li>• Their Swiss Bank money will remain safe</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>

            <button
              onClick={handleShoot}
              disabled={isLoading || player.bullets < calculateBulletsNeeded(player.rank, 0)}
              className="btn-mafia w-full text-lg py-3"
            >
              {isLoading ? 'Taking Shot...' : 
               player.bullets < calculateBulletsNeeded(player.rank, 0) ? 'Not Enough Bullets' :
               `🎯 Eliminate ${player.searchingFor?.targetUsername}`}
            </button>
          </div>
        </div>
      )}

      {/* No Weapon Warning */}
      {!playerGun && (
        <div className="card-mafia">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-xl font-bold text-mafia-red mb-2">No Weapon Equipped</h3>
            <p className="text-mafia-gray-400 mb-6">
              You need to purchase a weapon from the store before you can shoot other players.
            </p>
            <a href="/store" className="btn-mafia">
              Visit Store
            </a>
          </div>
        </div>
      )}

      {/* Shooting Tips */}
      <div className="mt-8">
        <div className="card-mafia">
          <h3 className="text-lg font-bold text-mafia-red mb-4">🎯 Shooting Tips</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-white">
                🔫 <strong>Better guns</strong> reduce bullets needed
              </p>
              <p className="text-white">
                🛡️ <strong>Target protection</strong> increases bullets needed
              </p>
              <p className="text-white">
                📊 <strong>Rank difference</strong> affects bullet calculation
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-white">
                ⏰ <strong>Search results</strong> expire after 1 hour
              </p>
              <p className="text-white">
                🚗 <strong>Successful kills</strong> transfer victim's cars to you
              </p>
              <p className="text-white">
                🏦 <strong>Swiss Bank funds</strong> are never lost on death
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shoot;