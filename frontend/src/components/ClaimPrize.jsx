/**
 * ClaimPrize.jsx
 * ==============
 * Lets winners check their allocated prize and claim it.
 * Shows full scorecard for their best submission + prize amount.
 */

import { useState, useEffect } from 'react';

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
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🏆</div>
            <h3 style={{ marginBottom:'0.75rem' }}>Claim Your Prize</h3>
            <p style={{ color:'#64748b', marginBottom:'1.5rem', fontSize:'0.9rem' }}>
              Connect your wallet to check if you've won a prize in the hackathon.
            </p>
            <button className="btn btn-primary btn-full" onClick={connectWallet}>
              <span>⚡</span> Connect Wallet
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
            <div style={{ fontSize:'2rem', fontWeight:800, color:'white',
              textShadow:'0 0 30px rgba(245,158,11,0.8)', animation:'prize-pop 0.5s ease 0.1s' }}>
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
          <div className="card" style={{ marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:'var(--grad-brand)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>👤</div>
                <div>
                  <div style={{ fontSize:'0.75rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>Your Wallet</div>
                  <div className="addr-chip" style={{ marginTop:'2px' }}>
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
              <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.5 }}>⏳</div>
              <h3 style={{ marginBottom:'0.75rem' }}>Judging In Progress</h3>
              <p style={{ color:'#64748b', fontSize:'0.9rem' }}>
                The organizer is currently judging submissions. Once all projects have been evaluated
                and the hackathon is finalized, prizes will be locked in and claimable here.
              </p>

              {myBest && (
                <div style={{ marginTop:'1.5rem', padding:'1rem', background:'var(--c-surface-2)',
                  border:'1px solid var(--c-border)', borderRadius:'12px', textAlign:'left' }}>
                  <div style={{ fontSize:'0.75rem', color:'#64748b', fontWeight:600, textTransform:'uppercase',
                    letterSpacing:'0.05em', marginBottom:'0.75rem' }}>Your Current Score</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'2.5rem', fontWeight:900,
                      background:'var(--grad-brand)', WebkitBackgroundClip:'text',
                      WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                      {myBest.total_score}
                    </div>
                    <div>
                      <div style={{ fontWeight:600 }}>{myBest.project_name}</div>
                      <div style={{ fontSize:'0.8rem', color:'#64748b' }}>
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
                  <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.5 }}>😢</div>
                  <h3 style={{ marginBottom:'0.75rem' }}>No Prize This Time</h3>
                  <p style={{ color:'#64748b', fontSize:'0.9rem' }}>
                    Your wallet address did not finish in the top 3. Keep building — the next
                    hackathon is around the corner!
                  </p>
                </div>
              ) : (
                <div>
                  {/* Winner banner */}
                  <div style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(139,92,246,0.1))',
                    border:'1px solid rgba(245,158,11,0.3)', borderRadius:'20px', padding:'2rem',
                    textAlign:'center', marginBottom:'1.25rem', position:'relative', overflow:'hidden' }}>

                    <div style={{ position:'absolute', top:'-20px', right:'-20px', fontSize:'6rem', opacity:0.08 }}>🏆</div>

                    <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>🎊</div>
                    <h2 style={{ marginBottom:'0.5rem' }}>
                      Congratulations, <span className="gradient-text">Winner!</span>
                    </h2>
                    <p style={{ color:'#94a3b8', fontSize:'0.9rem', marginBottom:'1.5rem' }}>
                      The AI judge has awarded you the following prize from the pool.
                    </p>

                    <div style={{ display:'inline-block', background:'rgba(0,0,0,0.3)',
                      borderRadius:'16px', padding:'1.5rem 3rem', border:'1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ fontSize:'0.75rem', color:'#94a3b8', textTransform:'uppercase',
                        letterSpacing:'0.08em', marginBottom:'0.25rem' }}>Your Prize</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'3rem', fontWeight:900,
                        background:'var(--grad-gold)', WebkitBackgroundClip:'text',
                        WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                        {(prizeAmount / 1_000_000).toFixed(2)}
                      </div>
                      <div style={{ color:'#94a3b8', fontSize:'0.9rem', fontWeight:600 }}>USDC</div>
                    </div>
                    <div style={{ marginTop:'0.5rem', fontSize:'0.75rem', color:'#475569', fontFamily:'var(--font-mono)' }}>
                      = {prizeAmount.toLocaleString()} wei
                    </div>
                  </div>

                  {/* Claim button */}
                  {!claimed ? (
                    <button id="claim-prize-btn" className="btn btn-gold btn-full"
                      style={{ fontSize:'1.05rem', padding:'1rem' }}
                      disabled={loading.claim}
                      onClick={handleClaim}>
                      {loading.claim ? (
                        <><span className="pulse-dot" style={{ background:'white' }} /> Processing…</>
                      ) : (
                        <><span>💰</span> Claim {(prizeAmount / 1_000_000).toFixed(2)} USDC</>
                      )}
                    </button>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.5rem',
                      background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)',
                      borderRadius:'12px', justifyContent:'center' }}>
                      <span style={{ fontSize:'1.5rem' }}>✅</span>
                      <div>
                        <div style={{ fontWeight:700, color:'var(--c-emerald)' }}>Prize Successfully Claimed</div>
                        <div style={{ fontSize:'0.8rem', color:'#64748b' }}>
                          Funds have been transferred to your wallet.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* My best submission scorecard */}
                  {myBest && (
                    <div className="card" style={{ marginTop:'1.25rem' }}>
                      <div className="card-header">
                        <div className="card-icon amber">📊</div>
                        <div>
                          <h3>Your Winning Scorecard</h3>
                          <div style={{ fontSize:'0.8rem', color:'#64748b' }}>{myBest.project_name}</div>
                        </div>
                      </div>

                      <div style={{ textAlign:'center', marginBottom:'1rem' }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'3.5rem', fontWeight:900,
                          background:'var(--grad-brand)', WebkitBackgroundClip:'text',
                          WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                          {myBest.total_score}
                        </span>
                        <span style={{ color:'#475569', fontFamily:'var(--font-mono)', fontSize:'1.2rem' }}>/90</span>
                      </div>

                      <div className="score-section">
                        {[
                          { label:'⚙️ Tech Breakthrough', value: myBest.tech_score, cls:'tech' },
                          { label:'🎨 UI / UX Design',    value: myBest.ui_score,   cls:'ui' },
                          { label:'✅ Completeness',       value: myBest.completeness_score, cls:'complete' },
                        ].map(({ label, value, cls }) => (
                          <div key={cls} className="score-row">
                            <div className="score-header">
                              <span className="score-label">{label}</span>
                              <span className="score-value" style={{
                                color: cls==='tech'?'var(--c-violet)':cls==='ui'?'var(--c-cyan)':'var(--c-amber)'
                              }}>{value}<span style={{color:'#475569'}}>/30</span></span>
                            </div>
                            <div className="score-bar-bg">
                              <div className={`score-bar-fill ${cls}`} style={{ width:`${(value/30)*100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {myBest.reasoning && (
                        <div className="reasoning-box">
                          <div style={{ fontSize:'0.7rem', color:'#64748b', fontWeight:700, textTransform:'uppercase',
                            letterSpacing:'0.06em', marginBottom:'0.5rem', fontStyle:'normal' }}>🤖 AI Judge Reasoning</div>
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
