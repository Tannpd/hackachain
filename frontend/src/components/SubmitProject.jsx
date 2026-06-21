/**
 * SubmitProject.jsx
 * =================
 * Form for participants to submit their hackathon project.
 * Supports: project name, URL validation, organizer setup panel.
 */

import { useState } from 'react';

export default function SubmitProject({ useHook }) {
  const { account, connectWallet, hackathonInfo, loading,
          setupHackathon, submitProject } = useHook;

  // Submit form state
  const [projName, setProjName] = useState('');
  const [projUrl,  setProjUrl]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedPid, setSubmittedPid] = useState(null);

  // Organizer setup form state
  const [orgName,  setOrgName]  = useState('');
  const [orgPrize, setOrgPrize] = useState('1000000');
  const [orgSub,   setOrgSub]   = useState('');
  const [orgJudge, setOrgJudge] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await submitProject({ name: projName, url: projUrl });
    if (ok) {
      setSubmitted(true);
      setProjName('');
      setProjUrl('');
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    const subTs   = Math.floor(new Date(orgSub).getTime() / 1000);
    const judgeTs = Math.floor(new Date(orgJudge).getTime() / 1000);
    const ok = await setupHackathon({
      name: orgName,
      prizeWei: parseInt(orgPrize, 10),
      subDeadline:   subTs,
      judgeDeadline: judgeTs,
    });
    if (ok) setShowSetup(false);
  }

  if (!account) {
    return (
      <div className="section">
        <div className="container">
          <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
            <h3 style={{ marginBottom: '0.75rem' }}>Connect Your Wallet</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Connect your GenLayer-compatible wallet to submit your project
              or configure a hackathon.
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
        <div className="two-col">

          {/* ── Left: Submit Project ─────────────────────────────── */}
          <div>
            <div className="section-header">
              <h2 className="section-title gradient-text">Submit Your Project</h2>
              <p className="section-sub">
                Your public URL will be autonomously evaluated by the AI judge on-chain.
              </p>
            </div>

            {/* Connected wallet banner */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem',
                          padding:'0.75rem 1rem', background:'rgba(16,185,129,0.06)',
                          border:'1px solid rgba(16,185,129,0.2)', borderRadius:'10px' }}>
              <span style={{ color:'#10b981', fontSize:'1.1rem' }}>●</span>
              <div>
                <div style={{ fontSize:'0.75rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>Connected</div>
                <div className="addr-chip" style={{ marginTop:'2px' }}>
                  {account.slice(0, 8)}…{account.slice(-6)}
                </div>
              </div>
            </div>

            {submitted && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'1rem',
                            background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)',
                            borderRadius:'10px', marginBottom:'1.25rem' }}>
                <span style={{ fontSize:'1.4rem' }}>🎉</span>
                <div>
                  <div style={{ fontWeight:700, color:'#10b981' }}>Project Submitted!</div>
                  <div style={{ fontSize:'0.8rem', color:'#64748b' }}>
                    The organizer will trigger AI judging soon. Check the Leaderboard tab for results.
                  </div>
                </div>
              </div>
            )}

            {!hackathonInfo?.name ? (
              <div className="card" style={{ textAlign:'center', padding:'2rem' }}>
                <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>⚙️</div>
                <p style={{ color:'#64748b', fontSize:'0.9rem' }}>
                  No hackathon has been set up yet.
                  Are you the organizer? Click below to configure one.
                </p>
                <button className="btn btn-secondary" style={{ marginTop:'1rem' }}
                  onClick={() => setShowSetup(true)}>
                  Configure Hackathon →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-icon violet">🚀</div>
                    <div>
                      <h3>New Submission</h3>
                      <div style={{ fontSize:'0.8rem', color:'#64748b' }}>
                        for <strong style={{ color:'#8b5cf6' }}>{hackathonInfo.name}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-name">Project Name</label>
                    <input id="proj-name" className="form-input" required
                      placeholder="e.g. DeFi Oracle Aggregator"
                      value={projName} onChange={e => setProjName(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-url">Project URL</label>
                    <input id="proj-url" className="form-input mono" type="url" required
                      placeholder="https://devpost.com/software/your-project"
                      value={projUrl} onChange={e => setProjUrl(e.target.value)} />
                    <p className="form-hint">
                      💡 Use a public Devpost, GitHub, or presentation URL.
                      The AI will scrape this page to generate your scorecard.
                    </p>
                  </div>

                  <div className="divider" />

                  {/* What the AI judges */}
                  <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.5rem' }}>
                    {[
                      { icon:'⚙️', label:'Tech Breakthrough', color:'var(--c-violet)' },
                      { icon:'🎨', label:'UI / UX Design',    color:'var(--c-cyan)' },
                      { icon:'✅', label:'Completeness',       color:'var(--c-emerald)' },
                    ].map(({ icon, label, color }) => (
                      <div key={label} style={{ flex:1, textAlign:'center', padding:'0.75rem 0.5rem',
                        background:'var(--c-surface-2)', border:'1px solid var(--c-border)', borderRadius:'10px' }}>
                        <div style={{ fontSize:'1.4rem' }}>{icon}</div>
                        <div style={{ fontSize:'0.72rem', color, fontWeight:600, marginTop:'0.3rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <button id="submit-project-btn" type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading.submit || hackathonInfo?.finalized}>
                    {loading.submit ? (
                      <><span className="pulse-dot" style={{ background:'white' }} />  Submitting…</>
                    ) : (
                      <><span>🚀</span> Submit Project</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Right: Organizer Panel ───────────────────────────── */}
          <div>
            <div className="section-header">
              <h2 className="section-title">Hackathon Info</h2>
              <p className="section-sub">Current hackathon status and controls.</p>
            </div>

            {hackathonInfo?.name ? (
              <div className="card">
                <div className="card-header">
                  <div className="card-icon amber">🏆</div>
                  <div>
                    <h3>{hackathonInfo.name}</h3>
                    <span className={`status-pill ${hackathonInfo.finalized ? 'status-done' : 'status-judging'}`}>
                      <span className="pulse-dot" />
                      {hackathonInfo.finalized ? 'Finalized' : 'Live'}
                    </span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.25rem' }}>
                  {[
                    { label:'Prize Pool', value: `${(hackathonInfo.pool / 1_000_000).toFixed(2)} USDC`, icon:'💰' },
                    { label:'Submissions', value: hackathonInfo.count, icon:'📦' },
                  ].map(({ label, value, icon }) => (
                    <div key={label} style={{ padding:'1rem', background:'var(--c-bg-2)',
                      border:'1px solid var(--c-border)', borderRadius:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:'1.5rem' }}>{icon}</div>
                      <div style={{ fontSize:'1.25rem', fontWeight:800, fontFamily:'var(--font-mono)', marginTop:'0.25rem' }}>{value}</div>
                      <div style={{ fontSize:'0.72rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Prize distribution info */}
                <div style={{ marginTop:'0.5rem' }}>
                  <div style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:600, textTransform:'uppercase',
                    letterSpacing:'0.05em', marginBottom:'0.75rem' }}>Prize Distribution</div>
                  {[
                    { rank:'🥇 1st Place', pct:'50%', color:'#f59e0b' },
                    { rank:'🥈 2nd Place', pct:'30%', color:'#94a3b8' },
                    { rank:'🥉 3rd Place', pct:'20%', color:'#cd7f32' },
                  ].map(({ rank, pct, color }) => (
                    <div key={rank} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'0.4rem 0', borderBottom:'1px solid var(--c-border)' }}>
                      <span style={{ fontSize:'0.875rem' }}>{rank}</span>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color }}>{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : showSetup ? (
              <form onSubmit={handleSetup}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-icon cyan">⚙️</div>
                    <h3>Configure Hackathon</h3>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-name">Hackathon Name</label>
                    <input id="org-name" className="form-input" required
                      placeholder="ETHGlobal Bangkok 2025"
                      value={orgName} onChange={e => setOrgName(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-prize">Prize Pool (USDC micro-units)</label>
                    <input id="org-prize" className="form-input mono" type="number" min="1" required
                      placeholder="1000000 = 1 USDC"
                      value={orgPrize} onChange={e => setOrgPrize(e.target.value)} />
                    <p className="form-hint">💡 1 USDC = 1,000,000 micro-units (6 decimals)</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-sub">Submission Deadline</label>
                    <input id="org-sub" className="form-input" type="datetime-local" required
                      value={orgSub} onChange={e => setOrgSub(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-judge">Judging Deadline</label>
                    <input id="org-judge" className="form-input" type="datetime-local" required
                      value={orgJudge} onChange={e => setOrgJudge(e.target.value)} />
                  </div>

                  <div style={{ display:'flex', gap:'0.75rem' }}>
                    <button type="button" className="btn btn-secondary"
                      style={{ flex:1 }} onClick={() => setShowSetup(false)}>Cancel</button>
                    <button id="setup-hackathon-btn" type="submit"
                      className="btn btn-primary" style={{ flex:2 }} disabled={loading.setup}>
                      {loading.setup ? 'Creating…' : '⚡ Create Hackathon'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="card" style={{ textAlign:'center', padding:'2.5rem' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.4 }}>🏗️</div>
                <p style={{ color:'#64748b', fontSize:'0.9rem', marginBottom:'1.25rem' }}>
                  No active hackathon. Organizers can create one to get started.
                </p>
                <button className="btn btn-primary" onClick={() => setShowSetup(true)}>
                  <span>⚙️</span> Create Hackathon
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
