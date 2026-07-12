/**
 * Leaderboard.jsx
 * ============
 * Live leaderboard showing all judged projects sorted by AI score.
 * Includes the "AI Judging in Progress" loading state with animated
 * step-by-step progress for the organizer judging flow.
 */

import { useState, useEffect } from 'react';
import {
  BrainIcon,
  TrophyIcon,
  PaintIcon,
  CheckIcon,
  CodeIcon,
  LockIcon,
  LogoIcon,
  RefreshIcon,
  InfoIcon,
  MonitorIcon,
  GlobeIcon
} from './Icons';

// Judging steps for the progress animation
const JUDGING_STEPS = [
  { icon: GlobeIcon, label: 'Fetching project URL via web.render()…' },
  { icon: MonitorIcon, label: 'Rendering full DOM (headless Chromium)…' },
  { icon: BrainIcon, label: 'AI Judge Panel evaluating (exec_prompt)…' },
  { icon: LockIcon, label: 'Validator nodes reaching consensus…' },
];

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

function ScorecardModal({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(3, 7, 18, 0.85)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem'
    }} onClick={onClose}>
      <div className="scorecard-panel" style={{ maxWidth:540, width:'100%' }}
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute', top:'1.5rem', right:'1.5rem',
          background:'transparent', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'1.25rem',
          transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#6b7280'}>✕</button>

        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.5rem' }}>
          <div className={`rank-badge rank-${entry.rank <= 3 ? entry.rank : 'n'}`}>{entry.rank}</div>
          <div>
            <h3 style={{ marginBottom:'0.15rem' }}>{entry.project_name}</h3>
            <div className="addr-chip">{entry.submitter?.slice(0,10)}…</div>
          </div>
        </div>

        <div className="total-score-display">
          <div className="total-score-number">{entry.total_score}</div>
          <div className="total-score-max">/90</div>
        </div>

        <div className="score-section">
          <ScoreBar label="Tech Level" icon={CodeIcon} value={entry.tech_score} className="tech" />
          <ScoreBar label="UI / UX Design" icon={PaintIcon} value={entry.ui_score} className="ui" />
          <ScoreBar label="Completeness" icon={CheckIcon} value={entry.completeness_score} className="complete" />
        </div>

        {entry.reasoning && (
          <div className="reasoning-box">
            <div style={{ fontSize:'0.75rem', color:'#9ca3af', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:'0.5rem', fontStyle:'normal', display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <BrainIcon size={14} /> AI Reasoning
            </div>
            {entry.reasoning}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Leaderboard({ useHook }) {
  const { account, leaderboard, projects, loading, judgingStep,
          judgeProject, finalizeHackathon, hackathonInfo, fetchLeaderboard, fetchProjects } = useHook;

  const [judgeTarget, setJudgeTarget] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchProjects();
  }, []);

  const isJudging = Object.keys(loading).some(k => k.startsWith('judge_') && loading[k]);
  const isOrganizer = account && hackathonInfo?.organizer && (account.toLowerCase() === hackathonInfo.organizer.toLowerCase());
  const unjudgedProjects = (projects || []).filter(p => !p.is_judged);

  return (
    <div className="section">
      <div className="container">
        <div className={isOrganizer ? "two-col" : ""} style={isOrganizer ? { alignItems:'start' } : { maxWidth: 680, margin: '0 auto' }}>

          {/* ── Left: Live Leaderboard ───────────────────────── */}
          <div>
            <div className="section-header">
              <h2 className="section-title gradient-text">Live Leaderboard</h2>
              <p className="section-sub">Ranked by consensus AI score. Click any row to view the full scorecard.</p>
            </div>

            <button className="btn btn-secondary" style={{ marginBottom:'1.5rem', fontSize:'0.85rem', padding:'0.5rem 1rem' }}
              onClick={() => { fetchLeaderboard(); fetchProjects(); }} disabled={loading.leaderboard}>
              <RefreshIcon size={14} className={loading.leaderboard ? 'spin' : ''} />
              {loading.leaderboard ? 'Refreshing…' : 'Refresh'}
            </button>

            {leaderboard.length === 0 ? (
              <div className="empty-state card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', color: '#4b5563' }}>
                  <LogoIcon size={48} />
                </div>
                <div className="empty-title">No scores yet</div>
                <div className="empty-desc">Projects will appear here once the AI has judged them.</div>
              </div>
            ) : (
              <div className="leaderboard-grid">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  return (
                    <div key={entry.pid}
                      className={`leaderboard-row ${rank === 1 ? 'rank-1-row' : ''}`}
                      onClick={() => setSelectedEntry({ ...entry, rank })}>

                      <div className={`rank-badge rank-${rank <= 3 ? rank : 'n'}`}>{rank}</div>

                      <div>
                        <div className="lb-project-name">{entry.project_name}</div>
                        <div className="lb-submitter">{entry.submitter?.slice(0,10)}…</div>
                        <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem', flexWrap:'wrap' }}>
                          {[
                            { label:'Tech', value: entry.tech_score, color:'var(--c-violet)' },
                            { label:'UI',   value: entry.ui_score,   color:'var(--c-cyan)' },
                            { label:'Done', value: entry.completeness_score, color:'var(--c-amber)' },
                          ].map(({ label, value, color }) => (
                            <span key={label} style={{ fontSize:'0.75rem', padding:'0.2rem 0.6rem',
                              background:'rgba(255,255,255,0.03)', border:'1px solid var(--c-border)',
                              borderRadius:'6px', color, fontFamily:'var(--font-mono)', fontWeight:700 }}>
                              {label} {value}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="lb-total-score">{entry.total_score}</div>
                        <div className="lb-score-label">/ 90 pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Organizer Controls / AI Judging Flow ─── */}
          {isOrganizer && (
            <div>
              <div className="section-header">
                <h2 className="section-title">Judge & Finalize</h2>
                <p className="section-sub">Organizer controls for AI judging and prize distribution.</p>
              </div>

              {/* AI Judging in Progress */}
              {isJudging && (
                <div className="card" style={{ marginBottom:'1.5rem' }}>
                  <div className="judging-overlay">
                    <div className="ai-spinner">
                      <div className="ai-spinner-ring" />
                      <div className="ai-spinner-ring" />
                      <div className="ai-spinner-ring" />
                      <span style={{ position:'absolute', inset:0, display:'flex',
                        alignItems:'center', justifyContent:'center', color: 'var(--c-violet)' }}>
                        <BrainIcon size={24} />
                      </span>
                    </div>
                    <h3 style={{ marginBottom:'0.5rem' }}>AI Judging in Progress</h3>
                    <p style={{ color:'#9ca3af', fontSize:'0.9rem', marginBottom:'1.5rem' }}>
                      GenLayer validators are independently evaluating the project URL.
                      Consensus will be reached when enough nodes agree on the score (±3 pts).
                    </p>

                    <div className="judging-steps">
                      {JUDGING_STEPS.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isDone   = judgingStep > stepNum;
                        const isActive = judgingStep === stepNum;
                        const StepIconComponent = step.icon;
                        return (
                          <div key={idx}
                            className={`judging-step ${isActive ? 'active' : isDone ? 'done' : ''}`}>
                            <span className="step-icon">
                              {isDone ? <CheckIcon size={16} /> : isActive ? <span className="pulse-dot" style={{ width: 8, height: 8 }} /> : <StepIconComponent size={16} />}
                            </span>
                            <span>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Judge a project by selecting from dropdown */}
              <div className="card" style={{ marginBottom:'1.5rem' }}>
                <div className="card-header">
                  <div className="card-icon violet">
                    <BrainIcon size={20} />
                  </div>
                  <div>
                    <h3>Trigger AI Judge</h3>
                    <div style={{ fontSize:'0.8rem', color:'#9ca3af', marginTop:'0.2rem' }}>Select a submitted project to evaluate</div>
                  </div>
                </div>

                {unjudgedProjects.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckIcon size={16} style={{ color: 'var(--c-emerald)' }} style={{ flexShrink: 0, color: 'var(--c-emerald)' }} />
                    All projects have been judged!
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:'0.75rem' }}>
                    <select className="form-input" style={{ flex:1, background: '#111827', border: '1px solid var(--c-border)', color: '#f3f4f6', borderRadius: '8px', padding: '0.5rem' }}
                      value={judgeTarget} onChange={e => setJudgeTarget(e.target.value)}>
                      <option value="">-- Select a project --</option>
                      {unjudgedProjects.map(p => (
                        <option key={p.pid} value={p.pid}>
                          ID {p.pid}: {p.project_name}
                        </option>
                      ))}
                    </select>
                    <button id="judge-project-btn" className="btn btn-primary"
                      disabled={isJudging || judgeTarget === '' || hackathonInfo?.finalized}
                      onClick={async () => {
                        const ok = await judgeProject(parseInt(judgeTarget, 10));
                        if (ok) {
                          setJudgeTarget('');
                          fetchProjects();
                        }
                      }}>
                      {isJudging ? '…' : '⚡ Judge'}
                    </button>
                  </div>
                )}
                <p className="form-hint" style={{ marginTop:'0.6rem' }}>
                  <InfoIcon size={14} /> This triggers <span className="mono" style={{ color:'var(--c-violet)', fontSize:'0.78rem', fontWeight:600 }}>
                  judge_project(pid)</span> on-chain with full web scraping + LLM consensus.
                </p>
              </div>

              {/* Finalize */}
              <div className="card">
                <div className="card-header">
                  <div className="card-icon emerald">
                    <TrophyIcon size={20} />
                  </div>
                  <div>
                    <h3>Finalize Hackathon</h3>
                    <div style={{ fontSize:'0.8rem', color:'#9ca3af', marginTop:'0.2rem' }}>Lock in prize distribution</div>
                  </div>
                </div>

                <p style={{ color:'#9ca3af', fontSize:'0.9rem', marginBottom:'1.5rem', lineHeight: 1.6 }}>
                  Once all projects are judged, finalize the hackathon to lock in the prize
                  pool distribution (50/30/20). Winners can then claim their prizes.
                </p>

                {hackathonInfo?.finalized ? (
                  <div className="status-pill status-done" style={{ display:'inline-flex' }}>
                    <CheckIcon size={14} /> Hackathon Finalized
                  </div>
                ) : (
                  <button id="finalize-btn" className="btn btn-emerald btn-full"
                    disabled={loading.finalize || !hackathonInfo?.name}
                    onClick={finalizeHackathon}>
                    {loading.finalize ? (
                      <><span className="pulse-dot" style={{ background:'#030712' }} /> Finalizing…</>
                    ) : (
                      <>
                        <LockIcon size={16} />
                        Finalize & Lock Prizes
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scorecard Modal */}
      {selectedEntry && (
        <ScorecardModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
