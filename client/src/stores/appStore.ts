import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';
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

  // App boot (chỉ dùng cho lúc khởi động + đăng nhập, KHÔNG dùng cho thao tác tap...)
  booting: boolean;
  authError: string | null;
  bootstrap: () => Promise<void>;

  // Logout
  logout: () => void;
}

let bootstrapPromise: Promise<void> | null = null;

function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'network'; // timeout / CORS / server ngủ / sai URL
    const code = (err.response.data as { error?: string } | undefined)?.error;
    return code ? `server:${code}` : `http_${err.response.status}`;
  }
  return 'unknown';
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      gameState: null,
      wallet: null,
      membership: null,
      booting: true,
      authError: null,

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

      bootstrap: () => {
        if (bootstrapPromise) return bootstrapPromise;

        bootstrapPromise = (async () => {
          set({ booting: true, authError: null });
          try {
            try {
              WebApp.ready();
              WebApp.expand();
            } catch {
              // mở ngoài Telegram thì bỏ qua
            }

            // Render free ngủ khi không có truy cập -> đánh thức trước (tối đa 60s)
            await api.warmUp();

            const initData = WebApp.initData;
            let me: MeView | null = null;

            if (api.getToken()) {
              try {
                me = await api.getMe();
              } catch (err) {
                if (!(axios.isAxiosError(err) && err.response?.status === 401)) throw err;
                api.clearToken();
              }
            }

            if (!me) {
              if (!initData) {
                set({ isAuthenticated: false, authError: 'not_in_telegram' });
                return;
              }
              await api.authTelegram(initData);
              me = await api.getMe();
            }

            set({
              user: me.user,
              gameState: me.state as unknown as GameState,
              wallet: me.wallet,
              membership: me.membership,
              isAuthenticated: true,
              authError: null,
            });
          } catch (err) {
            console.error('[bootstrap] failed:', err);
            set({ isAuthenticated: false, authError: describeError(err) });
          } finally {
            set({ booting: false });
            bootstrapPromise = null;
          }
        })();

        return bootstrapPromise;
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
