import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARS, CITIES, GAME_CONFIG } from '../../../shared/constants';

const formatDuration = (seconds: number) => {
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
};

const Travel = () => {
  const { player, travel, isLoading } = useGameStore();
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!player) return null;

  const currentCity = CITIES[player.city];
  const availableCities = CITIES.filter((_, index) => index !== player.city);
  const activeCar = player.cars.find((car) => car.id === player.activeCar);
  const activeCarInfo = activeCar ? CARS[activeCar.carType] : null;
  const travelTimeSeconds = activeCarInfo?.travelTimeSeconds ?? GAME_CONFIG.TRAVEL_TIME;
  const carCanTravel = Boolean(activeCarInfo && activeCar && activeCar.damage < 100);
  const travelRemaining = Math.max(0, (player.travelUntil ? Date.parse(player.travelUntil) : 0) - now);
  const isTravelling = travelRemaining > 0;

  const getTravelCost = () => GAME_CONFIG.TRAVEL_COST_BASE;

  const handleTravel = async () => {
    if (selectedCity === null) return;
    
    const success = await travel(selectedCity);
    if (success) {
      setSelectedCity(null);
    }
  };

  const canAffordTravel = (cost: number) => {
    return player.money >= cost;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-mafia-red mb-2">✈️ Travel</h1>
        <p className="text-mafia-gray-400 text-lg">
          Expand your criminal empire to new cities
        </p>
      </div>

      {isTravelling && (
        <div className="mb-8 rounded-lg border border-mafia-gold/50 bg-mafia-gold/10 px-4 py-3 text-mafia-gold">
          Journey in progress. Operations unlock in {formatDuration(Math.ceil(travelRemaining / 1000))}.
        </div>
      )}

      {/* Current Location */}
      <div className="card-mafia mb-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Current Location</h2>
          <div className="text-6xl mb-4">{currentCity.flag}</div>
          <h3 className="text-3xl font-bold text-mafia-gold">{currentCity.name}</h3>
          <p className="text-mafia-gray-400 mt-2">
            You're currently operating from {currentCity.name}
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-lg bg-mafia-gray-700 px-4 py-3 text-left">
            <span className="text-2xl">🚗</span>
            <div>
              <div className="text-xs uppercase tracking-wider text-mafia-gray-400">Active vehicle</div>
              <div className="font-bold text-white">{activeCarInfo?.name ?? 'No active car'}</div>
              <div className="text-xs text-mafia-gold">{formatDuration(travelTimeSeconds)} per journey</div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Destinations */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Choose Destination</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableCities.map((city) => {
            const travelCost = getTravelCost();
            const canAfford = canAffordTravel(travelCost);
            const canTravelThere = canAfford && carCanTravel && !isTravelling;
            
            return (
              <div
                key={city.id}
                className={`card-mafia cursor-pointer transition-all duration-300 ${
                  selectedCity === city.id
                    ? 'ring-2 ring-mafia-red scale-105'
                    : 'hover:scale-105 hover:shadow-xl'
                } ${
                  !canTravelThere ? 'opacity-50' : ''
                }`}
                onClick={() => canTravelThere && setSelectedCity(city.id)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">{city.flag}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{city.name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-mafia-gray-400">Travel Cost:</span>
                      <span className={`font-semibold ${canAfford ? 'text-money' : 'text-blood'}`}>
                        ${travelCost.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-mafia-gray-400">Travel Time:</span>
                      <span className="text-white font-semibold">
                        {formatDuration(travelTimeSeconds)}
                      </span>
                    </div>
                  </div>

                  {!canAfford && (
                    <div className="mt-3 bg-blood/20 border border-blood rounded p-2">
                      <p className="text-blood text-xs">Not enough money</p>
                    </div>
                  )}

                  {canAfford && !carCanTravel && (
                    <div className="mt-3 bg-blood/20 border border-blood rounded p-2">
                      <p className="text-blood text-xs">Activate a roadworthy car</p>
                    </div>
                  )}

                  {selectedCity === city.id && (
                    <div className="mt-3 bg-mafia-red/20 border border-mafia-red rounded p-2">
                      <p className="text-mafia-red text-xs">Selected for travel</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Travel Confirmation */}
      {selectedCity !== null && (
        <div className="card-mafia">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Travel</h3>
            
            <div className="flex items-center justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-3xl mb-2">{currentCity.flag}</div>
                <p className="text-mafia-gray-400">{currentCity.name}</p>
              </div>
              
              <div className="text-2xl text-mafia-red">→</div>
              
              <div className="text-center">
                <div className="text-3xl mb-2">{CITIES[selectedCity].flag}</div>
                <p className="text-white font-semibold">{CITIES[selectedCity].name}</p>
              </div>
            </div>

            <div className="bg-mafia-gray-700 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-money font-bold text-lg">
                    ${getTravelCost().toLocaleString()}
                  </div>
                  <div className="text-mafia-gray-400">Cost</div>
                </div>
                
                <div className="text-center">
                  <div className="text-white font-bold text-lg">
                    {formatDuration(travelTimeSeconds)}
                  </div>
                  <div className="text-mafia-gray-400">Travel Time</div>
                </div>
              </div>
              
              {/* Car damage warning */}
              <div className="mt-4 bg-amber-500/20 border border-amber-500 rounded p-3">
                <p className="text-amber-500 text-sm">
                  ⚠️ Your car will take {GAME_CONFIG.CAR_DAMAGE_PER_TRAVEL}% damage from this journey
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedCity(null)}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              
              <button
                onClick={handleTravel}
                className="btn-mafia flex-1"
                disabled={isLoading || isTravelling}
              >
                {isLoading ? 'Traveling...' : 'Confirm Travel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 card-mafia">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">Vehicle travel schedule</h2>
          <p className="mt-1 text-sm text-mafia-gray-400">
            Every vehicle tier is faster than the one before it. The top car completes a route in one minute.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-b border-mafia-gray-600 text-xs uppercase tracking-wider text-mafia-gray-400">
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3">Vehicle</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">Speed</th>
                <th className="px-3 py-3 text-right">Journey</th>
              </tr>
            </thead>
            <tbody>
              {CARS.map((car, index) => (
                <tr
                  key={car.id}
                  className={`border-b border-mafia-gray-700 last:border-0 ${activeCarInfo?.id === car.id ? 'bg-mafia-red/10' : ''}`}
                >
                  <td className="px-3 py-3 text-mafia-gray-400">{index + 1}</td>
                  <th className="px-3 py-3 font-bold text-white">
                    {car.name}{activeCarInfo?.id === car.id && <span className="ml-2 text-xs text-mafia-gold">ACTIVE</span>}
                  </th>
                  <td className="px-3 py-3 text-right text-money">${car.price.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-mafia-gray-300">{car.speed}</td>
                  <td className="px-3 py-3 text-right font-bold text-mafia-gold">{formatDuration(car.travelTimeSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Travel Tips */}
      <div className="mt-8">
        <div className="card-mafia">
          <h3 className="text-lg font-bold text-mafia-red mb-4">✈️ Travel Tips</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-white">
                💡 <strong>Different cities</strong> offer unique opportunities and challenges
              </p>
              <p className="text-white">
                🕐 <strong>Travel takes time</strong> - plan your moves carefully
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-white">
                💰 <strong>No travel fee</strong> - moving cities costs time and car condition, not cash
              </p>
              <p className="text-white">
                🚗 <strong>Cars take damage</strong> - Each trip damages your car by {GAME_CONFIG.CAR_DAMAGE_PER_TRAVEL}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Travel;
