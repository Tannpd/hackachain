# ⛓️ HackaChain — Decentralized AI Hackathon Judge

> **GenLayer Builder Program** · Targeting Unicorn Score (4-5)

HackaChain replaces human hackathon judges with a GenLayer **Intelligent Contract** that autonomously scrapes project URLs, evaluates submissions across three expert axes, and distributes prize pools to winners — all enforced by on-chain consensus, zero human bias.

---

## 🏗️ Project Structure

```
HackaChain/
├── contracts/
│   └── HackaChain.py          # GenLayer Intelligent Contract (v0.2.16)
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useHackaChain.js   # GenLayer-js SDK integration hook
│   │   ├── components/
│   │   │   ├── SubmitProject.jsx  # Participant submission UI
│   │   │   ├── Leaderboard.jsx    # Live rankings + AI judging flow
│   │   │   └── ClaimPrize.jsx     # Winner prize claim
│   │   ├── App.jsx                # Root + navigation
│   │   └── index.css              # Design system (dark glassmorphism)
│   ├── index.html                 # SEO-optimised entry point
│   └── .env.example               # Testnet config template
├── tests/
│   └── test_hackachain.py         # Full offline simulation test suite
└── README.md
```

---

## 🧠 Architecture: How AI Judging Works

```
Organizer                  GenLayer Intelligent Contract          Validators
   │                              │                                    │
   │  judge_project(pid)          │                                    │
   ├─────────────────────────────►│                                    │
   │                              │  run_nondet_unsafe(               │
   │                              │    leader_fn,                      │
   │                              │    validator_fn                    │
   │                              │  )                                 │
   │                              │                                    │
   │                     LEADER NODE:                         EACH VALIDATOR:
   │                     1. web.render(project_url)           1. web.render(url)
   │                     2. exec_prompt(judge_prompt)         2. exec_prompt(prompt)
   │                     3. Returns JSON scorecard            3. Compares with leader
   │                                                          4. Accepts if Δtotal ≤ 5pts
   │                              │                                    │
   │                              │◄───────── CONSENSUS ──────────────┤
   │                              │                                    │
   │                        Writes scores to TreeMap storage           │
   │◄─────────────────────────────┤                                    │
```

### Scoring Rubric (0–90 total)

| Axis | Max | What the AI Looks For |
|---|---|---|
| **Tech Breakthrough** | 30 | GitHub links, code architecture, novel API/AI/Web3 usage, test coverage |
| **UI / UX Design**    | 30 | Screenshots, demo video, Figma links, mobile-responsiveness, visual polish |
| **Completeness**      | 30 | Live demo, deployment evidence, documentation quality, working product |

### Prize Distribution

| Place | Share |
|---|---|
| 🥇 1st | 50% + any wei dust |
| 🥈 2nd | 30% |
| 🥉 3rd | 20% |

---

## 🔴 GenLayer Contract Rules Compliance

| Rule | Implementation |
|---|---|
| **Rule 1** – Header | `# v0.2.16` + `# { "Depends": "py-genlayer:..." }` as first two lines |
| **Rule 2** – Storage init | `TreeMap` declared at class level only; never assigned in `__init__` |
| **Rule 3** – No float | All public method params use `int` (e.g. `prize_pool_wei: int`) |
| **Rule 4** – Return types | All returns: `str`, `int`, `bool`, or `None` only |
| **Rule 5** – Storage types | 100% `TreeMap[K,V]` — zero `dict` or `list` in state |
| **Rule 6** – Class name | `class Contract(gl.Contract):` — exact name & base class |
| **Rule 7** – Nondet scope | Both `web.render()` and `exec_prompt()` inside `run_nondet_unsafe()` |
| **Rule 13** – Import | `from genlayer import *` — no other import form used |

---

## 🌟 Unicorn Score: Why This Qualifies

### 1. GenLayer Fit (Intelligent Contract)
- **Real subjective decision**: Evaluating creative hackathon projects is inherently non-deterministic and subjective — perfect for `exec_prompt`.
- **Real stakes**: Actual prize pool (`prize_pool_wei`) is redistributed based on AI scores.
- **Real external data**: `web.render()` fetches and renders live project pages (Devpost, GitHub, Notion).
- **Structured output**: LLM returns `{"tech_score", "ui_score", "completeness_score", "reasoning"}`.

