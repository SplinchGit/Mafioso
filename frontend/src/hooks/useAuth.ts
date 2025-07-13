import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import type { WorldIdSuccessResponse } from '../types';

export const useAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const { player, setPlayer, setLoading, logout } = useGameStore();

  // Check for existing auth on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token || player) return;

      setLoading(true);
      try {
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPlayer(data.player);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth validation failed:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    checkExistingAuth();
  }, [player, setPlayer, setLoading]);

  const authenticateWithWorldId = async (worldIdResult: WorldIdSuccessResponse): Promise<boolean> => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/verify-worldid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nullifier_hash: worldIdResult.nullifier_hash,
          merkle_root: worldIdResult.merkle_root,
          proof: worldIdResult.proof,
          verification_level: worldIdResult.verification_level
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store auth token
      localStorage.setItem('auth_token', data.token);
      
      // Update game state
      setPlayer(data.player);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Optional: Call logout endpoint
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clean up local state
      localStorage.removeItem('auth_token');
      logout();
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlayer(data.player);
        return true;
      } else {
        await signOut();
        return false;
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      await signOut();
      return false;
    }
  };

  const isAuthenticated = (): boolean => {
    return !!player && !!localStorage.getItem('auth_token');
  };

  const getAuthToken = (): string | null => {
    return localStorage.getItem('auth_token');
  };

  return {
    // State
    player,
    isAuthenticating,
    authError,
    isAuthenticated: isAuthenticated(),
    
    // Methods
    authenticateWithWorldId,
    signOut,
    refreshAuth,
    getAuthToken,
    
    // Utilities
    clearAuthError: () => setAuthError(null)
  };
};