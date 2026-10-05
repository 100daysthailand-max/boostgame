import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { BoostsResponse, BoostConfig, ActiveBoost } from '../types/api';

export function BoostScreen() {
  const navigate = useNavigate();
  const { wallet } = useAppStore();
  const { showToast } = useToast();
  const [boosts, setBoosts] = useState<BoostsResponse | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  const fetchBoosts = async () => {
    try {
      const data = await api.getBoosts();
      setBoosts(data);
    } catch (error) {
      showToast('Failed to load boosts', 'error');
    }
  };

  useEffect(() => {
    fetchBoosts();
  }, []);

  const handleActivate = async (type: string) => {
    if (activating) return;
    setActivating(type);
    try {
      await api.activateBoost(type, 'gem');
      showToast(`${type} activated!`, 'success');
      fetchBoosts();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Activation failed', 'error');
    } finally {
      setActivating(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const end = new Date(expiresAt).getTime();
    const diff = end - now;
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Boost</h1>
      </header>

      <div className="balance-bar">
        <div className="balance-item coin">
          <div className="balance-icon">💰</div>
          <div className="balance-value">{wallet?.coin?.toLocaleString() || '0'}</div>
          <div className="balance-label">Coin</div>
        </div>
        <div className="balance-item gem">
          <div className="balance-icon">💠</div>
          <div className="balance-value">{wallet?.gem?.toLocaleString() || '0'}</div>
          <div className="balance-label">Gem</div>
        </div>
        <div className="balance-item bc">
          <div className="balance-icon">💎</div>
          <div className="balance-value">{wallet?.bc_available?.toLocaleString() || '0'}</div>
          <div className="balance-label">BC</div>
        </div>
      </div>

      {/* Active Boosts */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Active Boosts</h2>
        </div>
        {boosts?.active.length ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {boosts.active.map((boost: ActiveBoost) => (
              <div key={boost.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px', background: 'var(--bg)', borderRadius: '10px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '24px'}}>{getBoostIcon(boost.type)}</span>
                    <div>
                      <div style={{fontWeight: '600'}}>{formatBoostName(boost.type)}</div>
                      <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                        Multiplier: x{boost.multiplier}
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '12px', color: 'var(--accent)'}}>
                      {getTimeRemaining(boost.expires_at)}
                    </div>
                    <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px'}}>
                      Expires
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '20px'}}>
            No active boosts
          </p>
        )}
      </div>

      {/* Available Boosts */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Available Boosts</h2>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {boosts?.configs.map((config: BoostConfig) => {
            const active = boosts?.active.find(b => b.type === config.type);
            const isActive = !!active;
            return (
              <div key={config.type} className="ad-slot-btn">
                <div className="ad-slot-info">
                  <div className="ad-slot-name" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '24px'}}>{getBoostIcon(config.type)}</span>
                    {formatBoostName(config.type)}
                  </div>
                  <div className="ad-slot-reward">
                    x{config.multiplier} multiplier • {config.duration_seconds / 60} min duration
                    {config.max_stack_seconds > 0 && ` • Max stack: ${config.max_stack_seconds / 60} min`}
                  </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  {isActive ? (
                    <span style={{color: 'var(--secondary)', fontWeight: '600'}}>ACTIVE</span>
                  ) : (
                    <button 
                      className={`btn btn-primary ${activating === config.type ? 'btn-sm' : ''}`}
                      onClick={() => !isActive && handleActivate(config.type)}
                      disabled={isActive || activating === config.type}
                    >
                      {activating === config.type ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Miner Key Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">⛏️ Auto Miner Keys</h2>
        </div>
        <p style={{color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px'}}>
          Miner keys unlock offline earnings. Standard: 2h/3h. Custom: 30min-10h.
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {[2, 3].map(h => (
            <button key={h} className="btn btn-primary" onClick={() => navigate('/miner')}>
              {h}h Key
            </button>
          ))}
          <button className="btn btn-secondary" onClick={() => navigate('/miner')}>
            Custom Duration (30min - 10h)
          </button>
        </div>
      </div>
    </div>
  );
}

function getBoostIcon(type: string): string {
  const icons: Record<string, string> = {
    COIN_2X: '💰',
    PRODUCTION_3X: '🏭',
    ENERGY_REFILL: '⚡',
    MINER_SPEED: '⛏️',
    CRITICAL_RATE: '💥',
    DOUBLE_OFFLINE: '🌙',
  };
  return icons[type] || '🚀';
}

function formatBoostName(type: string): string {
  const names: Record<string, string> = {
    COIN_2X: '2x Coin per Tap',
    PRODUCTION_3X: '3x Production',
    ENERGY_REFILL: 'Energy Refill',
    MINER_SPEED: 'Miner Speed 2x',
    CRITICAL_RATE: 'Critical Rate Up',
    DOUBLE_OFFLINE: 'Double Offline Earnings',
  };
  return names[type] || type;
}