import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { ConversionQuote, ConvertResponse, WithdrawalEligibility, WithdrawalRequest } from '../types/api';

export function WalletScreen() {
  const navigate = useNavigate();
  const { wallet, setWallet, gameState } = useAppStore();
  const { showToast } = useToast();
  
  const [quote, setQuote] = useState<ConversionQuote | null>(null);
  const [eligibility, setEligibility] = useState<WithdrawalEligibility | null>(null);
  const [withdrawals, setWithdrawals] = useState<Array<any>>([]);
  const [payoutAddress, setPayoutAddress] = useState('');
  
  const [convertAmount, setConvertAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [converting, setConverting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const fetchData = async () => {
    try {
      const [q, e, w] = await Promise.all([
        api.getConversionQuote(),
        api.getWithdrawalEligibility(),
        api.getWithdrawals(),
      ]);
      setQuote(q);
      setEligibility(e);
      setWithdrawals(w.withdrawals);
      if (e.payout_wallet_address) {
        setPayoutAddress(e.payout_wallet_address);
      }
    } catch (error) {
      showToast('Failed to load wallet data', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConvert = async () => {
    const amount = parseInt(convertAmount);
    if (!amount || amount <= 0) return;
    if (!wallet || wallet.coin < amount) {
      showToast('Insufficient Coin balance', 'error');
      return;
    }
    if (!quote || !quote.eligible) {
      showToast('Conversion not available', 'error');
      return;
    }

    setConverting(true);
    try {
      const result = await api.convertCoin(amount);
      showToast(`Converted! ${result.coin_amount.toLocaleString()} Coin → ${result.bc_amount.toLocaleString()} BC`, 'success');
      setConvertAmount('');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Conversion failed', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0) return;
    if (!eligibility?.eligible) {
      showToast('Withdrawal requirements not met', 'error');
      return;
    }
    if (!payoutAddress.trim()) {
      showToast('Set payout wallet address first', 'error');
      return;
    }
    if (!wallet || wallet.bc_available < amount) {
      showToast('Insufficient BC balance', 'error');
      return;
    }

    setWithdrawing(true);
    try {
      const result = await api.requestWithdrawal(amount, payoutAddress.trim());
      showToast(`Withdrawal requested! ${result.net_ton} TON (fee: ${result.fee_ton} TON)`, 'success');
      setWithdrawAmount('');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Withdrawal failed', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!payoutAddress.trim()) return;
    setSavingAddress(true);
    try {
      await api.saveWallet(payoutAddress.trim());
      showToast('Wallet address saved', 'success');
    } catch (error) {
      showToast('Failed to save address', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const formatTON = (ton: number) => ton.toFixed(6);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Wallet</h1>
      </header>

      {/* Main Balances */}
      <div className="wallet-section">
        <div className="wallet-balance">
          <div className="wallet-label">Coin Balance</div>
          <div className="wallet-amount" style={{color: 'var(--coin)'}}>{wallet?.coin?.toLocaleString() || '0'}</div>
        </div>
        <div className="wallet-balance" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
          <div className="wallet-label">Boost Cash (BC)</div>
          <div className="wallet-amount">{wallet?.bc_available?.toLocaleString() || '0'}</div>
          <div style={{fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '8px'}}>
            Locked: {wallet?.bc_locked?.toLocaleString() || 0} • Withheld: {wallet?.bc_withheld?.toLocaleString() || 0}
          </div>
        </div>
        <div className="wallet-balance" style={{background: 'linear-gradient(135deg, #a855f7, #9333ea)'}}>
          <div className="wallet-label">Gem</div>
          <div className="wallet-amount">{wallet?.gem?.toLocaleString() || '0'}</div>
        </div>
      </div>

      {/* Conversion Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🔄 Coin → BC Conversion</h2>
        </div>
        {quote && quote.eligible ? (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)'}}>
              <span>Rate: 1 Coin = {quote.rate_bc_per_coin?.toFixed(6) || '—'} BC</span>
              <span>Reference: {quote.reference_coin?.toLocaleString()} Coin = {quote.reference_ton} TON</span>
            </div>
            {quote.cooldown_hours > 0 && (
              <div style={{color: 'var(--accent)', fontSize: '13px', marginBottom: '12px'}}>
                ⏳ Cooldown: {quote.cooldown_hours}h remaining
              </div>
            )}
            <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
              <input
                className="input"
                type="number"
                placeholder="Coin amount"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                min="1"
                max={wallet?.coin || 0}
                disabled={converting}
              />
              <button className="btn btn-primary" onClick={handleConvert} disabled={converting || !convertAmount}>
                {converting ? 'Converting...' : `Convert → ~${quote.rate_bc_per_coin ? Math.floor(parseInt(convertAmount || '0') * quote.rate_bc_per_coin).toLocaleString() : 0} BC`}
              </button>
            </div>
            <p style={{fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center'}}>
              6h cooldown after each conversion • Rate may vary by level/season
            </p>
          </>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>
            <p>Conversion not available</p>
            {quote?.eligible === false && <p style={{fontSize: '12px', marginTop: '8px'}}>Requirements not met or on cooldown</p>}
          </div>
        )}
      </div>

      {/* Withdrawal Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">💸 Withdraw to TON</h2>
        </div>
        
        {/* Payout Address */}
        <div className="wallet-section">
          <label style={{display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px'}}>
            TON Payout Address (TON/USDT)
          </label>
          <div className="ref-link">
            <input
              className="input"
              type="text"
              placeholder="EQ... or UQ... (TON address)"
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              disabled={savingAddress}
            />
            <button className="copy-btn" onClick={handleSaveAddress} disabled={savingAddress || !payoutAddress}>
              {savingAddress ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Eligibility */}
        {eligibility && (
          <div className="wallet-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
              <h3 style={{fontSize: '14px', fontWeight: '600'}}>Eligibility Check</h3>
              <span className={`btn ${eligibility.eligible ? 'btn-success' : 'btn-danger'} btn-sm`}>
                {eligibility.eligible ? '✅ Eligible' : '❌ Not Eligible'}
              </span>
            </div>
            <div style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px'}}>
              Requirements: {eligibility.verified_ads_count}/{eligibility.required_verified_ads} verified ads + 
              {eligibility.options_met}/{eligibility.required_options} options
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px', fontSize: '11px'}}>
              <div className={`stat-card ${eligibility.option_details.level.met ? 'completed' : ''}`}>
                <div style={{color: eligibility.option_details.level.met ? 'var(--secondary)' : 'var(--text-muted)'}}>
                  {eligibility.option_details.level.met ? '✅' : '❌'} Level {eligibility.option_details.level.current}/{eligibility.option_details.level.required}
                </div>
              </div>
              <div className={`stat-card ${eligibility.option_details.streak.met ? 'completed' : ''}`}>
                <div style={{color: eligibility.option_details.streak.met ? 'var(--secondary)' : 'var(--text-muted)'}}>
                  {eligibility.option_details.streak.met ? '✅' : '❌'} Streak {eligibility.option_details.streak.current}/{eligibility.option_details.streak.required}
                </div>
              </div>
              <div className={`stat-card ${eligibility.option_details.referrals.met ? 'completed' : ''}`}>
                <div style={{color: eligibility.option_details.referrals.met ? 'var(--secondary)' : 'var(--text-muted)'}}>
                  {eligibility.option_details.referrals.met ? '✅' : '❌'} Referrals {eligibility.option_details.referrals.current}/{eligibility.option_details.referrals.required}
                </div>
              </div>
              <div className={`stat-card ${eligibility.option_details.account_age.met ? 'completed' : ''}`}>
                <div style={{color: eligibility.option_details.account_age.met ? 'var(--secondary)' : 'var(--text-muted)'}}>
                  {eligibility.option_details.account_age.met ? '✅' : '❌'} Age {eligibility.option_details.account_age.current}/{eligibility.option_details.account_age.required}d
                </div>
              </div>
            </div>
            {eligibility.reasons.length > 0 && (
              <div style={{fontSize: '11px', color: 'var(--danger)', marginBottom: '12px'}}>
                {eligibility.reasons.map((r, i) => <div key={i}>• {r}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Withdraw Form */}
        {eligibility?.eligible ? (
          <>
            <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
              <input
                className="input"
                type="number"
                placeholder="BC amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={eligibility.min_ton * 1000}
                max={wallet?.bc_available || 0}
                disabled={withdrawing}
              />
              <button className="btn btn-primary" onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount}>
                {withdrawing ? 'Requesting...' : `Request → ~${withdrawAmount ? formatTON(parseInt(withdrawAmount) * 0.000001) : 0} TON`}
              </button>
            </div>
            <p style={{fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center'}}>
              Min: {formatTON(eligibility.min_ton)} TON • Fee: {formatTON(0.0001)} TON • Max {eligibility.max_per_day}/day
            </p>
          </>
        ) : (
          <p style={{fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px'}}>
            Complete requirements above to unlock withdrawals
          </p>
        )}
      </div>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📜 Withdrawal History</h2>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {withdrawals.slice(0, 10).map((w: any) => (
              <div key={w.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', background: 'var(--bg)', borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span className={`reward-tag ${['REQUESTED', 'APPROVED'].includes(w.status) ? 'xp' : w.status === 'PAID' ? 'bc' : 'danger'}`}>
                      {w.status}
                    </span>
                    <span style={{fontWeight: '600'}}>{w.net_ton} TON</span>
                  </div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                    {w.amount_bc.toLocaleString()} BC • {new Date(w.requested_at).toLocaleDateString()}
                  </div>
                </div>
                {w.tx_reference && (
                  <span style={{fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace'}}>
                    {w.tx_reference.slice(0, 16)}...
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTON(ton: number): string {
  return ton.toFixed(6);
}