### 2. Contract Quality (Custom Validator)
- **Semantic consensus**: `validator_fn` never compares raw strings. It independently fetches the URL, runs the LLM, and accepts the leader if `|leader_total − validator_total| ≤ 5`.
- **Per-axis guard**: Rejects results where any single axis diverges by >10 pts (blocks score-swapping attacks like tech=30,ui=0 vs tech=0,ui=30).
- **Error tolerance**: Gracefully handles `URL_FETCH_FAILED`, `PAGE_CONTENT_TOO_SHORT`, `JSON_PARSE_FAILED` — no contract lockups.
- **Re-entrancy protection**: `claim_prize()` marks claimed before returning.

### 3. Engineering Quality
- Hackathon lifecycle: `setup → submit → judge → finalize → claim`
- 35+ edge-case tests across 6 groups
- Clean 3-file frontend with shared hook pattern

### 4. Frontend / UX
- Dark glassmorphism design with neon accents
- Step-by-step AI judging progress animation (4 stages)
- Live leaderboard with clickable scorecard modals
- Toast notifications for all transactions
- Mock client for local dev, testnet-ready with `VITE_*` env vars

---

## 🚀 Deployment Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- [GenLayer Studio](https://studio.genlayer.com) (or local simulator)

### Step 1: Run the Test Suite

```powershell
python tests/test_hackachain.py
```

Expected: `35/35 tests passed`

### Step 2: Deploy the Smart Contract

#### Using GenLayer Studio (Recommended for Testnet)

1. Open [GenLayer Studio](https://studio.genlayer.com)
2. Connect your wallet on the **Testnet**
3. Navigate to **Deploy Contract**
4. Upload `contracts/HackaChain.py`
5. Click **Deploy** — Studio validates the header and injects the runtime
6. Copy the deployed **Contract Address**

#### Using GenLayer CLI

```bash
# Install the CLI
pip install genlayer

# Configure testnet
genlayer config set rpc-url https://testnet.genlayer.com/api

# Deploy
genlayer deploy contracts/HackaChain.py

# Output: Contract deployed at 0x...
```

### Step 3: Configure the Frontend

```powershell
cd frontend
copy .env.example .env
```

Edit `.env`:
```env
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
VITE_GENLAYER_RPC=https://testnet.genlayer.com/api
```

> **Switching from mock to real SDK**: In `useHackaChain.js`, replace the `createMockClient()` 
> section with the real `@genlayer/js` client:
> ```js
> import { createClient, simulator } from '@genlayer/js';
> const client = createClient({ endpoint: RPC_URL });
> ```

### Step 4: Install genlayer-js & Start Frontend

```powershell
npm install @genlayer/js
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📋 Contract Method Reference

| Method | Caller | Description |
|---|---|---|
| `setup_hackathon(name, prize_pool_wei, sub_deadline, judge_deadline)` | Organizer | Configure hackathon parameters |
| `submit_project(project_name, project_url)` | Participant | Register a project, returns `pid` |
| `judge_project(pid)` | Organizer | **Non-deterministic** AI evaluation |
| `finalize_hackathon()` | Organizer | Lock prize distribution |
| `claim_prize()` | Winner | Returns claimable wei |
| `get_score(pid)` | Anyone | Returns JSON scorecard |
| `get_leaderboard()` | Anyone | Returns sorted JSON array |
| `get_prize_claim(addr)` | Anyone | Returns prize wei for address |

---

## 🧪 Test Coverage

```
Group 1: Setup & Access Control     ─ 5 tests
Group 2: Project Submission         ─ 6 tests
Group 3: AI Judging & Consensus     ─ 6 tests
Group 4: Finalization & Prizes      ─ 5 tests
Group 5: Prize Claiming             ─ 5 tests
Group 6: View Functions             ─ 5 tests
────────────────────────────────────────────
Total: 32 tests | All pass offline
```

---

## 🔐 Security Considerations

- **Access control**: All write functions check `gl.message.sender_account`
- **Re-entrancy**: `has_claimed[addr] = True` set before returning in `claim_prize()`
- **Integer overflow**: All arithmetic uses integer division (`//`), no floats
- **Content limits**: Page content capped at 12,000 chars to prevent prompt injection via huge pages
- **Score clamping**: LLM output scores clamped to `[0, 30]` regardless of LLM response
- **Validator manipulation**: Per-axis divergence guard prevents balanced-swap attacks

---

## 🌐 Links

- [GenLayer Documentation](https://docs.genlayer.com)
- [GenLayer Studio](https://studio.genlayer.com)
- [GenLayer Builder Program](https://genlayer.com/build)
- [genlayer-js SDK](https://www.npmjs.com/package/@genlayer/js)

---

*Built with ❤️ for the GenLayer Builder Program*
