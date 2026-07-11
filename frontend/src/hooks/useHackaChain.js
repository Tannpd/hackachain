/**
 * useHackaChain.js — Real GenLayer SDK Integration
 * ==================================================
 * Connects to the deployed HackaChain contract on GenLayer StudioNet.
 *
 * SDK: genlayer-js v1.1.8
 * Chain: studionet (RPC: https://studio.genlayer.com/api, ChainID: 61999)
 * Contract: 0x2De6f6b8f9716320565270577Df99170a0621b8d
 */

import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

// ─── Config ───────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// ─── GenLayer client (singleton, read-only until wallet connected) ─────────
// We create a base read client; write operations use client with account
let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: studionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  if (typeof account === 'string') {
    return createClient({
      chain: studionet,
      account,
      provider: window.ethereum,
    });
  }
  return createClient({ chain: studionet, account });
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useHackaChain() {
  const [account, setAccount]             = useState(null);
  const [glAccount, setGlAccount]         = useState(null); // GenLayer account object
  const [hackathonInfo, setHackathonInfo] = useState(null);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [loading, setLoading]             = useState({});
  const [judgingStep, setJudgingStep]     = useState(0);
  const [toasts, setToasts]               = useState([]);

  // ── Toast helper ─────────────────────────────────────────────────────
  const toast = useCallback((type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  const setLoadingKey = useCallback((key, val) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Connect Wallet ────────────────────────────────────────────────────
  // Creates a fresh GenLayer EOA account (for demo/testnet use).
  // In production, integrate with MetaMask via window.ethereum.
  const connectWallet = useCallback(async () => {
    try {
      setLoadingKey('connect', true);

      // Try MetaMask first
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0];

        // Ensure wallet is switched to the correct GenLayer network
        const client = getWriteClient(addr);
        await client.connect();

        setAccount(addr);
        setGlAccount(addr);
        toast('success', `Wallet connected: ${addr.slice(0,8)}…`);
      } else {
        // Fallback: generate a fresh ephemeral account for demo
        const acct = createAccount();
        setAccount(acct.address);
        setGlAccount(acct);
        toast('info', `Demo wallet: ${acct.address.slice(0,8)}… — fund it on StudioNet faucet to transact.`);
      }
    } catch (e) {
      toast('error', `Wallet connection failed: ${e.message}`);
    } finally {
      setLoadingKey('connect', false);
    }
  }, [toast, setLoadingKey]);

  // ── Read helpers ──────────────────────────────────────────────────────
  async function readContract(functionName, args = []) {
    const client = getReadClient();
    return client.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
    });
  }

  async function writeContract(functionName, args = [], value = 0n) {
    if (!glAccount) throw new Error('Wallet not connected.');
    const client = getWriteClient(glAccount);
    
    // Ensure wallet is on the correct GenLayer network before signing
    if (typeof glAccount === 'string') {
      await client.connect();
    }

    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value: value,
    });
    // Wait for FINALIZED status (GenLayer consensus)
    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
    });
    return { hash, receipt };
  }

  // ── Fetch hackathon metadata ──────────────────────────────────────────
  const fetchHackathonInfo = useCallback(async () => {
    setLoadingKey('info', true);
    try {
      const [name, pool, finalized, count] = await Promise.all([
        readContract('get_hackathon_name'),
        readContract('get_prize_pool'),
        readContract('get_is_finalized'),
        readContract('get_submission_count'),
      ]);
      setHackathonInfo({
        name:      String(name || ''),
        pool:      Number(pool || 0),
        finalized: Boolean(finalized),
        count:     Number(count || 0),
      });
    } catch (e) {
      console.error('fetchHackathonInfo:', e);
      // Don't crash — contract might not be set up yet
    } finally {
      setLoadingKey('info', false);
    }
  }, [setLoadingKey]);

  // ── Fetch leaderboard ─────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    setLoadingKey('leaderboard', true);
    try {
      const raw = await readContract('get_leaderboard');
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
      setLeaderboard(parsed);
    } catch (e) {
      console.error('fetchLeaderboard:', e);
    } finally {
      setLoadingKey('leaderboard', false);
    }
  }, [setLoadingKey]);

  // ── Setup hackathon ───────────────────────────────────────────────────
  const setupHackathon = useCallback(async ({ name, prizeWei, subDeadline, judgeDeadline }) => {
    setLoadingKey('setup', true);
    try {
      await writeContract('setup_hackathon', [name, prizeWei, subDeadline, judgeDeadline], BigInt(prizeWei));
      toast('success', `✅ Hackathon "${name}" created on-chain!`);
      await fetchHackathonInfo();
      return true;
    } catch (e) {
      toast('error', e.message);
      return false;
    } finally {
      setLoadingKey('setup', false);
    }
  }, [glAccount, toast, fetchHackathonInfo, setLoadingKey]);

  // ── Submit project ────────────────────────────────────────────────────
  const submitProject = useCallback(async ({ name, url }) => {
    setLoadingKey('submit', true);
    try {
      const { receipt } = await writeContract('submit_project', [name, url]);
      toast('success', `🚀 Project submitted on-chain! TX: ${receipt?.hash?.slice(0,10) || 'confirmed'}…`);
      await fetchHackathonInfo();
      return true;
    } catch (e) {
      toast('error', e.message);
      return false;
    } finally {
      setLoadingKey('submit', false);
    }
  }, [glAccount, toast, fetchHackathonInfo, setLoadingKey]);

  // ── Judge project (AI judging — GenLayer consensus) ───────────────────
  const judgeProject = useCallback(async (pid) => {
    setLoadingKey(`judge_${pid}`, true);
    setJudgingStep(1);
    try {
      // Step 1 UI: Fetching URL
      const stepTimer1 = setTimeout(() => setJudgingStep(2), 4000);  // Rendering DOM
      const stepTimer2 = setTimeout(() => setJudgingStep(3), 9000);  // LLM evaluating
      const stepTimer3 = setTimeout(() => setJudgingStep(4), 14000); // Validator consensus

      // This call blocks until GenLayer consensus is reached across validators
      // (web.render + exec_prompt + validator agreement — takes 30-120s on testnet)
      const { receipt } = await writeContract('judge_project', [pid]);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setJudgingStep(4);

      toast('success', `🧠 AI judging complete! Consensus finalized.`);
      await fetchLeaderboard();
      setTimeout(() => setJudgingStep(0), 2000);
      return true;
    } catch (e) {
      toast('error', e.message);
      setJudgingStep(0);
      return false;
    } finally {
      setLoadingKey(`judge_${pid}`, false);
    }
  }, [glAccount, toast, fetchLeaderboard, setLoadingKey]);

  // ── Finalize hackathon ────────────────────────────────────────────────
  const finalizeHackathon = useCallback(async () => {
    setLoadingKey('finalize', true);
    try {
      await writeContract('finalize_hackathon', []);
      toast('success', '🔒 Hackathon finalized! Prizes locked in.');
      await fetchHackathonInfo();
      await fetchLeaderboard();
      return true;
    } catch (e) {
      toast('error', e.message);
      return false;
    } finally {
      setLoadingKey('finalize', false);
    }
  }, [glAccount, toast, fetchHackathonInfo, fetchLeaderboard, setLoadingKey]);

  // ── Claim prize ───────────────────────────────────────────────────────
  const claimPrize = useCallback(async () => {
    setLoadingKey('claim', true);
    try {
      const { receipt } = await writeContract('claim_prize', []);
      toast('success', `💰 Prize claimed! TX: ${receipt?.hash?.slice(0,10) || 'confirmed'}…`);
      // Return prize amount by reading the claimed amount from the scorecard
      return true;
    } catch (e) {
      toast('error', e.message);
      return null;
    } finally {
      setLoadingKey('claim', false);
    }
  }, [glAccount, toast, setLoadingKey]);

  // ── Get scorecard ─────────────────────────────────────────────────────
  const getScore = useCallback(async (pid) => {
    try {
      const raw = await readContract('get_score', [pid]);
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      toast('error', e.message);
      return null;
    }
  }, [toast]);

  // ── Get prize claim ───────────────────────────────────────────────────
  const getPrizeClaim = useCallback(async () => {
    if (!account) return 0;
    try {
      const amt = await readContract('get_prize_claim', [account]);
      return Number(amt || 0);
    } catch {
      return 0;
    }
  }, [account]);

  // ── Auto-load on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetchHackathonInfo();
    fetchLeaderboard();
  }, [fetchHackathonInfo, fetchLeaderboard]);

  // ── Periodic refresh (every 30s for live leaderboard) ─────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return {
    account, connectWallet,
    hackathonInfo, leaderboard,
    loading, judgingStep, toasts,
    setupHackathon, submitProject, judgeProject,
    finalizeHackathon, claimPrize, getScore, getPrizeClaim,
    fetchHackathonInfo, fetchLeaderboard,
    CONTRACT_ADDRESS,
  };
}
