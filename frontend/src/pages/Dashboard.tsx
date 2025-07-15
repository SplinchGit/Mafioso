import { useGameStore } from '../store/gameStore';
import { CITIES, RANKS, CARS } from '../../../shared/constants.ts';

const Dashboard = () => {
  const { player } = useGameStore();

  if (!player) return null;

  const currentCity = CITIES[player.city];
  const currentRank = RANKS[player.rank];
  const nextRank = RANKS[player.rank + 1];
  const playerCar = player.carId !== undefined ? CARS[player.carId] : null;

  const rankProgress = nextRank 
    ? (player.respect / nextRank.requiredRespect) * 100 
    : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-mafia-red mb-2">
          Welcome back, {player.username}
        </h1>
        <p className="text-mafia-gray-400 text-lg">
          {currentRank.name} operating in {currentCity.name} {currentCity.flag}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Money Card */}
        <div className="card-mafia">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">💰 Cash</h3>
              <p className="text-money text-2xl font-mono font-bold">
                ${player.money.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl opacity-50">💵</div>
          </div>
        </div>

        {/* Respect Card */}
        <div className="card-mafia">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">⭐ Respect</h3>
              <p className="text-mafia-gold text-2xl font-bold">
                {player.respect.toLocaleString()}
              </p>
              {nextRank && (
                <div className="mt-2">
                  <div className="text-xs text-mafia-gray-400 mb-1">
                    Progress to {nextRank.name}
                  </div>
                  <div className="w-full bg-mafia-gray-700 rounded-full h-2">
                    <div 
                      className="bg-mafia-gold h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(rankProgress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-mafia-gray-400 mt-1">
                    {(nextRank.requiredRespect - player.respect).toLocaleString()} more needed
                  </div>
                </div>
              )}
            </div>
            <div className="text-4xl opacity-50">👑</div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Status */}
        <div className="card-mafia">
          <h3 className="text-xl font-bold text-mafia-red mb-4">🎯 Current Status</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-mafia-gray-400">Rank:</span>
              <span className="text-white font-semibold">{currentRank.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-mafia-gray-400">Location:</span>
              <span className="text-white font-semibold">
                {currentCity.name} {currentCity.flag}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-mafia-gray-400">Vehicle:</span>
              <span className="text-white font-semibold">
                {playerCar ? playerCar.name : 'None'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-mafia-gray-400">Crimes Committed:</span>
              <span className="text-white font-semibold">
                {player.stats.crimesCommitted}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-mafia-gray-400">Success Rate:</span>
              <span className="text-white font-semibold">
                {player.stats.crimesCommitted > 0 
                  ? Math.round((player.stats.crimesSuccessful / player.stats.crimesCommitted) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-mafia">
          <h3 className="text-xl font-bold text-mafia-red mb-4">⚡ Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <a 
              href="/crimes" 
              className="btn-mafia text-center py-3 block hover:scale-105 transform transition-all"
            >
              💰 Commit Crime
            </a>
            
            <a 
              href="/travel" 
              className="btn-secondary text-center py-3 block hover:scale-105 transform transition-all"
            >
              ✈️ Travel
            </a>
            
            <a 
              href="/garage" 
              className="btn-secondary text-center py-3 block hover:scale-105 transform transition-all"
            >
              🚗 Garage
            </a>
            
            <button 
              className="btn-secondary py-3 hover:scale-105 transform transition-all"
              disabled
            >
              👥 Gang (Soon)
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-mafia-gray-700 rounded-lg">
            <p className="text-sm text-mafia-gray-400 text-center">
              💡 Tip: Higher ranks unlock more profitable crimes!
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="card-mafia">
          <h3 className="text-xl font-bold text-mafia-red mb-4">📈 Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-money">
                ${player.stats.totalMoneyEarned.toLocaleString()}
              </div>
              <div className="text-xs text-mafia-gray-400">Total Earned</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-mafia-gold">
                {player.stats.totalRespectEarned.toLocaleString()}
              </div>
              <div className="text-xs text-mafia-gray-400">Total Respect</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blood">
                {player.stats.timesJailed}
              </div>
              <div className="text-xs text-mafia-gray-400">Times Jailed</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-mafia-red">
                {player.stats.rankUps}
              </div>
              <div className="text-xs text-mafia-gray-400">Rank Ups</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;