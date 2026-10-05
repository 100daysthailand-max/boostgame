import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { MeView, GameState, TapResult, UpgradesResponse, BoostsResponse, MinerResponse, SkinsResponse, QuestsResponse, DailyGateStatus, DailyGateStartResponse, ConversionQuote, ConvertResponse, WithdrawalEligibility, WithdrawalRequest, ReferralInfo, RankWeekly, RankSeason, AdOfferResponse } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://boostgame-60y9.onrender.com/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const url: string = error.config?.url ?? '';
        if (error.response?.status === 401 && !url.includes('/auth/telegram')) {
          this.clearToken();
          // App.tsx lắng nghe sự kiện này để đăng nhập lại (không còn trang /login)
          window.dispatchEvent(new Event('auth:expired'));
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Auth
  /** Đánh thức backend (Render free ngủ -> request đầu có thể mất 30-60s). */
  async warmUp(): Promise<void> {
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 60000 });
    } catch {
      // bỏ qua: các request sau sẽ tự báo lỗi cụ thể
    }
  }

  async authTelegram(initData: string): Promise<{ token: string; expiresAt: string; user: { telegramId: string } }> {
    const response = await this.client.post('/auth/telegram', { initData });
    this.setToken(response.data.token);
    return response.data;
  }

  async getMe(): Promise<MeView> {
    const response = await this.client.get<MeView>('/me');
    return response.data;
  }

  // Game
  async getGameState(): Promise<GameState> {
    const response = await this.client.get<GameState>('/game/state');
    return response.data;
  }

  async tap(): Promise<TapResult> {
    const response = await this.client.post<TapResult>('/game/tap', {});
    return response.data;
  }

  // Upgrades
  async getUpgrades(): Promise<UpgradesResponse> {
    const response = await this.client.get<UpgradesResponse>('/upgrades');
    return response.data;
  }

  async purchaseUpgrade(category: string): Promise<{ success: boolean; category: string; tier: number; level: number }> {
    const response = await this.client.post('/upgrades/purchase', { category });
    return response.data;
  }

  // Boosts
  async getBoosts(): Promise<BoostsResponse> {
    const response = await this.client.get<BoostsResponse>('/boosts');
    return response.data;
  }

  async activateBoost(type: string, source: string): Promise<{ success: boolean; type: string; multiplier: number; expires_at: string }> {
    const response = await this.client.post('/boosts/activate', { type, source });
    return response.data;
  }

  // Miner
  async getMiner(): Promise<MinerResponse> {
    const response = await this.client.get<MinerResponse>('/miner');
    return response.data;
  }

  async purchaseMinerKey(duration_hours: number, source: string): Promise<{ success: boolean; expires_at: string }> {
    const response = await this.client.post('/miner/purchase-key', { duration_hours, source });
    return response.data;
  }

  async claimOfflineMiner(): Promise<{ success: boolean; offline_earnings: number; offline_minutes: number; rate_per_minute: number }> {
    const response = await this.client.post('/miner/claim-offline', {});
    return response.data;
  }

  // Skins
  async getSkins(): Promise<SkinsResponse> {
    const response = await this.client.get<SkinsResponse>('/skins');
    return response.data;
  }

  async equipSkin(skin_id: number): Promise<{ success: boolean; skin_id: number }> {
    const response = await this.client.post('/skins/equip', { skin_id });
    return response.data;
  }

  // Quests
  async getQuests(): Promise<QuestsResponse> {
    const response = await this.client.get<QuestsResponse>('/quests');
    return response.data;
  }

  async claimQuest(assignment_id: number, x2: boolean = false): Promise<{ success: boolean; reward: { xp: number; coin: number; bc: number; gem: number; x2: boolean } }> {
    const response = await this.client.post('/quests/claim', { assignment_id, x2 });
    return response.data;
  }

  // Daily Gate
  async getDailyGateStatus(): Promise<DailyGateStatus> {
    const response = await this.client.get<DailyGateStatus>('/daily-gate/status');
    return response.data;
  }

  async startDailyGate(): Promise<DailyGateStartResponse> {
    const response = await this.client.post<DailyGateStartResponse>('/daily-gate/start', {});
    return response.data;
  }

  async claimDailyGateCode(code: string): Promise<{ success: boolean; reward: { bc: number } }> {
    const response = await this.client.post('/daily-gate/code/claim', { code });
    return response.data;
  }

  async useNewDaySwitch(): Promise<DailyGateStartResponse> {
    const response = await this.client.post<DailyGateStartResponse>('/daily-gate/new-day-switch', {});
    return response.data;
  }

  // Wallet
  async getConversionQuote(): Promise<ConversionQuote> {
    const response = await this.client.get<ConversionQuote>('/wallet/conversion-quote');
    return response.data;
  }

  async convertCoin(coin_amount: number): Promise<ConvertResponse> {
    const response = await this.client.post<ConvertResponse>('/wallet/convert', { coin_amount });
    return response.data;
  }

  async getWithdrawalEligibility(): Promise<WithdrawalEligibility> {
    const response = await this.client.get<WithdrawalEligibility>('/wallet/withdrawal/eligibility');
    return response.data;
  }

  async requestWithdrawal(amount_bc: number, wallet_address: string): Promise<WithdrawalRequest> {
    const response = await this.client.post<WithdrawalRequest>('/wallet/withdrawal', { amount_bc, wallet_address });
    return response.data;
  }

  async getWithdrawals(): Promise<{ withdrawals: Array<any> }> {
    const response = await this.client.get('/wallet/withdrawals');
    return response.data;
  }

  async saveWallet(address: string): Promise<{ success: boolean; address: string }> {
    const response = await this.client.post('/wallet/save-wallet', { address });
    return response.data;
  }

  // Referral
  async getReferralInfo(): Promise<ReferralInfo> {
    const response = await this.client.get<ReferralInfo>('/referral');
    return response.data;
  }

  async checkReferralQualification(): Promise<{ qualified: boolean; reward_bc?: number; reason?: string; requirements?: any }> {
    const response = await this.client.post('/referral/check-qualification', {});
    return response.data;
  }

  // Rank
  async getWeeklyRank(): Promise<RankWeekly> {
    const response = await this.client.get<RankWeekly>('/rank/weekly');
    return response.data;
  }

  async getSeasonRank(): Promise<RankSeason> {
    const response = await this.client.get<RankSeason>('/rank/season');
    return response.data;
  }

  // Ads
  async requestAd(slot: string): Promise<AdOfferResponse> {
    const response = await this.client.post<AdOfferResponse>('/ads/offer', { slot });
    return response.data;
  }
}

export const api = new ApiClient();