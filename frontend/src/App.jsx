/**
 * App.jsx
 * =======
 * Root application component.
 * Manages tab navigation and renders the three main views:
 *   1. Submit Project
 *   2. Leaderboard / AI Judge
 *   3. Claim Prize
 */

import { useState } from 'react';
import { useHackaChain } from './hooks/useHackaChain';
import SubmitProject from './components/SubmitProject';
import Leaderboard  from './components/Leaderboard';
import ClaimPrize   from './components/ClaimPrize';
import './index.css';

const TABS = [
  { id: 'submit',    label: '🚀 Submit',      component: SubmitProject },
  { id: 'judge',     label: '🧠 Leaderboard', component: Leaderboard  },
  { id: 'claim',     label: '💰 Claim Prize', component: ClaimPrize   },
];

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('submit');
  const hook = useHackaChain();

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || SubmitProject;

  return (
    <div className="app-wrapper">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="container navbar-inner">

          {/* Brand */}
          <a href="#" className="navbar-brand" onClick={e => e.preventDefault()}>
            <div className="brand-icon">⛓️</div>
            <span className="brand-name">HackaChain</span>
          </a>

          {/* Tab navigation */}
          <div className="nav-tabs" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Wallet connect */}
          <button
            id="wallet-connect-btn"
            className={`connect-btn ${hook.account ? 'connected' : ''}`}
            onClick={hook.account ? undefined : hook.connectWallet}>
            {hook.account ? (
              <>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--c-emerald)',
                  display:'inline-block', boxShadow:'0 0 8px var(--c-emerald)' }} />
                {hook.account.slice(0,6)}…{hook.account.slice(-4)}
              </>
            ) : (
              <><span>🔌</span> Connect</>
            )}
          </button>
        </div>
      </nav>

      {/* ── Hero (shown only on Submit tab) ─────────────────────── */}
      {activeTab === 'submit' && (
        <div className="hero">
          <div className="container">
            <div className="hero-badge">
              <span>⚡</span> Powered by GenLayer Intelligent Contracts
            </div>

            <h1 className="hero-title">
              <span className="gradient-text">Decentralized</span>
              <br />AI Hackathon Judging
            </h1>

            <p className="hero-subtitle">
              Submit your project URL. Our on-chain AI judge scrapes your page,
              evaluates Tech, UI & Completeness across multiple validator nodes,
              and distributes prizes automatically — zero human bias.
            </p>

            <div className="hero-stats">
              {[
                { number: hook.hackathonInfo?.count ?? '0',  label: 'Submissions' },
                { number: hook.hackathonInfo?.name ? String(Math.floor((hook.hackathonInfo?.pool ?? 0) / 1000000)) : '—', label: 'USDC Prize Pool' },
                { number: '3',    label: 'AI Judge Axes' },
                { number: '90',   label: 'Max Score' },
              ].map(({ number, label }) => (
                <div key={label} className="stat-item">
                  <div className="stat-number">{number || '—'}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <ActiveComponent useHook={hook} />
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <p>
            HackaChain — Built on{' '}
            <a href="https://genlayer.com" target="_blank" rel="noreferrer">GenLayer</a>
            {' '}·{' '}
            <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">Docs</a>
            {' '}·{' '}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem' }}>
              Contract: <span style={{ color:'var(--c-violet)' }}>
                {import.meta.env.VITE_CONTRACT_ADDRESS || '0x_NOT_DEPLOYED'}
              </span>
            </span>
          </p>
          <p style={{ marginTop:'0.4rem', opacity:0.6 }}>
            Live on{' '}
            <a href={`https://explorer-studio.genlayer.com/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
              GenLayer StudioNet Explorer ↗
            </a>
          </p>
        </div>
      </footer>

      {/* ── Toast notifications ──────────────────────────────────── */}
      <ToastContainer toasts={hook.toasts} />
    </div>
  );
}
