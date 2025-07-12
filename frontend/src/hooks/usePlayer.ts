import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Player } from '../types';

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

  // Auto-regenerate nerve
  useEffect(() => {
    if (!player || player.nerve >= 100) return;

    const regenerateNerve = () => {
      useGameStore.getState().updatePlayer({
        nerve: Math.min(100, player.nerve + 1)
      });
    };

    // Regenerate 1 nerve per minute
    const interval = setInterval(regenerateNerve, 60000);
    return () => clearInterval(interval);
  }, [player]);

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

  const updatePlayerNerve = (amount: number) => {
    if (!player) return;
    useGameStore.getState().updatePlayer({
      nerve: Math.max(0, Math.min(100, player.nerve + amount))
    });
  };

  const canAfford = (cost: number): boolean => {
    return player ? player.money >= cost : false;
  };

  const hasEnoughNerve = (required: number): boolean => {
    return player ? player.nerve >= required : false;
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
    if (!player || player.carId === undefined) return null;
    // This would import CARS from constants
    return player.carId;
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
    hasEnoughNerve,
    isRankEligible,
    
    // Update functions
    updatePlayerMoney,
    updatePlayerRespect,
    updatePlayerNerve,
    
    // Actions
    setPlayer,
    setLoading,
    setError
  };
};