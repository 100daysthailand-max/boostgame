export interface User {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_banned: boolean;
  created_at: string;
}

export interface PlayerState {
  level: number;
  xp: number;
  energy: number;
  combo_count: number;
  verified_ads_count: number;
  conversion_available_at: string | null;
}

export interface Wallet {
  coin: number;
  gem: number;
  bc_available: number;
  bc_locked: number;
  bc_withheld: number;
  payout_wallet_address?: string;
}

export interface Membership {
  main_channel: boolean;
  group_chat: boolean;
  payout_channel: boolean;
  last_verified_at: string | null;
}

export interface MeView {
  user: User;
  state: PlayerState;
  wallet: Wallet;
  membership: Membership;
}

export interface GameState {
  energy: number;
  energy_cap: number;
  energy_regen_seconds: number;
  coin_per_tap: number;
  boost_multiplier: number;
  combo_count: number;
  combo_every: number;
  combo_multipliers: number[];
  combo_timeout_seconds: number;
  level: number;
  xp: number;
  verified_ads_count: number;
  conversion_available_at: string | null;
  active_boosts: Array<{
    type: string;
    multiplier: number;
    expires_at: string;
  }>;
  miner_key: { expires_at: string } | null;
  features: Record<string, boolean>;
}

export interface TapResult {
  coin: number;
  coin_per_tap: number;
  energy: number;
  energy_cap: number;
  combo_count: number;
  combo_multiplier: number;
  critical: boolean;
}

export interface UpgradeCategory {
  category: string;
  current_tier: number;
  current_level: number;
  max_level_per_tier: number;
  required_account_level: number;
  is_unlocked: boolean;
  next_tier_unlock_level: number | null;
  levels: Array<{
    tier: number;
    level: number;
    cost_coin: number;
    cost_gem: number;
    cost_bc: number;
    effect_value: number;
    enabled: boolean;
    is_current: boolean;
    is_next: boolean;
  }>;
}

export interface UpgradesResponse {
  player_level: number;
  energy_cap: number;
  categories: Record<string, UpgradeCategory>;
}

export interface BoostConfig {
  type: string;
  multiplier: number;
  duration_seconds: number;
  max_stack_seconds: number;
  enabled: boolean;
}

export interface ActiveBoost {
  id: string;
  type: string;
  multiplier: number;
  expires_at: string;
}

export interface BoostsResponse {
  configs: BoostConfig[];
  active: ActiveBoost[];
  wallet: { coin: number; gem: number; bc_available: number };
}

export interface MinerResponse {
  base_rate: number;
  online_rate_per_minute: number;
  offline_rate_per_minute: number;
  offline_capacity_hours: number;
  active_key: { id: string; expires_at: string } | null;
  standard_durations_hours: number[];
  custom_min_minutes: number;
  custom_max_hours: number;
  wallet: { coin: number; gem: number; bc_available: number };
}

export interface Skin {
  id: number;
  code: string;
  name: string;
  buff_type: string;
  buff_value: number;
  is_default: boolean;
  enabled: boolean;
  owned: boolean;
  equipped: boolean;
  source?: string;
}

export interface SkinsResponse {
  all: Skin[];
  wallet: { coin: number; gem: number; bc_available: number };
}

export interface QuestAssignment {
  id: number;
  template_id: number;
  type: string;
  title: string;
  description: string;
  target: number;
  reward_xp: number;
  reward_coin: number;
  reward_bc: number;
  reward_gem: number;
  x2_eligible: boolean;
  progress: number;
  status: string;
}

export interface QuestsResponse {
  assignments: QuestAssignment[];
  wallet: { coin: number; gem: number; bc_available: number };
}

export interface DailyGateStatus {
  completed_today: boolean;
  streak: {
    current: number;
    longest: number;
    last_completed_day: string | null;
  };
  milestones: number[];
  normal_task: {
    id: string;
    status: string;
    link_variant: string;
    expires_at: string;
    reward_snapshot: { bc: number };
  } | null;
  fallback_enabled: boolean;
  new_day_switch: {
    used_today: boolean;
    used_this_month: number;
    per_day_limit: number;
    per_month_limit: number;
  };
  next_reset_utc: string;
  wallet: { coin: number; gem: number; bc_available: number };
}

export interface DailyGateStartResponse {
  task_url: string;
  expires_at: string;
}

export interface ConversionQuote {
  rate_bc_per_coin: number;
  reference_coin: number;
  reference_ton: number;
  cooldown_hours: number;
  eligible: boolean;
  wallet_coin: number;
}

export interface ConvertResponse {
  success: boolean;
  coin_amount: number;
  bc_amount: number;
  cooldown_until: string;
}

export interface WithdrawalEligibility {
  eligible: boolean;
  reasons: string[];
  verified_ads_count: number;
  required_verified_ads: number;
  options_met: number;
  required_options: number;
  option_details: {
    level: { met: boolean; current: number; required: number };
    streak: { met: boolean; current: number; required: number };
    referrals: { met: boolean; current: number; required: number };
    account_age: { met: boolean; current: number; required: number };
  };
  wallet_bc_available: number;
  min_ton: number;
  max_per_day: number;
  payout_wallet_address: string | null;
}

export interface WithdrawalRequest {
  success: boolean;
  amount_bc: number;
  ton_amount: number;
  fee_ton: number;
  net_ton: number;
  wallet_address: string;
  status: string;
}

export interface ReferralInfo {
  deep_link: string;
  my_referrer: {
    referrer_id: string;
    status: string;
    qualified_at: string | null;
  } | null;
  referrals: Array<{
    referee_id: string;
    username: string;
    first_name: string;
    status: string;
    qualified_at: string | null;
  }>;
  wallet: { coin: number; gem: number; bc_available: number };
}

export interface RankWeekly {
  week_start: string;
  boards: Array<{
    board: string;
    top: Array<{ rank: number; score: number; username: string; first_name: string }>;
    my_score: number;
  }>;
}

export interface RankSeason {
  active: boolean;
  season?: {
    id: string;
    number: number;
    starts_at: string;
    ends_at: string;
    economy_supply: number;
    status: string;
  };
  boards: Array<{
    board: string;
    top: Array<{ rank: number; score: number; username: string; first_name: string }>;
    my_score: number;
  }>;
}

export interface AdOfferResponse {
  event_id: string;
  provider: string;
  slot: string;
  reward_snapshot: { coin: number; bc: number };
  block_id?: string;
  widget_id?: string;
}