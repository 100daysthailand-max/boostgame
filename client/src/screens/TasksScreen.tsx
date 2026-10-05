import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { QuestAssignment, DailyGateStatus } from '../types/api';

export function TasksScreen() {
  const { wallet } = useAppStore();
  const { showToast } = useToast();
  const [quests, setQuests] = useState<QuestAssignment[]>([]);
  const [dailyGate, setDailyGate] = useState<DailyGateStatus | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [dgCode, setDgCode] = useState('');

  const fetchData = async () => {
    try {
      const [q, dg] = await Promise.all([
        api.getQuests(),
        api.getDailyGateStatus(),
      ]);
      setQuests(q.assignments);
      setDailyGate(dg);
    } catch (error) {
      showToast('Failed to load tasks', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClaim = async (quest: QuestAssignment, x2: boolean = false) => {
    setClaiming(quest.id);
    try {
      const result = await api.claimQuest(quest.id, x2);
      showToast(`Claimed! +${result.reward.coin} Coin${x2 ? ' (x2)' : ''}`, 'success');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Claim failed', 'error');
    } finally {
      setClaiming(null);
    }
  };

  const handleStartDailyGate = async () => {
    try {
      const result = await api.startDailyGate();
      window.open(result.task_url, '_blank');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to start Daily Gate', 'error');
    }
  };

  const handleClaimDailyGate = async () => {
    if (!dgCode.trim()) return;
    try {
      const result = await api.claimDailyGateCode(dgCode.trim());
      showToast(`Daily Gate claimed! +${result.reward.bc} BC`, 'success');
      setDgCode('');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Invalid code', 'error');
    }
  };

  const handleNewDaySwitch = async () => {
    try {
      const result = await api.useNewDaySwitch();
      window.open(result.task_url, '_blank');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed', 'error');
    }
  };

  const formatQuestType = (type: string) => {
    const names: Record<string, string> = {
      TAP_COUNT: '👆 Tap Count',
      COIN_EARNED: '💰 Coin Earned',
      UPGRADE_PURCHASE: '⬆️ Upgrade Purchase',
      REWARDED_AD: '📺 Watch Ad',
      DAILY_GATE: '🎫 Daily Gate',
      ACTIVE_TIME: '⏱️ Active Time',
      MEMBERSHIP: '👥 Membership',
      SHARE: '🔗 Share',
      QUALIFIED_REFERRAL: '🤝 Referral',
      COMBO_TARGET: '🔥 Combo Target',
    };
    return names[type] || type;
  };

  const isCodeIssued = dailyGate?.normal_task?.status === 'CODE_ISSUED';

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Tasks</h1>
      </header>

      <div className="balance-bar">
        <div className="balance-item coin">
          <div className="balance-icon">💰</div>
          <div className="balance-value">{wallet?.coin?.toLocaleString() || '0'}</div>
          <div className="balance-label">Coin</div>
        </div>
        <div className="balance-item bc">
          <div className="balance-icon">💎</div>
          <div className="balance-value">{wallet?.bc_available?.toLocaleString() || '0'}</div>
          <div className="balance-label">BC</div>
        </div>
        <div className="balance-item gem">
          <div className="balance-icon">💠</div>
          <div className="balance-value">{wallet?.gem?.toLocaleString() || '0'}</div>
          <div className="balance-label">Gem</div>
        </div>
      </div>

      {/* Daily Gate Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🎫 Daily Gate</h2>
        </div>
        <div style={{marginBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
            <div>
              <div style={{fontWeight: '600'}}>
                Streak: {dailyGate?.streak?.current || 0} days
              </div>
              <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                Longest: {dailyGate?.streak?.longest || 0} • Next reset: {dailyGate?.next_reset_utc ? new Date(dailyGate.next_reset_utc).toLocaleTimeString() : '—'}
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '12px', color: 'var(--accent)'}}>
                {dailyGate?.new_day_switch.used_this_month || 0}/{dailyGate?.new_day_switch.per_month_limit || 30} New Day Switches
              </div>
            </div>
          </div>
          
          {/* Milestones */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px'}}>
            {dailyGate?.milestones.map(day => {
              const completed = (dailyGate?.streak?.current || 0) >= day;
              return (
                <div key={day} className={`dg-milestone ${completed ? 'completed' : ''}`}>
                  <div className="dg-day">{day}</div>
                  <div className="dg-info">
                    <div className="dg-label">Day {day} Milestone</div>
                    <div className="dg-reward">Reward unlocks at {day} days streak</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Daily Gate Actions */}
          {dailyGate?.completed_today ? (
            <div style={{textAlign: 'center', padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid var(--secondary)'}}>
              <div style={{color: 'var(--secondary)', fontWeight: '600', marginBottom: '4px'}}>✅ Completed Today</div>
              <div style={{fontSize: '13px', color: 'var(--text-muted)'}}>Come back tomorrow for next Daily Gate</div>
            </div>
          ) : dailyGate?.normal_task ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <button className="btn btn-primary btn-block" onClick={handleStartDailyGate} disabled={isCodeIssued}>
                {isCodeIssued ? '⏳ Task in Progress' : '🎫 Start Daily Gate'}
              </button>
              {isCodeIssued && (
                <div style={{display: 'flex', gap: '8px'}}>
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter 6-char code"
                    value={dgCode}
                    onChange={(e) => setDgCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    style={{textTransform: 'uppercase', letterSpacing: '4px'}}
                  />
                  <button className="btn btn-success" onClick={handleClaimDailyGate}>Confirm</button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-block" onClick={handleStartDailyGate}>
              🎫 Start Daily Gate
            </button>
          )}

          {/* New Day Switch */}
          {!dailyGate?.new_day_switch.used_today && (dailyGate?.streak?.current || 0) > 0 && (
            <button className="btn btn-warning btn-block" onClick={handleNewDaySwitch} style={{marginTop: '12px'}}>
              🔄 New Day Switch ({dailyGate?.new_day_switch.used_this_month || 0}/{dailyGate?.new_day_switch.per_month_limit || 30} this month)
            </button>
          )}

          {dailyGate?.fallback_enabled && (
            <p style={{fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px'}}>
              Fallback mode available if Linkvertise is down
            </p>
          )}
        </div>
      </div>

      {/* Quests */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 Daily Quests</h2>
        </div>
        {quests.length === 0 ? (
          <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '20px'}}>
            No quests today. Check back tomorrow!
          </p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {quests.map(quest => (
              <div key={quest.id} className="quest-item">
                <div className="quest-header">
                  <div className="quest-title">{formatQuestType(quest.type)}</div>
                  <div className="quest-reward">
                    {quest.reward_xp > 0 && <span className="reward-tag xp">+{quest.reward_xp} XP</span>}
                    {quest.reward_coin > 0 && <span className="reward-tag coin">+{quest.reward_coin.toLocaleString()} Coin</span>}
                    {quest.reward_bc > 0 && <span className="reward-tag bc">+{quest.reward_bc} BC</span>}
                    {quest.reward_gem > 0 && <span className="reward-tag gem">+{quest.reward_gem} Gem</span>}
                  </div>
                </div>
                <div className="quest-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`}} />
                  </div>
                  <div className="progress-text">
                    <span>{Math.floor(quest.progress)}/{quest.target}</span>
                    <span>{Math.min(100, Math.round((quest.progress / quest.target) * 100))}%</span>
                  </div>
                </div>
                <div className="quest-desc">
                  {quest.description || `Complete ${quest.target} ${quest.type.toLowerCase().replace('_', ' ')}`}
                </div>
                <button
                  className={`btn ${quest.status === 'CLAIMED' ? 'btn-secondary' : (quest.progress >= quest.target ? 'btn-success' : 'btn-secondary')} btn-block`}
                  onClick={() => handleClaim(quest, quest.x2_eligible)}
                  disabled={claiming === quest.id || quest.status === 'CLAIMED' || quest.progress < quest.target}
                >
                  {claiming === quest.id ? 'Claiming...' : 
                   quest.status === 'CLAIMED' ? '✅ Claimed' : 
                   quest.progress >= quest.target ? `🎁 Claim${quest.x2_eligible ? ' (x2 available)' : ''}` : 'In Progress'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatQuestType(type: string): string {
  const names: Record<string, string> = {
    TAP_COUNT: '👆 Tap Count',
    COIN_EARNED: '💰 Coin Earned',
    UPGRADE_PURCHASE: '⬆️ Upgrade Purchase',
    REWARDED_AD: '📺 Watch Ad',
    DAILY_GATE: '🎫 Daily Gate',
    ACTIVE_TIME: '⏱️ Active Time',
    MEMBERSHIP: '👥 Membership',
    SHARE: '🔗 Share',
    QUALIFIED_REFERRAL: '🤝 Referral',
    COMBO_TARGET: '🔥 Combo Target',
  };
  return names[type] || type;
}