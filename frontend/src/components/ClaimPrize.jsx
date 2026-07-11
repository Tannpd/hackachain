/**
 * ClaimPrize.jsx
 * =============
 * Lets winners check their allocated prize and claim it.
 * Shows full scorecard for their best submission + prize amount.
 */

import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  WalletIcon,
  LogoIcon,
  UserIcon,
  CheckIcon,
  CodeIcon,
  PaintIcon,
  BrainIcon
} from './Icons';

export default function ClaimPrize({ useHook }) {
  const { account, connectWallet, hackathonInfo, loading,
          claimPrize, getPrizeClaim, leaderboard } = useHook;

  const [prizeAmount, setPrizeAmount]     = useState(null);
  const [claimed, setClaimed]             = useState(false);
  const [checking, setChecking]           = useState(false);
  const [confetti, setConfetti]           = useState(false);

  // Find if the current user has an entry in the leaderboard
  const myEntries = leaderboard.filter(e => e.submitter === account);
  const myBest    = myEntries[0] || null;

  async function checkPrize() {
    setChecking(true);
    const amount = await getPrizeClaim();
    setPrizeAmount(amount);
    setChecking(false);
  }

  async function handleClaim() {
    const amount = await claimPrize();
    if (amount !== null) {
      setClaimed(true);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
    }
  }

  useEffect(() => {
    if (account && hackathonInfo?.finalized) checkPrize();
  }, [account, hackathonInfo?.finalized]);

  if (!account) {
    return (
      <div className="section">
        <div className="container">
          <div className="card" style={{ maxWidth:500, margin:'0 auto', textAlign:'center', padding:'3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="card-icon amber" style={{ width: 64, height: 64, borderRadius: 16 }}>
                <TrophyIcon size={32} />
              </div>
            </div>
            <h3 style={{ marginBottom:'0.75rem' }}>Claim Your Prize</h3>
            <p style={{ color:'#9ca3af', marginBottom:'1.5rem', fontSize:'0.95rem' }}>
              Connect your wallet to check if you've won a prize in the hackathon.
            </p>
            <button className="btn btn-primary btn-full" onClick={connectWallet}>
              <WalletIcon size={16} /> Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">

        {/* Confetti overlay */}
        {confetti && (
          <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem' }}>
            <div style={{ fontSize:'6rem', animation:'prize-pop 0.5s ease' }}>🎉</div>
            <div style={{ fontSize:'2.5rem', fontWeight:900, color:'white',
              textShadow:'0 0 35px rgba(251,191,36,0.9)', animation:'prize-pop 0.5s ease 0.1s' }}>
              Prize Claimed!
            </div>
            <style>{`@keyframes prize-pop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }`}</style>
          </div>
        )}

        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div className="section-header" style={{ textAlign:'center' }}>
            <h2 className="section-title gradient-text">Claim Your Prize</h2>
            <p className="section-sub">
              {hackathonInfo?.finalized
                ? 'The hackathon has been finalized. Check your prize allocation below.'
                : 'Prizes will be claimable once the organizer finalizes the hackathon.'}
            </p>
          </div>

          {/* Wallet info */}
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:'var(--grad-brand)',
                  display:'flex', alignItems:'center', justifyContent:'center', color: '#030712' }}>
                  <UserIcon size={18} />
                </div>
                <div>
                  <div style={{ fontSize:'0.75rem', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700 }}>Your Wallet</div>
                  <div className="addr-chip" style={{ marginTop:'4px' }}>
                    {account.slice(0,10)}…{account.slice(-8)}
                  </div>
                </div>
              </div>

              <span className={`status-pill ${hackathonInfo?.finalized ? 'status-done' : 'status-pending'}`}>
                <span className="pulse-dot" />
                {hackathonInfo?.finalized ? 'Finalized' : 'Pending Finalization'}
              </span>
            </div>
          </div>

          {!hackathonInfo?.finalized ? (
            /* Not finalized yet */
            <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div className="card-icon violet" style={{ width: 64, height: 64, borderRadius: 16 }}>
                  <LogoIcon size={32} className="spin-slow" />
                </div>
              </div>
              <h3 style={{ marginBottom:'0.75rem' }}>Judging In Progress</h3>
              <p style={{ color:'#9ca3af', fontSize:'0.95rem', lineHeight: 1.6 }}>
                The organizer is currently judging submissions. Once all projects have been evaluated
                and the hackathon is finalized, prizes will be locked in and claimable here.
              </p>

              {myBest && (
                <div style={{ marginTop:'2rem', padding:'1.25rem', background:'rgba(255,255,255,0.02)',
                  border:'1px solid var(--c-border)', borderRadius:'14px', textAlign:'left' }}>
                  <div style={{ fontSize:'0.75rem', color:'#6b7280', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', marginBottom:'0.75rem' }}>Your Current Score</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'2.5rem', fontWeight:900,
                      background:'var(--grad-brand)', WebkitBackgroundClip:'text',
                      WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                      {myBest.total_score}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, color: '#f3f4f6' }}>{myBest.project_name}</div>
                      <div style={{ fontSize:'0.8rem', color:'#9ca3af', marginTop:'0.25rem' }}>
                        Tech: {myBest.tech_score} · UI: {myBest.ui_score} · Complete: {myBest.completeness_score}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Finalized — show prize */
            <div>
              {prizeAmount === null ? (
                <div className="card" style={{ textAlign:'center', padding:'2rem' }}>
                  <button className="btn btn-secondary" onClick={checkPrize} disabled={checking}>
                    {checking ? '⟳ Checking…' : '🔍 Check My Prize'}
                  </button>
                </div>
              ) : prizeAmount === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.4 }}>😢</div>
                  <h3 style={{ marginBottom:'0.75rem' }}>No Prize This Time</h3>
                  <p style={{ color:'#9ca3af', fontSize:'0.95rem', lineHeight: 1.6 }}>
                    Your wallet address did not finish in the top 3. Keep building — the next
                    hackathon is around the corner!
                  </p>
                </div>
              ) : (
                <div>
                  {/* Winner banner */}
                  <div style={{ background:'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(167,139,250,0.05) 100%)',
                    border:'1px solid rgba(251,191,36,0.25)', borderRadius:'24px', padding:'2.5rem 2rem',
                    textAlign:'center', marginBottom:'1.5rem', position:'relative', overflow:'hidden' }}>

                    <div style={{ position:'absolute', top:'-20px', right:'-20px', color: 'var(--c-amber)', opacity:0.06 }}>
                      <TrophyIcon size={120} />
                    </div>

                    <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>🏆</div>
                    <h2 style={{ marginBottom:'0.5rem' }}>
                      Congratulations, <span className="gradient-text">Winner!</span>
                    </h2>
                    <p style={{ color:'#9ca3af', fontSize:'0.95rem', marginBottom:'1.75rem' }}>
                      The AI judge has awarded you the following prize from the pool.
                    </p>

                    <div style={{ display:'inline-block', background:'rgba(3, 7, 18, 0.6)',
                      borderRadius:'18px', padding:'1.5rem 3.5rem', border:'1px solid rgba(251,191,36,0.15)' }}>
                      <div style={{ fontSize:'0.75rem', color:'#9ca3af', textTransform:'uppercase',
                        letterSpacing:'0.08em', marginBottom:'0.4rem', fontWeight: 700 }}>Your Prize</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'3.5rem', fontWeight:900,
                        background: 'var(--grad-gold)', WebkitBackgroundClip:'text',
                        WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight: 1 }}>
                        {(prizeAmount / 1_000_000).toFixed(2)}
                      </div>
                      <div style={{ color:'#fbbf24', fontSize:'1rem', fontWeight:800, marginTop: '0.25rem', letterSpacing: '0.05em' }}>USDC</div>
                    </div>
                    <div style={{ marginTop:'0.75rem', fontSize:'0.78rem', color:'#4b5563', fontFamily:'var(--font-mono)' }}>
                      = {prizeAmount.toLocaleString()} wei
                    </div>
                  </div>

                  {/* Claim button */}
                  {!claimed ? (
                    <button id="claim-prize-btn" className="btn btn-gold btn-full"
                      style={{ fontSize:'1.05rem', padding:'1.1rem' }}
                      disabled={loading.claim}
                      onClick={handleClaim}>
                      {loading.claim ? (
                        <><span className="pulse-dot" style={{ background:'#030712' }} /> Processing…</>
                      ) : (
                        <>
                          <WalletIcon size={18} />
                          Claim {(prizeAmount / 1_000_000).toFixed(2)} USDC
                        </>
                      )}
                    </button>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1.25rem 1.5rem',
                      background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.25)',
                      borderRadius:'14px', justifyContent:'center' }}>
                      <CheckIcon size={24} style={{ color: 'var(--c-emerald)' }} />
                      <div>
                        <div style={{ fontWeight:700, color:'var(--c-emerald)' }}>Prize Successfully Claimed</div>
                        <div style={{ fontSize:'0.85rem', color:'#9ca3af' }}>
                          Funds have been transferred to your wallet.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* My best submission scorecard */}
                  {myBest && (
                    <div className="card" style={{ marginTop:'1.5rem' }}>
                      <div className="card-header">
                        <div className="card-icon amber">
                          <TrophyIcon size={20} />
                        </div>
                        <div>
                          <h3>Your Winning Scorecard</h3>
                          <div style={{ fontSize:'0.8rem', color:'#9ca3af', marginTop:'0.2rem' }}>{myBest.project_name}</div>
                        </div>
                      </div>

                      <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'4rem', fontWeight:900,
                          background:'var(--grad-brand)', WebkitBackgroundClip:'text',
                          WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                          {myBest.total_score}
                        </span>
                        <span style={{ color:'#4b5563', fontFamily:'var(--font-mono)', fontSize:'1.25rem', fontWeight: 700 }}>/90</span>
                      </div>

                      <div className="score-section">
                        {[
                          { label:'Tech Level', value: myBest.tech_score, icon: CodeIcon, cls:'tech' },
                          { label:'UI / UX Design',    value: myBest.ui_score,   icon: PaintIcon, cls:'ui' },
                          { label:'Completeness',       value: myBest.completeness_score, icon: CheckIcon, cls:'complete' },
                        ].map(({ label, value, icon, cls }) => (
                          <ScoreBar key={cls} label={label} icon={icon} value={value} className={cls} />
                        ))}
                      </div>

                      {myBest.reasoning && (
                        <div className="reasoning-box">
                          <div style={{ fontSize:'0.75rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase',
                            letterSpacing:'0.06em', marginBottom:'0.5rem', fontStyle:'normal', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                            <BrainIcon size={14} /> AI Judge Reasoning
                          </div>
                          {myBest.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, icon: IconComponent, value, max = 30, className }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), 100);
    return () => clearTimeout(t);
  }, [value, max]);

  return (
    <div className="score-row">
      <div className="score-header">
        <span className="score-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {IconComponent && <IconComponent size={14} style={{ color: '#9ca3af' }} />}
          {label}
        </span>
        <span className="score-value" style={{ color: className === 'tech' ? 'var(--c-violet)' : className === 'ui' ? 'var(--c-cyan)' : 'var(--c-amber)' }}>
          {value}<span style={{ color:'#4b5563', fontWeight:400 }}>/{max}</span>
        </span>
      </div>
      <div className="score-bar-bg">
        <div className={`score-bar-fill ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
