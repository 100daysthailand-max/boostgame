import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MeView, GameState, Wallet } from '../types/api';
import { api } from '../services/api';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: MeView['user'] | null;
  setUser: (user: MeView['user'] | null) => void;
  
  // Game state
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  updateEnergy: (energy: number) => void;
  updateCoin: (coin: number) => void;
  
  // Wallet
  wallet: Wallet | null;
  setWallet: (wallet: Wallet) => void;
  
  // Membership
  membership: MeView['membership'] | null;
  setMembership: (membership: MeView['membership']) => void;
  
  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Initialize from stored token
  initAuth: () => Promise<void>;
  
  // Logout
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      gameState: null,
      wallet: null,
      membership: null,
      loading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setGameState: (gameState) => set({ gameState }),

      updateEnergy: (energy) => set((state) => ({
        gameState: state.gameState ? { ...state.gameState, energy } : null,
      })),

      updateCoin: (coin) => set((state) => ({
        wallet: state.wallet ? { ...state.wallet, coin } : null,
      })),

      setWallet: (wallet) => set({ wallet }),

      setMembership: (membership) => set({ membership }),

      setLoading: (loading) => set({ loading }),

      initAuth: async () => {
        const token = api.getToken();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        try {
          set({ loading: true });
          const me = await api.getMe();
          set({
            user: me.user,
            gameState: me.state as unknown as GameState,
            wallet: me.wallet,
            membership: me.membership,
            isAuthenticated: true,
          });
        } catch (error) {
          api.clearToken();
          set({ isAuthenticated: false, user: null, gameState: null, wallet: null, membership: null });
        } finally {
          set({ loading: false });
        }
      },

      logout: () => {
        api.clearToken();
        set({ isAuthenticated: false, user: null, gameState: null, wallet: null, membership: null });
      },
    }),
    {
      name: 'boostgame-storage',
      partialize: (state) => ({ 
        user: state.user,
        wallet: state.wallet,
        membership: state.membership,
      }),
    }
  )
);