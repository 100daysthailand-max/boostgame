import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { RankWeekly, RankSeason } from '../types/api';

export function RankScreen() {
  const { wallet } = useAppStore();
  const { showToast } = useToast();
  const [weekly, setWeekly] = useState<RankWeekly | null>(null);
  const [season, setSeason] = useState<RankSeason | null>(null);
  const [activeTab, setActiveTab] = useState<'weekly' | 'season'>('weekly');

  const fetchData = async () => {
    try {
      const [w, s] = await Promise.all([
        api.getWeeklyRank(),
        api.getSeasonRank(),
      ]);
      setWeekly(w);
      setSeason(s);
    } catch (error) {
      showToast('Failed to load rankings', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderBoards = (boards: any[]) => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
      {boards.map(board => (
        <div key={board.board} className="rank-board">
          <div className="rank-board-title">{board.board} Leaderboard</div>
          <div className="rank-list">
            {board.top.slice(0, 10).map((entry: any) => (
              <div key={entry.rank} className="rank-item">
                <div className={`rank-pos ${entry.rank <= 3 ? `top${entry.rank}` : 'other'}`}>
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                </div>
                <div className="rank-info">
                  <div className="rank-name">{entry.username || entry.first_name || `Player ${entry.rank}`}</div>
                  <div className="rank-score">{board.board} Score: {entry.score.toLocaleString()}</div>
                </div>
              </div>
            ))}
            {/* My rank if not in top 10 */}
            {board.my_score > 0 && board.top.length < 10 && (
              <div className="rank-item me">
                <div className="rank-pos other">👤</div>
                <div className="rank-info">
                  <div className="rank-name">You</div>
                  <div className="rank-score">{board.board} Score: {board.my_score.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Rank</h1>
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

      {/* Tab Navigation */}
      <div style={{display: 'flex', gap: '8px', marginBottom: '20px'}}>
        <button 
          className={`btn ${activeTab === 'weekly' ? 'btn-primary' : 'btn-secondary'} btn-block`}
          onClick={() => setActiveTab('weekly')}
        >
          📅 Weekly
        </button>
        <button 
          className={`btn ${activeTab === 'season' ? 'btn-primary' : 'btn-secondary'} btn-block`}
          onClick={() => setActiveTab('season')}
        >
          🏆 Season {season?.season?.number || '—'}
        </button>
      </div>

      {activeTab === 'weekly' ? (
        weekly ? renderBoards(weekly.boards) : (
          <div className="card" style={{textAlign: 'center', padding: '40px'}}>
            <div style={{fontSize: '32px', marginBottom: '12px'}}>📅</div>
            <p style={{color: 'var(--text-muted)'}}>Loading weekly rankings...</p>
          </div>
        )
      ) : (
        season?.active ? (
          <>
            {season.season && (
              <div className="card" style={{marginBottom: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))', borderColor: 'var(--primary)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
                  <div>
                    <div style={{fontWeight: '700', fontSize: '16px'}}>Season #{season.season.number}</div>
                    <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                      Ends: {new Date(season.season.ends_at).toLocaleDateString()} • Supply: {(season.season.economy_supply / 1e9).toFixed(1)}B Coin
                    </div>
                  </div>
                  <span style={{background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'}}>
                    {season.season.status}
                  </span>
                </div>
              </div>
            )}
            {renderBoards(season.boards)}
          </>
        ) : (
          <div className="card" style={{textAlign: 'center', padding: '40px'}}>
            <div style={{fontSize: '32px', marginBottom: '12px'}}>🏆</div>
            <p>No active season</p>
            <p style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>
              Next season starts soon
            </p>
          </div>
        )
      )}
    </div>
  );
}