import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Player, GameState, CrimeResult } from '../../../shared/types';

interface GameStore extends GameState {
  // Actions
  setPlayer: (player: Player | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePlayer: (updates: Partial<Player>) => void;
  clearError: () => void;
  logout: () => void;
  
  // Game actions
  commitCrime: (crimeId: number) => Promise<CrimeResult | null>;
  travel: (cityId: number) => Promise<boolean>;
  buyCar: (carId: number) => Promise<boolean>;
  buyGun: (gunId: number) => Promise<boolean>;
  buyProtection: (protectionId: number) => Promise<boolean>;
  swissBank: (action: 'deposit' | 'withdraw', amount: number) => Promise<boolean>;
  searchPlayer: (targetUsername: string) => Promise<boolean>;
  shootPlayer: () => Promise<boolean>;
  cancelSearch: () => Promise<boolean>;
  
  // Computed values
  getCurrentRank: () => string;
  canCommitCrime: (crimeId: number) => boolean;
  getTimeUntilFree: () => number;
  isInJail: () => boolean;
  isInHospital: () => boolean;
}

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        player: null,
        isLoading: false,
        error: null,
        lastUpdate: new Date().toISOString(),

        // Actions
        setPlayer: (player) => 
          set({ player, lastUpdate: new Date().toISOString() }, false, 'setPlayer'),

        setLoading: (isLoading) => 
          set({ isLoading }, false, 'setLoading'),

        setError: (error) => 
          set({ error }, false, 'setError'),

        updatePlayer: (updates) => 
          set((state) => ({
            player: state.player ? { ...state.player, ...updates } : null,
            lastUpdate: new Date().toISOString()
          }), false, 'updatePlayer'),

        clearError: () => 
          set({ error: null }, false, 'clearError'),

        logout: () => 
          set({ 
            player: null, 
            error: null, 
            lastUpdate: new Date().toISOString() 
          }, false, 'logout'),

        // Game actions
        commitCrime: async (crimeId: number): Promise<CrimeResult | null> => {
          const { player } = get();
          if (!player) return null;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/crimes/commit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ crimeId })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to commit crime');
            }

            // Update player with new stats
            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return data.result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return null;
          }
        },

        travel: async (cityId: number): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/player/travel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ cityId })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to travel');
            }

            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        buyCar: async (carId: number): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/player/buy-car', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ carId })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to buy car');
            }

            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        buyGun: async (gunId: number): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/player/buy-gun', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ gunId })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to buy gun');
            }

            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        buyProtection: async (protectionId: number): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/player/buy-protection', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ protectionId })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to buy protection');
            }

            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        swissBank: async (action: 'deposit' | 'withdraw', amount: number): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/player/swiss-bank', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ action, amount })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to process Swiss Bank transaction');
            }

            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        searchPlayer: async (targetUsername: string): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/combat/search-player', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ targetUsername })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to search for player');
            }

            // Update player with search data
            set((state) => ({
              player: { ...state.player!, searchingFor: { 
                targetId: '', 
                searchStartTime: new Date().toISOString(),
                searchEndTime: data.searchEndTime,
                targetUsername,
                isComplete: false
              }},
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        shootPlayer: async (): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/combat/shoot-player', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to shoot player');
            }

            set((state) => ({
              player: data.updatedAttacker || state.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        cancelSearch: async (): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/combat/cancel-search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to cancel search');
            }

            set((state) => ({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            }));

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return false;
          }
        },

        // Computed values
        getCurrentRank: () => {
          const { player } = get();
          if (!player) return 'Unknown';
          
          // This would normally import RANKS from constants
          // For now, returning basic rank logic
          return `Rank ${player.rank}`;
        },

        canCommitCrime: (crimeId: number) => {
          const { player } = get();
          if (!player) return false;

          // Check if player is in jail or hospital
          if (get().isInJail() || get().isInHospital()) return false;

          return true;
        },

        getTimeUntilFree: () => {
          const { player } = get();
          if (!player) return 0;

          const now = new Date().getTime();
          
          if (player.jailUntil) {
            const jailTime = new Date(player.jailUntil).getTime();
            return Math.max(0, jailTime - now);
          }
          
          if (player.hospitalUntil) {
            const hospitalTime = new Date(player.hospitalUntil).getTime();
            return Math.max(0, hospitalTime - now);
          }
          
          return 0;
        },

        isInJail: () => {
          const { player } = get();
          if (!player || !player.jailUntil) return false;
          return new Date(player.jailUntil).getTime() > Date.now();
        },

        isInHospital: () => {
          const { player } = get();
          if (!player || !player.hospitalUntil) return false;
          return new Date(player.hospitalUntil).getTime() > Date.now();
        }
      }),
      {
        name: 'mafioso-game-store',
        partialize: (state) => ({
          player: state.player,
          lastUpdate: state.lastUpdate
        })
      }
    ),
    { name: 'mafioso-store' }
  )
);