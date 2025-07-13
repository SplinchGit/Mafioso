import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export const useInactivityLogout = () => {
  const { player, setPlayer, setError } = useGameStore();
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  const checkInactivity = async () => {
    if (!player) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // If locally tracked inactivity exceeds timeout, logout immediately
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
      handleLogout('Session expired due to inactivity');
      return;
    }

    // Validate token with backend (this also updates lastActive on server)
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'INACTIVITY_TIMEOUT') {
          handleLogout('Session expired due to inactivity');
        } else {
          handleLogout('Session invalid');
        }
      } else {
        const data = await response.json();
        setPlayer(data.player);
      }
    } catch (error) {
      console.error('Failed to validate session:', error);
    }
  };

  const handleLogout = (message: string) => {
    localStorage.removeItem('auth_token');
    setPlayer(null);
    setError(message);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (player) {
      // Set up activity listeners
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });

      // Set up periodic inactivity check
      intervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

      return () => {
        // Cleanup
        activityEvents.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear interval if no player
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [player]);

  return { updateActivity };
};