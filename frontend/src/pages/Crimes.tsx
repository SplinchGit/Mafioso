import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CRIMES, RANKS } from '../../../shared/constants';

const Crimes = () => {
  const { player, commitCrime, isLoading } = useGameStore();
  const [selectedCrime, setSelectedCrime] = useState<number | null>(null);
  const [crimeResult, setCrimeResult] = useState<any>(null);

  if (!player) return null;

  const currentRank = RANKS[player.rank];
  const availableCrimes = CRIMES.filter(crime => crime.requiredRank <= player.rank);

  const handleCommitCrime = async (crimeId: number) => {
    if (!player || player.nerve < CRIMES[crimeId].nerve) return;

    const result = await commitCrime(crimeId);
    if (result) {
      setCrimeResult(result);
      setSelectedCrime(null);
    }
  };

  const getCrimeSuccessChance = (crime: typeof CRIMES[0]) => {
    // Basic calculation - would be more complex in real implementation
    const baseSuccess = crime.baseSuccess;
    const rankBonus = player.rank * 2;
    const nerveBonus = (player.nerve / 100) * 10;
    return Math.min(95, baseSuccess + rankBonus + nerveBonus);
  };

  const canCommitCrime = (crime: typeof CRIMES[0]) => {
    if (player.nerve < crime.nerve) return false;
    if (useGameStore.getState().isInJail() || useGameStore.getState().isInHospital()) return false;
    return true;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-mafia-red mb-2">💰 Crimes</h1>
        <p className="text-mafia-gray-400 text-lg">
          Choose your next criminal activity
        </p>
      </div>

      {/* Player Status */}
      <div className="card-mafia mb-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-white text-xl font-bold">{player.nerve}/100</div>
            <div className="text-mafia-gray-400 text-sm">Nerve</div>
          </div>
          <div>
            <div className="text-mafia-gold text-xl font-bold">{currentRank.name}</div>
            <div className="text-mafia-gray-400 text-sm">Current Rank</div>
          </div>
          <div>
            <div className="text-money text-xl font-bold">
              ${player.money.toLocaleString()}
            </div>
            <div className="text-mafia-gray-400 text-sm">Cash on Hand</div>
          </div>
        </div>
      </div>

      {/* Crime Result Modal */}
      {crimeResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card-mafia max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {crimeResult.success ? '✅ Success!' : '❌ Failed!'}
            </h3>
            
            <p className="text-white mb-4">{crimeResult.message}</p>
            
            {crimeResult.success && (
              <div className="space-y-2 mb-4">
                {crimeResult.moneyGained && (
                  <div className="flex justify-between">
                    <span>Money Gained:</span>
                    <span className="text-money font-bold">
                      +${crimeResult.moneyGained.toLocaleString()}
                    </span>
                  </div>
                )}
                {crimeResult.respectGained && (
                  <div className="flex justify-between">
                    <span>Respect Gained:</span>
                    <span className="text-mafia-gold font-bold">
                      +{crimeResult.respectGained}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {(crimeResult.jailTime || crimeResult.hospitalTime) && (
              <div className="bg-blood/20 border border-blood rounded p-3 mb-4">
                <p className="text-blood text-sm">
                  {crimeResult.jailTime && `Jailed for ${Math.round(crimeResult.jailTime / 60)} minutes`}
                  {crimeResult.hospitalTime && `Hospitalized for ${Math.round(crimeResult.hospitalTime / 60)} minutes`}
                </p>
              </div>
            )}
            
            <button
              onClick={() => setCrimeResult(null)}
              className="btn-mafia w-full"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Available Crimes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableCrimes.map((crime) => {
          const canCommit = canCommitCrime(crime);
          const successChance = getCrimeSuccessChance(crime);
          
          return (
            <div 
              key={crime.id} 
              className={`card-mafia hover:shadow-xl transition-all duration-300 ${
                !canCommit ? 'opacity-50' : 'hover:scale-105'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-2">{crime.name}</h3>
                <p className="text-mafia-gray-400 text-sm">{crime.description}</p>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-mafia-gray-400">Success Rate:</span>
                  <span className="text-white font-semibold">{Math.round(successChance)}%</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-mafia-gray-400">Payout:</span>
                  <span className="text-money font-semibold">
                    ${crime.basePayout.min.toLocaleString()} - ${crime.basePayout.max.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-mafia-gray-400">Respect:</span>
                  <span className="text-mafia-gold font-semibold">+{crime.baseRespect}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-mafia-gray-400">Nerve Cost:</span>
                  <span className="text-white font-semibold">{crime.nerve}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-mafia-gray-400">Cooldown:</span>
                  <span className="text-white font-semibold">
                    {Math.round(crime.cooldown / 60)} min
                  </span>
                </div>
              </div>

              {!canCommit && player.nerve < crime.nerve && (
                <div className="bg-blood/20 border border-blood rounded p-2 mb-4">
                  <p className="text-blood text-xs">
                    Not enough nerve ({crime.nerve} required)
                  </p>
                </div>
              )}

              <button
                onClick={() => handleCommitCrime(crime.id)}
                disabled={!canCommit || isLoading}
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  canCommit && !isLoading
                    ? 'btn-mafia hover:scale-105'
                    : 'bg-mafia-gray-600 text-mafia-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Committing...' : 'Commit Crime'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Locked Crimes */}
      {CRIMES.filter(crime => crime.requiredRank > player.rank).length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-mafia-red mb-6">🔒 Locked Crimes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CRIMES.filter(crime => crime.requiredRank > player.rank).map((crime) => {
              const requiredRank = RANKS[crime.requiredRank];
              
              return (
                <div key={crime.id} className="card-mafia opacity-50">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{crime.name}</h3>
                    <p className="text-mafia-gray-400 text-sm">{crime.description}</p>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-mafia-gray-400">Required Rank:</span>
                      <span className="text-mafia-red font-semibold">{requiredRank.name}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-mafia-gray-400">Payout:</span>
                      <span className="text-money font-semibold">
                        ${crime.basePayout.min.toLocaleString()} - ${crime.basePayout.max.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-mafia-gray-400">Respect:</span>
                      <span className="text-mafia-gold font-semibold">+{crime.baseRespect}</span>
                    </div>
                  </div>

                  <div className="bg-mafia-gray-700 text-center py-2 rounded">
                    <span className="text-mafia-gray-400 text-sm">
                      Unlock at {requiredRank.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Crimes;