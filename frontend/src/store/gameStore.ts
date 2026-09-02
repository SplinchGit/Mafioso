import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Player, GameState, CrimeResult, GoodsTradeResponse } from '../../../shared/types';
import type { GoodId } from '../../../shared/constants';
import { apiFetch } from '../utils/api';

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
  tradeGoods: (goodId: GoodId, action: 'buy' | 'sell', quantity: number) => Promise<GoodsTradeResponse | null>;
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
            const response = await apiFetch('/crimes/commit', {
              method: 'POST',
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
            const response = await apiFetch('/player/travel', {
              method: 'POST',
              body: JSON.stringify({ cityId })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to travel');
            }

            const updatedPlayer = data.data?.player ?? data.player;
            if (!updatedPlayer) {
              throw new Error('Travel response did not include the updated player');
            }

            set((state) => ({
              player: updatedPlayer,
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

        tradeGoods: async (
          goodId: GoodId,
          action: 'buy' | 'sell',
          quantity: number
        ): Promise<GoodsTradeResponse | null> => {
          const { player } = get();
          if (!player) return null;

          set({ isLoading: true, error: null });

          try {
            const response = await apiFetch('/player/trade-goods', {
              method: 'POST',
              body: JSON.stringify({ goodId, action, quantity })
            });
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to trade goods');
            }

            set({
              player: data.player,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            });

            return data as GoodsTradeResponse;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            return null;
          }
        },

        buyGun: async (gunId: number): Promise<boolean> => {
          const { player } = get();
          if (!player) return false;

          set({ isLoading: true, error: null });

          try {
            const response = await apiFetch('/player/buy-gun', {
              method: 'POST',
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
            const response = await apiFetch('/player/buy-protection', {
              method: 'POST',
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
            const response = await apiFetch('/player/swiss-bank', {
              method: 'POST',
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
            const response = await apiFetch('/combat/search-player', {
              method: 'POST',
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
            const response = await apiFetch('/combat/shoot-player', {
              method: 'POST'
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
            const response = await apiFetch('/combat/cancel-search', {
              method: 'POST'
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
        version: 2,
        migrate: (persistedState: unknown) => ({
          lastUpdate: (persistedState as { lastUpdate?: string } | null)?.lastUpdate
        }),
        partialize: (state) => ({
          lastUpdate: state.lastUpdate
        })
      }
    ),
    { name: 'mafioso-store' }
  )
);
