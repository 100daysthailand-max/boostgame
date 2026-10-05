import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { TapResult } from '../types/api';

export function PlayScreen() {
  const navigate = useNavigate();
  const { gameState, setGameState, updateEnergy, updateCoin, wallet } = useAppStore();
  const [tapping, setTapping] = useState(false);
  const { showToast } = useToast();
  const [tapResult, setTapResult] = useState<TapResult | null>(null);
  const [showCritical, setShowCritical] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const energyRef = useRef<HTMLDivElement>(null);

  const fetchGameState = useCallback(async () => {
    try {
      const state = await api.getGameState();
      setGameState(state);
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [setGameState]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  const handleTap = async () => {
    if (!gameState || gameState.energy < 1) {
      showToast('Wait for Energy', 'warning');
      return;
    }

    try {
      setTapping(true);
      const result = await api.tap();
      setTapResult(result);
      updateEnergy(result.energy);
      updateCoin(wallet ? wallet.coin + result.coin : result.coin);
      
      if (result.critical) {
        setShowCritical(true);
        setTimeout(() => setShowCritical(false), 1500);
      }
      if (result.combo_multiplier > 1) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 1500);
      }
      
      if (window.navigator.vibrate) {
        window.navigator.vibrate(result.critical ? [50, 30, 50] : 30);
      }
    } catch (error: any) {
      const message = error.response?.data?.error === 'rate_limited' 
        ? 'Tap speed limit reached. Try again in a moment.'
        : error.response?.data?.error === 'no_energy'
        ? 'Wait for Energy'
        : 'Tap failed. Try again.';
      showToast(message, 'error');
    } finally {
      setTapping(false);
    }
  };

  const handleEnergyRefill = () => {
    navigate('/boost');
  };

  const comboMultiplier = gameState?.combo_multipliers?.[gameState.combo_count > 0 ? Math.min(Math.floor(gameState.combo_count / 5), 2) : 0] || 1;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Play</h1>
        <div style={{display: 'flex', gap: '8px'}}>
          <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>
            Lv.{gameState?.level || 1}
          </span>
        </div>
      </header>

      {/* Balance Bar */}
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
        <div className="balance-item energy">
          <div className="balance-icon">⚡</div>
          <div className="balance-value">{gameState?.energy || 0}/{gameState?.energy_cap || 100}</div>
          <div className="balance-label">Energy</div>
        </div>
      </div>

      {/* Energy Bar */}
      <div className="energy-bar">
        <div className="energy-header">
          <span className="energy-label">Energy</span>
          <span className="energy-value">
            {gameState?.energy || 0} / {gameState?.energy_cap || 100}
            (+{((gameState?.energy_cap || 100) - (gameState?.energy || 0)) / (gameState?.energy_regen_seconds || 5)}s)
          </span>
        </div>
        <div className="energy-progress">
          <div 
            className="energy-fill" 
            ref={energyRef}
            style={{ width: `${Math.min(100, ((gameState?.energy || 0) / (gameState?.energy_cap || 100)) * 100)}%` }}
          />
        </div>
        <div className="energy-regen">
          Regenerates {gameState?.energy_regen_seconds || 5} per second • 
          {gameState?.energy_cap || 100} max capacity
        </div>
      </div>

      {/* Core Tap Button */}
      <button
        className="core-button"
        onClick={handleTap}
        disabled={tapping || !gameState || (gameState.energy || 0) < 1}
        aria-label="Tap Energy Core"
      >
        <span className="core-icon">⚡</span>
        <span className="core-coin">+{gameState?.coin_per_tap || 1} Coin/tap</span>
        {gameState && gameState.boost_multiplier > 1 && (
          <span className="core-text">Boost: x{gameState.boost_multiplier}</span>
        )}
        {gameState && gameState.combo_count > 0 && (
          <span className="core-combo">Combo x{gameState.combo_count} (x{comboMultiplier})</span>
        )}
      </button>

      {/* Combo/Critical Feedback */}
      {showCritical && (
        <div className="toast success" style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200, animation: 'slideIn 0.3s ease'}}>
          <span style={{fontSize: '24px'}}>💥</span>
          <span style={{fontWeight: '700', fontSize: '18px'}}>CRITICAL!</span>
          <span>+{tapResult?.coin || 0} Coin</span>
        </div>
      )}
      {showCombo && tapResult && tapResult.combo_multiplier > 1 && (
        <div className="toast warning" style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200, animation: 'slideIn 0.3s ease'}}>
          <span style={{fontSize: '24px'}}>🔥</span>
          <span style={{fontWeight: '700', fontSize: '18px'}}>COMBO x{tapResult.combo_multiplier}!</span>
          <span>+{tapResult.coin} Coin</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{color: 'var(--coin)'}}>{gameState?.coin_per_tap || 1}</div>
          <div className="stat-label">Coin/Tap</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{gameState?.combo_count || 0}</div>
          <div className="stat-label">Combo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{gameState?.level || 1}</div>
          <div className="stat-label">Level</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
          <button 
            className="btn btn-secondary"
            onClick={handleEnergyRefill}
            style={{flex: 1}}
          >
            ⚡ Energy Refill
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/boost')}
            style={{flex: 1}}
          >
            🚀 Boosts
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/tasks')}
            style={{flex: 1}}
          >
            📋 Tasks
          </button>
        </div>
      </div>

      {/* Active Boosts */}
      {gameState?.active_boosts && gameState.active_boosts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Active Boosts</h2>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {gameState.active_boosts.map((boost: any) => (
              <div key={boost.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px', background: 'var(--bg)', borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{fontWeight: '600'}}>{boost.type.replace('_', ' ')}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                    x{boost.multiplier} • {new Date(boost.expires_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Miner Key */}
      {gameState?.miner_key && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⛏️ Auto Miner Active</h2>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>Expires: {new Date(gameState.miner_key.expires_at).toLocaleString()}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/boost')}>
              Manage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}