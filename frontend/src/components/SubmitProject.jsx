/**
 * SubmitProject.jsx
 * =================
 * Form for participants to submit their hackathon project.
 * Supports: project name, URL validation, organizer setup panel.
 */

import { useState } from 'react';
import { 
  RocketIcon, 
  GearIcon, 
  TrophyIcon, 
  PaintIcon, 
  CheckIcon, 
  CodeIcon, 
  LockIcon, 
  LogoIcon,
  WalletIcon
} from './Icons';

export default function SubmitProject({ useHook }) {
  const { account, connectWallet, hackathonInfo, loading,
          setupHackathon, submitProject } = useHook;

  // Submit form state
  const [projName, setProjName] = useState('');
  const [projUrl,  setProjUrl]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedPid, setSubmittedPid] = useState(null);

  const isSubmissionPassed = hackathonInfo?.submissionDeadline && (Date.now() / 1000 >= hackathonInfo.submissionDeadline);

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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="card-icon violet" style={{ width: 64, height: 64, borderRadius: 16 }}>
                <LockIcon size={32} />
              </div>
            </div>
            <h3 style={{ marginBottom: '0.75rem' }}>Connect Your Wallet</h3>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Connect your GenLayer-compatible wallet to submit your project
              or configure a hackathon.
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
                          padding:'0.75rem 1rem', background:'rgba(52,211,153,0.05)',
                          border:'1px solid rgba(52,211,153,0.2)', borderRadius:'10px' }}>
              <span style={{ color:'#34d399', fontSize:'1.1rem', display:'flex', alignItems:'center' }}>
                <span className="pulse-dot" style={{ width: 8, height: 8 }} />
              </span>
              <div>
                <div style={{ fontSize:'0.75rem', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700 }}>Connected Wallet</div>
                <div className="addr-chip" style={{ marginTop:'4px' }}>
                  {account.slice(0, 8)}…{account.slice(-6)}
                </div>
              </div>
            </div>

            {submitted && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'1rem',
                            background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.25)',
                            borderRadius:'12px', marginBottom:'1.5rem' }}>
                <CheckIcon size={24} style={{ color: 'var(--c-emerald)' }} />
                <div>
                  <div style={{ fontWeight:700, color:'#34d399' }}>Project Submitted!</div>
                  <div style={{ fontSize:'0.85rem', color:'#9ca3af' }}>
                    The organizer will trigger AI judging soon. Check the Leaderboard tab for results.
                  </div>
                </div>
              </div>
            )}

            {!hackathonInfo?.name ? (
              <div className="card" style={{ textAlign:'center', padding:'2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div className="card-icon violet" style={{ width: 54, height: 54, borderRadius: 14 }}>
                    <GearIcon size={24} />
                  </div>
                </div>
                <p style={{ color:'#9ca3af', fontSize:'0.95rem' }}>
                  No hackathon has been set up yet.
                  Are you the organizer? Click below to configure one.
                </p>
                <button className="btn btn-secondary" style={{ marginTop:'1.25rem' }}
                  onClick={() => setShowSetup(true)}>
                  Configure Hackathon →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-icon violet">
                      <RocketIcon size={20} />
                    </div>
                    <div>
                      <h3>New Submission</h3>
                      <div style={{ fontSize:'0.8rem', color:'#9ca3af', marginTop:'0.2rem' }}>
                        for <strong style={{ color:'#a78bfa' }}>{hackathonInfo.name}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-name">Project Name</label>
                    <input id="proj-name" className="form-input" required
                      placeholder="e.g. DeFi Oracle Aggregator"
                      value={projName} onChange={e => setProjName(e.target.value)}
                      onInvalid={e => e.target.setCustomValidity('Please fill out this field.')}
                      onInput={e => e.target.setCustomValidity('')} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-url">Project URL</label>
                    <input id="proj-url" className="form-input mono" type="url" required
                      placeholder="https://github.com/your-repo/project"
                      value={projUrl} onChange={e => setProjUrl(e.target.value)}
                      onInvalid={e => {
                        if (e.target.value === '') {
                          e.target.setCustomValidity('Please fill out this field.');
                        } else {
                          e.target.setCustomValidity('Please enter a valid URL.');
                        }
                      }}
                      onInput={e => e.target.setCustomValidity('')} />
                    <p className="form-hint">
                      💡 Use a public GitHub repo, Vercel demo, or Devpost URL.
                      The AI will scrape this page to generate your scorecard.
                    </p>
                  </div>

                  <div className="divider" />

                  {/* What the AI judges */}
                  <div style={{ display:'flex', gap:'0.75rem', marginBottom:'2rem' }}>
                    {[
                      { icon: CodeIcon, label:'Tech Level', color:'var(--c-violet)' },
                      { icon: PaintIcon, label:'UI / UX Design',    color:'var(--c-cyan)' },
                      { icon: CheckIcon, label:'Completeness',       color:'var(--c-emerald)' },
                    ].map(({ icon: IconComponent, label, color }) => (
                      <div key={label} style={{ flex:1, textAlign:'center', padding:'1rem 0.5rem',
                        background:'rgba(255,255,255,0.02)', border:'1px solid var(--c-border)', borderRadius:'12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', color }}>
                          <IconComponent size={22} />
                        </div>
                        <div style={{ fontSize:'0.75rem', color, fontWeight:700, marginTop:'0.5rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <button id="submit-project-btn" type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading.submit || hackathonInfo?.finalized || isSubmissionPassed}>
                    {loading.submit ? (
                      <><span className="pulse-dot" style={{ background:'#030712' }} />  Submitting…</>
                    ) : isSubmissionPassed ? (
                      <>
                        <LockIcon size={16} />
                        Submission Deadline Passed
                      </>
                    ) : (
                      <>
                        <RocketIcon size={16} />
                        Submit Project
                      </>
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
                  <div className="card-icon amber">
                    <TrophyIcon size={20} />
                  </div>
                  <div>
                    <h3>{hackathonInfo.name}</h3>
                    <span className={`status-pill ${hackathonInfo.finalized ? 'status-done' : 'status-judging'}`} style={{ marginTop:'0.4rem' }}>
                      <span className="pulse-dot" />
                      {hackathonInfo.finalized ? 'Finalized' : 'Live'}
                    </span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
                  {[
                    { label:'Prize Pool', value: `${(hackathonInfo.pool / 1_000_000).toFixed(2)} USDC`, icon: TrophyIcon, color: 'var(--c-amber)' },
                    { label:'Submissions', value: hackathonInfo.count, icon: RocketIcon, color: 'var(--c-violet)' },
                  ].map(({ label, value, icon: IconComponent, color }) => (
                    <div key={label} style={{ padding:'1.25rem 1rem', background:'rgba(11, 15, 25, 0.6)',
                      border:'1px solid var(--c-border)', borderRadius:'14px', textAlign:'center' }}>
                      <div style={{ display:'flex', justifyContent:'center', color, marginBottom: '0.4rem' }}>
                        <IconComponent size={24} />
                      </div>
                      <div style={{ fontSize:'1.4rem', fontWeight:900, fontFamily:'var(--font-mono)', marginTop:'0.25rem', color: '#f3f4f6' }}>{value}</div>
                      <div style={{ fontSize:'0.75rem', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginTop: '0.2rem', fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Prize distribution info */}
                <div style={{ marginTop:'0.5rem' }}>
                  <div style={{ fontSize:'0.8rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.08em', marginBottom:'1rem', borderBottom:'1px solid var(--c-border)', paddingBottom:'0.5rem' }}>Prize Distribution</div>
                  {[
                    { rank:'🥇 1st Place', pct:'50%', color:'var(--c-amber)' },
                    { rank:'🥈 2nd Place', pct:'30%', color:'#d1d5db' },
                    { rank:'🥉 3rd Place', pct:'20%', color:'#b45309' },
                  ].map(({ rank, pct, color }) => (
                    <div key={rank} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'0.6rem 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize:'0.9rem', fontWeight: 600 }}>{rank}</span>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:800, color, fontSize:'1rem' }}>{pct}</span>
                    </div>
                  ))}
                </div>

                {/* Deadlines info */}
                <div style={{ marginTop:'1.5rem' }}>
                  <div style={{ fontSize:'0.8rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.08em', marginBottom:'1rem', borderBottom:'1px solid var(--c-border)', paddingBottom:'0.5rem' }}>Deadlines</div>
                  {[
                    { label:'Submission Deadline', time: hackathonInfo.submissionDeadline },
                    { label:'Judging Deadline', time: hackathonInfo.judgingDeadline },
                  ].map(({ label, time }) => {
                    const formatted = time ? new Date(time * 1000).toLocaleString() : 'Not set';
                    const isPassed = time && (Date.now() / 1000 >= time);
                    return (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'0.6rem 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize:'0.9rem', fontWeight: 600, color: '#f3f4f6' }}>{label}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', fontWeight: 700, color: isPassed ? 'var(--c-rose)' : 'var(--c-emerald)' }}>
                          {formatted} {isPassed && '(Passed)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : showSetup ? (
              <form onSubmit={handleSetup}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-icon cyan">
                      <GearIcon size={20} />
                    </div>
                    <h3>Configure Hackathon</h3>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-name">Hackathon Name</label>
                    <input id="org-name" className="form-input" required
                      placeholder="ETHGlobal Bangkok 2025"
                      value={orgName} onChange={e => setOrgName(e.target.value)}
                      onInvalid={e => e.target.setCustomValidity('Please fill out this field.')}
                      onInput={e => e.target.setCustomValidity('')} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-prize">Prize Pool (USDC micro-units)</label>
                    <input id="org-prize" className="form-input mono" type="number" min="1" required
                      placeholder="1000000 = 1 USDC"
                      value={orgPrize} onChange={e => setOrgPrize(e.target.value)}
                      onInvalid={e => {
                        if (e.target.value === '') {
                          e.target.setCustomValidity('Please fill out this field.');
                        } else {
                          e.target.setCustomValidity('Please enter a valid prize pool amount.');
                        }
                      }}
                      onInput={e => e.target.setCustomValidity('')} />
                    <p className="form-hint">💡 1 USDC = 1,000,000 micro-units (6 decimals)</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-sub">Submission Deadline</label>
                    <input id="org-sub" className="form-input" type="datetime-local" required
                      value={orgSub} onChange={e => setOrgSub(e.target.value)}
                      onInvalid={e => e.target.setCustomValidity('Please specify the submission deadline.')}
                      onInput={e => e.target.setCustomValidity('')} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="org-judge">Judging Deadline</label>
                    <input id="org-judge" className="form-input" type="datetime-local" required
                      value={orgJudge} onChange={e => setOrgJudge(e.target.value)}
                      onInvalid={e => e.target.setCustomValidity('Please specify the judging deadline.')}
                      onInput={e => e.target.setCustomValidity('')} />
                  </div>

                  <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
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
              <div className="card" style={{ textAlign:'center', padding:'3rem 2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div className="card-icon violet" style={{ width: 64, height: 64, borderRadius: 16, opacity: 0.8 }}>
                    <LogoIcon size={32} />
                  </div>
                </div>
                <p style={{ color:'#9ca3af', fontSize:'0.95rem', marginBottom:'1.5rem' }}>
                  No active hackathon. Organizers can create one to get started.
                </p>
                <button className="btn btn-primary" onClick={() => setShowSetup(true)}>
                  <GearIcon size={16} /> Create Hackathon
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
