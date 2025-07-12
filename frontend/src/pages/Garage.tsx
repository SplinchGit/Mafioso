import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARS } from '../../../shared/constants';

const Garage = () => {
  const { player, buyCar, isLoading } = useGameStore();
  const [selectedCar, setSelectedCar] = useState<number | null>(null);

  if (!player) return null;

  const playerCar = player.carId !== undefined ? CARS[player.carId] : null;
  const availableCars = CARS.filter((_, index) => index !== player.carId);

  const handleBuyCar = async () => {
    if (selectedCar === null) return;
    
    const success = await buyCar(selectedCar);
    if (success) {
      setSelectedCar(null);
    }
  };

  const canAffordCar = (price: number) => {
    return player.money >= price;
  };

  const getCarRarity = (carId: number) => {
    if (carId <= 2) return { label: 'Common', color: 'text-mafia-gray-400' };
    if (carId <= 5) return { label: 'Uncommon', color: 'text-white' };
    if (carId <= 7) return { label: 'Rare', color: 'text-mafia-gold' };
    if (carId <= 9) return { label: 'Epic', color: 'text-mafia-red' };
    return { label: 'Legendary', color: 'text-purple-400' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-mafia-red mb-2">🚗 Garage</h1>
        <p className="text-mafia-gray-400 text-lg">
          Upgrade your ride for faster getaways
        </p>
      </div>

      {/* Current Vehicle */}
      <div className="card-mafia mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Current Vehicle</h2>
        
        {playerCar ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-mafia-gold mb-2">{playerCar.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-mafia-gray-400">Speed: </span>
                  <span className="text-white font-semibold">{playerCar.speed}/100</span>
                </div>
                <div>
                  <span className="text-mafia-gray-400">Acceleration: </span>
                  <span className="text-white font-semibold">{playerCar.accel}/100</span>
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-sm font-semibold ${getCarRarity(player.carId!).color}`}>
                  {getCarRarity(player.carId!).label}
                </span>
              </div>
            </div>
            
            <div className="text-6xl">🚗</div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🚶‍♂️</div>
            <h3 className="text-xl font-bold text-mafia-gray-400 mb-2">On Foot</h3>
            <p className="text-mafia-gray-500">
              You don't own a vehicle yet. Buy one to improve your escape chances!
            </p>
          </div>
        )}
      </div>

      {/* Available Cars */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Available Vehicles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCars.map((car) => {
            const canAfford = canAffordCar(car.price);
            const rarity = getCarRarity(car.id);
            
            return (
              <div
                key={car.id}
                className={`card-mafia cursor-pointer transition-all duration-300 ${
                  selectedCar === car.id
                    ? 'ring-2 ring-mafia-red scale-105'
                    : 'hover:scale-105 hover:shadow-xl'
                } ${
                  !canAfford ? 'opacity-50' : ''
                }`}
                onClick={() => canAfford && setSelectedCar(car.id)}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🚗</div>
                  <h3 className="text-lg font-bold text-white mb-1">{car.name}</h3>
                  <span className={`text-sm font-semibold ${rarity.color}`}>
                    {rarity.label}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {/* Speed Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-mafia-gray-400">Speed</span>
                      <span className="text-white font-semibold">{car.speed}/100</span>
                    </div>
                    <div className="w-full bg-mafia-gray-700 rounded-full h-2">
                      <div 
                        className="bg-mafia-red h-2 rounded-full transition-all duration-300"
                        style={{ width: `${car.speed}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Acceleration Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-mafia-gray-400">Acceleration</span>
                      <span className="text-white font-semibold">{car.accel}/100</span>
                    </div>
                    <div className="w-full bg-mafia-gray-700 rounded-full h-2">
                      <div 
                        className="bg-mafia-gold h-2 rounded-full transition-all duration-300"
                        style={{ width: `${car.accel}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex justify-between text-sm">
                    <span className="text-mafia-gray-400">Price:</span>
                    <span className={`font-semibold ${canAfford ? 'text-money' : 'text-blood'}`}>
                      ${car.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {!canAfford && (
                  <div className="bg-blood/20 border border-blood rounded p-2 mb-3">
                    <p className="text-blood text-xs text-center">Not enough money</p>
                  </div>
                )}

                {selectedCar === car.id && (
                  <div className="bg-mafia-red/20 border border-mafia-red rounded p-2 mb-3">
                    <p className="text-mafia-red text-xs text-center">Selected for purchase</p>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xs text-mafia-gray-400">
                    Better vehicles improve crime success rates
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase Confirmation */}
      {selectedCar !== null && (
        <div className="card-mafia">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Purchase</h3>
            
            <div className="bg-mafia-gray-700 rounded-lg p-6 mb-6">
              <div className="text-4xl mb-3">🚗</div>
              <h4 className="text-xl font-bold text-mafia-gold mb-2">
                {CARS[selectedCar].name}
              </h4>
              <div className={`text-sm font-semibold mb-4 ${getCarRarity(selectedCar).color}`}>
                {getCarRarity(selectedCar).label}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-white font-semibold">{CARS[selectedCar].speed}/100</div>
                  <div className="text-xs text-mafia-gray-400">Speed</div>
                </div>
                <div>
                  <div className="text-white font-semibold">{CARS[selectedCar].accel}/100</div>
                  <div className="text-xs text-mafia-gray-400">Acceleration</div>
                </div>
              </div>
              
              <div className="text-money font-bold text-2xl">
                ${CARS[selectedCar].price.toLocaleString()}
              </div>
            </div>

            {playerCar && (
              <div className="bg-mafia-gray-700 rounded-lg p-3 mb-6">
                <p className="text-mafia-gray-400 text-sm">
                  Your current {playerCar.name} will be sold for ${Math.round(playerCar.price * 0.5).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedCar(null)}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              
              <button
                onClick={handleBuyCar}
                className="btn-mafia flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Purchasing...' : 'Buy Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Tips */}
      <div className="mt-8">
        <div className="card-mafia">
          <h3 className="text-lg font-bold text-mafia-red mb-4">🚗 Vehicle Tips</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-white">
                🏃‍♂️ <strong>Speed</strong> affects your ability to escape after crimes
              </p>
              <p className="text-white">
                ⚡ <strong>Acceleration</strong> helps you get away quickly
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-white">
                💰 <strong>Selling</strong> your current car gives you 50% of its value
              </p>
              <p className="text-white">
                🌟 <strong>Rarer cars</strong> provide better performance bonuses
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Garage;