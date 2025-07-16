import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../types';

export const usePlayer = () => {
  const { 
    player, 
    isLoading, 
    error, 
    setPlayer, 
    setLoading, 
    setError,
    getCurrentRank,
    isInJail,
    isInHospital,
    getTimeUntilFree
  } = useGameStore();

  // Auto-refresh player data periodically
  useEffect(() => {
    if (!player) return;

    const refreshPlayer = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('/api/player/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPlayer(data.player);
        }
      } catch (error) {
        console.error('Failed to refresh player data:', error);
      }
    };

    // Refresh every 30 seconds
    const interval = setInterval(refreshPlayer, 30000);
    return () => clearInterval(interval);
  }, [player, setPlayer]);


  const updatePlayerMoney = (amount: number) => {
    if (!player) return;
    useGameStore.getState().updatePlayer({
      money: Math.max(0, player.money + amount)
    });
  };

  const updatePlayerRespect = (amount: number) => {
    if (!player) return;
    useGameStore.getState().updatePlayer({
      respect: Math.max(0, player.respect + amount)
    });
  };


  const canAfford = (cost: number): boolean => {
    return player ? player.money >= cost : false;
  };


  const isRankEligible = (requiredRank: number): boolean => {
    return player ? player.rank >= requiredRank : false;
  };

  const getCurrentCity = () => {
    if (!player) return null;
    // This would import CITIES from constants
    return player.city;
  };

  const getCurrentCar = () => {
    if (!player || !player.activeCar || player.cars.length === 0) return null;
    // Find the active car in the cars array
    return player.cars.find(car => car.id === player.activeCar) || null;
  };

  return {
    // State
    player,
    isLoading,
    error,
    
    // Computed values
    currentRank: getCurrentRank(),
    currentCity: getCurrentCity(),
    currentCar: getCurrentCar(),
    isJailed: isInJail(),
    isHospitalized: isInHospital(),
    timeUntilFree: getTimeUntilFree(),
    
    // Helper functions
    canAfford,
    isRankEligible,
    
    // Update functions
    updatePlayerMoney,
    updatePlayerRespect,
    
    // Actions
    setPlayer,
    setLoading,
    setError
  };
};