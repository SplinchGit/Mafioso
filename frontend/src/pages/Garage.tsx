import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARS } from '../../../shared/constants';
import type { PlayerCar } from '../types';

interface CarData {
  cars: PlayerCar[];
  groupedCars: { [key: number]: PlayerCar[] };
  activeCar?: string;
  meltCooldownRemaining: number;
  totalCars: number;
}

const Garage = () => {
  const { player, isLoading } = useGameStore();
  const [carData, setCarData] = useState<CarData | null>(null);
  const [selectedCarToMelt, setSelectedCarToMelt] = useState<string | null>(null);
  const [selectedCarToRepair, setSelectedCarToRepair] = useState<string | null>(null);
  const [selectedCarToActivate, setSelectedCarToActivate] = useState<string | null>(null);
  const [meltCooldown, setMeltCooldown] = useState(0);

  useEffect(() => {
    fetchCarData();
  }, [player]);

  useEffect(() => {
    if (meltCooldown > 0) {
      const timer = setInterval(() => {
        setMeltCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [meltCooldown]);

  const fetchCarData = async () => {
    if (!player) return;

    try {
      const response = await fetch('/api/garage/cars', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setCarData(result.data);
        setMeltCooldown(result.data.meltCooldownRemaining || 0);
      }
    } catch (error) {
      console.error('Failed to fetch car data:', error);
    }
  };

  const handleMeltCar = async (carId: string) => {
    try {
      const response = await fetch('/api/garage/melt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ carId })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        fetchCarData();
        // Update player data in store
        useGameStore.getState().updatePlayer(result.player);
      } else {
        alert(result.error || 'Failed to melt car');
      }
    } catch (error) {
      console.error('Failed to melt car:', error);
      alert('Failed to melt car');
    }
  };

  const handleRepairCar = async () => {
    if (!selectedCarToRepair) return;

    try {
      const response = await fetch('/api/garage/repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ carId: selectedCarToRepair })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        setSelectedCarToRepair(null);
        fetchCarData();
        // Update player data in store
        useGameStore.getState().updatePlayer(result.player);
      } else {
        alert(result.error || 'Failed to repair car');
      }
    } catch (error) {
      console.error('Failed to repair car:', error);
      alert('Failed to repair car');
    }
  };

  const handleActivateCar = async () => {
    if (!selectedCarToActivate) return;

    try {
      const response = await fetch('/api/garage/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ carId: selectedCarToActivate })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Car activated successfully!');
        setSelectedCarToActivate(null);
        fetchCarData();
        // Update player data in store
        useGameStore.getState().updatePlayer(result.player);
      } else {
        alert(result.error || 'Failed to activate car');
      }
    } catch (error) {
      console.error('Failed to activate car:', error);
      alert('Failed to activate car');
    }
  };

  const getCarRarity = (carType: number) => {
    if (carType <= 2) return { label: 'Common', color: 'text-gray-400' };
    if (carType <= 6) return { label: 'Uncommon', color: 'text-white' };
    if (carType <= 9) return { label: 'Rare', color: 'text-yellow-400' };
    return { label: 'Legendary', color: 'text-orange-400' };
  };

  const calculateRepairChance = (car: PlayerCar) => {
    const isRareCar = (car.carType >= 7 && car.carType <= 9) || car.carType === 10;
    
    if (isRareCar) {
      return Math.max(0, 50 - (car.damage * 0.5));
    } else {
      return Math.max(0, 100 - car.damage);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (!player || !carData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Garage</h1>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Garage</h1>
        
        {/* Garage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Total Cars</h2>
            <p className="text-3xl font-bold text-blue-400">{carData.totalCars}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Active Car</h2>
            <p className="text-lg">
              {carData.activeCar ? 
                CARS[carData.cars.find(c => c.id === carData.activeCar)?.carType || 0]?.name || 'Unknown' 
                : 'None'
              }
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Melt Cooldown</h2>
            <p className="text-lg">
              {meltCooldown > 0 ? formatTime(meltCooldown) : 'Ready'}
            </p>
          </div>
        </div>

        {/* Car List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Your Cars</h2>
          
          {carData.cars.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">You don't own any cars yet.</p>
              <p className="text-gray-400 mt-2">Visit the marketplace to buy one or try Grand Theft Auto!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {carData.cars.map((car) => {
                const carInfo = CARS[car.carType];
                const rarity = getCarRarity(car.carType);
                const repairChance = calculateRepairChance(car);
                const isActive = car.id === carData.activeCar;
                
                return (
                  <div key={car.id} className={`bg-gray-700 rounded-lg p-4 border-2 ${isActive ? 'border-green-400' : 'border-gray-600'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold">{carInfo?.name || 'Unknown Car'}</h3>
                      {isActive && (
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">Active</span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Rarity:</span>
                        <span className={rarity.color}>{rarity.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Damage:</span>
                        <span className={car.damage > 50 ? 'text-red-400' : car.damage > 25 ? 'text-yellow-400' : 'text-green-400'}>
                          {car.damage}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span>{carInfo?.speed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="capitalize">{car.source.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Melt Value:</span>
                        <span>{Math.floor((carInfo?.baseBullets || 0) * ((100 - car.damage) / 100))} bullets</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {!isActive && (
                        <button
                          onClick={() => setSelectedCarToActivate(car.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                        >
                          Set as Active
                        </button>
                      )}
                      
                      {car.damage > 0 && (
                        <button
                          onClick={() => setSelectedCarToRepair(car.id)}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
                        >
                          Repair ({repairChance.toFixed(0)}% chance)
                        </button>
                      )}
                      
                      {!isActive && (
                        <button
                          onClick={() => handleMeltCar(car.id)}
                          disabled={meltCooldown > 0}
                          className={`w-full py-2 px-4 rounded ${
                            meltCooldown === 0
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Melt for Bullets
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {selectedCarToRepair && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-xl font-bold mb-4">Confirm Car Repair</h3>
              <p className="mb-4">
                Repair chance: {calculateRepairChance(carData.cars.find(c => c.id === selectedCarToRepair)!).toFixed(0)}%
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={handleRepairCar}
                  disabled={isLoading}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
                >
                  {isLoading ? 'Repairing...' : 'Attempt Repair'}
                </button>
                <button
                  onClick={() => setSelectedCarToRepair(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedCarToActivate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-xl font-bold mb-4">Activate Car</h3>
              <p className="mb-4">
                Set this car as your active vehicle for travel?
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={handleActivateCar}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                  {isLoading ? 'Activating...' : 'Activate'}
                </button>
                <button
                  onClick={() => setSelectedCarToActivate(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Garage;